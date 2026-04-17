/// <summary>
/// Procedural 3D visualization of the elevator simulation.
/// Orthographic side-view with cubes for shaft, car, stops, and riders.
/// </summary>

using System.Collections.Generic;
using UnityEngine;

namespace ElevatorDemo
{
    /// <summary>
    /// Renders the building shaft, stops, elevator cars, and riders as an
    /// orthographic side-view using primitive cubes.
    /// </summary>
    public class BuildingVisualizer : MonoBehaviour
    {
        public ElevatorSimManager simManager;

        // --- Layout constants ---
        private const float PPU = 2f;
        private const float ShaftWidth = 1f;
        private const float CarWidth = 0.8f;
        private const float CarHeight = 0.5f;
        private const float RiderSize = 0.15f;
        private const float RiderSpacing = 0.05f;
        private const int RidersPerColumn = 5;
        private const float StopMarkerHeight = 0.05f;
        private const float StopMarkerOverhang = 0.4f;
        private const float LabelCharSize = 0.08f;
        private const int LabelFontSize = 32;
        private const float CameraMarginY = 2.5f;
        private const float CameraHudOffsetX = 1.0f;
        private const float BoardingLerp = 0.4f;
        private const float ExitingLerp = 0.6f;
        private const int InitialRiderPoolSize = 64;
        private const int RiderPoolGrowth = 32;

        // --- Colors (matching the Bevy demo) ---
        private static readonly Color CarColor = new(0.2f, 0.5f, 0.9f);
        private static readonly Color ShaftColor = new(0.2f, 0.2f, 0.25f);
        private static readonly Color StopColor = new(0.5f, 0.5f, 0.5f, 0.6f);
        private static readonly Color WaitingColor = new(0.2f, 0.8f, 0.3f);
        private static readonly Color BoardingColor = new(0.3f, 0.9f, 0.9f);
        private static readonly Color RidingColor = new(0.9f, 0.8f, 0.2f);
        private static readonly Color ExitingColor = new(0.9f, 0.4f, 0.2f);
        private static readonly Color BackgroundColor = new(0.1f, 0.1f, 0.12f);

        private GameObject _shaft;
        private GameObject[] _cars;
        private GameObject[] _stopMarkers;
        private TextMesh[] _stopLabels;
        private GameObject[] _riderPool;
        private int _riderPoolSize;
        private float _minPos;
        private float _maxPos;
        private bool _initialized;

        // Lookup tables rebuilt each frame for fast stop/elevator position queries.
        private readonly Dictionary<ulong, float> _stopPositions = new();
        private readonly Dictionary<ulong, float> _elevatorPositions = new();
        private readonly Dictionary<ulong, int> _waitingCounts = new();
        private readonly Dictionary<ulong, int> _boardingCounts = new();
        private readonly Dictionary<ulong, int> _ridingCounts = new();
        private readonly Dictionary<ulong, int> _exitingCounts = new();

        private void LateUpdate()
        {
            if (simManager == null || simManager.Sim == null || !simManager.Sim.IsValid)
                return;

            var sim = simManager.Sim;
            if (sim.Stops.Length == 0) return;

            if (!_initialized)
                Initialize(sim);

            UpdateCars(sim);
            UpdateRiders(sim);
        }

