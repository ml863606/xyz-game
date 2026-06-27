extends Node2D

const BalloonScene := preload("res://scripts/balloon.gd")
const DartScene := preload("res://scripts/dart.gd")
const EffectRingScene := preload("res://scripts/effect_ring.gd")
const LightningScene := preload("res://scripts/lightning_bolt.gd")
const RocketScene := preload("res://scripts/rocket_projectile.gd")
const LevelConfigScript := preload("res://scripts/level_config.gd")
const PlatformAdapterScript := preload("res://scripts/platform_adapter.gd")

enum PlayState { READY, PLAYING, PAUSED, WIN, LOSE }

const VIEW_SIZE := Vector2(720, 1280)
const ROUND_SECONDS := 60.0
const LAUNCH_ORIGIN := Vector2(360, 1120)
const MAX_DRAG := 250.0
const MIN_POWER := 320.0
const MAX_POWER := 1180.0
const LAUNCH_TOUCH_RADIUS := 260.0
const ENERGY_MAX := 100.0
const FRENZY_SECONDS := 6.0

var platform: PlatformAdapter
var state: PlayState = PlayState.READY
var levels: Array[LevelConfig] = []
var level_index := 0
var time_left := ROUND_SECONDS
var score := 0
var combo := 0
var best_score := 0
var energy := 0.0
var frenzy_time_left := 0.0
var time_freeze_left := 0.0
var slowmo_left := 0.0
var shake_time := 0.0
var shake_strength := 0.0
var mission := ""
var mission_text := ""
var mission_progress := 0
var mission_goal := 1
var mission_done := false
var red_hits := 0
var bomb_hits := 0
var spawn_timer := 0.0
var rng := RandomNumberGenerator.new()
var dragging := false
var drag_start := Vector2.ZERO
var drag_current := Vector2.ZERO
var auto_demo := false
var demo_timer := 0.0
var capture_enabled := false
var capture_frame := 0
var capture_frames := [30, 60, 90, 120, 150, 210, 270]
var capture_dir := "res://screenshots/result/1"

var balloon_layer: Node2D
var dart_layer: Node2D
var fx_layer: Node2D
var hud_layer: CanvasLayer
var score_label: Label
var time_label: Label
var combo_label: Label
var level_label: Label
var best_label: Label
var mission_label: Label
var energy_label: Label
var wind_label: Label
var message_label: Label
var flash_rect: ColorRect
var power_bar: ColorRect
var aim_line: Line2D
var launcher: Node2D
var powerup_kinds := [
    Balloon.Kind.THUNDER,
    Balloon.Kind.BLACK_HOLE,
    Balloon.Kind.ROCKET,
    Balloon.Kind.NUKE,
]

@export var start_auto_demo := false
@export var start_capture_frames := false

func _ready() -> void:
    rng.randomize()
    platform = PlatformAdapterScript.new()
    platform.init()
    best_score = platform.load_best_score()
    _create_levels()
    _build_scene()
    _start_round(0)
    if start_auto_demo or "--auto-demo" in OS.get_cmdline_args():
        enable_auto_demo()
    if start_capture_frames or "--capture-frames" in OS.get_cmdline_args():
        enable_capture_frames()

func _process(delta: float) -> void:
    if state == PlayState.PLAYING:
        if time_freeze_left > 0.0:
            time_freeze_left = max(0.0, time_freeze_left - delta)
        else:
            time_left = max(0.0, time_left - delta)
        if slowmo_left > 0.0:
            slowmo_left = max(0.0, slowmo_left - delta)
            Engine.time_scale = 0.45
            if slowmo_left <= 0.0:
                Engine.time_scale = 1.0
        if frenzy_time_left > 0.0:
            frenzy_time_left = max(0.0, frenzy_time_left - delta)
            if frenzy_time_left <= 0.0:
                _floating_text(Vector2(360, 230), "狂热结束")
                launcher.queue_redraw()
        spawn_timer -= delta
        if spawn_timer <= 0.0:
            _spawn_balloon()
            spawn_timer = levels[level_index].spawn_interval
        if time_left <= 0.0:
            _finish_round()

    _update_screen_shake(delta)

    if auto_demo:
        _run_demo(delta)

    if capture_enabled:
        _capture_frame_step()

    _update_hud()

