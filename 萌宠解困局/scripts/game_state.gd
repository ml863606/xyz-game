class_name GameState
extends RefCounted

signal changed
signal level_completed(stars: int)

const PET_ORDER: Array[String] = ["orange", "doubao", "snow"]

var level: Dictionary = {}
var positions: Dictionary = {}
var crates: Array[Vector2i] = []
var selected_pet: String = "orange"
var rescued: Array[String] = []
var collected_keys: Array[String] = []
var fish_collected: int = 0
var steps: int = 0
var history: Array[Dictionary] = []


func setup(level_data: Dictionary) -> void:
	level = level_data.duplicate(true)
	level["_collected_fish"] = []
	positions.clear()
	for pet: String in PET_ORDER:
		positions[pet] = _vec(level["pets"][pet])
	crates.clear()
	for value: Variant in level.get("crates", []):
		crates.append(_vec(value))
	selected_pet = "orange"
	rescued.clear()
	collected_keys.clear()
	fish_collected = 0
	steps = 0
	history.clear()
	changed.emit()


func try_move(direction: Vector2i) -> bool:
	if direction == Vector2i.ZERO or selected_pet in rescued:
		return false
	var origin: Vector2i = positions[selected_pet]
	var target := origin + direction
	var crate_index := crates.find(target)
	if crate_index >= 0:
		if selected_pet != "orange":
			return false
		var crate_target := target + direction
		if not _can_crate_enter(crate_target):
			return false
		_push_history()
		crates[crate_index] = crate_target
	else:
		if not _can_pet_enter(selected_pet, target, direction):
			return false
		_push_history()

	positions[selected_pet] = target
	_collect_at(target)
	_apply_portal(selected_pet)
	_collect_at(positions[selected_pet])
	steps += 1
	_rescue_if_ready(selected_pet)
	_select_available_pet()
	changed.emit()
	if rescued.size() == PET_ORDER.size():
		level_completed.emit(get_star_count())
	return true


func undo() -> bool:
	if history.is_empty():
		return false
	var snapshot: Dictionary = history.pop_back()
	positions = snapshot["positions"].duplicate(true)
	crates.clear()
	for value: Variant in snapshot["crates"]:
		crates.append(value)
	selected_pet = snapshot["selected_pet"]
	rescued.assign(snapshot["rescued"])
	collected_keys.assign(snapshot["collected_keys"])
	fish_collected = snapshot["fish_collected"]
	steps = snapshot["steps"]
	level["_collected_fish"] = snapshot["collected_fish"].duplicate()
	changed.emit()
	return true


func select_pet(pet: String) -> bool:
	if pet not in PET_ORDER or pet in rescued:
		return false
	selected_pet = pet
	changed.emit()
	return true


func get_star_count() -> int:
	var stars := 1
	if steps <= int(level.get("par", 999)):
		stars += 1
	if fish_collected >= int(level.get("fish", []).size()):
		stars += 1
	return stars


