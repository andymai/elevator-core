extends Label
## Updates the HUD stats label every frame.

func _process(_delta: float) -> void:
	var sim: ElevatorSim = _get_sim()
	if sim == null:
		text = "No simulation"
		return

	var tick := sim.current_tick()
	var speed := sim.speed_multiplier

	var speed_label := "PAUSED" if speed == 0 else "%dx" % speed

	# Elevator info.
	var elev_lines := ""
	var elev_count := sim.elevator_count()
	for i in range(elev_count):
		var e: Dictionary = sim.get_elevator(i)
		var phase: String = e.get("phase", "?")
		var pos: float = e.get("position", 0.0)
		var vel: float = e.get("velocity", 0.0)
		var occ: int = e.get("occupancy", 0)
		var cap: float = e.get("capacity_kg", 0.0)
		var load_kg: float = e.get("current_load_kg", 0.0)
		var load_pct := 0.0
		if cap > 0:
			load_pct = (load_kg / cap) * 100.0
		elev_lines += "Car %d: %s  pos=%.1f  vel=%.2f\n" % [i, phase, pos, vel]
		elev_lines += "  Load: %.0f/%.0f kg (%.0f%%)  Riders: %d\n" % [load_kg, cap, load_pct, occ]

	# Rider counts.
	var metrics: Dictionary = sim.get_metrics()
	var spawned: int = metrics.get("total_spawned", 0)
	var delivered: int = metrics.get("total_delivered", 0)
	var abandoned: int = metrics.get("total_abandoned", 0)
	var avg_wait: float = metrics.get("avg_wait_seconds", 0.0)
	var avg_ride: float = metrics.get("avg_ride_seconds", 0.0)

	# Count waiting riders across stops.
	var total_waiting := 0
	for i in range(sim.stop_count()):
		var s: Dictionary = sim.get_stop(i)
		total_waiting += s.get("waiting", 0) as int

	text = "Tick: %d  Speed: %s\n" % [tick, speed_label]
	text += "---\n"
	text += elev_lines
	text += "---\n"
	text += "Waiting: %d  On board: %d\n" % [total_waiting, _count_riding(sim)]
	text += "Delivered: %d  Abandoned: %d\n" % [delivered, abandoned]
	text += "Spawned: %d\n" % spawned
	text += "Avg wait: %.1fs  Avg ride: %.1fs\n" % [avg_wait, avg_ride]

func _count_riding(sim: ElevatorSim) -> int:
	var count := 0
	for i in range(sim.elevator_count()):
		var e: Dictionary = sim.get_elevator(i)
		count += e.get("occupancy", 0) as int
	return count

func _get_sim() -> ElevatorSim:
	# Walk up to Main and find the ElevatorSim child.
	var main := get_tree().current_scene
	if main == null:
		return null
	for child in main.get_children():
		if child is ElevatorSim:
			return child
	return null
