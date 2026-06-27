import { _decorator, Component, Label, Node, Vec3 } from 'cc';
import { ITEM_DEFS } from '../data/items';
import type { GameSnapshot } from '../core/GameTypes';
import { colorFromHex, Theme } from './Theme';
import { makeButton, makeLabel, makePanel, setSpriteColor } from './UiFactory';

const { ccclass } = _decorator;

@ccclass('FactoryGridView')
export class FactoryGridView extends Component {
  private cells: Node[] = [];
  private labels: Label[] = [];
  private selectedIndex = -1;
  private splitHandler: (index: number) => void = () => {};
  private deliverHandler: (index: number) => void = () => {};

  build(onSplit: (index: number) => void, onDeliver: (index: number) => void): void {
    this.splitHandler = onSplit;
    this.deliverHandler = onDeliver;
    this.node.removeAllChildren();
    this.cells = [];
    this.labels = [];

    const cellSize = 104;
    const gap = 10;
    const boardWidth = cellSize * 5 + gap * 4;
    const startX = -boardWidth / 2 + cellSize / 2;
    const startY = boardWidth / 2 - cellSize / 2;

    for (let index = 0; index < 25; index += 1) {
      const x = startX + (index % 5) * (cellSize + gap);
      const y = startY - Math.floor(index / 5) * (cellSize + gap);
      const cell = makePanel(`Cell${index}`, this.node, cellSize, cellSize, Theme.emptyCell);
      cell.setPosition(new Vec3(x, y, 0));

      const label = makeLabel(`Cell${index}Text`, cell, '', 18, cellSize - 12, cellSize - 12, Theme.text);
      label.node.setPosition(new Vec3(0, -2, 0));

      cell.on(Node.EventType.TOUCH_END, () => {
        this.selectedIndex = index;
        this.splitHandler(index);
      });

      cell.on(Node.EventType.TOUCH_CANCEL, () => {
        this.selectedIndex = -1;
      });

      this.cells.push(cell);
      this.labels.push(label);
    }

    const deliver = makeButton('DeliverSelected', this.node, '交付选中', 160, 52, () => {
      if (this.selectedIndex >= 0) {
        this.deliverHandler(this.selectedIndex);
      }
    });
    deliver.node.setPosition(new Vec3(0, -boardWidth / 2 - 48, 0));
  }

  render(snapshot: GameSnapshot): void {
    snapshot.cells.forEach((cellState) => {
      const cell = this.cells[cellState.index];
      const label = this.labels[cellState.index];
      if (!cell || !label) {
        return;
      }

      if (!cellState.itemId) {
        setSpriteColor(cell, Theme.emptyCell);
        label.string = '';
        return;
      }

      const def = ITEM_DEFS[cellState.itemId];
      setSpriteColor(cell, colorFromHex(def.color));
      label.string = def.name;
    });
  }
}

