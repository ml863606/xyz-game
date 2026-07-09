extends Node2D

const PlayerScript := preload("res://scripts/player.gd")
const MovingPlatformScript := preload("res://scripts/moving_platform.gd")
const WobblePlatformScript := preload("res://scripts/rotating_platform.gd")

const TEX_PLATFORM_NORMAL := preload("res://assets/sprites/platform_normal.svg")
const TEX_PLATFORM_CHECKPOINT := preload("res://assets/sprites/platform_checkpoint.svg")
const TEX_PLATFORM_DANGER := preload("res://assets/sprites/platform_danger.svg")
const TEX_PLATFORM_BOUNCE := preload("res://assets/sprites/platform_bounce.svg")
const TEX_PLATFORM_MOVING := preload("res://assets/sprites/platform_moving.svg")
const TEX_PLATFORM_FINISH := preload("res://assets/sprites/platform_finish.svg")
const TEX_TOWER_BACK := preload("res://assets/sprites/tower_backdrop.svg")
const TEX_FLAG := preload("res://assets/sprites/finish_flag.svg")

const STYLE_HUD_PANEL := preload("res://assets/ui/styles/hud_panel.tres")
const STYLE_STAT_CARD := preload("res://assets/ui/styles/stat_card.tres")
const STYLE_CONTROL_PILL := preload("res://assets/ui/styles/control_pill.tres")
const STYLE_CENTER_PANEL := preload("res://assets/ui/styles/center_panel.tres")
const STYLE_PROGRESS_TRACK := preload("res://assets/ui/styles/progress_track.tres")
const STYLE_PROGRESS_FILL := preload("res://assets/ui/styles/progress_fill.tres")
const ICON_FLOOR := preload("res://assets/ui/icons/floor.svg")
const ICON_CHECKPOINT := preload("res://assets/ui/icons/checkpoint.svg")
const ICON_RESPAWN := preload("res://assets/ui/icons/respawn.svg")
const ICON_KEYS := preload("res://assets/ui/icons/keys.svg")

const FLOOR_COUNT := 100
const START_POS := Vector2(0.0, -72.0)
const FLOOR_GAP := 116.0
const WORLD_WIDTH := 920.0
const FALL_DISTANCE := 430.0

var player: JumpPlayer
var camera: Camera2D
var rng := RandomNumberGenerator.new()
var platforms: Array[Dictionary] = []
var bounce_pads: Array[StaticBody2D] = []
var highest_floor := 1
var checkpoint_floor := 1
var respawn_count := 0
var finished := false

var floor_label: Label
var checkpoint_label: Label
var respawn_label: Label
var progress_label: Label
var progress_fill: Control
var center_label: Label
var center_panel: PanelContainer

func _ready() -> void:
	rng.seed = 20260706
	_ensure_input_actions()
	_create_background()
	_create_course()
	_create_player()
	_create_camera()
	_create_ui()
	_update_ui()
	_flash_center("Jump 100 Floors\nA/D + Space", 1.4)

func _physics_process(_delta: float) -> void:
	if player.global_position.y > _fall_limit_y():
		_respawn_player()
		return
	_update_progress()
	_check_bounce_pads()
	_update_ui()

func _ensure_input_actions() -> void:
	_add_key_action("move_left", [KEY_A, KEY_LEFT])
	_add_key_action("move_right", [KEY_D, KEY_RIGHT])
	_add_key_action("jump", [KEY_SPACE, KEY_W, KEY_UP])

func _add_key_action(action_name: StringName, keys: Array[int]) -> void:
	if not InputMap.has_action(action_name):
		InputMap.add_action(action_name)
	for keycode in keys:
		var exists := false
		for event in InputMap.action_get_events(action_name):
			if event is InputEventKey and event.physical_keycode == keycode:
				exists = true
				break
		if not exists:
			var event := InputEventKey.new()
			event.physical_keycode = keycode
			InputMap.action_add_event(action_name, event)

