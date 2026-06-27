# Launch Plan

This is the fastest path from prototype to Douyin Mini Game test build.

## Day 1: Playable Gray Box

- Open with Cocos Creator 3.8.x.
- Create `Main.scene`.
- Add `Canvas/GameRoot`.
- Attach `GameRoot.ts`.
- Run in browser preview and tune:
  - board size
  - max moves
  - order reward
  - pressure spawn chance

## Day 2: Visual Identity

Keep the style silly, readable, and cheap to produce:

- Factory board with colored workstations.
- Absurd product icons.
- Squashy split effect.
- Short order completion burst.

Avoid complex character animation for v1.

## Day 3: Platform Layer

Implement in `assets/scripts/platform/PlatformAdapter.ts`:

- Douyin login if needed.
- Rewarded video revive or shuffle.
- Share card.
- Cloud or local save.
- Vibration and audio policy handling.

## Day 4: Content Expansion

Add:

- 30 item definitions.
- 40 order templates.
- 10 level configs.
- One infinite challenge mode.

Let AI generate data first, then manually review for duplicate or boring orders.

## Day 5: Build And Submit Test

In Cocos Creator:

1. Project > Build.
2. Platform: ByteDance Mini Game.
3. Check orientation and package size.
4. Open in Douyin developer tools.
5. Test on real device.
6. Submit test version.

## MCP Prompt

Use this after installing `DaxianLee/cocos-mcp-server`:

```text
Open this Cocos Creator 3.8 project and create a Main scene for Reverse Factory.
Build a 1280x720 landscape Canvas with a GameRoot node.
Attach assets/scripts/GameRoot.ts to GameRoot.
Run preview, verify that 25 grid cells, order panel, HUD, restart, shuffle, and share buttons are visible.
If any component binding is missing, create the node structure required by AI_PLAYBOOK.md.
Do not rewrite the gameplay logic unless the TypeScript compiler reports an error.
```

