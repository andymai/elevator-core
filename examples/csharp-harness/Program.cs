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
        public byte going_up;
        public byte going_down;
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

    // Matches crates/elevator-ffi/src/lib.rs::EvLogMessage.
    // Layout (64-bit only): u8 level + 7 pad + i64 ts_ns + *const u8
    // msg_ptr + u32 msg_len + 4 pad = 32 bytes. Spelled out explicitly
    // so CLR default packing can't drift from the Rust #[repr(C)]
    // layout. On 32-bit the offsets would differ (i64 lands at offset
    // 4, msg_ptr is 4 bytes, total size 20) — Main asserts
    // IntPtr.Size == 8 at startup so a 32-bit build fails fast rather
    // than corrupting reads.
    [StructLayout(LayoutKind.Explicit, Size = 32)]
    public struct EvLogMessage
    {
        [FieldOffset(0)] public byte level;
        [FieldOffset(8)] public long ts_ns;
        [FieldOffset(16)] public IntPtr msg_ptr;
        [FieldOffset(24)] public uint msg_len;
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
    public const byte EV_RIDER_SKIPPED = 5;
    public const byte EV_RIDER_SPAWNED = 6;
    public const byte EV_RIDER_BOARDED = 7;
    public const byte EV_RIDER_EXITED = 8;
    public const byte EV_RIDER_ABANDONED = 9;

    // Explicit layout mirrors the Rust #[repr(C)] EvEvent at ABI v5
    // (88 bytes). The first 8 bytes pack four single-byte fields and
    // a u32 group id; bytes 8..88 are nine u64/f64 slots in their
    // natural order. Relying on the CLR's default Sequential packing
    // could match by coincidence on one platform but skew on
    // another, so explicit FieldOffsets are spelled out for every
    // platform target.
    //
    // ABI v5 added the `tag` field (offset 80) carrying `Rider.tag`
    // for every rider-bearing variant; consumers that don't use the
    // tag can simply ignore the new slot.
    [StructLayout(LayoutKind.Explicit, Size = 88)]
    public struct EvEvent
    {
        [FieldOffset(0)] public byte kind;
        [FieldOffset(1)] public sbyte direction;
        [FieldOffset(2)] public byte code1;
        [FieldOffset(3)] public byte code2;
        [FieldOffset(4)] public uint group;
        [FieldOffset(8)] public ulong tick;
        [FieldOffset(16)] public ulong stop;
        [FieldOffset(24)] public ulong car;
        [FieldOffset(32)] public ulong rider;
        [FieldOffset(40)] public ulong floor;
        [FieldOffset(48)] public ulong entity;
        [FieldOffset(56)] public ulong count;
        [FieldOffset(64)] public double f1;
        [FieldOffset(72)] public double f2;
        [FieldOffset(80)] public ulong tag;
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
    [DllImport(Lib)]
    public static extern EvStatus ev_drain_log_messages(
        IntPtr handle, [Out] EvLogMessage[] outBuf, uint capacity, out uint outWritten);
    [DllImport(Lib)] public static extern uint ev_pending_log_message_count(IntPtr handle);
    [DllImport(Lib)] public static extern EvStatus ev_sim_press_hall_button(IntPtr handle, ulong stopEntityId, sbyte direction);
    [DllImport(Lib)] public static extern EvStatus ev_sim_pin_assignment(IntPtr handle, ulong carEntityId, ulong stopEntityId, sbyte direction);
    [DllImport(Lib)] public static extern uint ev_sim_hall_call_count(IntPtr handle);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_hall_calls_snapshot(
        IntPtr handle, [Out] EvHallCall[] outBuf, uint capacity, out uint outWritten);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_spawn_rider(
        IntPtr handle, ulong origin, ulong dest, double weight, out ulong outRiderId);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_spawn_rider_ex(
        IntPtr handle, ulong origin, ulong dest, double weight,
        [MarshalAs(UnmanagedType.U1)] bool skipFull, double maxCrowding,
        long abandonAfterTicks, [MarshalAs(UnmanagedType.U1)] bool abandonOnFull,
        long maxWaitTicks, out ulong outRiderId);
    [DllImport(Lib)]
    public static extern EvStatus ev_sim_despawn_rider(IntPtr handle, ulong riderEntityId);

    public static string LastError()
    {
        var ptr = ev_last_error();
        return ptr == IntPtr.Zero ? "<none>" : (Marshal.PtrToStringUTF8(ptr) ?? "<null>");
    }
}

internal static class Program
{
    private const int TICKS = 600;
    private const uint EXPECTED_ABI = 5;

    private static int Main(string[] args)
    {
        // EvLogMessage's explicit FieldOffsets are 64-bit-only. On a
        // 32-bit host the i64 would land at offset 4, the pointer
        // would be 4 bytes, and the layout would silently misalign.
        // Fail loudly rather than corrupting reads.
        if (IntPtr.Size != 8)
        {
            Console.Error.WriteLine(
                "elevator-ffi requires a 64-bit host (IntPtr.Size = "
                + IntPtr.Size + ", expected 8)");
            return 2;
        }

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

            // Activate lazy log buffering before the step loop so the
            // msg_ptr/msg_len round-trip below has data to check. The
            // first call to either polling-side log API flips
            // log_polling_active on the Rust side; without it,
            // forward_pending_events skips the per-step push and the
            // queue stays empty.
            _ = Native.ev_pending_log_message_count(handle);

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

            // Exercise the polling log-drain ABI. Forwarding pushes a
            // record per pending sim event on every step, so 600 ticks
            // should leave at least one in the queue. Decode one entry
            // to validate msg_ptr+msg_len round-trip across the FFI.
            var pendingLogs = Native.ev_pending_log_message_count(handle);
            var logBuf = new Native.EvLogMessage[64];
            var logStatus = Native.ev_drain_log_messages(
                handle, logBuf, (uint)logBuf.Length, out var logWritten);
            if (logStatus != Native.EvStatus.Ok)
            {
                Console.Error.WriteLine($"ev_drain_log_messages: {logStatus} ({Native.LastError()})");
                return 1;
            }
            Console.WriteLine($"  pending log messages: {pendingLogs}, drained: {logWritten}");
            if (logWritten > 0)
            {
                var first = logBuf[0];
                if (first.msg_ptr == IntPtr.Zero || first.msg_len == 0)
                {
                    Console.Error.WriteLine("first log message has null/empty borrowed slice");
                    return 1;
                }
                var bytes = new byte[first.msg_len];
                Marshal.Copy(first.msg_ptr, bytes, 0, (int)first.msg_len);
                var msg = System.Text.Encoding.UTF8.GetString(bytes);
                Console.WriteLine($"  first log: level={first.level} ts_ns={first.ts_ns} msg=\"{msg}\"");
            }

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
