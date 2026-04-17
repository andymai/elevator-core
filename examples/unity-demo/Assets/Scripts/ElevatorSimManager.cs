// Main simulation manager MonoBehaviour.
// Steps the sim, auto-spawns riders, and exposes frame data to other scripts.

using UnityEngine;

namespace ElevatorDemo
{
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

        public ElevatorSimulation Sim { get; private set; }

        // Event counters for the HUD.
        public int EventsSpawned { get; private set; }
        public int EventsBoarded { get; private set; }
        public int EventsExited { get; private set; }
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

            // Auto-spawn riders.
            if (autoSpawn && steps > 0)
                MaybeSpawnRider(steps);

            // Step the simulation.
            for (int i = 0; i < steps; i++)
                Sim.Step();

            // Update frame snapshot.
            Sim.GetFrame();

            // Drain and count events.
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

            // Handle keyboard shortcuts.
            if (Input.GetKeyDown(KeyCode.Space))
                speedMultiplier = speedMultiplier == 0 ? 1 : 0;
            if (Input.GetKeyDown(KeyCode.Alpha1)) speedMultiplier = 1;
            if (Input.GetKeyDown(KeyCode.Alpha2)) speedMultiplier = 2;
            if (Input.GetKeyDown(KeyCode.Alpha3)) speedMultiplier = 10;
        }

        private void OnDestroy()
        {
            Sim?.Dispose();
        }

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