func _input(event: InputEvent) -> void:
    if event.is_action_pressed("restart"):
        _start_round(level_index)
        return
    if event.is_action_pressed("pause") and state == PlayState.PLAYING:
        state = PlayState.PAUSED
        message_label.text = "已暂停"
        return
    if event.is_action_pressed("pause") and state == PlayState.PAUSED:
        state = PlayState.PLAYING
        message_label.text = ""
        return

    var pointer_pressed := false
    var pointer_released := false
    var pointer_position := Vector2.ZERO

    if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        pointer_pressed = event.pressed
        pointer_released = not event.pressed
        pointer_position = event.position
    elif event is InputEventScreenTouch:
        pointer_pressed = event.pressed
        pointer_released = not event.pressed
        pointer_position = event.position
    elif event is InputEventMouseMotion:
        pointer_position = event.position
    elif event is InputEventScreenDrag:
        pointer_position = event.position

    if pointer_pressed:
        _begin_drag(pointer_position)
    elif pointer_released:
        _release_drag(pointer_position)
    elif dragging and pointer_position != Vector2.ZERO:
        _update_drag(pointer_position)

func enable_auto_demo() -> void:
    auto_demo = true
    demo_timer = 0.7
    spawn_timer = 0.01
    _spawn_demo_targets()

func enable_capture_frames() -> void:
    capture_enabled = true
    capture_frame = 0
    DirAccess.make_dir_recursive_absolute(ProjectSettings.globalize_path(capture_dir))

func _create_levels() -> void:
    levels = [
        LevelConfigScript.new(1, 520, 0.70, 92.0, 0.07, 0.14, 0.0, 0.0, 0.0),
        LevelConfigScript.new(2, 780, 0.56, 128.0, 0.10, 0.13, 0.16, 0.0, 35.0),
        LevelConfigScript.new(3, 1080, 0.44, 168.0, 0.14, 0.14, 0.13, 0.10, -45.0),
    ]

func _build_scene() -> void:
    _build_background()

    balloon_layer = Node2D.new()
    balloon_layer.name = "Balloons"
    add_child(balloon_layer)

    dart_layer = Node2D.new()
    dart_layer.name = "Darts"
    add_child(dart_layer)

    fx_layer = Node2D.new()
    fx_layer.name = "Effects"
    add_child(fx_layer)

    launcher = Node2D.new()
    launcher.name = "Launcher"
    launcher.position = LAUNCH_ORIGIN
    launcher.draw.connect(_draw_launcher)
    add_child(launcher)
    launcher.queue_redraw()

    aim_line = Line2D.new()
    aim_line.name = "AimLine"
    aim_line.width = 7.0
    aim_line.default_color = Color(1, 1, 1, 0.75)
    aim_line.visible = false
    add_child(aim_line)

    _build_hud()

func _build_background() -> void:
    var bg := ColorRect.new()
    bg.name = "Sky"
    bg.color = Color("#77cdfd")
    bg.size = VIEW_SIZE
    add_child(bg)

    for i in range(5):
        var cloud := Node2D.new()
        cloud.position = Vector2(90 + i * 145, 120 + (i % 2) * 95)
        cloud.set_meta("radius", 38 + i * 4)
        cloud.draw.connect(_draw_cloud.bind(cloud))
        add_child(cloud)
        cloud.queue_redraw()

    var fair := ColorRect.new()
    fair.name = "FairGround"
    fair.color = Color("#ffd166")
    fair.position = Vector2(0, 1040)
    fair.size = Vector2(720, 240)
    add_child(fair)

    var booth := ColorRect.new()
    booth.name = "Booth"
    booth.color = Color("#ef476f")
    booth.position = Vector2(42, 980)
    booth.size = Vector2(636, 28)
    add_child(booth)

func _draw_cloud(cloud: Node2D) -> void:
    var r := float(cloud.get_meta("radius"))
    cloud.draw_circle(Vector2.ZERO, r, Color(1, 1, 1, 0.62))
    cloud.draw_circle(Vector2(-r * 0.72, r * 0.16), r * 0.72, Color(1, 1, 1, 0.52))
    cloud.draw_circle(Vector2(r * 0.82, r * 0.22), r * 0.62, Color(1, 1, 1, 0.50))

