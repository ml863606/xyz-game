import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import { getBasePieceAt, getCoveringPiece, getHiddenPiece, getMovablePieceAt } from '../core/AnimalChessGame';
import { BOARD_HEIGHT, BOARD_WIDTH, PIECE_DEFS, type GameState, type PlayerSide, type Position } from '../core/AnimalChessTypes';
import { makeLabel, makePanel, setSpriteColor } from './UiFactory';
import { Theme } from './Theme';

const { ccclass } = _decorator;

interface CellView {
  node: Node;
  baseNode: Node;
  baseLabel: Label;
  topNode: Node;
  topLabel: Label;
  markerLabel: Label;
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

    const cellSize = 104;
    const gap = 3;
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

        const baseNode = makePanel(`BaseToken-${x}-${y}`, node, 74, 74, Theme.pieceFace);
        const baseLabel = makeLabel(`BaseLabel-${x}-${y}`, baseNode, '', 38, 68, 68, Theme.darkText);
        const topNode = makePanel(`TopToken-${x}-${y}`, node, 58, 58, Theme.pieceFace);
        topNode.setPosition(new Vec3(22, 22, 0));
        const topLabel = makeLabel(`TopLabel-${x}-${y}`, topNode, '', 30, 52, 52, Theme.darkText);
        const markerLabel = makeLabel(`Marker-${x}-${y}`, node, '', 16, 80, 22, Theme.text);
        markerLabel.node.setPosition(new Vec3(0, -42, 0));

        this.cells.push({ node, baseNode, baseLabel, topNode, topLabel, markerLabel, position });
      }
    }
  }

  render(state: GameState, selected?: Position, legalMoves: Position[] = [], mySide: PlayerSide = 'red'): void {
    this.selectedKey = selected ? keyOf(selected) : '';
    this.legalKeys = new Set(legalMoves.map(keyOf));

    for (const cell of this.cells) {
      let color = Theme.land;
      if (this.legalKeys.has(keyOf(cell.position))) {
        color = Theme.highlight;
      }
      if (this.selectedKey === keyOf(cell.position)) {
        color = Theme.board;
      }

      const base = getBasePieceAt(state, cell.position);
      const top = base ? getCoveringPiece(state, base.id) : getMovablePieceAt(state, cell.position);
      const hidden = base ? getHiddenPiece(state, base.id) : undefined;

      setSpriteColor(cell.node, color);
      renderToken(cell.baseNode, cell.baseLabel, base, mySide, false);
      renderToken(cell.topNode, cell.topLabel, top, mySide, true);
      cell.markerLabel.string = hidden ? `地道:${PIECE_DEFS[hidden.kind].shortName}` : '';
      cell.markerLabel.color = hidden?.side === 'red' ? Theme.red : Theme.blue;
    }
  }
}

function renderToken(node: Node, label: Label, piece: ReturnType<typeof getBasePieceAt>, mySide: PlayerSide, compact: boolean): void {
  setNodeActive(node, Boolean(piece));
  if (!piece) {
    label.string = '';
    return;
  }

  if (!piece.revealed) {
    setSpriteColor(node, Theme.panelAlt);
    label.string = '背';
    label.color = Theme.text;
    return;
  }

  setSpriteColor(node, Theme.pieceFace);
  label.string = compact ? PIECE_DEFS[piece.kind].shortName : PIECE_DEFS[piece.kind].shortName;
  label.color = piece.side === 'red' ? Theme.red : Theme.blue;
}

function keyOf(position: Position): string {
  return `${position.x},${position.y}`;
}

function setNodeActive(node: Node, active: boolean): void {
  (node as unknown as { active: boolean }).active = active;
}
