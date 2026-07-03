class_name RocketProjectile
extends Node2D

signal hit_target(target: Balloon, rocket: RocketProjectile)

var target: Balloon
var velocity := Vector2.ZERO
var speed := 520.0
var life := 2.4
var age := 0.0
var trail: Array[Vector2] = []

func setup(p_pos: Vector2, p_target: Balloon) -> void:
    position = p_pos
    target = p_target

func _process(delta: float) -> void:
    age += delta
    if age > life:
        queue_free()
        return
    if not is_instance_valid(target):
        queue_free()
        return
    var desired := (target.global_position - global_position).normalized() * speed
    velocity = velocity.lerp(desired, 0.12)
    position += velocity * delta
    rotation = velocity.angle()
    trail.append(position)
    if trail.size() > 16:
        trail.pop_front()
    queue_redraw()
    if global_position.distance_to(target.global_position) < 34.0:
        hit_target.emit(target, self)
        queue_free()

func _draw() -> void:
    for i in range(trail.size()):
        var alpha: float = float(i + 1) / float(max(trail.size(), 1)) * 0.45
        draw_circle(to_local(trail[i]), 5.0, Color(1.0, 0.45, 0.05, alpha))
    draw_polygon([Vector2(26, 0), Vector2(-18, -12), Vector2(-10, 0), Vector2(-18, 12)], [Color("#ffffff")])
    draw_rect(Rect2(Vector2(-20, -6), Vector2(26, 12)), Color("#26364f"))
    draw_polygon([Vector2(-20, -10), Vector2(-38, 0), Vector2(-20, 10)], [Color("#ff4b1f")])

