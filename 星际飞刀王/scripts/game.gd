extends Node2D

const VIEW_SIZE := Vector2(1280.0, 720.0)
const KNIFE_TEXTURE := preload("res://assets/sprites/star_knife.svg")
const ASTEROID_TEXTURE := preload("res://assets/sprites/asteroid_cluster.svg")
const TARGET_TEXTURE := preload("res://assets/sprites/star_target.svg")
const GLIDE_ICON := preload("res://assets/ui/icons/glide.svg")
const MAX_HULL := 5

var knife_world := Vector2(120.0, 0.0)
var velocity := Vector2(230.0, 0.0)
var camera_world := Vector2.ZERO
var trail: Array[Vector2] = []
var explosions: Array[Dictionary] = []
var hit_targets := {}
var score := 0
var hull := MAX_HULL
var game_over := false
var glide_time := 0.0
var boost_cooldown := 0.0
var impact_cooldown := 0.0
var damage_cooldown := 0.0
var shake_time := 0.0
var shake_power := 0.0
var run_time := 0.0

var score_label: Label
var speed_label: Label
var glide_label: Label
var depth_label: Label
var hull_label: Label
var game_over_label: Label
var touch_direction := Vector2.ZERO
var touch_start := Vector2.ZERO
var touch_dragging := false
var touch_boost := false

func _ready() -> void:
    get_viewport().size_changed.connect(queue_redraw)
    _build_hud()
    _reset()

func _process(delta: float) -> void:
    run_time += delta
    _update_game(delta)
    _update_hud()
    queue_redraw()

func _update_game(delta: float) -> void:
    if Input.is_key_pressed(KEY_R):
        _reset()
        return

    if game_over:
        _update_explosions(delta)
        shake_time = maxf(0.0, shake_time - delta)
        return

    var input_vector := Vector2.ZERO
    input_vector.x = float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT)) - float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT))
    input_vector.y = float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN)) - float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP))
    input_vector += touch_direction
    if input_vector.length() > 1.0:
        input_vector = input_vector.normalized()

    boost_cooldown = maxf(0.0, boost_cooldown - delta)
    impact_cooldown = maxf(0.0, impact_cooldown - delta)
    damage_cooldown = maxf(0.0, damage_cooldown - delta)
    if (Input.is_key_pressed(KEY_SPACE) or touch_boost) and boost_cooldown <= 0.0:
        velocity += Vector2(360.0, 0.0).rotated(velocity.angle())
        glide_time = maxf(glide_time, 0.85)
        boost_cooldown = 0.55

    var h := gravity_height(knife_world)
    var gradient := gravity_gradient(knife_world)
    var gravity_accel := -gradient * 560.0
    velocity += (Vector2(125.0, 0.0) + gravity_accel + input_vector * Vector2(520.0, 460.0)) * delta

    if absf(h) > 0.68 and velocity.length() > 340.0:
        glide_time = maxf(glide_time, 0.6)
        velocity += Vector2(130.0, 0.0) * delta

    glide_time = maxf(0.0, glide_time - delta)
    var damping := 0.993 if glide_time > 0.0 else 0.982
    velocity *= pow(damping, delta * 60.0)
    velocity.x = clampf(velocity.x, 145.0, 820.0)
    velocity.y = clampf(velocity.y, -520.0, 520.0)
    knife_world += velocity * delta

    _resolve_boundaries()
    _resolve_asteroids()
    _resolve_targets()
    _update_trail()
    _update_camera(delta)
    _update_explosions(delta)
    shake_time = maxf(0.0, shake_time - delta)

func _reset() -> void:
    knife_world = Vector2(120.0, 0.0)
    velocity = Vector2(260.0, -20.0)
    camera_world = knife_world
    trail.clear()
    explosions.clear()
    hit_targets.clear()
    score = 0
    hull = MAX_HULL
    game_over = false
    glide_time = 0.0
    boost_cooldown = 0.0
    impact_cooldown = 0.0
    damage_cooldown = 0.0
    shake_time = 0.0
    shake_power = 0.0