func _build_hud() -> void:
    hud_layer = CanvasLayer.new()
    hud_layer.name = "HUD"
    add_child(hud_layer)

    var panel := ColorRect.new()
    panel.color = Color(0.05, 0.08, 0.15, 0.24)
    panel.size = Vector2(720, 168)
    hud_layer.add_child(panel)

    score_label = _make_label(Vector2(28, 24), 34, Color.WHITE)
    time_label = _make_label(Vector2(285, 24), 34, Color.WHITE)
    level_label = _make_label(Vector2(535, 24), 30, Color.WHITE)
    combo_label = _make_label(Vector2(28, 76), 28, Color("#fff6bf"))
    best_label = _make_label(Vector2(535, 78), 23, Color("#e6f7ff"))
    mission_label = _make_label(Vector2(28, 120), 24, Color("#ffffff"))
    mission_label.size = Vector2(430, 42)
    energy_label = _make_label(Vector2(455, 118), 23, Color("#fff6bf"))
    energy_label.size = Vector2(250, 42)
    wind_label = _make_label(Vector2(285, 76), 23, Color("#e6f7ff"))
    wind_label.size = Vector2(210, 42)

    message_label = _make_label(Vector2(72, 500), 44, Color.WHITE)
    message_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    message_label.size = Vector2(576, 220)

    power_bar = ColorRect.new()
    power_bar.name = "PowerBar"
    power_bar.color = Color("#ffffff")
    power_bar.position = Vector2(278, 1180)
    power_bar.size = Vector2(164, 9)
    power_bar.visible = false
    hud_layer.add_child(power_bar)

    flash_rect = ColorRect.new()
    flash_rect.name = "Flash"
    flash_rect.color = Color(1, 0.08, 0.08, 0.0)
    flash_rect.size = VIEW_SIZE
    hud_layer.add_child(flash_rect)

func _make_label(pos: Vector2, font_size: int, color: Color) -> Label:
    var label := Label.new()
    label.position = pos
    label.size = Vector2(240, 64)
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    hud_layer.add_child(label)
    return label

func _draw_launcher() -> void:
    var glow: Color = Color("#ffe66d") if frenzy_time_left > 0.0 else Color(1, 1, 1, 0.16)
    launcher.draw_circle(Vector2(0, 18), 76.0, Color(glow.r, glow.g, glow.b, 0.26))
    launcher.draw_arc(Vector2.ZERO, 62.0, PI * 1.08, PI * 1.92, 24, Color("#ffffff"), 5.0)
    launcher.draw_line(Vector2(0, 42), Vector2(0, -74), Color("#26364f"), 12.0)
    launcher.draw_line(Vector2(0, 30), Vector2(0, -50), Color("#f8d78a"), 6.0)
    launcher.draw_polygon([
        Vector2(0, -94),
        Vector2(-18, -64),
        Vector2(18, -64),
    ], [Color("#d7e8ff")])
    launcher.draw_polygon([
        Vector2(0, 48),
        Vector2(-28, 82),
        Vector2(-8, 60),
    ], [Color("#ff4b70")])
    launcher.draw_polygon([
        Vector2(0, 48),
        Vector2(28, 82),
        Vector2(8, 60),
    ], [Color("#ff4b70")])
    launcher.draw_circle(Vector2.ZERO, 8.0, Color("#ffffff"))

func _start_round(p_level_index: int) -> void:
    level_index = clampi(p_level_index, 0, levels.size() - 1)
    state = PlayState.PLAYING
    time_left = ROUND_SECONDS
    score = 0
    combo = 0
    energy = 0.0
    frenzy_time_left = 0.0
    time_freeze_left = 0.0
    slowmo_left = 0.0
    Engine.time_scale = 1.0
    shake_time = 0.0
    shake_strength = 0.0
    position = Vector2.ZERO
    mission_progress = 0
    mission_done = false
    red_hits = 0
    bomb_hits = 0
    spawn_timer = 0.1
    dragging = false
    message_label.text = ""
    aim_line.visible = false
    power_bar.visible = false
    for node in balloon_layer.get_children():
        node.queue_free()
    for node in dart_layer.get_children():
        node.queue_free()
    for node in fx_layer.get_children():
        node.queue_free()
    _choose_mission()
    _spawn_opening_targets()

func _begin_drag(pos: Vector2) -> void:
    if state != PlayState.PLAYING:
        if state == PlayState.WIN:
            _start_round(min(level_index + 1, levels.size() - 1))
        elif state == PlayState.LOSE:
            _start_round(level_index)
        return
    if pos.distance_to(LAUNCH_ORIGIN) > LAUNCH_TOUCH_RADIUS:
        return
    dragging = true
    drag_start = LAUNCH_ORIGIN
    drag_current = pos
    _refresh_aim()

