class_name LightningBolt
extends Node2D

var from_point := Vector2.ZERO
var to_point := Vector2.ZERO
var color := Color("#69f7ff")
var life := 0.18
var age := 0.0
var points: PackedVector2Array = PackedVector2Array()

func setup(p_from: Vector2, p_to: Vector2, p_color: Color = Color("#69f7ff")) -> void:
    from_point = p_from
    to_point = p_to
    color = p_color
    _build_points()

func _process(delta: float) -> void:
    age += delta
    modulate.a = max(0.0, 1.0 - age / life)
    if age >= life:
        queue_free()

func _draw() -> void:
    if points.size() < 2:
        return
    draw_polyline(points, Color(1, 1, 1, 0.92), 9.0)
    draw_polyline(points, color, 4.0)

func _build_points() -> void:
    points.clear()
    var segments := 8
    var direction := to_point - from_point
    var normal := direction.normalized().orthogonal()
    for i in range(segments + 1):
        var t := float(i) / float(segments)
        var jitter := 0.0 if i == 0 or i == segments else randf_range(-24.0, 24.0)
        points.append(from_point.lerp(to_point, t) + normal * jitter)