func _update_camera(delta: float) -> void:
    var target := knife_world + Vector2(320.0, 0.0)
    target.y = lerpf(target.y, track_y(knife_world.x), 0.45)
    camera_world = camera_world.lerp(target, 1.0 - pow(0.001, delta))

func _update_trail() -> void:
    trail.append(knife_world)
    var limit := 42 if glide_time > 0.0 else 24
    while trail.size() > limit:
        trail.pop_front()

func _resolve_boundaries() -> void:
    var center := track_y(knife_world.x)
    var half_height := 330.0
    var top := center - half_height
    var bottom := center + half_height
    if knife_world.y < top:
        knife_world.y = top
        velocity.y = absf(velocity.y) * 0.76
        _impact(0.16, 9.0)
        _take_damage()
    elif knife_world.y > bottom:
        knife_world.y = bottom
        velocity.y = -absf(velocity.y) * 0.76
        _impact(0.16, 9.0)
        _take_damage()

func _resolve_asteroids() -> void:
    var hit := false
    var hit_pos := Vector2.ZERO
    var hit_radius := 0.0
    var hit_normal := Vector2.RIGHT
    var hit_penetration := 0.0

    for asteroid in _asteroids_near_camera():
        var asteroid_pos: Vector2 = asteroid["pos"]
        var radius: float = asteroid["radius"]
        var offset: Vector2 = knife_world - asteroid_pos
        var distance := offset.length()
        var penetration := radius + 18.0 - distance
        if penetration > hit_penetration:
            hit = true
            hit_pos = asteroid_pos
            hit_radius = radius
            hit_normal = offset.normalized() if distance > 0.01 else Vector2.UP
            hit_penetration = penetration

    if not hit:
        return

    knife_world = hit_pos + hit_normal * (hit_radius + 21.0)
    var tangent := Vector2(-hit_normal.y, hit_normal.x)
    if absf(tangent.x) < 0.25:
        var side := signf(knife_world.y - track_y(knife_world.x))
        tangent = Vector2(0.0, -1.0 if side <= 0.0 else 1.0)
    elif tangent.x < 0.0:
        tangent = -tangent
    velocity = Vector2.RIGHT * 260.0 + tangent * 300.0 + hit_normal * 90.0
    velocity.y = clampf(velocity.y, -420.0, 420.0)
    glide_time = maxf(glide_time, 0.35)
    if impact_cooldown <= 0.0:
        _impact(0.1, 6.0)
        impact_cooldown = 0.2
    _take_damage()

func _resolve_targets() -> void:
    for target in _targets_near_camera():
        var target_id: int = target["id"]
        var target_pos: Vector2 = target["pos"]
        if hit_targets.has(target_id):
            continue
        if knife_world.distance_to(target_pos) < 42.0:
            hit_targets[target_id] = true
            score += 1
            velocity += Vector2(185.0, -signf(velocity.y) * 110.0)
            glide_time = maxf(glide_time, 0.7)
            explosions.append({"pos": target_pos, "age": 0.0, "life": 0.55})
            _impact(0.3, 22.0)

func _update_explosions(delta: float) -> void:
    for explosion in explosions:
        explosion["age"] = float(explosion["age"]) + delta
    explosions = explosions.filter(func(e: Dictionary) -> bool: return float(e["age"]) < float(e["life"]))

func _impact(duration: float, power: float) -> void:
    shake_time = maxf(shake_time, duration)
    shake_power = maxf(shake_power, power)

func _take_damage() -> void:
    if game_over or damage_cooldown > 0.0:
        return
    hull -= 1
    damage_cooldown = 0.7
    if hull <= 0:
        hull = 0
        game_over = true
        velocity = Vector2.ZERO
        glide_time = 0.0
        explosions.append({"pos": knife_world, "age": 0.0, "life": 0.75})
        _impact(0.32, 18.0)

