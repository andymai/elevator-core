// Managed wrapper around the elevator-ffi native handle.
// Owns the simulation lifetime and provides safe C# methods.

using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace ElevatorDemo
{
    public class ElevatorSimulation : IDisposable
    {
        private IntPtr _handle;
        private bool _disposed;

        // Cached frame data — valid until next GetFrame() call.
        public EvElevatorView[] Elevators { get; private set; } = Array.Empty<EvElevatorView>();
        public EvStopView[] Stops { get; private set; } = Array.Empty<EvStopView>();
        public EvRiderView[] Riders { get; private set; } = Array.Empty<EvRiderView>();
        public EvMetricsView Metrics { get; private set; }

        public bool IsValid => _handle != IntPtr.Zero;

        public static ElevatorSimulation Create(string configPath)
        {
            var sim = new ElevatorSimulation();
            sim._handle = ElevatorNative.ev_sim_create(configPath);
            if (sim._handle == IntPtr.Zero)
            {
                Debug.LogError($"Failed to create simulation: {ElevatorNative.LastError()}");
            }
            return sim;
        }

        public EvStatus Step()
        {
            if (!IsValid) return EvStatus.NullArg;
            return ElevatorNative.ev_sim_step(_handle);
        }

        public void GetFrame()
        {
            if (!IsValid) return;

            var status = ElevatorNative.ev_sim_frame(_handle, out var frame);
            if (status != EvStatus.Ok) return;

            Metrics = frame.metrics;

            // Copy elevator views.
            int elevCount = (int)frame.elevator_count;
            if (Elevators.Length != elevCount)
                Elevators = new EvElevatorView[elevCount];
            for (int i = 0; i < elevCount; i++)
            {
                Elevators[i] = Marshal.PtrToStructure<EvElevatorView>(
                    frame.elevators + i * Marshal.SizeOf<EvElevatorView>());
            }

            // Copy stop views.
            int stopCount = (int)frame.stop_count;
            if (Stops.Length != stopCount)
                Stops = new EvStopView[stopCount];
            for (int i = 0; i < stopCount; i++)
            {
                Stops[i] = Marshal.PtrToStructure<EvStopView>(
                    frame.stops + i * Marshal.SizeOf<EvStopView>());
            }

            // Copy rider views.
            int riderCount = (int)frame.rider_count;
            if (Riders.Length != riderCount)
                Riders = new EvRiderView[riderCount];
            for (int i = 0; i < riderCount; i++)
            {
                Riders[i] = Marshal.PtrToStructure<EvRiderView>(
                    frame.riders + i * Marshal.SizeOf<EvRiderView>());
            }
        }

        public ulong SpawnRider(ulong origin, ulong dest, double weight)
        {
            if (!IsValid) return 0;
            var status = ElevatorNative.ev_sim_spawn_rider(
                _handle, origin, dest, weight, out ulong riderId);
            if (status != EvStatus.Ok)
            {
                Debug.LogWarning($"SpawnRider failed: {ElevatorNative.LastError()}");
                return 0;
            }
            return riderId;
        }

        public bool DespawnRider(ulong riderId)
        {
            if (!IsValid) return false;
            return ElevatorNative.ev_sim_despawn_rider(_handle, riderId) == EvStatus.Ok;
        }

        public EvEvent[] DrainEvents(int bufferSize = 128)
        {
            if (!IsValid) return Array.Empty<EvEvent>();

            var buf = new EvEvent[bufferSize];
            var status = ElevatorNative.ev_sim_drain_events(
                _handle, buf, (uint)bufferSize, out uint written);
            if (status != EvStatus.Ok || written == 0)
                return Array.Empty<EvEvent>();

            var result = new EvEvent[written];
            Array.Copy(buf, result, written);
            return result;
        }

        public void SetStrategy(uint groupId, EvStrategy strategy)
        {
            if (!IsValid) return;
            ElevatorNative.ev_sim_set_strategy(_handle, groupId, strategy);
        }

        public void Dispose()
        {
            if (_disposed) return;
            _disposed = true;
            if (_handle != IntPtr.Zero)
            {
                ElevatorNative.ev_sim_destroy(_handle);
                _handle = IntPtr.Zero;
            }
        }
    }
}
