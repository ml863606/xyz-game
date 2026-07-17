class_name BoardView
extends Control

signal pet_clicked(pet: String)
signal cell_clicked(cell: Vector2i)

const ASSET_ROOT := "res://assets/svg/"
const PET_ASSETS := {
	"orange": "pet_orange.svg",
	"doubao": "pet_doubao.svg",
	"snow": "pet_snow.svg",
}

var state: GameState
var tile_size: float = 72.0
var board_origin := Vector2.ZERO
var last_pet_pixels: Dictionary = {}


func _ready() -> void:
	clip_contents = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	gui_input.connect(_on_board_input)


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED and is_instance_valid(state):
		refresh()


func set_game_state(value: GameState) -> void:
	state = value
	refresh()


func refresh() -> void:
	if not is_inside_tree() or not is_instance_valid(state) or state.level.is_empty():
		return
	for child: Node in get_children():
		child.queue_free()

	var columns := int(state.level["width"])
	var rows := int(state.level["height"])
	tile_size = floor(min((size.x - 28.0) / columns, (size.y - 28.0) / rows))
	tile_size = clampf(tile_size, 42.0, 86.0)
	var board_size := Vector2(columns * tile_size, rows * tile_size)
	board_origin = (size - board_size) * 0.5

	var frame := Panel.new()
	frame.position = board_origin - Vector2(10, 10)
	frame.size = board_size + Vector2(20, 20)
	frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var frame_style := StyleBoxFlat.new()
	frame_style.bg_color = Color("#27343a")
	frame_style.corner_radius_top_left = 8
	frame_style.corner_radius_top_right = 8
	frame_style.corner_radius_bottom_left = 8
	frame_style.corner_radius_bottom_right = 8
	frame_style.shadow_color = Color(0.04, 0.07, 0.08, 0.24)
	frame_style.shadow_size = 10
	frame.add_theme_stylebox_override("panel", frame_style)
	add_child(frame)

	for y: int in rows:
		for x: int in columns:
			_add_floor(Vector2i(x, y), (x + y) % 2 == 0)

	_place_texture("exit.svg", _vec(state.level["exit"]), 0.82, Color.WHITE, 2)
	for value: Variant in state.level.get("walls", []):
		_place_texture("wall.svg", _vec(value), 0.96, Color.WHITE, 3)
	for value: Variant in state.level.get("fences", []):
		_place_texture("fence.svg", _vec(value), 0.9, Color.WHITE, 4)
	for plate: Dictionary in state.level.get("plates", []):
		var active := state.is_plate_active(plate)
		_place_texture("plate.svg", _vec(plate["pos"]), 0.74, Color("#b8f5cf") if active else Color.WHITE, 2)
	for rune_data: Dictionary in state.level.get("runes", []):
		var active := state.is_bridge_active(str(rune_data["bridge"]))
		_place_texture("rune.svg", _vec(rune_data["pos"]), 0.72, Color.WHITE if active else Color(1, 1, 1, 0.72), 2)
	for bridge: Dictionary in state.level.get("bridges", []):
		var active := state.is_bridge_active(str(bridge["id"]))
		_place_texture("bridge.svg", _vec(bridge["pos"]), 0.92, Color.WHITE if active else Color(0.65, 0.77, 0.8, 0.28), 2)
	for portal: Dictionary in state.level.get("portals", []):
		_place_texture("portal.svg", _vec(portal["pos"]), 0.76, Color.WHITE, 2)
	for arrow: Dictionary in state.level.get("one_way", []):
		var direction := _vec(arrow["dir"])
		var rotation := 0.0
		if direction == Vector2i.DOWN:
			rotation = PI * 0.5
		elif direction == Vector2i.LEFT:
			rotation = PI
		elif direction == Vector2i.UP:
			rotation = -PI * 0.5
		_place_texture("arrow.svg", _vec(arrow["pos"]), 0.72, Color.WHITE, 2, rotation)
	for door: Dictionary in state.level.get("doors", []):
		var is_open := state.is_door_open(str(door["id"]))
		_place_texture("door.svg", _vec(door["pos"]), 0.9, Color(0.65, 0.95, 0.76, 0.28) if is_open else Color.WHITE, 5)
	for key_data: Dictionary in state.level.get("keys", []):
		if str(key_data["door"]) not in state.collected_keys:
			_place_texture("key.svg", _vec(key_data["pos"]), 0.58, Color.WHITE, 5)
	for fish_pos: Vector2i in state.get_uncollected_fish():
		_place_texture("fish.svg", fish_pos, 0.56, Color.WHITE, 5)
	for crate_pos: Vector2i in state.crates:
		_place_texture("crate.svg", crate_pos, 0.82, Color.WHITE, 6)

	var next_pet_pixels: Dictionary = {}
	for pet: String in GameState.PET_ORDER:
		if pet in state.rescued:
			continue
		var cell: Vector2i = state.positions[pet]
		var target_pixel := _cell_pixel(cell)
		next_pet_pixels[pet] = target_pixel
		if pet == state.selected_pet:
			_add_selection_ring(cell)
		var pet_node := _place_texture(PET_ASSETS[pet], cell, 0.9, Color.WHITE, 8)
		pet_node.mouse_filter = Control.MOUSE_FILTER_STOP
		pet_node.tooltip_text = _pet_name(pet)
		pet_node.gui_input.connect(_on_pet_input.bind(pet))
		if last_pet_pixels.has(pet) and last_pet_pixels[pet] != target_pixel:
			pet_node.position = last_pet_pixels[pet] + Vector2(tile_size * 0.05, tile_size * 0.05)
			create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).tween_property(pet_node, "position", target_pixel + Vector2(tile_size * 0.05, tile_size * 0.05), 0.18)
		elif pet == state.selected_pet:
			pet_node.scale = Vector2(0.88, 0.88)
			pet_node.pivot_offset = pet_node.size * 0.5
			create_tween().set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT).tween_property(pet_node, "scale", Vector2.ONE, 0.16)
	last_pet_pixels = next_pet_pixels