func _build_hud() -> void:
    var layer := CanvasLayer.new()
    layer.name = "HUD"
    add_child(layer)

    score_label = _hud_label(Vector2(24.0, 20.0), 26)
    speed_label = _hud_label(Vector2(24.0, 58.0), 16)
    depth_label = _hud_label(Vector2(24.0, 86.0), 16)
    hull_label = _hud_label(Vector2(24.0, 114.0), 16)
    glide_label = _hud_label(Vector2(1098.0, 22.0), 18)
    layer.add_child(score_label)
    layer.add_child(speed_label)
    layer.add_child(depth_label)
    layer.add_child(hull_label)
    layer.add_child(glide_label)

    var glide_icon := TextureRect.new()
    glide_icon.texture = GLIDE_ICON
    glide_icon.position = Vector2(1048.0, 18.0)
    glide_icon.custom_minimum_size = Vector2(38.0, 38.0)
    glide_icon.expand_mode = TextureRect.EXPAND_FIT_WIDTH_PROPORTIONAL
    layer.add_child(glide_icon)

    game_over_label = _hud_label(Vector2(0.0, 292.0), 34)
    game_over_label.size = Vector2(VIEW_SIZE.x, 92.0)
    game_over_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    game_over_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    game_over_label.visible = false
    layer.add_child(game_over_label)

    _build_touch_controls(layer)

func _build_touch_controls(layer: CanvasLayer) -> void:
    var controls := Control.new()
    controls.name = "横屏触控"
    controls.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
    controls.mouse_filter = Control.MOUSE_FILTER_IGNORE
    layer.add_child(controls)

    var touch_area := Control.new()
    touch_area.name = "滑动操控区"
    touch_area.anchor_right = 0.48
    touch_area.anchor_bottom = 1.0
    touch_area.mouse_filter = Control.MOUSE_FILTER_STOP
    touch_area.gui_input.connect(_on_touch_area_input)
    controls.add_child(touch_area)

    var actions := Control.new()
    actions.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
    actions.position = Vector2(-164.0, -210.0)
    actions.size = Vector2(140.0, 186.0)
    actions.mouse_filter = Control.MOUSE_FILTER_PASS
    controls.add_child(actions)

    var boost := _touch_button("推进", Vector2(140.0, 104.0), 26)
    boost.button_down.connect(func() -> void: touch_boost = true)
    boost.button_up.connect(func() -> void: touch_boost = false)
    actions.add_child(boost)
    var restart := _touch_button("重开", Vector2(140.0, 58.0), 18)
    restart.position = Vector2(0.0, 116.0)
    restart.pressed.connect(_reset)
    actions.add_child(restart)

func _on_touch_area_input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            touch_start = event.position
            touch_direction = Vector2.ZERO
            touch_dragging = true
        else:
            touch_direction = Vector2.ZERO
            touch_dragging = false
    elif event is InputEventScreenDrag and touch_dragging:
        _set_touch_direction(event.position)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        if event.pressed:
            touch_start = event.position
            touch_direction = Vector2.ZERO
            touch_dragging = true
        else:
            touch_direction = Vector2.ZERO
            touch_dragging = false
    elif event is InputEventMouseMotion and touch_dragging:
        _set_touch_direction(event.position)

func _set_touch_direction(current_position: Vector2) -> void:
    var drag := current_position - touch_start
    if drag.length() >= 16.0:
        touch_direction = drag.normalized()

func _touch_button(text: String, button_size: Vector2, font_size: int) -> Button:
    var button := Button.new()
    button.text = text
    button.size = button_size
    button.add_theme_font_size_override("font_size", font_size)
    button.add_theme_color_override("font_color", Color("#fff4d6"))
    button.add_theme_color_override("font_hover_color", Color("#ffffff"))
    button.add_theme_color_override("font_pressed_color", Color("#ffdc7d"))
    button.add_theme_stylebox_override("normal", _control_style(Color("#18263d"), Color("#8aa9c7"), 0.82))
    button.add_theme_stylebox_override("hover", _control_style(Color("#26405e"), Color("#f0c56c"), 0.92))
    button.add_theme_stylebox_override("pressed", _control_style(Color("#43311d"), Color("#ffcf62"), 0.98))
    return button

func _control_style(fill: Color, border: Color, alpha: float) -> StyleBoxFlat:
    var style := StyleBoxFlat.new()
    style.bg_color = Color(fill, alpha)
    style.border_color = border
    style.set_border_width_all(2)
    style.corner_radius_top_left = 10
    style.corner_radius_top_right = 10
    style.corner_radius_bottom_left = 10
    style.corner_radius_bottom_right = 10
    return style

