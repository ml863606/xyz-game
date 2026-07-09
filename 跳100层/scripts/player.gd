extends CharacterBody2D
class_name JumpPlayer

signal died

@export var move_speed := 310.0
@export var acceleration := 2100.0
@export var friction := 1700.0
@export var jump_velocity := -690.0
@export var air_control := 0.68

var gravity: float = ProjectSettings.get_setting("physics/2d/default_gravity")
var spawn_position := Vector2.ZERO
var spawn_floor := 1
var sprite: Sprite2D

func _ready() -> void:
	_create_body()

func _physics_process(delta: float) -> void:
	var direction := Input.get_axis("move_left", "move_right")
	var control := 1.0 if is_on_floor() else air_control
	if abs(direction) > 0.01:
		velocity.x = move_toward(velocity.x, direction * move_speed, acceleration * control * delta)
		sprite.flip_h = direction < 0.0
	else:
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)

	if not is_on_floor():
		velocity.y += gravity * 1.55 * delta
	elif Input.is_action_just_pressed("jump"):
		velocity.y = jump_velocity

	move_and_slide()

	if global_position.y > 520.0:
		died.emit()

func set_spawn(point: Vector2, floor_number: int) -> void:
	spawn_position = point
	spawn_floor = floor_number

func respawn() -> void:
	global_position = spawn_position
	velocity = Vector2.ZERO

func bounce(strength: float) -> void:
	velocity.y = -abs(strength)

func _create_body() -> void:
	var collision := CollisionShape2D.new()
	var shape := CapsuleShape2D.new()
	shape.radius = 15.0
	shape.height = 42.0
	collision.shape = shape
	collision.position = Vector2(0.0, -24.0)
	add_child(collision)

	sprite = Sprite2D.new()
	sprite.texture = preload("res://assets/sprites/player_runner.svg")
	sprite.position = Vector2(0.0, -31.0)
	sprite.scale = Vector2(0.84, 0.84)
	add_child(sprite)
