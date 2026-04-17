/// <summary>
/// P/Invoke bindings for the elevator-ffi native library.
/// Struct layouts match crates/elevator-ffi/src/lib.rs exactly.
/// </summary>

using System;
using System.Runtime.InteropServices;

namespace ElevatorDemo
{
    /// <summary>Status code returned by every FFI entrypoint.</summary>
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

    /// <summary>Built-in dispatch strategy identifier.</summary>
    public enum EvStrategy : int
    {
        Scan = 0,
        Look = 1,
        NearestCar = 2,
        Etd = 3,
    }

    /// <summary>Aggregate metrics at the current tick.</summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct EvMetricsView
    {
        public ulong total_delivered;
        public ulong total_abandoned;
        public double avg_wait_seconds;
        public double avg_ride_seconds;
        public ulong current_tick;
    }

    /// <summary>Borrowed per-tick snapshot with slice pointers valid until the next frame call.</summary>
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

    /// <summary>View of a single elevator at the current tick.</summary>
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

    /// <summary>View of a single stop at the current tick.</summary>
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

    /// <summary>View of a single rider at the current tick.</summary>
    [StructLayout(LayoutKind.Sequential)]
    public struct EvRiderView
    {
        public ulong entity_id;
        public byte phase;
        public ulong origin_stop_id;
        public ulong destination_stop_id;
        public ulong elevator_id;
    }

    /// <summary>C-ABI-flat projection of simulation events.</summary>
    [StructLayout(LayoutKind.Explicit, Size = 48)]
    public struct EvEvent
    {
        [FieldOffset(0)] public byte kind;
        [FieldOffset(1)] public sbyte direction;
        [FieldOffset(8)] public ulong tick;
        [FieldOffset(16)] public ulong stop;
        [FieldOffset(24)] public ulong car;
        [FieldOffset(32)] public ulong rider;
        [FieldOffset(40)] public ulong floor;
    }

    /// <summary>Event kind discriminator constants.</summary>
    public static class EvEventKind
    {
        public const byte HallButtonPressed = 1;
        public const byte HallCallAcknowledged = 2;
        public const byte HallCallCleared = 3;
        public const byte CarButtonPressed = 4;
        public const byte RiderSkipped = 5;
        public const byte RiderSpawned = 6;
        public const byte RiderBoarded = 7;
        public const byte RiderExited = 8;
        public const byte RiderAbandoned = 9;
    }

    /// <summary>Rider phase constants matching the FFI EvRiderView.phase field.</summary>
    public static class RiderPhase
    {
        public const byte Waiting = 0;
        public const byte Boarding = 1;
        public const byte Riding = 2;
        public const byte Exiting = 3;
        public const byte Walking = 4;
        public const byte Arrived = 5;
        public const byte Abandoned = 6;
        public const byte Resident = 7;
    }

    /// <summary>Static P/Invoke declarations for the elevator_ffi native library.</summary>
    public static class ElevatorNative
    {
        private const string Lib = "elevator_ffi";

        [DllImport(Lib)] public static extern uint ev_abi_version();
        [DllImport(Lib)] public static extern IntPtr ev_last_error();
        [DllImport(Lib)]
        public static extern IntPtr ev_sim_create(
            [MarshalAs(UnmanagedType.LPUTF8Str)] string path);
        [DllImport(Lib)] public static extern void ev_sim_destroy(IntPtr handle);
        [DllImport(Lib)] public static extern EvStatus ev_sim_step(IntPtr handle);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_frame(IntPtr handle, out EvFrame outFrame);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_best_eta(
            IntPtr handle, ulong stopEntityId, sbyte direction,
            out ulong outElevator, out double outSeconds);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_set_strategy(
            IntPtr handle, uint groupId, EvStrategy strategy);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_drain_events(
            IntPtr handle, [Out] EvEvent[] outBuf, uint capacity, out uint outWritten);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_spawn_rider(
            IntPtr handle, ulong origin, ulong dest, double weight, out ulong outRiderId);
        [DllImport(Lib)]
        public static extern EvStatus ev_sim_despawn_rider(
            IntPtr handle, ulong riderEntityId);
        [DllImport(Lib)]
        public static extern uint ev_sim_pending_event_count(IntPtr handle);

        /// <summary>Returns the last FFI error as a managed string.</summary>
        public static string LastError()
        {
            var ptr = ev_last_error();
            return ptr == IntPtr.Zero
                ? "<none>"
                : (Marshal.PtrToStringUTF8(ptr) ?? "<null>");
        }
    }
}