func _hud_label(pos: Vector2, size: int) -> Label:
    var label := Label.new()
    label.position = pos
    label.add_theme_font_size_override("font_size", size)
    label.add_theme_color_override("font_color", Color("#f3e8c8"))
    label.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.65))
    label.add_theme_constant_override("shadow_offset_x", 2)
    label.add_theme_constant_override("shadow_offset_y", 2)
    return label

func _update_hud() -> void:
    score_label.text = "得分 %02d" % score
    speed_label.text = "速度 %03d" % int(velocity.length())
    depth_label.text = "引力 %+0.2f" % gravity_height(knife_world)
    hull_label.text = "耐久 %s" % "◆".repeat(hull)
    glide_label.text = "已坠毁" if game_over else ("滑翔中" if glide_time > 0.0 else "准备就绪")
    game_over_label.text = "飞刀坠毁\n点击右下角重开"
    game_over_label.visible = game_over

func _draw() -> void:
    _draw_background()
    _draw_contours()
    _draw_boundaries()
    _draw_track()
    _draw_targets()
    _draw_asteroids()
    _draw_explosions()
    _draw_trail()
    _draw_knife()

func _draw_background() -> void:
    var rect := Rect2(Vector2.ZERO, get_viewport_rect().size)
    draw_rect(rect, Color("#09101d"))

    var nebula_points := PackedVector2Array()
    for i in range(44):
        var x := remap(float(i), 0.0, 43.0, -80.0, VIEW_SIZE.x + 80.0)
        var y := 94.0 + sin(x * 0.004 + 1.7) * 42.0
        nebula_points.append(Vector2(x, y))
    draw_polyline(nebula_points, Color(0.42, 0.54, 0.72, 0.18), 68.0, true)
    draw_polyline(nebula_points, Color(0.58, 0.34, 0.68, 0.12), 128.0, true)

    for i in range(160):
        var p := _paper_point(i)
        var tint := Color(0.9, 0.78, 0.55, 0.04 + float(i % 5) * 0.008)
        draw_line(p, p + Vector2(10.0 + float(i % 9), 0.0).rotated(float(i) * 0.71), tint, 1.0)
    for i in range(90):
        var p2 := _paper_point(i + 300)
        var r := 1.0 + float(i % 3) * 0.45
        draw_circle(p2, r, Color(0.88, 0.9, 0.82, 0.12))

func _draw_contours() -> void:
    var start_x := camera_world.x - VIEW_SIZE.x * 0.58
    var end_x := camera_world.x + VIEW_SIZE.x * 0.58
    var top_y := camera_world.y - VIEW_SIZE.y * 0.62
    var bottom_y := camera_world.y + VIEW_SIZE.y * 0.62

    var y := top_y
    while y <= bottom_y:
        var dense := absf(y - track_y(camera_world.x)) < 180.0
        var points := PackedVector2Array()
        var x := start_x
        while x <= end_x:
            var h := gravity_height(Vector2(x, y))
            var warped := Vector2(x, y + h * (24.0 if dense else 16.0))
            points.append(world_to_screen(warped))
            x += 34.0
        draw_polyline(points, Color(0.52, 0.73, 0.82, 0.17 if dense else 0.1), 1.35 if dense else 1.0, true)
        y += 26.0 if dense else 42.0

    for peak in _gravity_peaks_near_camera():
        var center := world_to_screen(peak)
        for r in [32.0, 48.0, 64.0, 82.0]:
            draw_arc(center, r, 0.0, TAU, 72, Color(0.77, 0.82, 0.84, 0.16), 1.2)