func _create_background() -> void:
	for i in range(7):
		var back := Sprite2D.new()
		back.texture = TEX_TOWER_BACK
		back.position = Vector2(0.0, 120.0 - i * 880.0)
		back.z_index = -20
		back.scale = Vector2(1.22, 1.22)
		add_child(back)

func _create_course() -> void:
	var x := 0.0
	var previous_width := 360.0
	for floor_number in range(1, FLOOR_COUNT + 1):
		var kind := _platform_kind(floor_number)
		var y := -float(floor_number - 1) * FLOOR_GAP
		var width := _platform_width(kind, floor_number)
		if floor_number == 1:
			x = 0.0
			width = 360.0
		else:
			x = _next_platform_x(x, previous_width, width, floor_number)
		var node := _create_platform(Vector2(x, y), width, floor_number, kind)
		previous_width = width
		if floor_number % 10 == 0:
			_create_world_label("%dF CHECKPOINT" % floor_number, Vector2(x, y - 52.0), Color(0.75, 1.0, 0.82), 22)
		elif floor_number in [25, 50, 75]:
			_create_world_label("%dF" % floor_number, Vector2(x, y - 48.0), Color(1.0, 0.92, 0.42), 21)
		if floor_number == FLOOR_COUNT:
			_create_finish_flag(node.position + Vector2(0.0, -78.0))

func _next_platform_x(previous_x: float, previous_width: float, current_width: float, floor_number: int) -> float:
	var difficulty := float(floor_number) / float(FLOOR_COUNT)
	var direction := 1.0 if floor_number % 2 == 0 else -1.0
	if floor_number % 6 == 0:
		direction *= -1.0
	var edge_gap := lerpf(-22.0, 92.0, difficulty) + rng.randf_range(-24.0, 30.0)
	if floor_number < 12:
		edge_gap = clamp(edge_gap, -28.0, 38.0)
	else:
		edge_gap = clamp(edge_gap, -12.0, 118.0)
	var center_delta := previous_width * 0.5 + current_width * 0.5 + edge_gap
	var limit := minf(WORLD_WIDTH * 0.46, 250.0 + floor_number * 2.4)
	var candidate := previous_x + direction * center_delta
	if candidate > limit or candidate < -limit:
		candidate = previous_x - direction * center_delta
	return clamp(candidate, -limit, limit)

func _platform_kind(floor_number: int) -> String:
	if floor_number == FLOOR_COUNT:
		return "finish"
	if floor_number % 10 == 0:
		return "checkpoint"
	if floor_number % 17 == 0:
		return "bounce"
	if floor_number >= 18 and floor_number % 13 == 0:
		return "moving"
	if floor_number >= 24 and floor_number % 11 == 0:
		return "wobble"
	if floor_number >= 34 and floor_number % 7 == 0:
		return "narrow"
	if floor_number >= 52 and floor_number % 5 == 0:
		return "small"
	return "normal"

func _platform_width(kind: String, floor_number: int) -> float:
	if floor_number == 1:
		return 360.0
	var difficulty := float(floor_number) / float(FLOOR_COUNT)
	var wave := (sin(float(floor_number) * 1.73) + 1.0) * 0.5
	match kind:
		"checkpoint":
			return 285.0 + wave * 70.0
		"finish":
			return 360.0
		"moving":
			return 150.0 + wave * 70.0
		"wobble":
			return 126.0 + wave * 78.0
		"narrow":
			return maxf(78.0, 138.0 - floor_number * 0.45 + wave * 22.0)
		"small":
			return 82.0 + wave * 42.0
		"bounce":
			return 118.0 + wave * 52.0
		_:
			var base := lerpf(286.0, 142.0, difficulty)
			return clamp(base + (wave - 0.5) * 88.0, 118.0, 318.0)

