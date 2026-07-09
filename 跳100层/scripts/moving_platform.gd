extends StaticBody2D

@export var axis := Vector2.RIGHT
@export var amplitude := 86.0
@export var speed := 1.0

var origin := Vector2.ZERO
var phase := 0.0

func _ready() -> void:
	origin = position
	phase = randf() * TAU

func _physics_process(delta: float) -> void:
	phase += delta * speed
	position = origin + axis.normalized() * sin(phase) * amplitude