func _draw_boundaries() -> void:
    var start_x := camera_world.x - VIEW_SIZE.x * 0.62
    var end_x := camera_world.x + VIEW_SIZE.x * 0.62
    for side in [-1.0, 1.0]:
        var previous := Vector2.ZERO
        for pass_index in range(12):
            var points := PackedVector2Array()
            var x := start_x
            while x <= end_x:
                var y: float = track_y(x) + side * (325.0 + float(pass_index) * 7.0)
                y += sin(x * 0.018 + float(pass_index)) * 11.0
                points.append(world_to_screen(Vector2(x, y)))
                x += 24.0
            var color := Color(0.55, 0.38, 0.72, 0.09 + float(12 - pass_index) * 0.006)
            draw_polyline(points, color, 2.0, true)
            previous = points[0] if points.size() > 0 else previous
        if previous != Vector2.ZERO:
            draw_circle(previous, 72.0, Color(0.43, 0.25, 0.48, 0.05))

func _draw_track() -> void:
    var points := PackedVector2Array()
    var start_x := camera_world.x - VIEW_SIZE.x * 0.56
    var end_x := camera_world.x + VIEW_SIZE.x * 0.58
    var x := start_x
    while x <= end_x:
        points.append(world_to_screen(Vector2(x, track_y(x))))
        x += 28.0
    draw_polyline(points, Color(1.0, 0.23, 0.08, 0.86), 8.0, true)
    draw_polyline(points, Color(1.0, 0.66, 0.16, 1.0), 3.0, true)

    var tick_x: float = floor(start_x / 150.0) * 150.0
    while tick_x <= end_x:
        var p := world_to_screen(Vector2(tick_x, track_y(tick_x)))
        draw_line(p + Vector2(0, -12), p + Vector2(0, 12), Color(1.0, 0.83, 0.42, 0.46), 1.2)
        tick_x += 150.0

func _draw_asteroids() -> void:
    for asteroid in _asteroids_near_camera():
        var asteroid_pos: Vector2 = asteroid["pos"]
        var radius: float = asteroid["radius"]
        var p := world_to_screen(asteroid_pos)
        var size: Vector2 = Vector2.ONE * radius * 2.1
        draw_texture_rect(ASTEROID_TEXTURE, Rect2(p - size * 0.5, size), false, Color(1, 1, 1, 0.94))
        draw_arc(p, radius + 8.0, 0.0, TAU, 48, Color(0.9, 0.78, 0.62, 0.22), 1.0)

func _draw_targets() -> void:
    for target in _targets_near_camera():
        var target_id: int = target["id"]
        var target_pos: Vector2 = target["pos"]
        if hit_targets.has(target_id):
            continue
        var p := world_to_screen(target_pos)
        var pulse := 1.0 + sin(run_time * 4.0 + float(target_id)) * 0.08
        var size: Vector2 = Vector2.ONE * 70.0 * pulse
        draw_circle(p, 42.0 * pulse, Color(1.0, 0.78, 0.22, 0.12))
        draw_texture_rect(TARGET_TEXTURE, Rect2(p - size * 0.5, size), false)

func _draw_explosions() -> void:
    for explosion in explosions:
        var t: float = float(explosion["age"]) / float(explosion["life"])
        var p := world_to_screen(explosion["pos"])
        var radius := lerpf(18.0, 92.0, t)
        draw_circle(p, radius * 0.55, Color(1.0, 0.72, 0.18, 0.22 * (1.0 - t)))
        draw_arc(p, radius, 0.0, TAU, 64, Color(1.0, 0.91, 0.58, 1.0 - t), 4.0)
        for i in range(10):
            var dir := Vector2.RIGHT.rotated(float(i) / 10.0 * TAU + run_time)
            draw_line(p + dir * radius * 0.2, p + dir * radius, Color(1.0, 0.28, 0.12, 1.0 - t), 2.0)

func _draw_trail() -> void:
    for i in range(trail.size()):
        var t := float(i + 1) / float(maxi(1, trail.size()))
        var p := world_to_screen(trail[i])
        var width := lerpf(3.0, 14.0 if glide_time > 0.0 else 8.0, t)
        draw_circle(p, width, Color(1.0, 0.37, 0.07, 0.06 + t * 0.16))
    if trail.size() > 1:
        var points := PackedVector2Array()
        for point in trail:
            points.append(world_to_screen(point))
        draw_polyline(points, Color(1.0, 0.53, 0.08, 0.52 if glide_time > 0.0 else 0.32), 4.0, true)

