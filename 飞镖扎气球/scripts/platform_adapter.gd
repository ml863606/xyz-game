class_name PlatformAdapter
extends RefCounted

const BEST_SCORE_KEY := "best_score"

var initialized := false
var douyin_runtime := false

func init() -> void:
    initialized = true
    douyin_runtime = false

func is_douyin_runtime() -> bool:
    return douyin_runtime

func load_best_score() -> int:
    var cfg := ConfigFile.new()
    var err := cfg.load("user://dart_balloon.cfg")
    if err != OK:
        return 0
    return int(cfg.get_value("score", BEST_SCORE_KEY, 0))

func save_best_score(score: int) -> void:
    var cfg := ConfigFile.new()
    cfg.load("user://dart_balloon.cfg")
    cfg.set_value("score", BEST_SCORE_KEY, score)
    cfg.save("user://dart_balloon.cfg")

func share() -> void:
    # Douyin binding is intentionally kept out of gameplay for the first release.
    pass

