---
name: mxl-game-design
description: Game creation and maintenance rules for the xyz-game workspace. Use when the user asks to make, build, design, implement, polish, or revise a game, especially Chinese requests matching "做xxx游戏", "做一个xxx游戏", "做XX小游戏", "改游戏素材", "游戏不好看", or game prototype work under D:\WorkSpace\mxl\xyz\xyz-game.
---

# MXL Game Design

## Core Rule

When building or revising a game, keep gameplay code, scene composition, and visual assets separated.

Do not treat art as inline gameplay code. Inline `_draw()` shapes are acceptable only for quick debugging or throwaway prototypes. For maintainable game work, put replaceable visuals in asset files and have logic scripts load or reference those assets.

## Workflow

1. Locate the target game project first.
2. Identify the engine/framework already used by the project.
3. Preserve existing project conventions and native engine patterns.
4. Put visual assets under an `assets/` folder or the engine's established asset directory.
5. Keep gameplay scripts focused on rules, movement, collisions, score, state, and signals.
6. Keep reusable presentation values in scenes, resources, config, or asset files instead of hardcoding them into logic scripts.
7. Validate with the project-native command after changes.
8. If a playable game is expected, run it locally after verification.

## Asset Maintenance Rule

For requests like "素材太丑了", "换素材", "改角色", "改平台", "游戏不好看", or similar visual polish tasks:

- Prefer editing or replacing files in `assets/`.
- Prefer wiring visuals through `Sprite2D`, textures, scenes, resources, prefab nodes, or the engine equivalent.
- Avoid changing gameplay scripts unless the current architecture prevents asset replacement.
- If code must change, first create a stable asset boundary so future visual changes do not require touching core gameplay code.
- Keep dynamic runtime text, score, state, collision, and generated layout in code when appropriate; these are not static art assets.

## Godot Guidance

For Godot projects:

- Use scenes, resources, signals, groups, typed GDScript, and exported variables.
- Use `Sprite2D`, `Texture2D`, `.tscn`, `.tres`, SVG/PNG assets, or resource references for visuals.
- Avoid placing final art directly in `_draw()` inside gameplay classes.
- Keep collision shapes and gameplay behavior independent from sprite replacement.
- Validate with:

```powershell
godot --headless --import --quit --path .
godot --headless --check-only --path .
```

If a visual refactor follows an earlier prototype, migrate inline drawing to assets first, then continue polishing.
