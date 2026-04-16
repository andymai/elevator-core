extends Node2D
## Draws the elevator shaft, stops, car, and riders as procedural 2D shapes.

const SHAFT_WIDTH := 60.0
const CAR_WIDTH := 50.0
const CAR_HEIGHT := 30.0
const RIDER_SIZE := 8.0
const PPU := 40.0  # pixels per sim unit
const SHAFT_X := 512.0  # horizontal center of shaft

const COLOR_SHAFT := Color(0.2, 0.2, 0.25, 1.0)
const COLOR_CAR := Color(0.2, 0.5, 0.9, 1.0)
const COLOR_STOP := Color(0.5, 0.5, 0.5, 0.6)
const COLOR_WAITING := Color(0.2, 0.8, 0.3, 1.0)
const COLOR_BOARDING := Color(0.3, 0.9, 0.9, 1.0)
const COLOR_RIDING := Color(0.9, 0.8, 0.2, 1.0)
const COLOR_EXITING := Color(0.9, 0.4, 0.2, 1.0)

var shaft_top_y := 0.0
var shaft_bottom_y := 0.0

func _process(_delta: float) -> void:
	queue_redraw()

func _draw() -> void:
	var sim: ElevatorSim = _get_sim()
	if sim == null:
		return

	var stop_count := sim.stop_count()
	if stop_count == 0:
		return

	# Gather stop positions to compute shaft bounds.
	var stops: Array[Dictionary] = []
	var min_pos := INF
	var max_pos := -INF
	for i in range(stop_count):
		var s: Dictionary = sim.get_stop(i)
		stops.append(s)
		var p: float = s.get("position", 0.0)
		min_pos = min(min_pos, p)
		max_pos = max(max_pos, p)

	var shaft_height: float = (max_pos - min_pos) * PPU
	shaft_bottom_y = 650.0
	shaft_top_y = shaft_bottom_y - shaft_height

	# Draw shaft background.
	draw_rect(
		Rect2(SHAFT_X - SHAFT_WIDTH / 2, shaft_top_y, SHAFT_WIDTH, shaft_height),
		COLOR_SHAFT
	)

	# Draw stops.
	for s in stops:
		var pos_y := _sim_to_screen_y(s.get("position", 0.0), min_pos)
		# Horizontal line.
		draw_line(
			Vector2(SHAFT_X - SHAFT_WIDTH / 2 - 10, pos_y),
			Vector2(SHAFT_X + SHAFT_WIDTH / 2 + 10, pos_y),
			COLOR_STOP, 2.0
		)
		# Stop name label.
		var stop_name: String = s.get("name", "")
		var waiting: int = s.get("waiting", 0)
		var label := "%s (%d)" % [stop_name, waiting]
		draw_string(ThemeDB.fallback_font, Vector2(SHAFT_X + SHAFT_WIDTH / 2 + 15, pos_y + 4), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.WHITE)

	# Draw elevators.
	var elev_count := sim.elevator_count()
	for i in range(elev_count):
		var e: Dictionary = sim.get_elevator(i)
		var pos_y := _sim_to_screen_y(e.get("position", 0.0), min_pos)
		draw_rect(
			Rect2(SHAFT_X - CAR_WIDTH / 2, pos_y - CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT),
			COLOR_CAR
		)
		# Occupancy label inside car.
		var occ: int = e.get("occupancy", 0)
		if occ > 0:
			draw_string(ThemeDB.fallback_font, Vector2(SHAFT_X - 8, pos_y + 4), str(occ), HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color.WHITE)

	# Draw riders.
	var rider_count := sim.rider_count()
	for i in range(rider_count):
		var r: Dictionary = sim.get_rider(i)
		var phase: int = r.get("phase", -1)
		# Only draw waiting riders (phase 0) at their stop.
		if phase == 0:  # Waiting
			# Find the stop position for this rider.
			var stop_eid: int = r.get("current_stop", 0)
			if stop_eid == 0:
				continue
			for s in stops:
				if s.get("entity_id", 0) == stop_eid:
					var pos_y := _sim_to_screen_y(s.get("position", 0.0), min_pos)
					# Offset riders to the left of the shaft, spread by index.
					var offset_x := SHAFT_X - SHAFT_WIDTH / 2 - 20 - (i % 5) * (RIDER_SIZE + 2)
					draw_rect(
						Rect2(offset_x - RIDER_SIZE / 2, pos_y - RIDER_SIZE / 2, RIDER_SIZE, RIDER_SIZE),
						COLOR_WAITING
					)
					break

func _sim_to_screen_y(sim_pos: float, min_pos: float) -> float:
	return shaft_bottom_y - (sim_pos - min_pos) * PPU

func _get_sim() -> ElevatorSim:
	var parent := get_parent()
	if parent == null:
		return null
	for child in parent.get_children():
		if child is ElevatorSim:
			return child
	return null