func is_wall(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.y < 0 or pos.x >= int(level["width"]) or pos.y >= int(level["height"]):
		return true
	return _list_has_pos(level.get("walls", []), pos)


func is_fence(pos: Vector2i) -> bool:
	return _list_has_pos(level.get("fences", []), pos)


func is_door_open(door_id: String) -> bool:
	if door_id in collected_keys:
		return true
	for plate: Dictionary in level.get("plates", []):
		if str(plate.get("door", "")) == door_id and is_plate_active(plate):
			return true
	return false


func is_plate_active(plate: Dictionary) -> bool:
	var pos := _vec(plate["pos"])
	if pos in crates:
		return true
	for pet: String in PET_ORDER:
		if pet in rescued or positions[pet] != pos:
			continue
		if str(plate.get("kind", "light")) == "light" or pet == "orange":
			return true
	return false


func is_bridge_active(bridge_id: String) -> bool:
	for rune_data: Dictionary in level.get("runes", []):
		if str(rune_data.get("bridge", "")) != bridge_id:
			continue
		if "snow" not in rescued and positions["snow"] == _vec(rune_data["pos"]):
			return true
	return false


func get_uncollected_fish() -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for value: Variant in level.get("fish", []):
		var pos := _vec(value)
		if not _snapshot_fish_positions().has(pos):
			result.append(pos)
	return result


func _can_pet_enter(pet: String, target: Vector2i, direction: Vector2i) -> bool:
	if is_wall(target):
		return false
	if is_fence(target) and pet != "doubao":
		return false
	if _pet_at(target) != "":
		return false
	for door: Dictionary in level.get("doors", []):
		if _vec(door["pos"]) == target and not is_door_open(str(door["id"])):
			return false
	for bridge: Dictionary in level.get("bridges", []):
		if _vec(bridge["pos"]) == target and not is_bridge_active(str(bridge["id"])):
			return false
	for arrow: Dictionary in level.get("one_way", []):
		if _vec(arrow["pos"]) == target and _vec(arrow["dir"]) != direction:
			return false
	return true


func _can_crate_enter(target: Vector2i) -> bool:
	if is_wall(target) or is_fence(target) or target in crates or _pet_at(target) != "":
		return false
	for door: Dictionary in level.get("doors", []):
		if _vec(door["pos"]) == target and not is_door_open(str(door["id"])):
			return false
	for bridge: Dictionary in level.get("bridges", []):
		if _vec(bridge["pos"]) == target and not is_bridge_active(str(bridge["id"])):
			return false
	return true


func _collect_at(pos: Vector2i) -> void:
	for key_data: Dictionary in level.get("keys", []):
		if _vec(key_data["pos"]) == pos:
			var door_id := str(key_data["door"])
			if door_id not in collected_keys:
				collected_keys.append(door_id)
	for fish_pos: Variant in level.get("fish", []):
		if _vec(fish_pos) == pos and not _snapshot_fish_positions().has(pos):
			fish_collected += 1
			var collected: Array[Vector2i] = _snapshot_fish_positions()
			collected.append(pos)
			level["_collected_fish"] = collected


func _apply_portal(pet: String) -> void:
	var current: Vector2i = positions[pet]
	for portal: Dictionary in level.get("portals", []):
		if _vec(portal["pos"]) != current:
			continue
		var pair_id := str(portal["pair"])
		for destination: Dictionary in level.get("portals", []):
			var destination_pos := _vec(destination["pos"])
			if str(destination["pair"]) == pair_id and destination_pos != current:
				if _pet_at(destination_pos) == "" and destination_pos not in crates:
					positions[pet] = destination_pos
				return


func _rescue_if_ready(pet: String) -> void:
	if positions[pet] == _vec(level["exit"]) and pet not in rescued:
		rescued.append(pet)


func _select_available_pet() -> void:
	if selected_pet not in rescued:
		return
	for pet: String in PET_ORDER:
		if pet not in rescued:
			selected_pet = pet
			return


func _pet_at(pos: Vector2i) -> String:
	for pet: String in PET_ORDER:
		if pet not in rescued and positions.get(pet, Vector2i(-1, -1)) == pos:
			return pet
	return ""


func _push_history() -> void:
	history.append({
		"positions": positions.duplicate(true),
		"crates": crates.duplicate(),
		"selected_pet": selected_pet,
		"rescued": rescued.duplicate(),
		"collected_keys": collected_keys.duplicate(),
		"fish_collected": fish_collected,
		"steps": steps,
		"collected_fish": _snapshot_fish_positions().duplicate(),
	})


func _snapshot_fish_positions() -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for value: Variant in level.get("_collected_fish", []):
		result.append(value)
	return result


func _list_has_pos(source: Array, pos: Vector2i) -> bool:
	for value: Variant in source:
		if _vec(value) == pos:
			return true
	return false


func _vec(value: Variant) -> Vector2i:
	if value is Vector2i:
		return value
	return Vector2i(int(value[0]), int(value[1]))
