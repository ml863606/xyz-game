extends SceneTree

func _initialize() -> void:
    var scene = load("res://scenes/main.tscn").instantiate()
    root.add_child(scene)
    if scene.has_method("enable_auto_demo"):
        scene.enable_auto_demo()
