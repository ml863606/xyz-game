class_name Balloon
extends Area2D

signal popped(balloon: Balloon)

enum Kind { NORMAL, GOLD, BOMB, SHIELD, CLOCK, THUNDER, BLACK_HOLE, ROCKET, NUKE }

var kind: Kind = Kind.NORMAL
var radius := 42.0
var velocity := Vector2.ZERO
var wobble_phase := 0.0
var age := 0.0
var popped_state := false
var hits_left := 1

func configure(p_kind: Kind, p_radius: float, p_velocity: Vector2, p_phase: float) -> void:
    kind = p_kind
    radius = p_radius
    velocity = p_velocity
    wobble_phase = p_phase
    hits_left = 2 if kind == Kind.SHIELD else 1
    _rebuild_collision()
    queue_redraw()

func _ready() -> void:
    _rebuild_collision()

func _process(delta: float) -> void:
    if popped_state:
        modulate.a = max(0.0, modulate.a - delta * 6.0)
        scale += Vector2.ONE * delta * 2.5
        if modulate.a <= 0.02:
            queue_free()
        return

    age += delta
    position += velocity * delta
    position.x += sin(age * 3.0 + wobble_phase) * 18.0 * delta
    rotation = sin(age * 2.5 + wobble_phase) * 0.08
    if position.y < -120.0 or position.y > 1160.0 or position.x < -140.0 or position.x > 860.0:
        queue_free()

func pop() -> void:
    if popped_state:
        return
    if kind == Kind.SHIELD and hits_left > 1:
        hits_left -= 1
        scale = Vector2.ONE * 0.92
        queue_redraw()
        return
    popped_state = true
    popped.emit(self)
    var collision := get_node_or_null("CollisionShape2D")
    if collision:
        collision.set_deferred("disabled", true)
    queue_redraw()

func _draw() -> void:
    var main_color := Color("#ff4f73")
    var side_color := Color("#d9365d")
    if kind == Kind.GOLD:
        main_color = Color("#ffd34d")
        side_color = Color("#f59e0b")
    elif kind == Kind.BOMB:
        _draw_bomb()
        return
    elif kind == Kind.SHIELD:
        main_color = Color("#66e0ff")
        side_color = Color("#168aad")
    elif kind == Kind.CLOCK:
        main_color = Color("#9b5cff")
        side_color = Color("#5b2abf")
    elif kind == Kind.THUNDER:
        main_color = Color("#50f5ff")
        side_color = Color("#006dff")
    elif kind == Kind.BLACK_HOLE:
        main_color = Color("#27123d")
        side_color = Color("#ff4fd8")
    elif kind == Kind.ROCKET:
        main_color = Color("#ff7a30")
        side_color = Color("#b82020")
    elif kind == Kind.NUKE:
        main_color = Color("#ffffff")
        side_color = Color("#ff2bd6")

    draw_circle(Vector2.ZERO, radius, side_color)
    draw_circle(Vector2(-radius * 0.12, -radius * 0.1), radius * 0.92, main_color)
    draw_circle(Vector2(-radius * 0.28, -radius * 0.35), radius * 0.18, Color(1, 1, 1, 0.55))
    draw_polygon([
        Vector2(-10, radius * 0.8),
        Vector2(10, radius * 0.8),
        Vector2(0, radius * 1.12)
    ], [side_color])
    draw_line(Vector2(0, radius * 1.1), Vector2(0, radius * 1.65), Color("#6b4f3a"), 3.0)

    if kind == Kind.SHIELD:
        draw_arc(Vector2.ZERO, radius * 0.58, PI * 0.12, PI * 1.88, 28, Color("#ffffff"), 6.0)
        draw_line(Vector2(-radius * 0.24, 0), Vector2(radius * 0.24, 0), Color("#ffffff"), 5.0)
    elif kind == Kind.CLOCK:
        draw_circle(Vector2.ZERO, radius * 0.48, Color("#fff7d6"))
        draw_line(Vector2.ZERO, Vector2(0, -radius * 0.28), Color("#5b2abf"), 4.0)
        draw_line(Vector2.ZERO, Vector2(radius * 0.22, radius * 0.12), Color("#5b2abf"), 4.0)
    elif kind == Kind.THUNDER:
        draw_polyline([
            Vector2(-radius * 0.08, -radius * 0.5),
            Vector2(-radius * 0.32, 0.0),
            Vector2(radius * 0.02, -radius * 0.02),
            Vector2(-radius * 0.14, radius * 0.5),
            Vector2(radius * 0.34, -radius * 0.16),
        ], Color("#fff45c"), 7.0)
    elif kind == Kind.BLACK_HOLE:
        draw_circle(Vector2.ZERO, radius * 0.5, Color("#090514"))
        draw_arc(Vector2.ZERO, radius * 0.6, 0.0, TAU * 0.78, 40, Color("#ff8cf0"), 7.0)
        draw_arc(Vector2.ZERO, radius * 0.32, PI, TAU * 1.52, 30, Color("#69f7ff"), 5.0)
    elif kind == Kind.ROCKET:
        draw_polygon([
            Vector2(0, -radius * 0.58),
            Vector2(-radius * 0.24, radius * 0.12),
            Vector2(radius * 0.24, radius * 0.12),
        ], [Color("#ffffff")])
        draw_rect(Rect2(Vector2(-radius * 0.17, -radius * 0.05), Vector2(radius * 0.34, radius * 0.52)), Color("#26364f"))
        draw_polygon([
            Vector2(-radius * 0.17, radius * 0.34),
            Vector2(-radius * 0.46, radius * 0.62),
            Vector2(0, radius * 0.48),
            Vector2(radius * 0.46, radius * 0.62),
            Vector2(radius * 0.17, radius * 0.34),
        ], [Color("#ffeb3b")])
    elif kind == Kind.NUKE:
        draw_circle(Vector2.ZERO, radius * 0.58, Color("#fff45c"))
        draw_circle(Vector2.ZERO, radius * 0.32, Color("#ff2bd6"))
        draw_arc(Vector2.ZERO, radius * 0.68, 0.0, TAU, 48, Color("#69f7ff"), 5.0)
        draw_line(Vector2(-radius * 0.5, 0), Vector2(radius * 0.5, 0), Color("#ffffff"), 5.0)
        draw_line(Vector2(0, -radius * 0.5), Vector2(0, radius * 0.5), Color("#ffffff"), 5.0)

func _draw_bomb() -> void:
    draw_circle(Vector2.ZERO, radius * 0.88, Color("#2d3448"))
    draw_circle(Vector2(-radius * 0.24, -radius * 0.28), radius * 0.18, Color(1, 1, 1, 0.22))
    draw_line(Vector2(radius * 0.5, -radius * 0.5), Vector2(radius * 0.9, -radius * 1.0), Color("#42210b"), 6.0)
    draw_circle(Vector2(radius * 1.02, -radius * 1.12), radius * 0.17, Color("#ffcf33"))
    draw_line(Vector2(-radius * 0.35, -2), Vector2(radius * 0.35, -2), Color("#f7f2dc"), 4.0)
    draw_line(Vector2(-radius * 0.35, 12), Vector2(radius * 0.35, 12), Color("#f7f2dc"), 4.0)

func _rebuild_collision() -> void:
    var collision := get_node_or_null("CollisionShape2D") as CollisionShape2D
    if collision == null:
        collision = CollisionShape2D.new()
        collision.name = "CollisionShape2D"
        add_child(collision)
    var shape := CircleShape2D.new()
    shape.radius = radius
    collision.shape = shape
