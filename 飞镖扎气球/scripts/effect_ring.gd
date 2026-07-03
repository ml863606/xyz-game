class_name EffectRing
extends Node2D

var color := Color.WHITE
var radius := 10.0
var width := 8.0
var life := 0.45
var age := 0.0
var max_radius := 180.0

func setup(p_pos: Vector2, p_color: Color, p_max_radius: float, p_life: float = 0.45) -> void:
    position = p_pos
    color = p_color
    max_radius = p_max_radius
    life = p_life

func _process(delta: float) -> void:
    age += delta
    var t: float = clampf(age / life, 0.0, 1.0)
    radius = lerpf(10.0, max_radius, t)
    width = lerpf(12.0, 1.0, t)
    modulate.a = 1.0 - t
    queue_redraw()
    if age >= life:
        queue_free()

func _draw() -> void:
    draw_arc(Vector2.ZERO, radius, 0.0, TAU, 80, color, width)
    draw_arc(Vector2.ZERO, radius * 0.62, 0.0, TAU, 64, Color(color.r, color.g, color.b, 0.45), max(1.0, width * 0.45))

