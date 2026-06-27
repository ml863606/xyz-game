import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import { getPieceAt, terrainAt } from '../core/AnimalChessGame';
import { BOARD_HEIGHT, BOARD_WIDTH, PIECE_DEFS, type GameState, type Position } from '../core/AnimalChessTypes';
import { makeLabel, makePanel, setSpriteColor } from './UiFactory';
import { Theme } from './Theme';

const { ccclass } = _decorator;

interface CellView {
  node: Node;
  label: Label;
  position: Position;
}

@ccclass('AnimalChessBoardView')
export class AnimalChessBoardView extends Component {
  private cells: CellView[] = [];
  private legalKeys = new Set<string>();
  private selectedKey = '';
  private onCellTap: (position: Position) => void = () => {};

  build(onCellTap: (position: Position) => void): void {
    this.onCellTap = onCellTap;
    this.node.removeAllChildren();
    this.cells = [];

    const cellSize = 66;
    const gap = 4;
    const totalWidth = BOARD_WIDTH * cellSize + (BOARD_WIDTH - 1) * gap;
    const totalHeight = BOARD_HEIGHT * cellSize + (BOARD_HEIGHT - 1) * gap;

    for (let y = 0; y < BOARD_HEIGHT; y += 1) {
      for (let x = 0; x < BOARD_WIDTH; x += 1) {
        const position = { x, y };
        const node = makePanel(`Cell-${x}-${y}`, this.node, cellSize, cellSize, Theme.land);
        node.setPosition(
          new Vec3(x * (cellSize + gap) - totalWidth / 2 + cellSize / 2, totalHeight / 2 - y * (cellSize + gap) - cellSize / 2, 0),
        );
        node.on(Node.EventType.TOUCH_END, () => this.onCellTap(position));
        const label = makeLabel(`Piece-${x}-${y}`, node, '', 30, cellSize - 8, cellSize - 8, Theme.darkText);
        this.cells.push({ node, label, position });
      }
    }
  }

  render(state: GameState, selected?: Position, legalMoves: Position[] = []): void {
    this.selectedKey = selected ? keyOf(selected) : '';
    this.legalKeys = new Set(legalMoves.map(keyOf));

    for (const cell of this.cells) {
      const terrain = terrainAt(cell.position);
      const piece = getPieceAt(state, cell.position);
      let color = terrain === 'water' ? Theme.water : Theme.land;
      if (terrain.endsWith('trap')) {
        color = Theme.trap;
      }
      if (terrain.endsWith('den')) {
        color = Theme.den;
      }
      if (this.legalKeys.has(keyOf(cell.position))) {
        color = Theme.highlight;
      }
      if (this.selectedKey === keyOf(cell.position)) {
        color = piece?.side === 'blue' ? Theme.blue : Theme.red;
      }

      setSpriteColor(cell.node, color);
      cell.label.string = piece ? `${piece.side === 'red' ? '红' : '蓝'}${PIECE_DEFS[piece.kind].shortName}` : terrainLabel(terrain);
      cell.label.color = piece ? Theme.text : Theme.darkText;
    }
  }
}

function keyOf(position: Position): string {
  return `${position.x},${position.y}`;
}

function terrainLabel(terrain: string): string {
  if (terrain === 'water') {
    return '河';
  }
  if (terrain.endsWith('trap')) {
    return '陷';
  }
  if (terrain.endsWith('den')) {
    return '穴';
  }
  return '';
}
