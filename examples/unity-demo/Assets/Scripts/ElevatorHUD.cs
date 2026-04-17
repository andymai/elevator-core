// OnGUI-based HUD for the elevator demo.
// Shows stats, metrics, and speed controls.

using UnityEngine;

namespace ElevatorDemo
{
    public class ElevatorHUD : MonoBehaviour
    {
        public ElevatorSimManager simManager;

        private GUIStyle _labelStyle;
        private GUIStyle _buttonStyle;

        private void OnGUI()
        {
            if (simManager == null || simManager.Sim == null || !simManager.Sim.IsValid)
            {
                GUI.Label(new Rect(10, 10, 300, 30), "No simulation loaded");
                return;
            }

            if (_labelStyle == null)
            {
                _labelStyle = new GUIStyle(GUI.skin.label)
                {
                    fontSize = 14,
                    normal = { textColor = Color.white }
                };
                _buttonStyle = new GUIStyle(GUI.skin.button) { fontSize = 13 };
            }

            var sim = simManager.Sim;
            var m = sim.Metrics;

            float y = 10;
            float x = 10;
            float w = 320;
            float lineH = 20;

            // Background panel.
            GUI.Box(new Rect(x - 5, y - 5, w + 10, 340), "");

            string speedLabel = simManager.speedMultiplier == 0 ? "PAUSED" : $"{simManager.speedMultiplier}x";
            GUI.Label(new Rect(x, y, w, lineH), $"Tick: {m.current_tick}  Speed: {speedLabel}", _labelStyle);
            y += lineH;

            GUI.Label(new Rect(x, y, w, lineH), "---", _labelStyle);
            y += lineH;

            // Elevator info.
            for (int i = 0; i < sim.Elevators.Length; i++)
            {
                var e = sim.Elevators[i];
                string phase = ElevatorPhaseName(e.phase);
                GUI.Label(new Rect(x, y, w, lineH),
                    $"Car {i}: {phase}  pos={e.position:F1}  vel={e.velocity:F2}", _labelStyle);
                y += lineH;

                float loadPct = e.capacity_kg > 0 ? (float)(e.position / e.capacity_kg * 100) : 0;
                // Use current_load from occupancy * avg weight estimate.
                GUI.Label(new Rect(x, y, w, lineH),
                    $"  Capacity: {e.capacity_kg:F0} kg  Riders: {e.occupancy}", _labelStyle);
                y += lineH;
            }

            GUI.Label(new Rect(x, y, w, lineH), "---", _labelStyle);
            y += lineH;

            // Rider counts.
            int totalWaiting = 0;
            foreach (var s in sim.Stops)
                totalWaiting += (int)s.waiting;

            int totalOnBoard = 0;
            foreach (var e in sim.Elevators)
                totalOnBoard += (int)e.occupancy;

            GUI.Label(new Rect(x, y, w, lineH),
                $"Waiting: {totalWaiting}  On board: {totalOnBoard}", _labelStyle);
            y += lineH;

            GUI.Label(new Rect(x, y, w, lineH),
                $"Delivered: {m.total_delivered}  Abandoned: {m.total_abandoned}", _labelStyle);
            y += lineH;

            GUI.Label(new Rect(x, y, w, lineH),
                $"Avg wait: {m.avg_wait_seconds:F1}s  Avg ride: {m.avg_ride_seconds:F1}s", _labelStyle);
            y += lineH;

            GUI.Label(new Rect(x, y, w, lineH),
                $"Events — Spawned: {simManager.EventsSpawned}  Boarded: {simManager.EventsBoarded}", _labelStyle);
            y += lineH;

            GUI.Label(new Rect(x, y, w, lineH),
                $"  Exited: {simManager.EventsExited}  Abandoned: {simManager.EventsAbandoned}", _labelStyle);
            y += lineH * 1.5f;

            // Controls.
            float btnW = 55;
            float btnH = 25;
            if (GUI.Button(new Rect(x, y, btnW, btnH), "Pause", _buttonStyle))
                simManager.speedMultiplier = simManager.speedMultiplier == 0 ? 1 : 0;
            if (GUI.Button(new Rect(x + btnW + 5, y, btnW, btnH), "1x", _buttonStyle))
                simManager.speedMultiplier = 1;
            if (GUI.Button(new Rect(x + (btnW + 5) * 2, y, btnW, btnH), "2x", _buttonStyle))
                simManager.speedMultiplier = 2;
            if (GUI.Button(new Rect(x + (btnW + 5) * 3, y, btnW, btnH), "10x", _buttonStyle))
                simManager.speedMultiplier = 10;
            if (GUI.Button(new Rect(x + (btnW + 5) * 4, y, btnW, btnH), "Spawn", _buttonStyle))
                simManager.SpawnRandomRider();

            y += btnH + 10;

            // Help text.
            var helpStyle = new GUIStyle(_labelStyle)
            {
                fontSize = 11,
                normal = { textColor = new Color(0.6f, 0.6f, 0.6f) }
            };
            GUI.Label(new Rect(x, y, w, lineH),
                "Space: pause | 1: 1x | 2: 2x | 3: 10x", helpStyle);
        }

        private static string ElevatorPhaseName(byte phase) => phase switch
        {
            0 => "Idle",
            1 => "Moving",
            2 => "Repositioning",
            3 => "DoorOpening",
            4 => "Loading",
            5 => "DoorClosing",
            6 => "Stopped",
            _ => $"Phase({phase})",
        };
    }
}
