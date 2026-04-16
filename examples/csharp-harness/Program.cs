// Smoke test for the elevator-ffi C ABI.
//
// Loads a RON config, steps the simulation a fixed number of times, prints
// the metrics view, and exits non-zero if anything looks broken (null
// handle, status != Ok, ABI version mismatch, zero ticks elapsed). The point
// is to prove the P/Invoke boundary works end-to-end on the host.

using System;
using System.IO;
using System.Runtime.InteropServices;

namespace ElevatorHarness;

internal static class Native
{
    private const string Lib = "elevator_ffi";

    public enum EvStatus : int
    {
        Ok = 0,
        NullArg = 1,
        InvalidUtf8 = 2,
        ConfigLoad = 3,
        ConfigParse = 4,
        BuildFailed = 5,
        NotFound = 6,
        InvalidArg = 7,
        Panic = 99,
    }

    public enum EvStrategy : int
    {
        Scan = 0,
        Look = 1,
        NearestCar = 2,
        Etd = 3,
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct EvMetricsView
    {
        public ulong total_delivered;
        public ulong total_abandoned;
        public double avg_wait_seconds;
        public double avg_ride_seconds;
        public ulong current_tick;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct EvFrame
    {
        public IntPtr elevators;
        public UIntPtr elevator_count;
        public IntPtr stops;
        public UIntPtr stop_count;
        public IntPtr riders;
        public UIntPtr rider_count;
        public EvMetricsView metrics;
    }

    // Matches crates/elevator-ffi/src/lib.rs::EvElevatorView.
    [StructLayout(LayoutKind.Sequential)]
    public struct EvElevatorView
    {
        public ulong entity_id;
        public uint group_id;
        public ulong line_id;
        public byte phase;
        public double position;
        public double velocity;
        public ulong current_stop_id;
        public ulong target_stop_id;
        public uint occupancy;
        public double capacity_kg;
        public byte door_state;
    }

    // Matches crates/elevator-ffi/src/lib.rs::EvStopView.
    [StructLayout(LayoutKind.Sequential)]
    public struct EvStopView
    {
        public ulong entity_id;
        public uint stop_id;
        public double position;
        public uint waiting;
        public uint residents;
        public uint abandoned;
        public IntPtr name_ptr;
        public UIntPtr name_len;
    }

    // Matches crates/elevator-ffi/src/lib.rs::EvHallCall.
    [StructLayout(LayoutKind.Sequential)]
    public struct EvHallCall
    {
        public ulong stop_entity_id;
        public sbyte direction;
        public ulong press_tick;
        public ulong acknowledged_at;
        public ulong assigned_car;
        public ulong destination_entity_id;
        public byte pinned;
        public uint pending_rider_count;
    }

    // Kind discriminator values for EvEvent. See crates/elevator-ffi/src/lib.rs::ev_event_kind.
    public const byte EV_HALL_BUTTON_PRESSED = 1;
    public const byte EV_HALL_CALL_ACKNOWLEDGED = 2;
    public const byte EV_HALL_CALL_CLEARED = 3;
    public const byte EV_CAR_BUTTON_PRESSED = 4;
    public const byte EV_RIDER_BALKED = 5;

    // Explicit layout so the 6 bytes of padding before `tick`
    // (natural u64 alignment on the Rust #[repr(C)] side) are
    // reserved here too, rather than relying on the CLR's default
    // Sequential packing rules matching by coincidence across all
    // three target ABIs.
    [StructLayout(LayoutKind.Explicit, Size = 48)]
    public struct EvEvent
    {
        [FieldOffset(0)] public byte kind;
        [FieldOffset(1)] public sbyte direction;
        // bytes 2..8 are padding (reserved for alignment)
        [FieldOffset(8)] public ulong tick;
        [FieldOffset(16)] public ulong stop;
        [FieldOffset(24)] public ulong car;
        [FieldOffset(32)] public ulong rider;
        [FieldOffset(40)] public ulong floor;
    }

    [DllImport(Lib)] public static extern uint ev_abi_version();
    [DllImport(Lib)] public static extern IntPtr ev_last_error();
    [DllImport(Lib)] public static extern IntPtr ev_sim_create([MarshalAs(UnmanagedType.LPUTF8Str)] string path);
    [DllImport(Lib)] public static extern void ev_sim_destroy(IntPtr handle);
    [DllImport(Lib)] public static extern EvStatus ev_sim_step(IntPtr handle);
    [DllImport(Lib)] public static extern EvStatus ev_sim_frame(IntPtr handle, out EvFrame outFrame);
    [DllImport(Lib)] public static extern EvStatus ev_sim_set_strategy(IntPtr handle, uint groupId, EvStrategy strategy);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_drain_events(
        IntPtr handle, [Out] EvEvent[] outBuf, uint capacity, out uint outWritten);
    [DllImport(Lib)] public static extern EvStatus ev_sim_press_hall_button(IntPtr handle, ulong stopEntityId, sbyte direction);
    [DllImport(Lib)] public static extern EvStatus ev_sim_pin_assignment(IntPtr handle, ulong carEntityId, ulong stopEntityId, sbyte direction);
    [DllImport(Lib)] public static extern uint ev_sim_hall_call_count(IntPtr handle);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_hall_calls_snapshot(
        IntPtr handle, [Out] EvHallCall[] outBuf, uint capacity, out uint outWritten);

    public static string LastError()
    {
        var ptr = ev_last_error();
        return ptr == IntPtr.Zero ? "<none>" : (Marshal.PtrToStringUTF8(ptr) ?? "<null>");
    }
}

internal static class Program
{
    private const int TICKS = 600;
    private const uint EXPECTED_ABI = 1;

