extends Node2D
## Root script. Creates the ElevatorSim node and wires up controls.

var sim: ElevatorSim

func _ready() -> void:
	# Create the simulation node programmatically.
	sim = ElevatorSim.new()
	# Resolve config path relative to the project root.
	var project_dir := ProjectSettings.globalize_path("res://")
	# Walk up to the repo root (examples/godot-demo/ -> repo root).
	var repo_root := project_dir.get_base_dir().get_base_dir()
	sim.config_path = repo_root.path_join("assets/config/default.ron")
	sim.speed_multiplier = 1
	sim.auto_spawn = true
	add_child(sim)

	# Wire up button signals.
	var pause_btn: Button = $HUD/Panel/VBox/Controls/PauseBtn
	var speed1_btn: Button = $HUD/Panel/VBox/Controls/Speed1
	var speed2_btn: Button = $HUD/Panel/VBox/Controls/Speed2
	var speed10_btn: Button = $HUD/Panel/VBox/Controls/Speed10
	var spawn_btn: Button = $HUD/Panel/VBox/Controls/SpawnBtn

	pause_btn.pressed.connect(_on_pause)
	speed1_btn.pressed.connect(_on_speed_1)
	speed2_btn.pressed.connect(_on_speed_2)
	speed10_btn.pressed.connect(_on_speed_10)
	spawn_btn.pressed.connect(_on_spawn)

func _unhandled_key_input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed:
		match event.keycode:
			KEY_SPACE:
				_on_pause()
			KEY_1:
				_on_speed_1()
			KEY_2:
				_on_speed_2()
			KEY_3:
				_on_speed_10()

func _on_pause() -> void:
	if sim.speed_multiplier == 0:
		sim.speed_multiplier = 1
	else:
		sim.speed_multiplier = 0

func _on_speed_1() -> void:
	sim.speed_multiplier = 1

func _on_speed_2() -> void:
	sim.speed_multiplier = 2

func _on_speed_10() -> void:
	sim.speed_multiplier = 10

func _on_spawn() -> void:
	var stop_count := sim.stop_count()
	if stop_count < 2:
		return
	var origin := randi_range(0, stop_count - 1)
	var dest := randi_range(0, stop_count - 2)
	if dest >= origin:
		dest += 1
	sim.spawn_rider(origin, dest, randf_range(50.0, 100.0))
