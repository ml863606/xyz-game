class_name JumpHazard
extends Area2D

@export var move_span: float = 130.0
@export var move_speed: float = 1.6

var _origin_x: float
var _time: float = 0.0
var _sprite: Sprite2D

const HAZARD_TEXTURE := preload("res://assets/sprites/hazard.svg")

func setup(pos: Vector2, span: float, speed: float) -> void:
	position = pos
	move_span = span
	move_speed = speed

func _ready() -> void:
	add_to_group("hazards")
	collision_layer = 4
	collision_mask = 2
	_origin_x = position.x
	_create_collision()
	_create_visual()
	body_entered.connect(_on_body_entered)

func _physics_process(delta: float) -> void:
	_time += delta
	position.x = _origin_x + sin(_time * move_speed) * move_span
	_sprite.rotation += delta * 3.6

func _create_visual() -> void:
	_sprite = Sprite2D.new()
	_sprite.name = "Visual"
	_sprite.texture = HAZARD_TEXTURE
	_sprite.centered = true
	_sprite.scale = Vector2(0.86, 0.86)
	add_child(_sprite)

func _create_collision() -> void:
	var shape_node := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 26.0
	shape_node.shape = shape
	add_child(shape_node)

func _on_body_entered(body: Node2D) -> void:
	if body.has_method("take_hit"):
		body.take_hit()