func _create_platform(pos: Vector2, width: float, floor_number: int, kind: String) -> StaticBody2D:
	var body := StaticBody2D.new()
	body.name = "%03d_%s" % [floor_number, kind]
	body.position = pos
	if kind == "moving":
		body.set_script(MovingPlatformScript)
		body.set("axis", Vector2.RIGHT)
		body.set("amplitude", 75.0 + floor_number * 1.2)
		body.set("speed", 0.65 + floor_number * 0.006)
	elif kind == "wobble":
		body.set_script(WobblePlatformScript)
		body.set("wobble_speed", 1.1 + floor_number * 0.006)
		body.set("wobble_angle", 0.08)
	add_child(body)

	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = Vector2(width, 24.0)
	collision.shape = shape
	body.add_child(collision)

	var sprite := Sprite2D.new()
	sprite.texture = _texture_for(kind)
	sprite.scale = Vector2(width / 256.0, 1.0)
	sprite.z_index = 2
	body.add_child(sprite)

	platforms.append({"floor": floor_number, "kind": kind, "node": body, "width": width})
	if kind == "bounce":
		bounce_pads.append(body)
	return body

func _texture_for(kind: String) -> Texture2D:
	match kind:
		"checkpoint":
			return TEX_PLATFORM_CHECKPOINT
		"moving":
			return TEX_PLATFORM_MOVING
		"wobble", "narrow", "small":
			return TEX_PLATFORM_DANGER
		"bounce":
			return TEX_PLATFORM_BOUNCE
		"finish":
			return TEX_PLATFORM_FINISH
		_:
			return TEX_PLATFORM_NORMAL

func _create_player() -> void:
	player = PlayerScript.new()
	player.name = "Player"
	add_child(player)
	player.set_spawn(START_POS, 1)
	player.global_position = START_POS
	player.died.connect(_respawn_player)

func _create_camera() -> void:
	camera = Camera2D.new()
	camera.name = "Camera2D"
	camera.enabled = true
	camera.position_smoothing_enabled = true
	camera.position_smoothing_speed = 8.0
	camera.limit_left = -720
	camera.limit_right = 720
	camera.limit_top = -FLOOR_COUNT * FLOOR_GAP - 260
	camera.limit_bottom = 360
	camera.zoom = Vector2(0.82, 0.82)
	player.add_child(camera)

func _create_finish_flag(pos: Vector2) -> void:
	var flag := Sprite2D.new()
	flag.texture = TEX_FLAG
	flag.position = pos
	flag.z_index = 4
	add_child(flag)
	_create_world_label("100F CLEAR", pos + Vector2(0.0, -68.0), Color(0.98, 0.86, 1.0), 26)

func _create_world_label(text: String, pos: Vector2, color: Color, font_size: int) -> void:
	var label := Label.new()
	label.text = text
	label.position = pos - Vector2(130.0, 18.0)
	label.custom_minimum_size = Vector2(260.0, 40.0)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", font_size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_outline_color", Color(0.02, 0.02, 0.03))
	label.add_theme_constant_override("outline_size", 5)
	label.z_index = 8
	add_child(label)

func _update_progress() -> void:
	var new_highest := highest_floor
	for info in platforms:
		var node: StaticBody2D = info.node
		var width: float = info.width
		var floor_number: int = info.floor
		var diff := player.global_position - node.global_position
		if abs(diff.x) <= width * 0.58 and diff.y > -70.0 and diff.y < 18.0:
			if floor_number > new_highest:
				new_highest = floor_number
			if floor_number % 10 == 0 and floor_number > checkpoint_floor:
				checkpoint_floor = floor_number
				player.set_spawn(node.global_position + Vector2(0.0, -70.0), checkpoint_floor)
				_flash_center("Checkpoint %dF" % checkpoint_floor)
			if floor_number == FLOOR_COUNT and not finished:
				finished = true
				_flash_center("100F Clear\nRespawns: %d" % respawn_count, 999.0)
	if new_highest > highest_floor:
		highest_floor = new_highest

func _check_bounce_pads() -> void:
	for pad in bounce_pads:
		var diff := player.global_position - pad.global_position
		if abs(diff.x) < 90.0 and diff.y > -64.0 and diff.y < 12.0 and player.is_on_floor():
			player.bounce(850.0)

