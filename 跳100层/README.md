# Jump 100 Floors

Godot 4 + GDScript 2D prototype inspired by CF map-workshop jump maps.

## Play

- Move: `A/D` or arrow left/right
- Jump: `Space`, `W`, or arrow up

## Game Loop

Climb 100 stacked 2D platforms. Every 10 floors is a checkpoint. Falling sends the player back to the last checkpoint. Platform widths vary per floor and the next platform is placed from the previous platform edge, creating offset jumps instead of vertical stacking. Later floors introduce narrow platforms, wobbling platforms, moving platforms, small pads, and bounce pads.

## Assets

Visual materials are stored as independent Godot resource files under `assets/materials/` and loaded from `scripts/game.gd` with `preload("res://assets/...")`. Gameplay code should reference assets by path instead of constructing reusable visual assets inline.

UI assets follow the same split:

- `assets/ui/styles/*.tres` stores Godot UI style resources such as panels, cards, pills, and progress bars.
- `assets/ui/icons/*.svg` stores editable vector icons for HUD symbols.
- `assets/sprites/*.svg` stores editable 2D gameplay sprites: player, platforms, backdrop, and finish flag.
- `scripts/game.gd` only assembles UI nodes and preloads those files.

## Run

```powershell
godot --path .
```
