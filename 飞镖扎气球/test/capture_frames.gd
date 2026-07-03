extends SceneTree

const OUT_DIR := "res://screenshots/result/1"

var scene
var frame := 0
var captures := [20, 70, 120, 170, 220]

func _initialize() -> void:
    DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(OUT_DIR))
    scene = load("res://scenes/main.tscn").instantiate()
    root.add_child(scene)
    if scene.has_method("enable_auto_demo"):
        scene.enable_auto_demo()
    call_deferred("_capture_loop")

func _process(_delta: float) -> bool:
    return false

func _capture_loop() -> void:
    while frame <= 240:
        await process_frame
        frame += 1
        if captures.has(frame):
            var image := root.get_texture().get_image()
            var path := "%s/screenshot_%03d.png" % [OUT_DIR, frame]
            var err := image.save_png(path)
            print("capture ", path, " err=", err, " size=", image.get_size())
    quit()
