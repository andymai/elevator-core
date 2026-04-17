extends Node2D
## Draws the elevator shaft, stops, cars, and riders as procedural 2D shapes.
## PPU is computed dynamically so any config (15-unit building or 1000-unit
## space elevator) fits the viewport.

const SHAFT_WIDTH := 60.0
const CAR_WIDTH := 50.0
const CAR_HEIGHT := 30.0
const RIDER_SIZE := 8.0

## Vertical margin above/below the shaft, in pixels.
const SHAFT_MARGIN_V := 40.0
## Width reserved for the HUD panel on the left side.
const HUD_PANEL_WIDTH := 320.0

## Phase colors matching the Bevy demo.
const COLOR_SHAFT := Color(0.2, 0.2, 0.25, 1.0)
const COLOR_CAR := Color(0.2, 0.5, 0.9, 1.0)
const COLOR_STOP := Color(0.5, 0.5, 0.5, 0.6)
const COLOR_WAITING := Color(0.2, 0.8, 0.3, 1.0)
const COLOR_BOARDING := Color(0.3, 0.9, 0.9, 1.0)
const COLOR_RIDING := Color(0.9, 0.8, 0.2, 1.0)
const COLOR_EXITING := Color(0.9, 0.4, 0.2, 1.0)

## Computed each frame from viewport size and sim range.
var shaft_x := 512.0
var shaft_top_y := 0.0
var shaft_bottom_y := 0.0
var ppu := 40.0  # pixels per sim unit


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

	# Dynamic PPU: fit the full stop range into the available vertical space.
	var viewport_size := get_viewport_rect().size
	var available_height: float = viewport_size.y - 2.0 * SHAFT_MARGIN_V
	var sim_range: float = max_pos - min_pos
	if sim_range > 0.0:
		ppu = available_height / sim_range
	else:
		ppu = 40.0

	# Center the shaft in the drawable area (viewport minus HUD panel).
	var drawable_width: float = viewport_size.x - HUD_PANEL_WIDTH
	shaft_x = HUD_PANEL_WIDTH + drawable_width / 2.0

	shaft_bottom_y = viewport_size.y - SHAFT_MARGIN_V
	shaft_top_y = shaft_bottom_y - sim_range * ppu

	# Draw shaft background.
	var shaft_height: float = sim_range * ppu
	draw_rect(
		Rect2(shaft_x - SHAFT_WIDTH / 2, shaft_top_y, SHAFT_WIDTH, shaft_height),
		COLOR_SHAFT
	)

	# Draw stops.
	for s in stops:
		var pos_y := _sim_to_screen_y(s.get("position", 0.0), min_pos)
		# Horizontal line.
		draw_line(
			Vector2(shaft_x - SHAFT_WIDTH / 2 - 10, pos_y),
			Vector2(shaft_x + SHAFT_WIDTH / 2 + 10, pos_y),
			COLOR_STOP, 2.0
		)
		# Stop name label.
		var stop_name: String = s.get("name", "")
		var waiting: int = s.get("waiting", 0)
		var label := "%s (%d)" % [stop_name, waiting]
		draw_string(
			ThemeDB.fallback_font,
			Vector2(shaft_x + SHAFT_WIDTH / 2 + 15, pos_y + 4),
			label, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color.WHITE
		)

	# Build lookup: elevator entity_id -> screen Y position.
	var elev_count := sim.elevator_count()
	var elev_screen_y: Dictionary = {}
	for i in range(elev_count):
		var e: Dictionary = sim.get_elevator(i)
		var eid: int = e.get("entity_id", 0)
		var pos_y := _sim_to_screen_y(e.get("position", 0.0), min_pos)
		elev_screen_y[eid] = pos_y
		# Draw car.
		draw_rect(
			Rect2(shaft_x - CAR_WIDTH / 2, pos_y - CAR_HEIGHT / 2, CAR_WIDTH, CAR_HEIGHT),
			COLOR_CAR
		)
		# Occupancy label inside car.
		var occ: int = e.get("occupancy", 0)
		if occ > 0:
			draw_string(
				ThemeDB.fallback_font,
				Vector2(shaft_x - 8, pos_y + 4),
				str(occ), HORIZONTAL_ALIGNMENT_CENTER, -1, 12, Color.WHITE
			)

	# Draw riders — all phases.
	var rider_count := sim.rider_count()
	var stop_waiting_offset: Dictionary = {}  # stop entity_id -> int
	var elev_riding_offset: Dictionary = {}   # elevator entity_id -> int
	for i in range(rider_count):
		var r: Dictionary = sim.get_rider(i)
		var phase: int = r.get("phase", -1)
		var stop_eid: int = r.get("current_stop", 0)
		var elev_eid: int = r.get("elevator_entity", 0)

		if phase == 0:  # Waiting — positioned at stop, offset left
			if stop_eid == 0:
				continue
			var stop_y := _stop_screen_y(stops, stop_eid, min_pos)
			if stop_y < 0.0:
				continue
			var local_i: int = stop_waiting_offset.get(stop_eid, 0)
			stop_waiting_offset[stop_eid] = local_i + 1
			var row := local_i / 5
			var col := local_i % 5
			var rx := shaft_x - SHAFT_WIDTH / 2 - 20 - col * (RIDER_SIZE + 2)
			var ry := stop_y - RIDER_SIZE / 2 - row * (RIDER_SIZE + 2)
			draw_rect(Rect2(rx - RIDER_SIZE / 2, ry, RIDER_SIZE, RIDER_SIZE), COLOR_WAITING)

		elif phase == 1:  # Boarding — partially toward car
			if elev_eid == 0:
				continue
			var car_y: float = elev_screen_y.get(elev_eid, -1.0)
			if car_y < 0.0:
				continue
			# Position at the left edge of the car, offset outward.
			var local_i: int = elev_riding_offset.get(elev_eid, 0)
			elev_riding_offset[elev_eid] = local_i + 1
			var rx := shaft_x - CAR_WIDTH / 2 - 6 - local_i * (RIDER_SIZE + 2)
			var ry := car_y - RIDER_SIZE / 2
			draw_rect(Rect2(rx - RIDER_SIZE / 2, ry, RIDER_SIZE, RIDER_SIZE), COLOR_BOARDING)

		elif phase == 2:  # Riding — inside the car
			if elev_eid == 0:
				continue
			var car_y: float = elev_screen_y.get(elev_eid, -1.0)
			if car_y < 0.0:
				continue
			var local_i: int = elev_riding_offset.get(elev_eid, 0)
			elev_riding_offset[elev_eid] = local_i + 1
			var row := local_i / 4
			var col := local_i % 4
			var rx := shaft_x - CAR_WIDTH / 2 + 6 + col * (RIDER_SIZE + 2)
			var ry := car_y - CAR_HEIGHT / 2 + 4 + row * (RIDER_SIZE + 2)
			draw_rect(Rect2(rx, ry, RIDER_SIZE, RIDER_SIZE), COLOR_RIDING)

		elif phase == 3:  # Exiting — partially away from car
			if elev_eid == 0:
				continue
			var car_y: float = elev_screen_y.get(elev_eid, -1.0)
			if car_y < 0.0:
				continue
			var local_i: int = elev_riding_offset.get(elev_eid, 0)
			elev_riding_offset[elev_eid] = local_i + 1
			var rx := shaft_x + CAR_WIDTH / 2 + 6 + local_i * (RIDER_SIZE + 2)
			var ry := car_y - RIDER_SIZE / 2
			draw_rect(Rect2(rx - RIDER_SIZE / 2, ry, RIDER_SIZE, RIDER_SIZE), COLOR_EXITING)


func _sim_to_screen_y(sim_pos: float, min_pos: float) -> float:
	return shaft_bottom_y - (sim_pos - min_pos) * ppu


## Look up the screen Y for a stop by its entity_id. Returns -1.0 if not found.
func _stop_screen_y(stops: Array[Dictionary], stop_eid: int, min_pos: float) -> float:
	for s in stops:
		if s.get("entity_id", 0) == stop_eid:
			return _sim_to_screen_y(s.get("position", 0.0), min_pos)
	return -1.0


func _get_sim() -> ElevatorSim:
	var parent := get_parent()
	if parent == null:
		return null
	for child in parent.get_children():
		if child is ElevatorSim:
			return child
	return null
