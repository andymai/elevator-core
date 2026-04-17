extends Label
## Updates the HUD stats label every frame.
## Display order: tick/speed, per-elevator details, rider counts, averages.


func _process(_delta: float) -> void:
	var sim: ElevatorSim = _get_sim()
	if sim == null:
		text = "No simulation"
		return

	var tick := sim.current_tick()
	var speed := sim.speed_multiplier
	var speed_label := "PAUSED" if speed == 0 else "%dx" % speed

	# ── Tick and speed ──
	var lines := "Tick: %d  Speed: %s\n" % [tick, speed_label]
	lines += "---\n"

	# ── Per-elevator info ──
	var elev_count := sim.elevator_count()
	var stop_count := sim.stop_count()
	var total_on_board := 0

	for i in range(elev_count):
		var e: Dictionary = sim.get_elevator(i)
		var phase: String = e.get("phase", "?")
		var pos: float = e.get("position", 0.0)
		var vel: float = e.get("velocity", 0.0)
		var occ: int = e.get("occupancy", 0)
		var cap_kg: float = e.get("capacity_kg", 0.0)
		var load_kg: float = e.get("current_load_kg", 0.0)
		var going_up: bool = e.get("going_up", false)
		var going_down: bool = e.get("going_down", false)

		total_on_board += occ

		var load_pct := 0.0
		if cap_kg > 0:
			load_pct = (load_kg / cap_kg) * 100.0

		# Direction indicators.
		var dir_str := ""
		if going_up:
			dir_str += "↑"
		if going_down:
			dir_str += "↓"
		if dir_str.is_empty():
			dir_str = "-"

		lines += "Car %d: %s %s  pos=%.1f  vel=%.2f\n" % [i, phase, dir_str, pos, vel]
		lines += "  Load: %.0f/%.0f kg (%.0f%%)  Riders: %d\n" % [load_kg, cap_kg, load_pct, occ]

		# ETA to each stop.
		var eta_parts: PackedStringArray = []
		for s_i in range(stop_count):
			var eta_sec: float = sim.eta_to_stop(i, s_i)
			if eta_sec >= 0.0:
				var s: Dictionary = sim.get_stop(s_i)
				var stop_name: String = s.get("name", "S%d" % s_i)
				eta_parts.append("%s:%.0fs" % [stop_name, eta_sec])
		if not eta_parts.is_empty():
			lines += "  ETA: %s\n" % ", ".join(eta_parts)

	lines += "---\n"

	# ── Rider counts ──
	var metrics: Dictionary = sim.get_metrics()
	var spawned: int = metrics.get("total_spawned", 0)
	var delivered: int = metrics.get("total_delivered", 0)
	var abandoned: int = metrics.get("total_abandoned", 0)

	var total_waiting := 0
	for i in range(stop_count):
		var s: Dictionary = sim.get_stop(i)
		total_waiting += s.get("waiting", 0) as int

	lines += "On board: %d  Waiting: %d\n" % [total_on_board, total_waiting]
	lines += "Delivered: %d  Abandoned: %d\n" % [delivered, abandoned]
	lines += "Spawned: %d\n" % spawned

	# ── Average wait/ride times ──
	var avg_wait: float = metrics.get("avg_wait_seconds", 0.0)
	var avg_ride: float = metrics.get("avg_ride_seconds", 0.0)
	lines += "Avg wait: %.1fs  Avg ride: %.1fs\n" % [avg_wait, avg_ride]

	text = lines


func _get_sim() -> ElevatorSim:
	# Walk up to Main and find the ElevatorSim child.
	var main := get_tree().current_scene
	if main == null:
		return null
	for child in main.get_children():
		if child is ElevatorSim:
			return child
	return null