func _fall_limit_y() -> float:
	return player.spawn_position.y + FALL_DISTANCE

func _respawn_player() -> void:
	if finished:
		return
	respawn_count += 1
	player.respawn()
	_flash_center("Respawn - %dF checkpoint" % checkpoint_floor)

func _create_ui() -> void:
	var layer := CanvasLayer.new()
	layer.name = "HUD"
	add_child(layer)

	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(root)

	var hud_panel := PanelContainer.new()
	hud_panel.position = Vector2(22, 18)
	hud_panel.custom_minimum_size = Vector2(384, 174)
	hud_panel.add_theme_stylebox_override("panel", STYLE_HUD_PANEL)
	root.add_child(hud_panel)

	var hud_margin := MarginContainer.new()
	hud_margin.add_theme_constant_override("margin_left", 14)
	hud_margin.add_theme_constant_override("margin_right", 14)
	hud_margin.add_theme_constant_override("margin_top", 12)
	hud_margin.add_theme_constant_override("margin_bottom", 12)
	hud_panel.add_child(hud_margin)

	var hud_box := VBoxContainer.new()
	hud_box.add_theme_constant_override("separation", 9)
	hud_margin.add_child(hud_box)

	var title_row := HBoxContainer.new()
	title_row.add_theme_constant_override("separation", 8)
	hud_box.add_child(title_row)
	var title := _make_label("JUMP 100", 21, Color(1.0, 0.96, 0.82))
	title.add_theme_color_override("font_outline_color", Color(0.05, 0.06, 0.08, 0.95))
	title.add_theme_constant_override("outline_size", 4)
	title_row.add_child(title)
	var subtitle := _make_label("2D tower jump", 13, Color(0.67, 0.82, 0.93))
	subtitle.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
	title_row.add_child(subtitle)

	var card_row := HBoxContainer.new()
	card_row.add_theme_constant_override("separation", 8)
	hud_box.add_child(card_row)
	floor_label = _make_stat_card(card_row, ICON_FLOOR, "Floor")
	checkpoint_label = _make_stat_card(card_row, ICON_CHECKPOINT, "Checkpoint")
	respawn_label = _make_stat_card(card_row, ICON_RESPAWN, "Respawns")

	var progress_box := VBoxContainer.new()
	progress_box.add_theme_constant_override("separation", 4)
	hud_box.add_child(progress_box)
	progress_label = _make_label("Tower progress", 12, Color(0.78, 0.88, 0.94))
	progress_box.add_child(progress_label)
	var progress_track := PanelContainer.new()
	progress_track.custom_minimum_size = Vector2(0, 14)
	progress_track.add_theme_stylebox_override("panel", STYLE_PROGRESS_TRACK)
	progress_box.add_child(progress_track)
	progress_fill = PanelContainer.new()
	progress_fill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	progress_fill.custom_minimum_size = Vector2(0, 14)
	progress_fill.add_theme_stylebox_override("panel", STYLE_PROGRESS_FILL)
	progress_track.add_child(progress_fill)

	_create_control_bar(root)
	_create_center_message(root)