func _update_drag(pos: Vector2) -> void:
    drag_current = pos
    _refresh_aim()

func _release_drag(pos: Vector2) -> void:
    if not dragging:
        return
    dragging = false
    drag_current = pos
    var pull := _aim_vector()
    var length: float = min(pull.length(), MAX_DRAG)
    if length > 18.0:
        var power: float = lerpf(MIN_POWER, MAX_POWER, length / MAX_DRAG)
        _launch_dart(pull.normalized() * power)
    aim_line.visible = false
    power_bar.visible = false

func _refresh_aim() -> void:
    var pull := _aim_vector()
    var clamped := pull.limit_length(MAX_DRAG)
    aim_line.visible = true
    aim_line.points = PackedVector2Array([LAUNCH_ORIGIN, LAUNCH_ORIGIN + clamped])
    power_bar.visible = true
    power_bar.size.x = 54.0 + 210.0 * (clamped.length() / MAX_DRAG)

func _aim_vector() -> Vector2:
    var vector := drag_current - drag_start
    if vector.y > -12.0:
        vector.y = -12.0
    return vector

func _launch_dart(velocity: Vector2) -> void:
    var dart := DartScene.new()
    var speed_bonus: float = 1.25 if frenzy_time_left > 0.0 else 1.0
    dart.launch(LAUNCH_ORIGIN, velocity * speed_bonus, levels[level_index].wind_strength)
    dart.area_entered.connect(_on_dart_area_entered.bind(dart))
    dart.expired.connect(_on_dart_expired)
    dart_layer.add_child(dart)

func _spawn_balloon() -> void:
    var level: LevelConfig = levels[level_index]
    var roll: float = rng.randf()
    var kind := Balloon.Kind.NORMAL
    if roll < level.bomb_chance:
        kind = Balloon.Kind.BOMB
    elif roll < level.bomb_chance + level.gold_chance:
        kind = Balloon.Kind.GOLD
    elif roll < level.bomb_chance + level.gold_chance + level.shield_chance:
        kind = Balloon.Kind.SHIELD
    elif roll < level.bomb_chance + level.gold_chance + level.shield_chance + level.clock_chance:
        kind = Balloon.Kind.CLOCK
    elif level.number == 1 and roll > 0.94:
        kind = Balloon.Kind.THUNDER if rng.randf() < 0.55 else Balloon.Kind.ROCKET
    elif level.number == 2 and roll > 0.91:
        kind = [Balloon.Kind.THUNDER, Balloon.Kind.ROCKET, Balloon.Kind.BLACK_HOLE][rng.randi_range(0, 2)]
    elif level.number >= 3 and roll > 0.88:
        kind = [Balloon.Kind.THUNDER, Balloon.Kind.ROCKET, Balloon.Kind.BLACK_HOLE, Balloon.Kind.NUKE][rng.randi_range(0, 3)]

    var radius: float = rng.randf_range(34.0, 52.0)
    var side: int = -1 if rng.randf() < 0.5 else 1
    var x: float = -80.0 if side < 0 else 800.0
    var y: float = rng.randf_range(250.0, 880.0)
    var horizontal: float = -side * rng.randf_range(level.move_speed * 0.45, level.move_speed)
    var vertical: float = -rng.randf_range(30.0, 85.0)

    var balloon := BalloonScene.new()
    balloon.position = Vector2(x, y)
    balloon.configure(kind, radius, Vector2(horizontal, vertical), rng.randf_range(0.0, TAU))
    balloon.popped.connect(_on_balloon_popped)
    balloon_layer.add_child(balloon)

func _spawn_opening_targets() -> void:
    var placements := [
        [Balloon.Kind.NORMAL, Vector2(150, 610), Vector2(16, -18), 46.0],
        [Balloon.Kind.NORMAL, Vector2(555, 760), Vector2(-18, -16), 46.0],
        [Balloon.Kind.GOLD, Vector2(410, 485), Vector2(-10, -14), 42.0],
        [Balloon.Kind.BOMB, Vector2(270, 805), Vector2(12, -12), 40.0],
        [Balloon.Kind.SHIELD, Vector2(560, 525), Vector2(-8, -12), 40.0],
        [Balloon.Kind.THUNDER, Vector2(355, 650), Vector2(5, -10), 42.0],
        [Balloon.Kind.ROCKET, Vector2(650, 430), Vector2(-16, -8), 40.0],
    ]
    for item in placements:
        var balloon := BalloonScene.new()
        balloon.position = item[1]
        balloon.configure(item[0], item[3], item[2], rng.randf_range(0.0, TAU))
        balloon.popped.connect(_on_balloon_popped)
        balloon_layer.add_child(balloon)