        /// <summary>Creates all static geometry (shaft, stops, labels) and configures the camera.</summary>
        private void Initialize(ElevatorSimulation sim)
        {
            _initialized = true;

            _minPos = float.MaxValue;
            _maxPos = float.MinValue;
            foreach (var s in sim.Stops)
            {
                if (s.position < _minPos) _minPos = (float)s.position;
                if (s.position > _maxPos) _maxPos = (float)s.position;
            }

            float shaftHeight = (_maxPos - _minPos) * PPU;
            float shaftCenterY = shaftHeight / 2f;

            // Shaft background.
            _shaft = CreateCube("Shaft",
                new Vector3(ShaftWidth, shaftHeight, 0.1f),
                new Vector3(0, shaftCenterY, 0),
                ShaftColor);

            // Stops.
            _stopMarkers = new GameObject[sim.Stops.Length];
            _stopLabels = new TextMesh[sim.Stops.Length];
            for (int i = 0; i < sim.Stops.Length; i++)
            {
                float y = SimToWorldY(sim.Stops[i].position);

                _stopMarkers[i] = CreateCube($"Stop_{i}",
                    new Vector3(ShaftWidth + StopMarkerOverhang, StopMarkerHeight, 0.1f),
                    new Vector3(0, y, 0),
                    StopColor);

                var labelObj = new GameObject($"StopLabel_{i}");
                labelObj.transform.SetParent(transform);
                labelObj.transform.localPosition = new Vector3(ShaftWidth / 2 + 0.5f, y, 0);
                var tm = labelObj.AddComponent<TextMesh>();
                tm.text = GetStopName(sim.Stops[i]);
                tm.fontSize = LabelFontSize;
                tm.characterSize = LabelCharSize;
                tm.color = Color.white;
                tm.anchor = TextAnchor.MiddleLeft;
                _stopLabels[i] = tm;
            }

            // Cars (one per elevator).
            int carCount = Mathf.Max(1, sim.Elevators.Length);
            _cars = new GameObject[carCount];
            for (int i = 0; i < carCount; i++)
            {
                _cars[i] = CreateCube($"Car_{i}",
                    new Vector3(CarWidth, CarHeight, 0.15f),
                    Vector3.zero,
                    CarColor);
            }

            // Rider pool.
            _riderPoolSize = InitialRiderPoolSize;
            _riderPool = new GameObject[_riderPoolSize];
            for (int i = 0; i < _riderPoolSize; i++)
            {
                _riderPool[i] = CreateRiderCube(i);
            }

            // Orthographic camera — account for labels, HUD, and margin.
            var cam = Camera.main;
            if (cam != null)
            {
                cam.orthographic = true;
                cam.orthographicSize = shaftHeight / 2f + CameraMarginY;
                cam.transform.position = new Vector3(CameraHudOffsetX, shaftCenterY, -10);
                cam.transform.LookAt(new Vector3(CameraHudOffsetX, shaftCenterY, 0));
                cam.backgroundColor = BackgroundColor;
            }
        }

        /// <summary>Updates car positions from the current elevator views.</summary>
        private void UpdateCars(ElevatorSimulation sim)
        {
            for (int i = 0; i < sim.Elevators.Length && i < _cars.Length; i++)
            {
                float y = SimToWorldY(sim.Elevators[i].position);
                _cars[i].transform.localPosition = new Vector3(0, y, -0.05f);
            }
        }

        /// <summary>
        /// Renders all active riders (Waiting, Boarding, Riding, Exiting) with
        /// phase-specific colors and positions.
        /// </summary>
        private void UpdateRiders(ElevatorSimulation sim)
        {
            EnsurePoolCapacity(sim.Riders.Length);
            RebuildLookupTables(sim);

            // Reset per-stop/elevator counters for layout offsets.
            _waitingCounts.Clear();
            _boardingCounts.Clear();
            _ridingCounts.Clear();
            _exitingCounts.Clear();

            int activeCount = 0;

            for (int i = 0; i < sim.Riders.Length; i++)
            {
                var r = sim.Riders[i];

                Vector3 pos;
                Color color;

                switch (r.phase)
                {
                    case RiderPhase.Waiting:
                    {
                        float stopY = LookupStopY(r.origin_stop_id);
                        int idx = IncrementCount(_waitingCounts, r.origin_stop_id);
                        pos = WaitingPosition(stopY, idx);
                        color = WaitingColor;
                        break;
                    }
                    case RiderPhase.Boarding:
                    {
                        float stopY = LookupStopY(r.origin_stop_id);
                        float carY = LookupElevatorY(r.elevator_id);
                        int idx = IncrementCount(_boardingCounts, r.elevator_id);
                        float lerpY = Mathf.Lerp(stopY, carY, BoardingLerp);
                        pos = RidingPosition(lerpY, idx);
                        color = BoardingColor;
                        break;
                    }
                    case RiderPhase.Riding:
                    {
                        float carY = LookupElevatorY(r.elevator_id);
                        int idx = IncrementCount(_ridingCounts, r.elevator_id);
                        pos = RidingPosition(carY, idx);
                        color = RidingColor;
                        break;
                    }
                    case RiderPhase.Exiting:
                    {
                        float destY = LookupStopY(r.destination_stop_id);
                        float carY = LookupElevatorY(r.elevator_id);
                        int idx = IncrementCount(_exitingCounts, r.elevator_id);
                        float lerpY = Mathf.Lerp(carY, destY, ExitingLerp);
                        pos = ExitingPosition(lerpY, idx);
                        color = ExitingColor;
                        break;
                    }
                    default:
                        continue; // Skip Arrived, Abandoned, Resident, Walking
                }

                if (activeCount >= _riderPoolSize) break;

                var go = _riderPool[activeCount];
                go.SetActive(true);
                go.transform.localPosition = pos;
                go.GetComponent<Renderer>().material.color = color;
                activeCount++;
            }

            // Deactivate unused pool objects.
            for (int i = activeCount; i < _riderPoolSize; i++)
            {
                if (_riderPool[i].activeSelf)
                    _riderPool[i].SetActive(false);
            }
        }

