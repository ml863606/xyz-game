# Dart Balloon

竖屏飞镖扎气球 Godot 4 小游戏原型，目标是先形成可玩单机版本，再验证抖音小游戏中心上架路径。

## Run

Open this folder in Godot 4 and run `res://scenes/main.tscn`.

## Controls

- Drag from the lower launcher area to aim.
- Release to throw a dart.
- `R` restarts the current round.
- `P` pauses and resumes.

## Game Loop

- 60 seconds per round.
- Complete the round mission shown in the HUD for bonus score and time.
- Pop regular balloons for score, combo, and energy.
- Pop gold balloons for score, extra energy, and +3 seconds.
- Shield balloons need two hits and are worth more.
- Clock balloons freeze the countdown briefly.
- Thunder balloons chain lightning through nearby targets.
- Black hole balloons pull nearby targets inward before exploding.
- Rocket balloons fire homing rockets from the launcher.
- Rainbow nuke balloons create a full-screen shockwave and slow motion.
- Fill the energy meter to trigger Frenzy Time: faster darts, double score, and bigger bursts.
- Avoid bombs because they break combo, remove 5 seconds, and drain energy.
- Watch the wind indicator from later levels because darts drift in flight.
- Reach the target score to enter the next level.

## Douyin Mini Game Notes

- First release is single-player and offline.
- No ad, ranking, backend, or payment integration is included.
- `scripts/platform_adapter.gd` isolates score persistence and future share/runtime hooks so `tt.*` bindings do not leak into gameplay.
- Before submission, prepare app information, icon, at least three screenshots, user/privacy agreements, and required filing/copyright materials in the Douyin developer console.
