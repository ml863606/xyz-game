extends SceneTree

const LEVELS_PATH := "res://data/levels.json"
const REQUIRED_KEYS := ["id", "chapter", "title", "width", "height", "par", "pets", "exit"]
const POSITION_LISTS := ["walls", "crates", "fences", "fish"]
const POSITION_OBJECTS := ["plates", "doors", "keys", "runes", "bridges", "portals", "one_way"]


func _init() -> void:
	var failures: Array[String] = []
	var file := FileAccess.open(LEVELS_PATH, FileAccess.READ)
	if file == null:
		push_error("无法读取关卡文件")
		quit(1)
		return
	var parsed: Variant = JSON.parse_string(file.get_as_text())
	if not (parsed is Dictionary) or not parsed.has("levels"):
		push_error("关卡 JSON 格式错误")
		quit(1)
		return
	var levels: Array = parsed["levels"]
	if levels.size() != 12:
		failures.append("关卡数量应为 12，实际为 %d" % levels.size())
	for index: int in levels.size():
		_validate_level(levels[index], index + 1, failures)
	if failures.is_empty():
		print("LEVEL_VALIDATION_OK: 12 levels")
		quit(0)
	else:
		for failure: String in failures:
			push_error(failure)
		quit(1)


func _validate_level(level: Dictionary, expected_id: int, failures: Array[String]) -> void:
	for key: String in REQUIRED_KEYS:
		if not level.has(key):
			failures.append("第 %d 关缺少字段 %s" % [expected_id, key])
	if int(level.get("id", -1)) != expected_id:
		failures.append("关卡编号不连续：期望 %d" % expected_id)
	var width := int(level.get("width", 0))
	var height := int(level.get("height", 0))
	if width < 5 or height < 5:
		failures.append("第 %d 关尺寸过小" % expected_id)
	for pet: String in GameState.PET_ORDER:
		if not level.get("pets", {}).has(pet):
			failures.append("第 %d 关缺少萌宠 %s" % [expected_id, pet])
		elif not _inside(level["pets"][pet], width, height):
			failures.append("第 %d 关萌宠 %s 越界" % [expected_id, pet])
	if not _inside(level.get("exit", [-1, -1]), width, height):
		failures.append("第 %d 关出口越界" % expected_id)
	for key: String in POSITION_LISTS:
		for value: Variant in level.get(key, []):
			if not _inside(value, width, height):
				failures.append("第 %d 关 %s 坐标越界" % [expected_id, key])
	for key: String in POSITION_OBJECTS:
		for item: Dictionary in level.get(key, []):
			if not item.has("pos") or not _inside(item["pos"], width, height):
				failures.append("第 %d 关 %s 坐标越界" % [expected_id, key])
			elif _list_has_pos(level.get("walls", []), _vec(item["pos"])):
				failures.append("第 %d 关 %s 与墙体重叠" % [expected_id, key])
	for pet: String in GameState.PET_ORDER:
		if _list_has_pos(level.get("walls", []), _vec(level["pets"][pet])):
			failures.append("第 %d 关萌宠 %s 出生在墙体内" % [expected_id, pet])
	if _list_has_pos(level.get("walls", []), _vec(level["exit"])):
		failures.append("第 %d 关出口与墙体重叠" % expected_id)
	for crate_pos: Variant in level.get("crates", []):
		if _list_has_pos(level.get("walls", []), _vec(crate_pos)):
			failures.append("第 %d 关木箱与墙体重叠" % expected_id)
	for portal: Dictionary in level.get("portals", []):
		var pair := str(portal.get("pair", ""))
		var count := 0
		for candidate: Dictionary in level.get("portals", []):
			if str(candidate.get("pair", "")) == pair:
				count += 1
		if count != 2:
			failures.append("第 %d 关传送窝 %s 需要成对" % [expected_id, pair])
	for bridge: Dictionary in level.get("bridges", []):
		var bridge_id := str(bridge.get("id", ""))
		var bridge_pos := _vec(bridge["pos"])
		var adjacent_rune := false
		for rune_data: Dictionary in level.get("runes", []):
			if str(rune_data.get("bridge", "")) == bridge_id and _vec(rune_data["pos"]).distance_to(bridge_pos) == 1.0:
				adjacent_rune = true
		if not adjacent_rune:
			failures.append("第 %d 关冰桥 %s 缺少相邻符文" % [expected_id, bridge_id])


func _inside(value: Variant, width: int, height: int) -> bool:
	var pos := _vec(value)
	return pos.x >= 0 and pos.y >= 0 and pos.x < width and pos.y < height


func _vec(value: Variant) -> Vector2i:
	return Vector2i(int(value[0]), int(value[1]))


func _list_has_pos(source: Array, pos: Vector2i) -> bool:
	for value: Variant in source:
		if _vec(value) == pos:
			return true
	return false
