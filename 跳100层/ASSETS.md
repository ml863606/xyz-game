# Asset Responsibility Split

## `.tres`

Use Godot resource files for engine-native assets and tunable UI/game parameters:

- `assets/materials/*.tres`: 3D platform, finish, bounce, danger, outline, and ground materials.
- `assets/ui/styles/*.tres`: HUD panel, stat card, control pill, center message, and progress bar styles.

These are edited in Godot or as text when changing color, border, roughness, shadow, or UI panel treatment.

## `.svg`

Use SVG for editable graphic symbols:

- `assets/sprites/*.svg`: 2D gameplay sprites for the player, platforms, backdrop, and finish flag.
- `assets/ui/icons/floor.svg`
- `assets/ui/icons/checkpoint.svg`
- `assets/ui/icons/respawn.svg`
- `assets/ui/icons/keys.svg`

These are the source files for sprites and HUD icons. Keep shapes bold, flat, and readable.

## Code

Scripts may generate the procedural level and assemble UI controls, but reusable visuals should live in `assets/` and be referenced with `preload("res://assets/...")`.

## Generation Quality

Use `ASSET_PROMPTS.md` as the baseline quality prompt library when producing new raster concepts, item icons, character art, or scene art. Keep generated source files outside code, then import or redraw the approved result into `assets/`.

## Redrawn Assets

The following runtime assets have been redrawn against the prompt quality rules with clean silhouettes, sharper outlines, stronger material separation, and clearer in-game readability:

- `assets/sprites/player_runner.svg`
- `assets/sprites/platform_normal.svg`
- `assets/sprites/platform_checkpoint.svg`
- `assets/sprites/platform_danger.svg`
- `assets/sprites/platform_bounce.svg`
- `assets/sprites/platform_moving.svg`
- `assets/sprites/platform_finish.svg`
- `assets/sprites/tower_backdrop.svg`
- `assets/sprites/finish_flag.svg`
- `assets/ui/icons/floor.svg`
- `assets/ui/icons/checkpoint.svg`
- `assets/ui/icons/respawn.svg`
- `assets/ui/icons/keys.svg`
