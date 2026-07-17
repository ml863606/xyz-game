extends SceneTree

var frame_count := 0
var main_scene: Control


func _initialize() -> void:
	root.size = Vector2i(1280, 720)
	main_scene = load("res://scenes/main.tscn").instantiate()
	root.add_child(main_scene)
	DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path("res://screenshots"))


func _process(_delta: float) -> bool:
	frame_count += 1
	if frame_count == 8:
		_capture("res://screenshots/main-menu.png")
		main_scene.start_level(0)
	elif frame_count == 18:
		_capture("res://screenshots/level-01.png")
		root.remove_child(main_scene)
		main_scene.free()
		quit(0)
	return false


func _capture(path: String) -> void:
	RenderingServer.force_draw(false)
	var image := root.get_texture().get_image()
	var error := image.save_png(path)
	if error != OK:
		push_error("截图保存失败：%s" % path)