func _spawn_demo_targets() -> void:
    if balloon_layer == null:
        return
    var placements := [
        [Balloon.Kind.NUKE, Vector2(360, 700), Vector2(0, -12)],
        [Balloon.Kind.THUNDER, Vector2(245, 740), Vector2(18, -22)],
        [Balloon.Kind.GOLD, Vector2(470, 665), Vector2(-12, -18)],
        [Balloon.Kind.BOMB, Vector2(350, 525), Vector2(8, -16)],
        [Balloon.Kind.SHIELD, Vector2(135, 455), Vector2(22, -14)],
        [Balloon.Kind.CLOCK, Vector2(585, 420), Vector2(-16, -10)],
        [Balloon.Kind.THUNDER, Vector2(350, 610), Vector2(8, -12)],
        [Balloon.Kind.NUKE, Vector2(650, 520), Vector2(-14, -9)],
    ]
    for item in placements:
        var balloon := BalloonScene.new()
        balloon.position = item[1]
        balloon.configure(item[0], 46.0, item[2], rng.randf_range(0.0, TAU))
        balloon.popped.connect(_on_balloon_popped)
        balloon_layer.add_child(balloon)

func _on_dart_area_entered(area: Area2D, dart: Dart) -> void:
    if not is_instance_valid(dart) or not dart.alive:
        return
    if area is Balloon:
        dart.alive = false
        area.pop()
        dart.queue_free()

func _on_dart_expired(_dart: Dart) -> void:
    combo = 0

func _on_balloon_popped(balloon: Balloon) -> void:
    _resolve_hit(balloon)
    if score >= levels[level_index].target_score:
        _finish_round()

func _resolve_hit(balloon: Balloon) -> void:
    if balloon.kind in powerup_kinds:
        _trigger_powerup(balloon)
        return

    var text := ""
    var color := Color("#ff4f73")
    var base_score := 25
    var energy_gain := 12.0

    if balloon.kind == Balloon.Kind.BOMB:
        combo = 0
        bomb_hits += 1
        time_left = max(0.0, time_left - 5.0)
        energy = max(0.0, energy - 18.0)
        text = "-5s 断连"
        color = Color("#30384d")
        _screen_flash()
        _update_mission(balloon, 0)
        _burst(balloon.position, color)
        _floating_text(balloon.position + Vector2(0, -55), text)
        return

    combo += 1
    if balloon.kind == Balloon.Kind.GOLD:
        base_score = 45
        energy_gain = 24.0
        time_left = min(ROUND_SECONDS, time_left + 3.0)
        text = "金气球 +3s"
        color = Color("#ffd34d")
    elif balloon.kind == Balloon.Kind.SHIELD:
        base_score = 60
        energy_gain = 18.0
        text = "破盾!"
        color = Color("#66e0ff")
    elif balloon.kind == Balloon.Kind.CLOCK:
        base_score = 35
        energy_gain = 14.0
        time_freeze_left = 2.0
        text = "时间冻结"
        color = Color("#9b5cff")
    else:
        red_hits += 1
        text = "命中"

    var gained: int = base_score + combo * 5
    if frenzy_time_left > 0.0:
        gained *= 2
        text += " x2"
    score += gained
    energy = min(ENERGY_MAX, energy + energy_gain + combo * 1.5)
    if energy >= ENERGY_MAX and frenzy_time_left <= 0.0:
        _start_frenzy()
    if combo in [3, 5, 8]:
        var bonus := combo * 10
        score += bonus
        text += " 连击奖励+" + str(bonus)
    _update_mission(balloon, gained)
    _burst(balloon.position, color)
    _floating_text(balloon.position + Vector2(0, -55), text + " +" + str(gained))

