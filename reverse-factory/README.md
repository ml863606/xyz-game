# Reverse Factory

An anti-merge Cocos Creator mini-game prototype for fast launch experiments.

Instead of combining small items into bigger ones, players receive absurd finished goods and break them down into the parts required by customer orders.

## Stack

- Cocos Creator 3.8+
- TypeScript
- Target platforms: Douyin Mini Game, WeChat Mini Game
- AI editor control: DaxianLee/cocos-mcp-server

## Core Loop

1. A weird product enters the 5x5 factory grid.
2. Tap a product to split it into smaller parts.
3. Complete orders by delivering exact parts.
4. Manage limited grid space before the conveyor jams.

## Open In Cocos Creator

1. Install Cocos Creator 3.8.x.
2. Create a new empty 2D TypeScript project named `reverse-factory`.
3. Copy this folder's `assets` and `project.json` into the Cocos project.
4. Open the project in Cocos Creator.
5. Create a `Main` scene, add a root Canvas, then attach `GameRoot` to a node named `GameRoot`.

The scripts are intentionally data-driven, so AI tools can safely edit item chains, orders, levels, and UI text without touching engine internals.

## AI/MCP Setup

Use the Cocos Creator MCP plugin:

- GitHub: https://github.com/DaxianLee/cocos-mcp-server

Suggested workflow:

1. Install the plugin into Cocos Creator 3.8+.
2. Start the MCP server from the Cocos editor.
3. Connect Codex, Cursor, Claude Code, or another MCP-capable AI tool.
4. Ask the AI to create scene nodes matching the components in `assets/scripts/ui`.

Useful first AI tasks:

- Build the `Main` scene from `GameRoot`, `FactoryGridView`, `OrderPanelView`, and `HudView`.
- Generate placeholder sprites for the item ids in `assets/scripts/data/items.ts`.
- Add Douyin platform calls behind `assets/scripts/platform/PlatformAdapter.ts`.

## MVP Scope

- One 5x5 board
- Tap-to-split product chains
- Three active orders
- Score, combo, move count, jam meter
- Configurable item recipes and level goals

