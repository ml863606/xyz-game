class_name JumpPlatform
extends StaticBody2D

@export var size: Vector2 = Vector2(220.0, 22.0)
@export var floor_number: int = 0
@export var moving: bool = false
@export var move_span: float = 120.0
@export var move_speed: float = 1.0
@export var checkpoint: bool = false

var _origin_x: float
var _phase: float
var _label: Label
var _sprite: Sprite2D

const PLATFORM_NORMAL_TEXTURE := preload("res://assets/sprites/platform_normal.svg")
const PLATFORM_MOVING_TEXTURE := preload("res://assets/sprites/platform_moving.svg")
const PLATFORM_CHECKPOINT_TEXTURE := preload("res://assets/sprites/platform_checkpoint.svg")

func setup(pos: Vector2, platform_size: Vector2, number: int, is_moving: bool, is_checkpoint: bool) -> void:
	position = pos
	size = platform_size
	floor_number = number
	moving = is_moving
	checkpoint = is_checkpoint

func _ready() -> void:
	add_to_group("platforms")
	collision_layer = 1
	collision_mask = 0
	_origin_x = position.x
	_phase = float((floor_number * 37) % 360) * 0.0174533
	_create_collision()
	_create_visual()
	_create_label()

func _physics_process(delta: float) -> void:
	if not moving:
		return
	_phase += delta * move_speed
	position.x = _origin_x + sin(_phase) * move_span

func _create_visual() -> void:
	_sprite = Sprite2D.new()
	_sprite.name = "Visual"
	if checkpoint:
		_sprite.texture = PLATFORM_CHECKPOINT_TEXTURE
		_sprite.scale = Vector2(size.x / 420.0, 0.88)
	elif moving:
		_sprite.texture = PLATFORM_MOVING_TEXTURE
		_sprite.scale = Vector2(size.x / 360.0, 0.86)
	else:
		_sprite.texture = PLATFORM_NORMAL_TEXTURE
		_sprite.scale = Vector2(size.x / 360.0, 0.86)
	_sprite.centered = true
	_sprite.position = Vector2(0.0, 2.0)
	_sprite.z_index = -1
	add_child(_sprite)

func _create_collision() -> void:
	var shape_node := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	shape_node.shape = shape
	add_child(shape_node)

func _create_label() -> void:
	_label = Label.new()
	_label.text = "%02d" % floor_number
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_label.size = Vector2(70.0, 28.0)
	_label.position = Vector2(-35.0, -50.0)
	_label.add_theme_font_size_override("font_size", 19)
	_label.add_theme_color_override("font_color", Color(0.88, 0.96, 1.0, 0.9))
	_label.add_theme_color_override("font_shadow_color", Color(0.0, 0.0, 0.0, 0.65))
	_label.add_theme_constant_override("shadow_offset_x", 1)
	_label.add_theme_constant_override("shadow_offset_y", 2)
	add_child(_label)
