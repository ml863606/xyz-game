# Dart Balloon

## Dimension

2D vertical Godot 4 game, 720x1280 logical viewport.

## Scenes

### Main
- **File:** `res://scenes/main.tscn`
- **Root type:** `Node2D`
- **Script:** `res://scripts/game.gd`
- **Runtime children:** background, balloon layer, dart layer, effects layer, launcher, aim line, HUD canvas.

## Scripts

### Game
- **File:** `res://scripts/game.gd`
- Owns state, level configs, spawning, drag input, dart launching, scoring, round flow, HUD, and demo capture control.

### Balloon
- **File:** `res://scripts/balloon.gd`
- `Area2D` with procedural drawing, movement, collision, and pop transition.

### Dart
- **File:** `res://scripts/dart.gd`
- `Area2D` projectile with gravity, wind, trail, collision, and out-of-bounds expiry.

### LevelConfig
- **File:** `res://scripts/level_config.gd`
- Resource-like data object for target score, spawn interval, movement, bomb/gold odds, and wind.

### PlatformAdapter
- **File:** `res://scripts/platform_adapter.gd`
- Local persistence and future Douyin runtime/share boundary.

## Input Actions

| Action | Key |
| --- | --- |
| restart | R |
| pause | P |

Pointer/touch input is handled directly from mouse/touch events.

## Douyin Boundary

Gameplay never calls `tt.*` directly. Future Douyin-specific runtime code should be attached through `PlatformAdapter`.

