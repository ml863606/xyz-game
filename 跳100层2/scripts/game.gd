class_name Jump100Game
extends Node2D

signal game_started
signal game_ended(won: bool)
signal score_changed(score: int)

const WORLD_WIDTH := 900.0
const VIEW_HEIGHT := 1280.0
const START_Y := 1120.0
const FLOOR_GAP := 128.0
const FLOOR_COUNT := 100

var rng := RandomNumberGenerator.new()
var world: Node2D
var player: PlayerJumper
var camera: Camera2D
var ui_layer: CanvasLayer
var floor_label: Label
var score_label: Label
var status_label: Label
var hint_label: Label
var progress_bar: ProgressBar

var score: int = 0:
	set(value):
		score = value
		score_changed.emit(score)

var reached_floor: int = 0
var elapsed: float = 0.0
var game_over: bool = false

func _ready() -> void:
	rng.randomize()
	_ensure_input_actions()
	_build_scene_shell()
	_restart_game()

func _process(delta: float) -> void:
	if game_over or player == null:
		return

	elapsed += delta
	var target_y := minf(camera.position.y, player.global_position.y - 180.0)
	camera.position = camera.position.lerp(Vector2(WORLD_WIDTH * 0.5, target_y), 0.08)

	if player.global_position.y > camera.position.y + VIEW_HEIGHT * 0.58:
		_end_game(false)

	_update_ui()

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("restart"):
		_restart_game()

func _build_scene_shell() -> void:
	world = Node2D.new()
	world.name = "World"
	add_child(world)

	camera = Camera2D.new()
	camera.name = "Camera2D"
	camera.enabled = true
	camera.position = Vector2(WORLD_WIDTH * 0.5, VIEW_HEIGHT * 0.5)
	add_child(camera)

	ui_layer = CanvasLayer.new()
	ui_layer.name = "HUD"
	add_child(ui_layer)
	_create_hud()

func _restart_game() -> void:
	for child in world.get_children():
		child.free()

	score = 0
	reached_floor = 0
	elapsed = 0.0
	game_over = false
	camera.position = Vector2(WORLD_WIDTH * 0.5, VIEW_HEIGHT * 0.5)

	var background := BackgroundPainter.new()
	background.width = WORLD_WIDTH
	background.height = FLOOR_GAP * float(FLOOR_COUNT + 12)
	background.start_y = START_Y
	background.floor_gap = FLOOR_GAP
	background.floor_count = FLOOR_COUNT
	world.add_child(background)

	_generate_tower()
	_spawn_player()
	_update_ui()
	game_started.emit()

func _generate_tower() -> void:
	for i in range(FLOOR_COUNT + 1):
		var y := START_Y - float(i) * FLOOR_GAP
		var platform := JumpPlatform.new()
		var width := _platform_width(i)
		var x := WORLD_WIDTH * 0.5
		if i > 0:
			x = rng.randf_range(110.0 + width * 0.35, WORLD_WIDTH - 110.0 - width * 0.35)

		var is_checkpoint := i % 10 == 0
		var is_moving := i > 7 and i % 6 == 0
		platform.setup(Vector2(x, y), Vector2(width, 22.0), i, is_moving, is_checkpoint)
		world.add_child(platform)

		if i > 0 and i < FLOOR_COUNT:
			if i % 3 == 1:
				_spawn_pickup(Vector2(x + rng.randf_range(-width * 0.28, width * 0.28), y - 58.0), &"gem", 25)
			if i % 9 == 4:
				_spawn_pickup(Vector2(x + rng.randf_range(-width * 0.25, width * 0.25), y - 34.0), &"spring", 5)
			if i > 12 and i % 8 == 0:
				_spawn_hazard(Vector2(rng.randf_range(170.0, WORLD_WIDTH - 170.0), y - 72.0), 110.0 + float(i % 4) * 18.0)

func _spawn_player() -> void:
	player = PlayerJumper.new()
	player.name = "Player"
	player.world_width = WORLD_WIDTH
	player.start_y = START_Y
	player.floor_gap = FLOOR_GAP
	player.reset_to(Vector2(WORLD_WIDTH * 0.5, START_Y - 62.0))
	player.floor_changed.connect(_on_player_floor_changed)
	player.died.connect(_on_player_died)
	world.add_child(player)

func _spawn_pickup(pos: Vector2, kind: StringName, value: int) -> void:
	var pickup := JumpPickup.new()
	pickup.setup(pos, kind, value)
	pickup.collected.connect(_on_pickup_collected)
	world.add_child(pickup)

func _spawn_hazard(pos: Vector2, span: float) -> void:
	var hazard := JumpHazard.new()
	hazard.setup(pos, span, rng.randf_range(1.1, 2.0))
	world.add_child(hazard)