func _make_label(text: String, size: int, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", size)
	label.add_theme_color_override("font_color", color)
	label.add_theme_color_override("font_shadow_color", Color(0.02, 0.02, 0.03, 0.9))
	label.add_theme_constant_override("shadow_offset_x", 2)
	label.add_theme_constant_override("shadow_offset_y", 2)
	return label

func _make_stat_card(parent: Control, icon: Texture2D, caption: String) -> Label:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(112, 58)
	card.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	card.add_theme_stylebox_override("panel", STYLE_STAT_CARD)
	parent.add_child(card)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 9)
	margin.add_theme_constant_override("margin_right", 8)
	margin.add_theme_constant_override("margin_top", 7)
	margin.add_theme_constant_override("margin_bottom", 7)
	card.add_child(margin)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 7)
	margin.add_child(row)

	var icon_rect := TextureRect.new()
	icon_rect.texture = icon
	icon_rect.custom_minimum_size = Vector2(26, 26)
	icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(icon_rect)

	var text_box := VBoxContainer.new()
	text_box.add_theme_constant_override("separation", 0)
	row.add_child(text_box)
	var caption_label := _make_label(caption, 10, Color(0.57, 0.72, 0.82))
	text_box.add_child(caption_label)
	var value_label := _make_label("--", 22, Color(1.0, 0.97, 0.86))
	value_label.add_theme_color_override("font_outline_color", Color(0.04, 0.05, 0.07, 0.95))
	value_label.add_theme_constant_override("outline_size", 3)
	text_box.add_child(value_label)
	return value_label

func _create_control_bar(root: Control) -> void:
	var pill := PanelContainer.new()
	pill.custom_minimum_size = Vector2(500, 46)
	pill.add_theme_stylebox_override("panel", STYLE_CONTROL_PILL)
	pill.anchor_left = 0.5
	pill.anchor_right = 0.5
	pill.anchor_top = 1.0
	pill.anchor_bottom = 1.0
	pill.offset_left = -250
	pill.offset_right = 250
	pill.offset_top = -66
	pill.offset_bottom = -20
	root.add_child(pill)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 14)
	margin.add_theme_constant_override("margin_right", 14)
	margin.add_theme_constant_override("margin_top", 8)
	margin.add_theme_constant_override("margin_bottom", 8)
	pill.add_child(margin)

	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10)
	margin.add_child(row)

	var icon_rect := TextureRect.new()
	icon_rect.texture = ICON_KEYS
	icon_rect.custom_minimum_size = Vector2(28, 28)
	icon_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	row.add_child(icon_rect)

	var label := _make_label("A/D move   SPACE jump   W/UP also jump", 16, Color(0.95, 0.98, 1.0))
	row.add_child(label)

func _create_center_message(root: Control) -> void:
	center_panel = PanelContainer.new()
	center_panel.custom_minimum_size = Vector2(430, 104)
	center_panel.add_theme_stylebox_override("panel", STYLE_CENTER_PANEL)
	center_panel.anchor_left = 0.5
	center_panel.anchor_right = 0.5
	center_panel.anchor_top = 0.5
	center_panel.anchor_bottom = 0.5
	center_panel.offset_left = -215
	center_panel.offset_right = 215
	center_panel.offset_top = -74
	center_panel.offset_bottom = 30
	center_panel.visible = false
	root.add_child(center_panel)

	var margin := MarginContainer.new()
	margin.add_theme_constant_override("margin_left", 18)
	margin.add_theme_constant_override("margin_right", 18)
	margin.add_theme_constant_override("margin_top", 14)
	margin.add_theme_constant_override("margin_bottom", 14)
	center_panel.add_child(margin)

	center_label = _make_label("", 34, Color(1.0, 0.92, 0.42))
	center_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	center_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	center_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	margin.add_child(center_label)

func _flash_center(text: String, duration := 1.35) -> void:
	center_label.text = text
	center_panel.visible = true
	if duration < 900.0:
		var timer := get_tree().create_timer(duration)
		timer.timeout.connect(func() -> void:
			if center_label.text == text:
				center_panel.visible = false
		)

func _update_ui() -> void:
	floor_label.text = "%03d" % highest_floor
	checkpoint_label.text = "%03dF" % checkpoint_floor
	respawn_label.text = "%02d" % respawn_count
	progress_label.text = "Tower progress  %d%%" % roundi(float(highest_floor) / float(FLOOR_COUNT) * 100.0)
	var fill_width: float = 352.0 * clamp(float(highest_floor) / float(FLOOR_COUNT), 0.0, 1.0)
	progress_fill.custom_minimum_size = Vector2(fill_width, 14)
	progress_fill.size = Vector2(fill_width, 14)
