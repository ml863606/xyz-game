class_name PlayerJumper
extends CharacterBody2D

signal died
signal floor_changed(floor_number: int)

@export var move_speed: float = 360.0
@export var acceleration: float = 2600.0
@export var gravity: float = 1800.0
@export var jump_velocity: float = -660.0
@export var boost_velocity: float = -980.0
@export var world_width: float = 900.0
@export var start_y: float = 1120.0
@export var floor_gap: float = 128.0

var frozen: bool = false
var highest_floor: int = 0
var _squash: float = 0.0
var _facing: float = 1.0
var _time: float = 0.0
var _sprite: Sprite2D

const PLAYER_TEXTURE := preload("res://assets/sprites/player.svg")

func _ready() -> void:
	collision_layer = 2
	collision_mask = 1
	_create_collision()
	_create_visual()

func _physics_process(delta: float) -> void:
	_time += delta
	if frozen:
		velocity = Vector2.ZERO
		_update_visual()
		return

	var input_axis := Input.get_axis("move_left", "move_right")
	if absf(input_axis) > 0.01:
		_facing = signf(input_axis)
	var target_x := input_axis * move_speed
	velocity.x = move_toward(velocity.x, target_x, acceleration * delta)
	velocity.y += gravity * delta

	if is_on_floor() and velocity.y >= 0.0:
		_jump(jump_velocity)

	move_and_slide()
	_wrap_screen()
	_update_floor()
	_squash = maxf(_squash - delta * 5.0, 0.0)
	_update_visual()

func apply_boost() -> void:
	_jump(boost_velocity)

func take_hit() -> void:
	died.emit()

func reset_to(pos: Vector2) -> void:
	global_position = pos
	velocity = Vector2.ZERO
	frozen = false
	highest_floor = 0

func _jump(power: float) -> void:
	velocity.y = power
	_squash = 1.0

func _wrap_screen() -> void:
	if global_position.x < -26.0:
		global_position.x = world_width + 26.0
	elif global_position.x > world_width + 26.0:
		global_position.x = -26.0

func _update_floor() -> void:
	var floor_number := clampi(int(round((start_y - global_position.y) / floor_gap)), 0, 100)
	if floor_number > highest_floor:
		highest_floor = floor_number
		floor_changed.emit(highest_floor)

func _create_visual() -> void:
	_sprite = Sprite2D.new()
	_sprite.name = "Visual"
	_sprite.texture = PLAYER_TEXTURE
	_sprite.centered = true
	_sprite.position = Vector2(0.0, -6.0)
	_sprite.scale = Vector2(0.78, 0.78)
	add_child(_sprite)
	_update_visual()

func _update_visual() -> void:
	if _sprite == null:
		return
	var bob := sin(_time * 8.0) * 2.0
	var squash_scale := Vector2(1.0 + _squash * 0.13, 1.0 - _squash * 0.15)
	_sprite.position = Vector2(0.0, -6.0 + bob)
	_sprite.scale = Vector2(0.78 * _facing, 0.78) * squash_scale

func _create_collision() -> void:
	if get_node_or_null("CollisionShape2D") != null:
		return
	var shape_node := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 24.0
	shape_node.shape = shape
	add_child(shape_node)
