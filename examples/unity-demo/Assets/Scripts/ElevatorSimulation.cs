/// <summary>
/// Managed wrapper around the elevator-ffi native handle.
/// Owns the simulation lifetime and provides safe C# methods.
/// </summary>

using System;
using System.Runtime.InteropServices;
using UnityEngine;

namespace ElevatorDemo
{
    /// <summary>
    /// Wraps an <c>EvSim</c> handle with safe, managed accessors for stepping,
    /// querying frame data, spawning riders, and querying ETAs.
    /// </summary>
    public class ElevatorSimulation : IDisposable
    {
        private IntPtr _handle;
        private bool _disposed;

        /// <summary>Elevator views from the most recent frame snapshot.</summary>
        public EvElevatorView[] Elevators { get; private set; } = Array.Empty<EvElevatorView>();

        /// <summary>Stop views from the most recent frame snapshot.</summary>
        public EvStopView[] Stops { get; private set; } = Array.Empty<EvStopView>();

        /// <summary>Rider views from the most recent frame snapshot.</summary>
        public EvRiderView[] Riders { get; private set; } = Array.Empty<EvRiderView>();

        /// <summary>Aggregate metrics from the most recent frame snapshot.</summary>
        public EvMetricsView Metrics { get; private set; }

        /// <summary>Whether the native handle is valid and usable.</summary>
        public bool IsValid => _handle != IntPtr.Zero;

        /// <summary>
        /// Creates a new simulation from a RON config file on disk.
        /// Returns a simulation instance; check <see cref="IsValid"/> before use.
        /// </summary>
        public static ElevatorSimulation Create(string configPath)
        {
            const uint ExpectedAbi = 2;
            uint abiVersion = ElevatorNative.ev_abi_version();
            if (abiVersion != ExpectedAbi)
            {
                Debug.LogError(
                    $"elevator_ffi ABI version mismatch: expected {ExpectedAbi}, got {abiVersion}. " +
                    "Run build.sh to recompile the native library.");
                return new ElevatorSimulation();
            }

            var sim = new ElevatorSimulation();
            sim._handle = ElevatorNative.ev_sim_create(configPath);
            if (sim._handle == IntPtr.Zero)
            {
                Debug.LogError($"Failed to create simulation: {ElevatorNative.LastError()}");
            }
            return sim;
        }

        /// <summary>Advances the simulation by one tick.</summary>
        public EvStatus Step()
        {
            if (!IsValid) return EvStatus.NullArg;
            return ElevatorNative.ev_sim_step(_handle);
        }

        /// <summary>
        /// Snapshots the current frame into <see cref="Elevators"/>, <see cref="Stops"/>,
        /// <see cref="Riders"/>, and <see cref="Metrics"/>.
        /// </summary>
        public void GetFrame()
        {
            if (!IsValid) return;

            var status = ElevatorNative.ev_sim_frame(_handle, out var frame);
            if (status != EvStatus.Ok) return;

            Metrics = frame.metrics;

            int elevCount = (int)frame.elevator_count;
            if (Elevators.Length != elevCount)
                Elevators = new EvElevatorView[elevCount];
            for (int i = 0; i < elevCount; i++)
            {
                Elevators[i] = Marshal.PtrToStructure<EvElevatorView>(
                    frame.elevators + i * Marshal.SizeOf<EvElevatorView>());
            }

            int stopCount = (int)frame.stop_count;
            if (Stops.Length != stopCount)
                Stops = new EvStopView[stopCount];
            for (int i = 0; i < stopCount; i++)
            {
                Stops[i] = Marshal.PtrToStructure<EvStopView>(
                    frame.stops + i * Marshal.SizeOf<EvStopView>());
            }

            int riderCount = (int)frame.rider_count;
            if (Riders.Length != riderCount)
                Riders = new EvRiderView[riderCount];
            for (int i = 0; i < riderCount; i++)
            {
                Riders[i] = Marshal.PtrToStructure<EvRiderView>(
                    frame.riders + i * Marshal.SizeOf<EvRiderView>());
            }
        }

        /// <summary>
        /// Queries the best ETA to a stop across eligible elevators.
        /// Returns the estimated seconds, or -1.0 if no elevator is heading there.
        /// </summary>
        /// <param name="stopEntityId">Stop entity id to query.</param>
        /// <param name="direction">-1 = Down, 0 = Either, 1 = Up.</param>
        public double BestEta(ulong stopEntityId, int direction)
        {
            if (!IsValid) return -1.0;

            var status = ElevatorNative.ev_sim_best_eta(
                _handle, stopEntityId, (sbyte)direction,
                out ulong _, out double seconds);

            if (status != EvStatus.Ok || double.IsNaN(seconds))
                return -1.0;

            return seconds;
        }

        /// <summary>Spawns a rider with default preferences. Returns the rider entity id, or 0 on failure.</summary>
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

        /// <summary>Removes a rider from the simulation. Returns true on success.</summary>
        public bool DespawnRider(ulong riderId)
        {
            if (!IsValid) return false;
            return ElevatorNative.ev_sim_despawn_rider(_handle, riderId) == EvStatus.Ok;
        }

        /// <summary>Drains pending events into a managed array.</summary>
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

        /// <summary>Replaces the dispatch strategy for a group.</summary>
        public void SetStrategy(uint groupId, EvStrategy strategy)
        {
            if (!IsValid) return;
            ElevatorNative.ev_sim_set_strategy(_handle, groupId, strategy);
        }

        /// <summary>Destroys the native simulation handle.</summary>
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