func _trigger_powerup(balloon: Balloon) -> void:
    var origin := balloon.global_position
    var kind: Balloon.Kind = balloon.kind
    combo += 1
    score += 35 + combo * 5
    energy = min(ENERGY_MAX, energy + 20.0)
    _shockwave(origin, Color("#ffffff"), 180.0)
    _screen_shake(0.24, 12.0)
    match kind:
        Balloon.Kind.THUNDER:
            _big_flash(Color(0.35, 0.9, 1.0, 0.34))
            _floating_text(origin + Vector2(0, -70), "雷暴连锁")
            _trigger_thunder(origin)
        Balloon.Kind.BLACK_HOLE:
            _big_flash(Color(0.7, 0.1, 1.0, 0.28))
            _floating_text(origin + Vector2(0, -70), "黑洞吸附")
            _trigger_black_hole(origin)
        Balloon.Kind.ROCKET:
            _big_flash(Color(1.0, 0.45, 0.05, 0.28))
            _floating_text(origin + Vector2(0, -70), "火箭齐射")
            _trigger_rockets(origin)
        Balloon.Kind.NUKE:
            _big_flash(Color(1.0, 0.95, 0.2, 0.42))
            _floating_text(origin + Vector2(0, -70), "全屏爆破")
            _trigger_nuke(origin)

func _trigger_thunder(origin: Vector2) -> void:
    var targets := _nearest_targets(origin, 5, true)
    var previous := origin
    for i in range(targets.size()):
        var target: Balloon = targets[i]
        if not is_instance_valid(target):
            continue
        var delay := i * 0.08
        var tween := create_tween()
        tween.tween_interval(delay)
        tween.tween_callback(_lightning.bind(previous, target.global_position))
        tween.tween_callback(_pop_balloon_by_power.bind(target, Balloon.Kind.THUNDER))
        previous = target.global_position
    _screen_shake(0.35, 16.0)

func _trigger_black_hole(origin: Vector2) -> void:
    var ring := EffectRingScene.new()
    ring.setup(origin, Color("#ff4fd8"), 260.0, 1.15)
    fx_layer.add_child(ring)
    var targets := _targets_in_radius(origin, 260.0, true)
    for target in targets:
        if not is_instance_valid(target):
            continue
        var tween := create_tween()
        tween.tween_property(target, "position", origin, 1.1).set_trans(Tween.TRANS_QUAD).set_ease(Tween.EASE_IN)
    var final_tween := create_tween()
    final_tween.tween_interval(1.15)
    final_tween.tween_callback(_shockwave.bind(origin, Color("#ff4fd8"), 320.0))
    final_tween.tween_callback(_screen_shake.bind(0.45, 18.0))
    final_tween.tween_callback(_pop_targets_by_power.bind(targets, Balloon.Kind.BLACK_HOLE))

func _trigger_rockets(origin: Vector2) -> void:
    var targets := _nearest_targets(origin, 3, true)
    for i in range(targets.size()):
        var target: Balloon = targets[i]
        if not is_instance_valid(target):
            continue
        var rocket := RocketScene.new()
        rocket.setup(LAUNCH_ORIGIN + Vector2((i - 1) * 70, -25), target)
        rocket.hit_target.connect(_on_rocket_hit)
        fx_layer.add_child(rocket)
    _screen_shake(0.22, 10.0)

func _trigger_nuke(origin: Vector2) -> void:
    slowmo_left = 1.5
    var targets := _targets_in_radius(Vector2(360, 600), 820.0, true)
    _shockwave(origin, Color("#fff45c"), 760.0)
    _shockwave(origin, Color("#ff2bd6"), 560.0)
    _shockwave(origin, Color("#69f7ff"), 380.0)
    _screen_shake(0.65, 28.0)
    var tween := create_tween()
    tween.tween_interval(0.18)
    tween.tween_callback(_pop_targets_by_power.bind(targets, Balloon.Kind.NUKE))

func _on_rocket_hit(target: Balloon, rocket: RocketProjectile) -> void:
    if not is_instance_valid(target):
        return
    _shockwave(target.global_position, Color("#ff7a30"), 120.0)
    _pop_balloon_by_power(target, Balloon.Kind.ROCKET)

func _pop_targets_by_power(targets: Array, source_kind: Balloon.Kind) -> void:
    for target in targets:
        if target is Balloon and is_instance_valid(target):
            _pop_balloon_by_power(target, source_kind)

