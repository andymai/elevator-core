/// <summary>
/// Main simulation manager MonoBehaviour.
/// Steps the sim, auto-spawns riders, and exposes frame data to other scripts.
/// </summary>

using UnityEngine;

namespace ElevatorDemo
{
    /// <summary>
    /// Drives the simulation loop: steps the sim each frame, auto-spawns riders
    /// on a random interval, drains events, and handles keyboard shortcuts.
    /// </summary>
    public class ElevatorSimManager : MonoBehaviour
    {
        [Header("Configuration")]
        [Tooltip("RON config filename in StreamingAssets/config/")]
        public string configFile = "default.ron";

        [Header("Simulation")]
        [Tooltip("Ticks per frame. 0 = paused.")]
        public int speedMultiplier = 1;

        [Header("Auto-Spawn")]
        public bool autoSpawn = true;
        public int meanSpawnInterval = 120;
        public float weightMin = 50f;
        public float weightMax = 100f;

        /// <summary>The managed simulation handle. Null until Awake completes.</summary>
        public ElevatorSimulation Sim { get; private set; }

        /// <summary>Cumulative count of RiderSpawned events.</summary>
        public int EventsSpawned { get; private set; }

        /// <summary>Cumulative count of RiderBoarded events.</summary>
        public int EventsBoarded { get; private set; }

        /// <summary>Cumulative count of RiderExited events.</summary>
        public int EventsExited { get; private set; }

        /// <summary>Cumulative count of RiderAbandoned events.</summary>
        public int EventsAbandoned { get; private set; }

        private int _ticksUntilSpawn;

        private void Awake()
        {
            var configPath = System.IO.Path.Combine(
                Application.streamingAssetsPath, "config", configFile);
            Sim = ElevatorSimulation.Create(configPath);
            _ticksUntilSpawn = meanSpawnInterval;
        }

        private void Update()
        {
            if (Sim == null || !Sim.IsValid) return;

            int steps = Mathf.Max(0, speedMultiplier);

            if (autoSpawn && steps > 0)
                MaybeSpawnRider(steps);

            for (int i = 0; i < steps; i++)
                Sim.Step();

            Sim.GetFrame();

            var events = Sim.DrainEvents();
            foreach (var ev in events)
            {
                switch (ev.kind)
                {
                    case EvEventKind.RiderSpawned: EventsSpawned++; break;
                    case EvEventKind.RiderBoarded: EventsBoarded++; break;
                    case EvEventKind.RiderExited: EventsExited++; break;
                    case EvEventKind.RiderAbandoned: EventsAbandoned++; break;
                }
            }

            HandleKeyboardInput();
        }

        private void OnDestroy()
        {
            Sim?.Dispose();
        }

        /// <summary>Spawns a rider between two random stops with a random weight.</summary>
        public void SpawnRandomRider()
        {
            if (Sim == null || !Sim.IsValid || Sim.Stops.Length < 2) return;

            int originIdx = Random.Range(0, Sim.Stops.Length);
            int destIdx = Random.Range(0, Sim.Stops.Length - 1);
            if (destIdx >= originIdx) destIdx++;

            float weight = Random.Range(weightMin, weightMax);
            Sim.SpawnRider(
                Sim.Stops[originIdx].entity_id,
                Sim.Stops[destIdx].entity_id,
                weight);
        }

        private void HandleKeyboardInput()
        {
            if (Input.GetKeyDown(KeyCode.Space))
                speedMultiplier = speedMultiplier == 0 ? 1 : 0;
            if (Input.GetKeyDown(KeyCode.Alpha1)) speedMultiplier = 1;
            if (Input.GetKeyDown(KeyCode.Alpha2)) speedMultiplier = 2;
            if (Input.GetKeyDown(KeyCode.Alpha3)) speedMultiplier = 10;
        }

        private void MaybeSpawnRider(int steps)
        {
            if (Sim.Stops.Length < 2) return;

            int remaining = steps;
            while (_ticksUntilSpawn <= remaining)
            {
                remaining -= _ticksUntilSpawn;
                SpawnRandomRider();
                float jitter = Random.Range(0.5f, 1.5f);
                _ticksUntilSpawn = Mathf.Max(1, (int)(meanSpawnInterval * jitter));
            }
            _ticksUntilSpawn -= remaining;
        }
    }
}
