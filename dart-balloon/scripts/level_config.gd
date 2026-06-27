class_name LevelConfig
extends Resource

var number: int
var target_score: int
var spawn_interval: float
var move_speed: float
var bomb_chance: float
var gold_chance: float
var shield_chance: float
var clock_chance: float
var wind_strength: float

func _init(
        p_number: int = 1,
        p_target_score: int = 240,
        p_spawn_interval: float = 0.75,
        p_move_speed: float = 90.0,
        p_bomb_chance: float = 0.08,
        p_gold_chance: float = 0.12,
        p_shield_chance: float = 0.0,
        p_clock_chance: float = 0.0,
        p_wind_strength: float = 0.0) -> void:
    number = p_number
    target_score = p_target_score
    spawn_interval = p_spawn_interval
    move_speed = p_move_speed
    bomb_chance = p_bomb_chance
    gold_chance = p_gold_chance
    shield_chance = p_shield_chance
    clock_chance = p_clock_chance
    wind_strength = p_wind_strength
