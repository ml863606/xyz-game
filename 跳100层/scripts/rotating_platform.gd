extends StaticBody2D

@export var wobble_speed := 1.4
@export var wobble_angle := 0.12

var phase := 0.0

func _ready() -> void:
	phase = randf() * TAU

func _physics_process(delta: float) -> void:
	phase += delta * wobble_speed
	rotation = sin(phase) * wobble_angle
