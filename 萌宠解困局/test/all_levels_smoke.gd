extends SceneTree

var frame_count := 0
var level_index := 0
var main_scene: Control


func _initialize() -> void:
	root.size = Vector2i(1280, 720)
	main_scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(main_scene)


func _process(_delta: float) -> bool:
	frame_count += 1
	if frame_count % 3 != 0:
		return false
	if level_index < 12:
		main_scene.start_level(level_index)
		if main_scene.game_state.level.is_empty():
			push_error("第 %d 关未能加载" % (level_index + 1))
			quit(1)
			return false
		level_index += 1
	else:
		print("ALL_LEVELS_SMOKE_OK: 12 levels rendered")
		root.remove_child(main_scene)
		main_scene.free()
		quit(0)
	return false