func _pop_balloon_by_power(balloon: Balloon, source_kind: Balloon.Kind) -> void:
    if not is_instance_valid(balloon) or balloon.popped_state:
        return
    if balloon.kind == Balloon.Kind.BOMB:
        return
    if balloon.kind in powerup_kinds:
        var bonus := 45
        score += bonus
        _burst(balloon.global_position, Color("#ffffff"))
        balloon.queue_free()
        if source_kind == Balloon.Kind.NUKE:
            _floating_text(balloon.global_position + Vector2(0, -50), "引爆 +" + str(bonus))
        return
    if balloon.kind == Balloon.Kind.SHIELD and balloon.hits_left > 1:
        balloon.hits_left = 1
    balloon.pop()

func _nearest_targets(origin: Vector2, count: int, skip_bombs: bool) -> Array[Balloon]:
    var candidates: Array[Balloon] = []
    for node in balloon_layer.get_children():
        if node is Balloon and is_instance_valid(node) and not node.popped_state:
            if skip_bombs and node.kind == Balloon.Kind.BOMB:
                continue
            candidates.append(node)
    candidates.sort_custom(func(a: Balloon, b: Balloon) -> bool:
        return a.global_position.distance_squared_to(origin) < b.global_position.distance_squared_to(origin)
    )
    return candidates.slice(0, min(count, candidates.size()))

func _targets_in_radius(origin: Vector2, radius: float, skip_bombs: bool) -> Array[Balloon]:
    var targets: Array[Balloon] = []
    for node in balloon_layer.get_children():
        if node is Balloon and is_instance_valid(node) and not node.popped_state:
            if skip_bombs and node.kind == Balloon.Kind.BOMB:
                continue
            if node.global_position.distance_to(origin) <= radius:
                targets.append(node)
    return targets

func _finish_round() -> void:
    if score > best_score:
        best_score = score
        platform.save_best_score(best_score)
    if score >= levels[level_index].target_score:
        state = PlayState.WIN
        message_label.text = "过关!\n点击进入下一关"
    else:
        state = PlayState.LOSE
        message_label.text = "时间到\n点击重开"

func _burst(pos: Vector2, color: Color) -> void:
    var count: int = 18 if frenzy_time_left > 0.0 else 10
    var distance: float = 145.0 if frenzy_time_left > 0.0 else 105.0
    for i in range(count):
        var dot := ColorRect.new()
        dot.color = color
        dot.size = Vector2(10, 10)
        dot.position = pos
        dot.rotation = rng.randf_range(0.0, TAU)
        fx_layer.add_child(dot)
        var tween := create_tween()
        tween.tween_property(dot, "position", pos + Vector2.RIGHT.rotated(rng.randf_range(0.0, TAU)) * rng.randf_range(45.0, distance), 0.28)
        tween.parallel().tween_property(dot, "modulate:a", 0.0, 0.28)
        tween.tween_callback(dot.queue_free)

func _floating_text(pos: Vector2, text: String) -> void:
    var label := Label.new()
    label.text = text
    label.position = pos
    label.size = Vector2(220, 48)
    label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    label.add_theme_font_size_override("font_size", 21)
    label.add_theme_color_override("font_color", Color.WHITE)
    fx_layer.add_child(label)
    var tween := create_tween()
    tween.tween_property(label, "position", pos + Vector2(0, -70), 0.55)
    tween.parallel().tween_property(label, "modulate:a", 0.0, 0.55)
    tween.tween_callback(label.queue_free)

func _choose_mission() -> void:
    var candidates := ["combo", "gold", "clean_score", "red"]
    mission = candidates[rng.randi_range(0, candidates.size() - 1)]
    mission_progress = 0
    mission_done = false
    match mission:
        "combo":
            mission_text = "连击"
            mission_goal = 5
        "gold":
            mission_text = "金气球"
            mission_goal = 2
        "clean_score":
            mission_text = "无炸弹得分"
            mission_goal = 300
        _:
            mission_text = "红气球"
            mission_goal = 5

func _update_mission(balloon: Balloon, gained: int) -> void:
    if mission_done:
        return
    match mission:
        "combo":
            mission_progress = max(mission_progress, combo)
        "gold":
            if balloon.kind == Balloon.Kind.GOLD:
                mission_progress += 1
        "clean_score":
            if balloon.kind == Balloon.Kind.BOMB:
                mission_progress = 0
            else:
                mission_progress += gained
        "red":
            if balloon.kind == Balloon.Kind.NORMAL:
                mission_progress += 1
    if mission_progress >= mission_goal:
        mission_progress = mission_goal
        mission_done = true
        score += 80
        time_left = min(ROUND_SECONDS, time_left + 5.0)
        _floating_text(Vector2(360, 300), "任务完成 +80 +5s")

