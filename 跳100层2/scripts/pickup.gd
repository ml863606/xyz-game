class_name JumpPickup
extends Area2D

signal collected(kind: StringName, value: int)

@export var kind: StringName = &"gem"
@export var value: int = 10

var _time: float = 0.0
var _sprite: Sprite2D

const GEM_TEXTURE := preload("res://assets/sprites/gem.svg")
const SPRING_TEXTURE := preload("res://assets/sprites/spring.svg")

func setup(pos: Vector2, pickup_kind: StringName, pickup_value: int) -> void:
	position = pos
	kind = pickup_kind
	value = pickup_value

func _ready() -> void:
	add_to_group("pickups")
	collision_layer = 8
	collision_mask = 2
	_create_collision()
	_create_visual()
	body_entered.connect(_on_body_entered)

func _process(delta: float) -> void:
	_time += delta
	var pulse := 1.0 + sin(_time * 5.0) * 0.055
	scale = Vector2.ONE * pulse
	rotation = sin(_time * 2.2) * 0.12

func _create_visual() -> void:
	_sprite = Sprite2D.new()
	_sprite.name = "Visual"
	_sprite.texture = SPRING_TEXTURE if kind == &"spring" else GEM_TEXTURE
	_sprite.centered = true
	_sprite.scale = Vector2(0.82, 0.82) if kind == &"spring" else Vector2(0.92, 0.92)
	add_child(_sprite)

func _create_collision() -> void:
	var shape_node := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 24.0
	shape_node.shape = shape
	add_child(shape_node)

func _on_body_entered(body: Node2D) -> void:
	if body is PlayerJumper:
		if kind == &"spring":
			(body as PlayerJumper).apply_boost()
		collected.emit(kind, value)
		queue_free()
