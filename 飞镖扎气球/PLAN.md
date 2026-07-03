# Game Plan: Dart Balloon

## Goal

Build a vertical short-session Godot game where players drag to aim a dart, release to throw, pop balloons, avoid bombs, chain combos, and clear score targets within 60 seconds.

## Status

- [x] Create Godot project and godogen/Codex runtime files.
- [x] Implement procedural 2D arcade visuals.
- [x] Implement drag aiming, dart flight, balloon spawning, scoring, combo, time rewards, bomb penalties, round win/lose, restart, and pause.
- [x] Add missions, energy, Frenzy Time, wind HUD, shield balloons, clock balloons, and richer hit feedback.
- [x] Add power-up balloons with lightning chains, black-hole pulls, homing rockets, full-screen nuke shockwaves, flash, shake, and slow motion.
- [x] Add platform adapter boundary for future Douyin runtime binding.
- [x] Run Godot import/check validation.
- [x] Produce final visual proof bundle.

## Acceptance Criteria

- Runs from `res://scenes/main.tscn` at 720x1280.
- Mouse and touch drag inputs launch darts.
- Regular, gold, bomb, shield, clock, thunder, black-hole, rocket, and nuke balloons visibly spawn and resolve correctly.
- HUD shows score target, time, level, combo, best score, mission, wind, and energy/frenzy state.
- `godot --headless --import --quit` and `godot --headless --check-only --path .` pass.
- Final proof bundle under `screenshots/result/{N}/` shows gameplay progression. On this Windows machine the available Godot movie output is `capture.avi`; `ffmpeg` is not installed for MP4 conversion.

## Verification

- `godot --headless --import --quit` passed.
- `godot --headless --check-only --path .` passed.
- `screenshots/result/1/capture.avi` and five PNG screenshots were generated from `res://test/auto_main.tscn`.
