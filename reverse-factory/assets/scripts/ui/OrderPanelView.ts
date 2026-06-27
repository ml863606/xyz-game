import { _decorator, Component, Label, Vec3 } from 'cc';
import { ITEM_DEFS } from '../data/items';
import type { GameSnapshot } from '../core/GameTypes';
import { Theme } from './Theme';
import { makeLabel, makePanel } from './UiFactory';

const { ccclass } = _decorator;

@ccclass('OrderPanelView')
export class OrderPanelView extends Component {
  private rows: Label[] = [];

  build(): void {
    this.node.removeAllChildren();
    const title = makeLabel('OrderTitle', this.node, '荒唐订单', 28, 300, 44, Theme.accent);
    title.node.setPosition(new Vec3(0, 168, 0));

    for (let i = 0; i < 3; i += 1) {
      const row = makePanel(`OrderRow${i}`, this.node, 320, 92, i % 2 === 0 ? Theme.panel : Theme.panelAlt);
      row.setPosition(new Vec3(0, 76 - i * 104, 0));
      const label = makeLabel(`OrderRow${i}Text`, row, '', 20, 292, 74, Theme.text);
      label.node.setPosition(new Vec3(0, -2, 0));
      this.rows.push(label);
    }
  }

  render(snapshot: GameSnapshot): void {
    this.rows.forEach((row, index) => {
      const order = snapshot.orders[index];
      if (!order) {
        row.string = '';
        return;
      }

      row.string = order.lines
        .map((line) => {
          const done = order.delivered[line.itemId] ?? 0;
          return `${ITEM_DEFS[line.itemId].name} ${done}/${line.count}`;
        })
        .join('\n');
    });
  }
}

