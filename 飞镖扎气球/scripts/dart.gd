class_name Dart
extends Area2D

signal expired(dart: Dart)

var velocity := Vector2.ZERO
var gravity_force := 620.0
var wind := 0.0
var alive := true
var trail: Array[Vector2] = []

func launch(origin: Vector2, p_velocity: Vector2, p_wind: float) -> void:
    position = origin
    velocity = p_velocity
    wind = p_wind
    trail.clear()
    _rebuild_collision()

func _ready() -> void:
    _rebuild_collision()

func _physics_process(delta: float) -> void:
    if not alive:
        return
    velocity.x += wind * delta
    velocity.y += gravity_force * delta
    position += velocity * delta
    rotation = velocity.angle()
    trail.append(position)
    if trail.size() > 12:
        trail.pop_front()
    queue_redraw()
    if position.x < -120.0 or position.x > 840.0 or position.y < -180.0 or position.y > 1350.0:
        alive = false
        expired.emit(self)
        queue_free()

func _draw() -> void:
    for i in range(trail.size()):
        var alpha := float(i + 1) / float(max(trail.size(), 1)) * 0.18
        draw_circle(to_local(trail[i]), 4.0, Color(1, 1, 1, alpha))

    draw_line(Vector2(-34, 0), Vector2(30, 0), Color("#26364f"), 8.0)
    draw_line(Vector2(-28, 0), Vector2(18, 0), Color("#f6d78c"), 4.0)
    draw_polygon([Vector2(30, 0), Vector2(50, -9), Vector2(50, 9)], [Color("#d6e5ff")])
    draw_polygon([Vector2(-34, 0), Vector2(-55, -14), Vector2(-48, 0), Vector2(-55, 14)], [Color("#ff4b70")])

func _rebuild_collision() -> void:
    var collision := get_node_or_null("CollisionShape2D") as CollisionShape2D
    if collision == null:
        collision = CollisionShape2D.new()
        collision.name = "CollisionShape2D"
        add_child(collision)
    var shape := CircleShape2D.new()
    shape.radius = 18.0
    collision.shape = shape