func _platform_width(floor_number: int) -> float:
	if floor_number == 0:
		return 680.0
	if floor_number == FLOOR_COUNT:
		return 540.0
	var base := 250.0 - float(floor_number) * 0.9
	if floor_number % 10 == 0:
		base += 90.0
	return clampf(base + rng.randf_range(-28.0, 32.0), 120.0, 340.0)

func _on_player_floor_changed(floor_number: int) -> void:
	reached_floor = max(reached_floor, floor_number)
	score += 100 + floor_number * 3
	if reached_floor >= FLOOR_COUNT:
		_end_game(true)

func _on_pickup_collected(kind: StringName, value: int) -> void:
	score += value
	if kind == &"spring":
		status_label.text = "弹簧加速"

func _on_player_died() -> void:
	_end_game(false)

func _end_game(won: bool) -> void:
	if game_over:
		return
	game_over = true
	if player != null:
		player.frozen = true
	game_ended.emit(won)
	status_label.text = "通关成功" if won else "坠落失败"
	hint_label.text = "按 R 重新开始"

func _update_ui() -> void:
	floor_label.text = "%03dF / 100F" % reached_floor
	score_label.text = "%06d  |  %.1fs" % [score, elapsed]
	progress_bar.value = reached_floor
	if not game_over:
		status_label.text = "SKYLINE CLIMB"
		hint_label.text = "A/D 移动  |  R 重开"

func _create_hud() -> void:
	var bar := Panel.new()
	bar.position = Vector2(18.0, 16.0)
	bar.size = Vector2(WORLD_WIDTH - 36.0, 112.0)
	var bar_style := StyleBoxFlat.new()
	bar_style.bg_color = Color(0.025, 0.035, 0.075, 0.76)
	bar_style.border_color = Color(0.36, 0.86, 1.0, 0.28)
	bar_style.set_border_width_all(1)
	bar_style.set_corner_radius_all(16)
	bar.add_theme_stylebox_override("panel", bar_style)
	ui_layer.add_child(bar)

	var glow := ColorRect.new()
	glow.color = Color(0.24, 0.75, 1.0, 0.08)
	glow.position = Vector2(34.0, 122.0)
	glow.size = Vector2(WORLD_WIDTH - 68.0, 3.0)
	ui_layer.add_child(glow)

	floor_label = _new_label(Vector2(42.0, 28.0), Vector2(250.0, 36.0), 30, Color(1.0, 0.88, 0.38))
	score_label = _new_label(Vector2(42.0, 70.0), Vector2(330.0, 28.0), 20, Color(0.84, 0.95, 1.0))
	status_label = _new_label(Vector2(440.0, 28.0), Vector2(400.0, 30.0), 22, Color.WHITE)
	status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	hint_label = _new_label(Vector2(440.0, 70.0), Vector2(400.0, 28.0), 18, Color(0.63, 0.82, 1.0))
	hint_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT

	progress_bar = ProgressBar.new()
	progress_bar.position = Vector2(44.0, 104.0)
	progress_bar.size = Vector2(WORLD_WIDTH - 88.0, 12.0)
	progress_bar.min_value = 0.0
	progress_bar.max_value = 100.0
	progress_bar.show_percentage = false
	var progress_bg := StyleBoxFlat.new()
	progress_bg.bg_color = Color(0.08, 0.10, 0.16, 0.92)
	progress_bg.set_corner_radius_all(8)
	var progress_fill := StyleBoxFlat.new()
	progress_fill.bg_color = Color(0.30, 0.95, 0.78, 0.96)
	progress_fill.set_corner_radius_all(8)
	progress_bar.add_theme_stylebox_override("background", progress_bg)
	progress_bar.add_theme_stylebox_override("fill", progress_fill)
	ui_layer.add_child(progress_bar)

func _new_label(pos: Vector2, label_size: Vector2, font_size: int, color: Color) -> Label:
	var label := Label.new()
	label.position = pos
	label.size = label_size
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.55))
	label.add_theme_constant_override("shadow_offset_x", 1)
	label.add_theme_constant_override("shadow_offset_y", 2)
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	ui_layer.add_child(label)
	return label

func _ensure_input_actions() -> void:
	var action_specs := {
		"move_left": [KEY_A, KEY_LEFT],
		"move_right": [KEY_D, KEY_RIGHT],
		"restart": [KEY_R, KEY_ENTER]
	}

	for action_name in action_specs.keys():
		if not InputMap.has_action(action_name):
			InputMap.add_action(action_name)
		for keycode in action_specs[action_name]:
			var event := InputEventKey.new()
			event.keycode = keycode
			InputMap.action_add_event(action_name, event)
