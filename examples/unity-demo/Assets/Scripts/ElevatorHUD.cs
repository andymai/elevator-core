/// <summary>
/// OnGUI-based HUD for the elevator demo.
/// Shows elevator stats, rider metrics, direction indicators, and speed controls.
/// </summary>

using UnityEngine;

namespace ElevatorDemo
{
    /// <summary>
    /// Renders an IMGUI overlay with simulation status, per-elevator details,
    /// aggregate rider metrics, event counters, and playback controls.
    /// </summary>
    public class ElevatorHUD : MonoBehaviour
    {
        public ElevatorSimManager simManager;

        // --- Layout constants ---
        private const float PanelX = 10f;
        private const float PanelWidth = 320f;
        private const float LineHeight = 20f;
        private const float ButtonWidth = 55f;
        private const float ButtonHeight = 25f;
        private const float ButtonGap = 5f;
        private const int LabelFontSize = 14;
        private const int ButtonFontSize = 13;
        private const int HelpFontSize = 11;
        private const float AssumedRiderWeightKg = 75f;

        private static readonly Color HelpTextColor = new(0.6f, 0.6f, 0.6f);

        private GUIStyle _labelStyle;
        private GUIStyle _buttonStyle;
        private GUIStyle _helpStyle;

        private void OnGUI()
        {
            if (simManager == null || simManager.Sim == null || !simManager.Sim.IsValid)
            {
                GUI.Label(new Rect(PanelX, PanelX, PanelWidth, LineHeight), "No simulation loaded");
                return;
            }

            EnsureStyles();

            var sim = simManager.Sim;
            var m = sim.Metrics;

            float y = PanelX;

            // Count lines needed for dynamic panel height.
            int elevatorLines = sim.Elevators.Length * 3; // 3 lines per elevator
            float panelHeight = LineHeight * (9 + elevatorLines) + ButtonHeight + LineHeight + 30f;
            GUI.Box(new Rect(PanelX - 5, y - 5, PanelWidth + 10, panelHeight), "");

            // --- Tick and speed ---
            string speedLabel = simManager.speedMultiplier == 0 ? "PAUSED" : $"{simManager.speedMultiplier}x";
            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"Tick: {m.current_tick}  Speed: {speedLabel}", _labelStyle);
            y += LineHeight;

            DrawSeparator(ref y);

            // --- Per-elevator info ---
            for (int i = 0; i < sim.Elevators.Length; i++)
            {
                var e = sim.Elevators[i];
                string phase = ElevatorPhaseName(e.phase);
                string direction = FormatDirection(e.going_up, e.going_down);

                GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                    $"Car {i}: {phase} {direction}  pos={e.position:F1}  vel={e.velocity:F2}",
                    _labelStyle);
                y += LineHeight;

                float loadPct = e.capacity_kg > 0
                    ? Mathf.Clamp01((float)(e.occupancy * AssumedRiderWeightKg / e.capacity_kg)) * 100f
                    : 0f;
                GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                    $"  Load: {loadPct:F0}%  Riders: {e.occupancy}  Cap: {e.capacity_kg:F0} kg",
                    _labelStyle);
                y += LineHeight;

                // ETA for the target stop (if moving).
                if (e.target_stop_id != 0)
                {
                    sbyte dir = e.going_up != 0 ? (sbyte)1 : (e.going_down != 0 ? (sbyte)-1 : (sbyte)0);
                    double eta = sim.BestEta(e.target_stop_id, dir);
                    string etaStr = eta >= 0 ? $"{eta:F1}s" : "--";
                    GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                        $"  Target ETA: {etaStr}", _labelStyle);
                }
                else
                {
                    GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                        "  No target", _labelStyle);
                }
                y += LineHeight;
            }

            DrawSeparator(ref y);

            // --- Rider counts ---
            int totalWaiting = 0;
            foreach (var s in sim.Stops)
                totalWaiting += (int)s.waiting;

            int totalOnBoard = 0;
            foreach (var e in sim.Elevators)
                totalOnBoard += (int)e.occupancy;

            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"Waiting: {totalWaiting}  On board: {totalOnBoard}", _labelStyle);
            y += LineHeight;

            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"Delivered: {m.total_delivered}  Abandoned: {m.total_abandoned}", _labelStyle);
            y += LineHeight;

            // --- Average times ---
            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"Avg wait: {m.avg_wait_seconds:F1}s  Avg ride: {m.avg_ride_seconds:F1}s",
                _labelStyle);
            y += LineHeight;

            // --- Event counters ---
            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"Events \u2014 Spawned: {simManager.EventsSpawned}  Boarded: {simManager.EventsBoarded}",
                _labelStyle);
            y += LineHeight;

            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                $"  Exited: {simManager.EventsExited}  Abandoned: {simManager.EventsAbandoned}",
                _labelStyle);
            y += LineHeight * 1.5f;

            // --- Controls ---
            DrawControls(ref y);

            // --- Help ---
            y += ButtonHeight + 10;
            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight),
                "Space: pause | 1: 1x | 2: 2x | 3: 10x", _helpStyle);
        }

        /// <summary>Formats the direction indicator lamps as arrow characters.</summary>
        private static string FormatDirection(byte goingUp, byte goingDown)
        {
            if (goingUp != 0 && goingDown != 0) return "\u2195"; // ↕
            if (goingUp != 0) return "\u2191"; // ↑
            if (goingDown != 0) return "\u2193"; // ↓
            return "\u2022"; // bullet (idle)
        }

        /// <summary>Draws speed control and spawn buttons.</summary>
        private void DrawControls(ref float y)
        {
            if (GUI.Button(new Rect(PanelX, y, ButtonWidth, ButtonHeight), "Pause", _buttonStyle))
                simManager.speedMultiplier = simManager.speedMultiplier == 0 ? 1 : 0;
            if (GUI.Button(new Rect(PanelX + (ButtonWidth + ButtonGap), y, ButtonWidth, ButtonHeight),
                "1x", _buttonStyle))
                simManager.speedMultiplier = 1;
            if (GUI.Button(new Rect(PanelX + (ButtonWidth + ButtonGap) * 2, y, ButtonWidth, ButtonHeight),
                "2x", _buttonStyle))
                simManager.speedMultiplier = 2;
            if (GUI.Button(new Rect(PanelX + (ButtonWidth + ButtonGap) * 3, y, ButtonWidth, ButtonHeight),
                "10x", _buttonStyle))
                simManager.speedMultiplier = 10;
            if (GUI.Button(new Rect(PanelX + (ButtonWidth + ButtonGap) * 4, y, ButtonWidth, ButtonHeight),
                "Spawn", _buttonStyle))
                simManager.SpawnRandomRider();
        }

        private void DrawSeparator(ref float y)
        {
            GUI.Label(new Rect(PanelX, y, PanelWidth, LineHeight), "---", _labelStyle);
            y += LineHeight;
        }

        /// <summary>Lazily initializes GUI styles on first use.</summary>
        private void EnsureStyles()
        {
            if (_labelStyle != null) return;

            _labelStyle = new GUIStyle(GUI.skin.label)
            {
                fontSize = LabelFontSize,
                normal = { textColor = Color.white }
            };
            _buttonStyle = new GUIStyle(GUI.skin.button) { fontSize = ButtonFontSize };
            _helpStyle = new GUIStyle(_labelStyle)
            {
                fontSize = HelpFontSize,
                normal = { textColor = HelpTextColor }
            };
        }

        /// <summary>Returns a human-readable name for the elevator phase byte.</summary>
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