    private static int Main(string[] args)
    {
        if (args.Length != 1)
        {
            Console.Error.WriteLine("usage: elevator-harness <path-to-config.ron>");
            return 2;
        }

        var configPath = Path.GetFullPath(args[0]);
        if (!File.Exists(configPath))
        {
            Console.Error.WriteLine($"config not found: {configPath}");
            return 2;
        }

        var abi = Native.ev_abi_version();
        Console.WriteLine($"ABI version: {abi}");
        if (abi != EXPECTED_ABI)
        {
            Console.Error.WriteLine($"ABI mismatch: harness expects {EXPECTED_ABI}, lib reports {abi}");
            return 1;
        }

        var handle = Native.ev_sim_create(configPath);
        if (handle == IntPtr.Zero)
        {
            Console.Error.WriteLine($"ev_sim_create failed: {Native.LastError()}");
            return 1;
        }

        try
        {
            // Exercise the hall-call ABI before the main tick loop.
            // Take one step first so the frame's elevator/stop arrays
            // are populated, then press and pin a call at stops[1].
            var bootFrame = new Native.EvFrame();
            var bootStatus = Native.ev_sim_frame(handle, out bootFrame);
            if (bootStatus != Native.EvStatus.Ok)
            {
                Console.Error.WriteLine($"ev_sim_frame (boot): {bootStatus} ({Native.LastError()})");
                return 1;
            }
            if ((ulong)bootFrame.stop_count >= 2 && (ulong)bootFrame.elevator_count >= 1)
            {
                // Grab the second stop + first car by reading the
                // borrowed arrays. Frame-view lifetime is "valid until
                // next ev_sim_frame call on the same handle"; we're
                // within that window here.
                var stopSize = Marshal.SizeOf<Native.EvStopView>();
                var stop1Ptr = bootFrame.stops + stopSize;
                var stop1 = Marshal.PtrToStructure<Native.EvStopView>(stop1Ptr);
                var car0 = Marshal.PtrToStructure<Native.EvElevatorView>(bootFrame.elevators);

                const sbyte Up = 1;
                var pressSt = Native.ev_sim_press_hall_button(handle, stop1.entity_id, Up);
                if (pressSt != Native.EvStatus.Ok)
                {
                    Console.Error.WriteLine($"ev_sim_press_hall_button: {pressSt} ({Native.LastError()})");
                    return 1;
                }
                var pinSt = Native.ev_sim_pin_assignment(handle, car0.entity_id, stop1.entity_id, Up);
                if (pinSt != Native.EvStatus.Ok)
                {
                    Console.Error.WriteLine($"ev_sim_pin_assignment: {pinSt} ({Native.LastError()})");
                    return 1;
                }

                // Verify the call is visible via the hall-call snapshot API.
                var hcBuf = new Native.EvHallCall[8];
                var snapSt = Native.ev_sim_hall_calls_snapshot(
                    handle, hcBuf, (uint)hcBuf.Length, out var hcWritten);
                if (snapSt != Native.EvStatus.Ok)
                {
                    Console.Error.WriteLine($"ev_sim_hall_calls_snapshot: {snapSt} ({Native.LastError()})");
                    return 1;
                }
                var pinnedSeen = false;
                for (var i = 0; i < (int)hcWritten; i++)
                {
                    if (hcBuf[i].stop_entity_id == stop1.entity_id
                        && hcBuf[i].direction == Up
                        && hcBuf[i].pinned == 1)
                    {
                        pinnedSeen = true;
                        break;
                    }
                }
                if (!pinnedSeen)
                {
                    Console.Error.WriteLine("snapshot did not surface the pinned hall call");
                    return 1;
                }
                Console.WriteLine($"  hall-call API OK: pressed Up at stop {stop1.entity_id}, pinned car {car0.entity_id}, snapshot count {hcWritten}");
            }
            else
            {
                Console.WriteLine("  hall-call API skipped: config has <2 stops or 0 elevators");
            }

            for (var i = 0; i < TICKS; i++)
            {
                var st = Native.ev_sim_step(handle);
                if (st != Native.EvStatus.Ok)
                {
                    Console.Error.WriteLine($"ev_sim_step at tick {i}: {st} ({Native.LastError()})");
                    return 1;
                }
            }

            var fst = Native.ev_sim_frame(handle, out var frame);
            if (fst != Native.EvStatus.Ok)
            {
                Console.Error.WriteLine($"ev_sim_frame: {fst} ({Native.LastError()})");
                return 1;
            }

            Console.WriteLine($"After {TICKS} ticks (current_tick={frame.metrics.current_tick}):");
            Console.WriteLine($"  elevators: {frame.elevator_count}");
            Console.WriteLine($"  stops:     {frame.stop_count}");
            Console.WriteLine($"  riders:    {frame.rider_count}");
            Console.WriteLine($"  delivered: {frame.metrics.total_delivered}");
            Console.WriteLine($"  abandoned: {frame.metrics.total_abandoned}");
            Console.WriteLine($"  avg wait:  {frame.metrics.avg_wait_seconds:F2}s");
            Console.WriteLine($"  avg ride:  {frame.metrics.avg_ride_seconds:F2}s");

            // Exercise the event-drain ABI. The default config doesn't
            // auto-spawn riders so the drained count may legitimately be
            // zero — the point is to prove the struct layout and status
            // code wire up across the boundary.
            var eventBuf = new Native.EvEvent[64];
            var evStatus = Native.ev_sim_drain_events(handle, eventBuf, (uint)eventBuf.Length, out var drained);
            if (evStatus != Native.EvStatus.Ok)
            {
                Console.Error.WriteLine($"ev_sim_drain_events: {evStatus} ({Native.LastError()})");
                return 1;
            }
            Console.WriteLine($"  drained events: {drained}");

            if (frame.metrics.current_tick == 0)
            {
                Console.Error.WriteLine("current_tick is 0 — sim did not advance");
                return 1;
            }
            if ((ulong)frame.elevator_count == 0 || (ulong)frame.stop_count == 0)
            {
                Console.Error.WriteLine("frame missing elevators or stops");
                return 1;
            }

            return 0;
        }
        finally
        {
            Native.ev_sim_destroy(handle);
        }
    }
}
