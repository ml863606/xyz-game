# AI Playbook

Use this project as a small, data-first Cocos game. Keep mechanics readable and avoid heavy framework code until the first playable version is approved.

## Project Rules

- Put gameplay rules in `assets/scripts/data` and `assets/scripts/core`.
- Put Cocos node binding code in `assets/scripts/ui`.
- Put platform-specific SDK calls in `assets/scripts/platform`.
- Do not hard-code Douyin APIs inside gameplay classes.
- Prefer adding new item chains and orders through data tables.

## Scene Contract

Expected scene tree:

```text
Canvas
  GameRoot
    Hud
    FactoryGrid
    OrderPanel
    ToastLayer
```

Attach components:

- `GameRoot.ts` on `GameRoot`
- `HudView.ts` on `Hud`
- `FactoryGridView.ts` on `FactoryGrid`
- `OrderPanelView.ts` on `OrderPanel`

## First Milestone

Create a playable gray-box scene with Cocos labels and buttons only:

- 25 grid cells
- Clickable item labels
- Three order rows
- Split, deliver, shuffle, and restart actions

After the gray-box loop feels good, replace labels with sprites and effects.

