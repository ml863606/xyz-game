class_name BackgroundPainter
extends Node2D

@export var width: float = 900.0
@export var height: float = 14500.0
@export var start_y: float = 1280.0
@export var floor_gap: float = 128.0
@export var floor_count: int = 100

var _sparkles: Array[Vector2] = []

func _ready() -> void:
	z_index = -100
	_build_sparkles()
	queue_redraw()

func _draw() -> void:
	var top_y := start_y - height
	_draw_sky(top_y)
	_draw_far_lights(top_y)
	_draw_city_layers(top_y)
	_draw_floor_guides()
	_draw_summit_beam(top_y)

func _build_sparkles() -> void:
	_sparkles.clear()
	for i in range(180):
		var x := 28.0 + float((i * 137) % int(width - 56.0))
		var y := start_y - float((i * 251) % int(height - 320.0)) - 140.0
		_sparkles.append(Vector2(x, y))

func _draw_sky(top_y: float) -> void:
	var bands := 42
	for i in range(bands):
		var t := float(i) / float(maxi(bands - 1, 1))
		var color := Color(
			lerpf(0.015, 0.08, t),
			lerpf(0.025, 0.16, t),
			lerpf(0.08, 0.32, t)
		)
		draw_rect(Rect2(0.0, top_y + height * t, width, height / bands + 3.0), color)

	draw_circle(Vector2(width * 0.78, top_y + 760.0), 92.0, Color(0.78, 0.96, 1.0, 0.16))
	draw_circle(Vector2(width * 0.78, top_y + 760.0), 54.0, Color(0.8, 0.96, 1.0, 0.28))
	draw_circle(Vector2(width * 0.80, top_y + 742.0), 44.0, Color(0.05, 0.09, 0.18, 0.38))

func _draw_far_lights(_top_y: float) -> void:
	for i in range(_sparkles.size()):
		var p := _sparkles[i]
		var alpha := 0.18 + float((i * 29) % 80) / 260.0
		var radius := 1.2 + float(i % 4) * 0.45
		draw_circle(p, radius, Color(0.85, 0.94, 1.0, alpha))
		if i % 17 == 0:
			draw_line(p + Vector2(-8.0, 0.0), p + Vector2(8.0, 0.0), Color(0.48, 0.85, 1.0, 0.16), 1.0)

func _draw_city_layers(top_y: float) -> void:
	_draw_city_layer(top_y, 0.20, 520.0, Color(0.015, 0.025, 0.06, 0.34))
	_draw_city_layer(top_y, 0.46, 360.0, Color(0.025, 0.04, 0.09, 0.46))
	_draw_city_layer(top_y, 0.74, 240.0, Color(0.03, 0.045, 0.1, 0.62))

func _draw_city_layer(top_y: float, offset: float, max_height: float, color: Color) -> void:
	var baseline := start_y - 200.0 - height * offset
	for i in range(18):
		var building_w := 32.0 + float((i * 31) % 56)
		var x := -40.0 + float(i) * 58.0 + float((i * 19) % 32)
		var h := 120.0 + float((i * 73) % int(max_height))
		draw_rect(Rect2(x, baseline - h, building_w, h), color)
		for j in range(4):
			var wy := baseline - h + 28.0 + float(j) * 56.0
			if wy < baseline - 16.0:
				draw_rect(Rect2(x + 8.0, wy, 5.0, 12.0), Color(0.35, 0.78, 1.0, 0.10 + 0.05 * float((i + j) % 2)))
				draw_rect(Rect2(x + building_w - 14.0, wy + 9.0, 5.0, 12.0), Color(1.0, 0.78, 0.35, 0.08))

func _draw_floor_guides() -> void:
	for i in range(floor_count + 1):
		if i % 5 != 0:
			continue
		var y := start_y - float(i) * floor_gap
		var strong := i % 10 == 0
		var color := Color(0.3, 0.8, 1.0, 0.11 if strong else 0.045)
		draw_line(Vector2(58.0, y), Vector2(width - 58.0, y), color, 2.0 if strong else 1.0)
		if strong and i > 0:
			draw_circle(Vector2(50.0, y), 4.0, Color(1.0, 0.82, 0.38, 0.42))
			draw_circle(Vector2(width - 50.0, y), 4.0, Color(1.0, 0.82, 0.38, 0.42))

func _draw_summit_beam(top_y: float) -> void:
	var center_x := width * 0.5
	var y := start_y - float(floor_count) * floor_gap - 230.0
	draw_polygon(
		PackedVector2Array([
			Vector2(center_x - 72.0, y + 250.0),
			Vector2(center_x + 72.0, y + 250.0),
			Vector2(center_x + 22.0, top_y + 160.0),
			Vector2(center_x - 22.0, top_y + 160.0)
		]),
		PackedColorArray([Color(0.38, 0.95, 1.0, 0.10), Color(0.38, 0.95, 1.0, 0.10), Color(1.0, 0.95, 0.5, 0.0), Color(1.0, 0.95, 0.5, 0.0)])
	)