func _add_floor(cell: Vector2i, even: bool) -> void:
	var tile := Panel.new()
	tile.position = _cell_pixel(cell)
	tile.size = Vector2.ONE * tile_size
	tile.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color("#eef3e7") if even else Color("#e3ecdc")
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color("#cbd7c4")
	tile.add_theme_stylebox_override("panel", style)
	add_child(tile)


func _add_selection_ring(cell: Vector2i) -> void:
	var ring := Panel.new()
	ring.position = _cell_pixel(cell) + Vector2.ONE * tile_size * 0.04
	ring.size = Vector2.ONE * tile_size * 0.92
	ring.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var style := StyleBoxFlat.new()
	style.bg_color = Color(1, 1, 1, 0.05)
	style.border_width_left = 4
	style.border_width_top = 4
	style.border_width_right = 4
	style.border_width_bottom = 4
	style.border_color = Color("#f2b84b")
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	ring.add_theme_stylebox_override("panel", style)
	add_child(ring)


func _place_texture(file_name: String, cell: Vector2i, ratio: float, tint: Color, z: int, rotation := 0.0) -> TextureRect:
	var texture_rect := TextureRect.new()
	texture_rect.texture = load(ASSET_ROOT + file_name)
	texture_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	texture_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var inset := tile_size * (1.0 - ratio) * 0.5
	texture_rect.position = _cell_pixel(cell) + Vector2.ONE * inset
	texture_rect.size = Vector2.ONE * tile_size * ratio
	texture_rect.modulate = tint
	texture_rect.z_index = z
	texture_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	texture_rect.pivot_offset = texture_rect.size * 0.5
	texture_rect.rotation = rotation
	add_child(texture_rect)
	return texture_rect


func _on_pet_input(event: InputEvent, pet: String) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		pet_clicked.emit(pet)
		accept_event()


func _on_board_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
		var mouse_event := event as InputEventMouseButton
		var local_pos: Vector2 = mouse_event.position - board_origin
		if local_pos.x < 0 or local_pos.y < 0:
			return
		var cell := Vector2i(floori(local_pos.x / tile_size), floori(local_pos.y / tile_size))
		if cell.x < int(state.level["width"]) and cell.y < int(state.level["height"]):
			cell_clicked.emit(cell)


func _cell_pixel(cell: Vector2i) -> Vector2:
	return board_origin + Vector2(cell) * tile_size


func _pet_name(pet: String) -> String:
	return {"orange": "小橘", "doubao": "豆包", "snow": "雪团"}.get(pet, pet)


func _vec(value: Variant) -> Vector2i:
	if value is Vector2i:
		return value
	return Vector2i(int(value[0]), int(value[1]))