func _start_frenzy() -> void:
    energy = 0.0
    frenzy_time_left = FRENZY_SECONDS
    _floating_text(Vector2(360, 245), "狂热时间!")
    launcher.queue_redraw()

func _screen_flash() -> void:
    if flash_rect == null:
        return
    flash_rect.color = Color(1, 0.08, 0.08, 0.32)
    var tween := create_tween()
    tween.tween_property(flash_rect, "color", Color(1, 0.08, 0.08, 0.0), 0.22)

func _big_flash(color: Color) -> void:
    if flash_rect == null:
        return
    flash_rect.color = color
    var tween := create_tween()
    tween.tween_property(flash_rect, "color", Color(color.r, color.g, color.b, 0.0), 0.34)

func _screen_shake(duration: float, strength: float) -> void:
    shake_time = max(shake_time, duration)
    shake_strength = max(shake_strength, strength)

func _update_screen_shake(delta: float) -> void:
    if shake_time <= 0.0:
        position = Vector2.ZERO
        return
    shake_time = max(0.0, shake_time - delta)
    position = Vector2(rng.randf_range(-shake_strength, shake_strength), rng.randf_range(-shake_strength, shake_strength))
    shake_strength = max(0.0, shake_strength - delta * 38.0)
    if shake_time <= 0.0:
        position = Vector2.ZERO

func _shockwave(pos: Vector2, color: Color, radius: float) -> void:
    var ring := EffectRingScene.new()
    ring.setup(pos, color, radius, 0.48)
    fx_layer.add_child(ring)

func _lightning(from_pos: Vector2, to_pos: Vector2) -> void:
    var bolt := LightningScene.new()
    bolt.setup(from_pos, to_pos)
    fx_layer.add_child(bolt)

func _wind_text() -> String:
    var wind: float = levels[level_index].wind_strength
    if absf(wind) < 1.0:
        return "风向 -"
    return "风向 →" if wind > 0.0 else "风向 ←"

func _update_hud() -> void:
    score_label.text = "得分 " + str(score) + "/" + str(levels[level_index].target_score)
    time_label.text = "冻结 " + str(int(ceil(time_left))) if time_freeze_left > 0.0 else "时间 " + str(int(ceil(time_left)))
    level_label.text = "第 " + str(levels[level_index].number) + " 关"
    combo_label.text = "连击 x" + str(combo)
    best_label.text = "最高 " + str(best_score)
    mission_label.text = "任务 " + mission_text + " " + str(mission_progress) + "/" + str(mission_goal)
    energy_label.text = "狂热 " + str(int(ceil(frenzy_time_left))) + "s" if frenzy_time_left > 0.0 else "能量 " + str(int(energy)) + "%"
    wind_label.text = _wind_text()
    launcher.queue_redraw()

func _run_demo(delta: float) -> void:
    if state != PlayState.PLAYING:
        demo_timer -= delta
        if demo_timer <= 0.0:
            _start_round(min(level_index + 1, levels.size() - 1) if state == PlayState.WIN else level_index)
            demo_timer = 0.5
        return

    demo_timer -= delta
    if demo_timer > 0.0:
        return

    var target: Balloon = null
    for node in balloon_layer.get_children():
        if node is Balloon and node.kind != Balloon.Kind.BOMB and node.position.y > 120.0:
            target = node
            break
    if target == null:
        demo_timer = 0.15
        return

    var to_target := target.position - LAUNCH_ORIGIN
    var aim := Vector2(to_target.x * 1.0, to_target.y - 120.0).normalized() * rng.randf_range(980.0, 1120.0)
    _launch_dart(aim)
    demo_timer = 0.55

func _capture_frame_step() -> void:
    capture_frame += 1
    if capture_frames.has(capture_frame):
        var image := get_viewport().get_texture().get_image()
        var path := "%s/screenshot_%03d.png" % [capture_dir, capture_frame]
        var err := image.save_png(path)
        print("capture ", path, " err=", err, " size=", image.get_size())
    if capture_frame > 300:
        get_tree().quit()