        // --- Position helpers ---

        /// <summary>Positions a waiting rider to the left of the shaft at the given stop.</summary>
        private static Vector3 WaitingPosition(float stopY, int index)
        {
            int col = index % RidersPerColumn;
            int row = index / RidersPerColumn;
            float xOffset = -(ShaftWidth / 2 + 0.3f) - col * (RiderSize + RiderSpacing);
            float yOffset = row * (RiderSize + RiderSpacing);
            return new Vector3(xOffset, stopY + yOffset, -0.05f);
        }

        /// <summary>Positions a riding/boarding rider inside the car in columns.</summary>
        private static Vector3 RidingPosition(float carY, int index)
        {
            int col = index % 3;
            int row = index / 3;
            float xOffset = -0.2f + col * (RiderSize + RiderSpacing);
            float yOffset = -CarHeight / 2 + RiderSize / 2 + row * (RiderSize + RiderSpacing);
            return new Vector3(xOffset, carY + yOffset, -0.1f);
        }

        /// <summary>Positions an exiting rider to the right of the shaft.</summary>
        private static Vector3 ExitingPosition(float y, int index)
        {
            int col = index % RidersPerColumn;
            int row = index / RidersPerColumn;
            float xOffset = ShaftWidth / 2 + 0.3f + col * (RiderSize + RiderSpacing);
            float yOffset = row * (RiderSize + RiderSpacing);
            return new Vector3(xOffset, y + yOffset, -0.05f);
        }

        // --- Lookup table helpers ---

        /// <summary>Rebuilds stop and elevator position lookup tables from the current frame.</summary>
        private void RebuildLookupTables(ElevatorSimulation sim)
        {
            _stopPositions.Clear();
            foreach (var s in sim.Stops)
                _stopPositions[s.entity_id] = SimToWorldY(s.position);

            _elevatorPositions.Clear();
            foreach (var e in sim.Elevators)
                _elevatorPositions[e.entity_id] = SimToWorldY(e.position);
        }

        private float LookupStopY(ulong stopId)
        {
            return _stopPositions.TryGetValue(stopId, out float y) ? y : 0f;
        }

        private float LookupElevatorY(ulong elevatorId)
        {
            return _elevatorPositions.TryGetValue(elevatorId, out float y) ? y : 0f;
        }

        private static int IncrementCount(Dictionary<ulong, int> counts, ulong key)
        {
            if (!counts.TryGetValue(key, out int idx))
                idx = 0;
            counts[key] = idx + 1;
            return idx;
        }

        // --- Pool management ---

        /// <summary>Grows the rider object pool if needed.</summary>
        private void EnsurePoolCapacity(int needed)
        {
            if (needed <= _riderPoolSize) return;

            int newSize = needed + RiderPoolGrowth;
            var newPool = new GameObject[newSize];
            System.Array.Copy(_riderPool, newPool, _riderPoolSize);
            for (int i = _riderPoolSize; i < newSize; i++)
            {
                newPool[i] = CreateRiderCube(i);
            }
            _riderPool = newPool;
            _riderPoolSize = newSize;
        }

        // --- Factory helpers ---

        private GameObject CreateCube(string name, Vector3 scale, Vector3 position, Color color)
        {
            var obj = GameObject.CreatePrimitive(PrimitiveType.Cube);
            obj.name = name;
            obj.transform.SetParent(transform);
            obj.transform.localScale = scale;
            obj.transform.localPosition = position;
            obj.GetComponent<Renderer>().material.color = color;
            Destroy(obj.GetComponent<Collider>());
            return obj;
        }

        private GameObject CreateRiderCube(int index)
        {
            var rider = GameObject.CreatePrimitive(PrimitiveType.Cube);
            rider.name = $"Rider_{index}";
            rider.transform.SetParent(transform);
            rider.transform.localScale = new Vector3(RiderSize, RiderSize, RiderSize);
            rider.GetComponent<Renderer>().material.color = WaitingColor;
            Destroy(rider.GetComponent<Collider>());
            rider.SetActive(false);
            return rider;
        }

        private float SimToWorldY(double simPos)
        {
            return (float)(simPos - _minPos) * PPU;
        }

        private static string GetStopName(EvStopView stop)
        {
            if (stop.name_ptr == System.IntPtr.Zero || (int)stop.name_len == 0)
                return $"Stop {stop.stop_id}";
            return System.Runtime.InteropServices.Marshal.PtrToStringUTF8(
                stop.name_ptr, (int)stop.name_len) ?? $"Stop {stop.stop_id}";
        }
    }
}
