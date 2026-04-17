// Procedural 3D visualization of the elevator simulation.
// Orthographic side-view with cubes for shaft, car, stops, and riders.

using UnityEngine;

namespace ElevatorDemo
{
    public class BuildingVisualizer : MonoBehaviour
    {
        public ElevatorSimManager simManager;

        private const float PPU = 2f; // world-units per sim-unit
        private const float ShaftWidth = 1f;
        private const float CarWidth = 0.8f;
        private const float CarHeight = 0.5f;
        private const float RiderSize = 0.15f;

        private GameObject _shaft;
        private GameObject _car;
        private GameObject[] _stopMarkers;
        private TextMesh[] _stopLabels;
        private GameObject[] _riderPool;
        private int _riderPoolSize;
        private float _minPos;
        private float _maxPos;
        private bool _initialized;

        private static readonly Color CarColor = new(0.2f, 0.5f, 0.9f);
        private static readonly Color ShaftColor = new(0.2f, 0.2f, 0.25f);
        private static readonly Color StopColor = new(0.5f, 0.5f, 0.5f, 0.6f);
        private static readonly Color WaitingColor = new(0.2f, 0.8f, 0.3f);

        private void LateUpdate()
        {
            if (simManager == null || simManager.Sim == null || !simManager.Sim.IsValid)
                return;

            var sim = simManager.Sim;
            if (sim.Stops.Length == 0) return;

            if (!_initialized)
                Initialize(sim);

            UpdateCar(sim);
            UpdateRiders(sim);
        }

        private void Initialize(ElevatorSimulation sim)
        {
            _initialized = true;

            // Compute shaft bounds.
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
            _shaft = GameObject.CreatePrimitive(PrimitiveType.Cube);
            _shaft.name = "Shaft";
            _shaft.transform.SetParent(transform);
            _shaft.transform.localScale = new Vector3(ShaftWidth, shaftHeight, 0.1f);
            _shaft.transform.localPosition = new Vector3(0, shaftCenterY, 0);
            _shaft.GetComponent<Renderer>().material.color = ShaftColor;
            Destroy(_shaft.GetComponent<Collider>());

            // Stops.
            _stopMarkers = new GameObject[sim.Stops.Length];
            _stopLabels = new TextMesh[sim.Stops.Length];
            for (int i = 0; i < sim.Stops.Length; i++)
            {
                float y = SimToWorldY(sim.Stops[i].position);

                var marker = GameObject.CreatePrimitive(PrimitiveType.Cube);
                marker.name = $"Stop_{i}";
                marker.transform.SetParent(transform);
                marker.transform.localScale = new Vector3(ShaftWidth + 0.4f, 0.05f, 0.1f);
                marker.transform.localPosition = new Vector3(0, y, 0);
                marker.GetComponent<Renderer>().material.color = StopColor;
                Destroy(marker.GetComponent<Collider>());
                _stopMarkers[i] = marker;

                // Stop name label.
                var labelObj = new GameObject($"StopLabel_{i}");
                labelObj.transform.SetParent(transform);
                labelObj.transform.localPosition = new Vector3(ShaftWidth / 2 + 0.5f, y, 0);
                var tm = labelObj.AddComponent<TextMesh>();
                string stopName = GetStopName(sim.Stops[i]);
                tm.text = stopName;
                tm.fontSize = 32;
                tm.characterSize = 0.08f;
                tm.color = Color.white;
                tm.anchor = TextAnchor.MiddleLeft;
                _stopLabels[i] = tm;
            }

            // Car.
            _car = GameObject.CreatePrimitive(PrimitiveType.Cube);
            _car.name = "Car";
            _car.transform.SetParent(transform);
            _car.transform.localScale = new Vector3(CarWidth, CarHeight, 0.15f);
            _car.GetComponent<Renderer>().material.color = CarColor;
            Destroy(_car.GetComponent<Collider>());

            // Rider pool.
            _riderPoolSize = 64;
            _riderPool = new GameObject[_riderPoolSize];
            for (int i = 0; i < _riderPoolSize; i++)
            {
                var rider = GameObject.CreatePrimitive(PrimitiveType.Cube);
                rider.name = $"Rider_{i}";
                rider.transform.SetParent(transform);
                rider.transform.localScale = new Vector3(RiderSize, RiderSize, RiderSize);
                rider.GetComponent<Renderer>().material.color = WaitingColor;
                Destroy(rider.GetComponent<Collider>());
                rider.SetActive(false);
                _riderPool[i] = rider;
            }

            // Set up orthographic camera.
            var cam = Camera.main;
            if (cam != null)
            {
                cam.orthographic = true;
                cam.orthographicSize = shaftHeight / 2f + 1f;
                cam.transform.position = new Vector3(0, shaftCenterY, -10);
                cam.transform.LookAt(new Vector3(0, shaftCenterY, 0));
                cam.backgroundColor = new Color(0.1f, 0.1f, 0.12f);
            }
        }

        private void UpdateCar(ElevatorSimulation sim)
        {
            if (sim.Elevators.Length == 0 || _car == null) return;

            float y = SimToWorldY(sim.Elevators[0].position);
            _car.transform.localPosition = new Vector3(0, y, -0.05f);
        }

        private void UpdateRiders(ElevatorSimulation sim)
        {
            // Ensure pool is large enough.
            if (sim.Riders.Length > _riderPoolSize)
            {
                int newSize = sim.Riders.Length + 32;
                var newPool = new GameObject[newSize];
                System.Array.Copy(_riderPool, newPool, _riderPoolSize);
                for (int i = _riderPoolSize; i < newSize; i++)
                {
                    var rider = GameObject.CreatePrimitive(PrimitiveType.Cube);
                    rider.name = $"Rider_{i}";
                    rider.transform.SetParent(transform);
                    rider.transform.localScale = new Vector3(RiderSize, RiderSize, RiderSize);
                    rider.GetComponent<Renderer>().material.color = WaitingColor;
                    Destroy(rider.GetComponent<Collider>());
                    rider.SetActive(false);
                    newPool[i] = rider;
                }
                _riderPool = newPool;
                _riderPoolSize = newSize;
            }

            // Per-stop counter for offset.
            var stopCounts = new System.Collections.Generic.Dictionary<ulong, int>();
            int activeCount = 0;

            for (int i = 0; i < sim.Riders.Length; i++)
            {
                var r = sim.Riders[i];
                // Only show waiting riders (phase 0).
                if (r.phase != 0)
                    continue;

                if (activeCount >= _riderPoolSize) break;

                var go = _riderPool[activeCount];
                go.SetActive(true);

                // Find stop position.
                float stopY = 0;
                foreach (var s in sim.Stops)
                {
                    if (s.entity_id == r.origin_stop_id)
                    {
                        stopY = SimToWorldY(s.position);
                        break;
                    }
                }

                // Per-stop offset.
                if (!stopCounts.TryGetValue(r.origin_stop_id, out int localIdx))
                    localIdx = 0;
                stopCounts[r.origin_stop_id] = localIdx + 1;

                int col = localIdx % 5;
                int row = localIdx / 5;
                float xOffset = -(ShaftWidth / 2 + 0.3f) - col * (RiderSize + 0.05f);
                float yOffset = row * (RiderSize + 0.05f);
                go.transform.localPosition = new Vector3(xOffset, stopY + yOffset, -0.05f);
                go.GetComponent<Renderer>().material.color = WaitingColor;

                activeCount++;
            }

            // Deactivate unused pool objects.
            for (int i = activeCount; i < _riderPoolSize; i++)
            {
                if (_riderPool[i].activeSelf)
                    _riderPool[i].SetActive(false);
            }
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
