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

    // Kind discriminator values for EvEvent. See crates/elevator-ffi/src/lib.rs::ev_event_kind.
    public const byte EV_HALL_BUTTON_PRESSED = 1;
    public const byte EV_HALL_CALL_ACKNOWLEDGED = 2;
    public const byte EV_HALL_CALL_CLEARED = 3;
    public const byte EV_CAR_BUTTON_PRESSED = 4;
    public const byte EV_RIDER_BALKED = 5;

    [StructLayout(LayoutKind.Sequential)]
    public struct EvEvent
    {
        public byte kind;
        public sbyte direction;
        // 6 bytes of natural padding before `tick` on every target the
        // harness runs on (linux-x64, win-x64, osx-arm64); the repr(C)
        // layout on the Rust side lines up with default-pack LayoutKind.Sequential.
        public ulong tick;
        public ulong stop;
        public ulong car;
        public ulong rider;
        public ulong floor;
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