func _draw_knife() -> void:
    var p := world_to_screen(knife_world)
    var angle := velocity.angle()
    draw_set_transform(p + Vector2(0, 13), angle, Vector2(0.42, 0.42))
    draw_texture(KNIFE_TEXTURE, -KNIFE_TEXTURE.get_size() * 0.5, Color(0.0, 0.0, 0.0, 0.22))
    draw_set_transform(p, angle, Vector2(0.42, 0.42))
    draw_texture(KNIFE_TEXTURE, -KNIFE_TEXTURE.get_size() * 0.5)
    draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

func world_to_screen(world: Vector2) -> Vector2:
    var shake := Vector2.ZERO
    if shake_time > 0.0:
        shake = Vector2(sin(run_time * 73.0), cos(run_time * 61.0)) * shake_power * (shake_time / 0.3)
    return world - camera_world + VIEW_SIZE * 0.5 + shake

func gravity_height(p: Vector2) -> float:
    var ridge := sin(p.x * 0.0065 + sin(p.y * 0.004) * 1.7) * 0.46
    var tide := cos((p.x + p.y * 0.7) * 0.0048) * 0.32
    var peak := 0.0
    for g in _gravity_peaks_around(p.x):
        var d := p.distance_to(g)
        peak += exp(-d * d / 42000.0) * 0.85
    return clampf(ridge + tide + peak - 0.22, -1.0, 1.0)

func gravity_gradient(p: Vector2) -> Vector2:
    var step := 24.0
    return Vector2(
        (gravity_height(p + Vector2(step, 0)) - gravity_height(p - Vector2(step, 0))) / (step * 2.0),
        (gravity_height(p + Vector2(0, step)) - gravity_height(p - Vector2(0, step))) / (step * 2.0)
    )

func _gravity_peaks_around(world_x: float) -> Array[Vector2]:
    var peaks: Array[Vector2] = []
    var start := int(floor(world_x / 520.0)) - 3
    for i in range(start, start + 8):
        var x := float(i) * 520.0 + 250.0
        var y := track_y(x) + sin(float(i) * 1.9) * 210.0
        peaks.append(Vector2(x, y))
    return peaks

func _gravity_peaks_near_camera() -> Array[Vector2]:
    return _gravity_peaks_around(camera_world.x)

func track_y(x: float) -> float:
    return sin(x * 0.0038) * 110.0 + sin(x * 0.00135 + 1.6) * 70.0

func _asteroids_near_camera() -> Array[Dictionary]:
    var asteroids: Array[Dictionary] = []
    var start := int(floor((camera_world.x - VIEW_SIZE.x) / 190.0)) - 1
    for i in range(start, start + 18):
        if i % 2 == 0:
            var x := float(i) * 190.0 + 90.0
            var y := track_y(x) + sin(float(i) * 2.17) * 250.0
            asteroids.append({"pos": Vector2(x, y), "radius": 28.0 + float((i * 17) % 23)})
        if i % 7 == 0:
            var cx := float(i) * 190.0 + 160.0
            for j in range(4):
                var arc := -0.9 + float(j) * 0.42
                var pos := Vector2(cx + cos(arc) * 96.0, track_y(cx) + sin(arc) * 118.0)
                asteroids.append({"pos": pos, "radius": 25.0 + float(j) * 5.0})
    return asteroids

func _targets_near_camera() -> Array[Dictionary]:
    var targets: Array[Dictionary] = []
    var start := int(floor((camera_world.x - VIEW_SIZE.x) / 430.0)) - 1
    for i in range(start, start + 8):
        var x := float(i) * 430.0 + 360.0
        var y := track_y(x) + cos(float(i) * 1.31) * 210.0
        targets.append({"id": i, "pos": Vector2(x, y)})
    return targets

func _paper_point(i: int) -> Vector2:
    var x := fposmod(sin(float(i) * 91.17) * 9287.0, VIEW_SIZE.x)
    var y := fposmod(cos(float(i) * 44.31) * 7391.0, VIEW_SIZE.y)
    return Vector2(x, y)
