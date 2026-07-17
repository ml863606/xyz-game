extends SceneTree

var levels: Array = []
var failures: Array[String] = []


func _init() -> void:
	_load_levels()
	_test_undo_collectible()
	_test_crate_and_plate()
	_test_doubao_fence_and_key()
	_test_snow_bridge()
	_test_portal()
	_test_level_one_completion()
	if failures.is_empty():
		print("GAME_STATE_TESTS_OK: 6 scenarios")
		quit(0)
	else:
		for failure: String in failures:
			push_error(failure)
		quit(1)


func _test_undo_collectible() -> void:
	var state := _state(0)
	_move(state, Vector2i.RIGHT, 3)
	_expect(state.fish_collected == 1, "拾取小鱼干失败")
	state.undo()
	_expect(state.fish_collected == 0, "撤销没有恢复小鱼干")
	_expect(state.get_uncollected_fish().size() == 1, "撤销后小鱼干没有重新显示")


func _test_crate_and_plate() -> void:
	var state := _state(1)
	_move(state, Vector2i.RIGHT, 2)
	_expect(Vector2i(4, 3) in state.crates, "小橘推箱位置错误")
	_expect(state.is_door_open("A"), "重型踏板没有打开门")


func _test_doubao_fence_and_key() -> void:
	var state := _state(2)
	state.select_pet("doubao")
	_move(state, Vector2i.RIGHT, 4)
	_expect(state.positions["doubao"] == Vector2i(5, 2), "豆包没有穿过栅栏")
	_expect(state.is_door_open("B"), "豆包拾取钥匙后门仍关闭")


func _test_snow_bridge() -> void:
	var state := _state(3)
	state.select_pet("snow")
	state.try_move(Vector2i.RIGHT)
	_expect(state.is_bridge_active("C"), "雪团没有激活冰桥")
	state.try_move(Vector2i.RIGHT)
	_expect(state.positions["snow"] == Vector2i(4, 2), "雪团没有进入冰桥")
	state.try_move(Vector2i.RIGHT)
	_expect(state.positions["snow"] == Vector2i(5, 2), "雪团没有离开冰桥")


func _test_portal() -> void:
	var state := _state(4)
	_move(state, Vector2i.RIGHT, 2)
	state.try_move(Vector2i.DOWN)
	_expect(state.positions["orange"] == Vector2i(5, 3), "传送窝没有传送到配对位置")


func _test_level_one_completion() -> void:
	var state := _state(0)
	_move(state, Vector2i.RIGHT, 4)
	state.try_move(Vector2i.DOWN)
	state.select_pet("doubao")
	_move(state, Vector2i.RIGHT, 4)
	state.select_pet("snow")
	_move(state, Vector2i.RIGHT, 4)
	state.try_move(Vector2i.UP)
	_expect(state.rescued.size() == 3, "第一关没有完成全员撤离")
	_expect(state.steps == 14, "第一关完成步数应为 14")
	_expect(state.get_star_count() == 3, "第一关三星结算错误")


func _state(index: int) -> GameState:
	var state := GameState.new()
	state.setup(levels[index])
	return state


func _move(state: GameState, direction: Vector2i, count: int) -> void:
	for _index: int in count:
		state.try_move(direction)


func _expect(condition: bool, message: String) -> void:
	if not condition:
		failures.append(message)


func _load_levels() -> void:
	var file := FileAccess.open("res://data/levels.json", FileAccess.READ)
	var parsed: Dictionary = JSON.parse_string(file.get_as_text())
	levels = parsed["levels"]
