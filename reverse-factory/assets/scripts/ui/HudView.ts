import { _decorator, Component, Label, Vec3 } from 'cc';
import type { GameSnapshot } from '../core/GameTypes';
import { Theme } from './Theme';
import { makeLabel } from './UiFactory';

const { ccclass } = _decorator;

@ccclass('HudView')
export class HudView extends Component {
  private title!: Label;
  private stats!: Label;
  private message!: Label;

  build(): void {
    this.node.removeAllChildren();
    this.title = makeLabel('Title', this.node, '反向合成工厂', 42, 520, 56, Theme.accent);
    this.title.node.setPosition(new Vec3(0, 54, 0));

    this.stats = makeLabel('Stats', this.node, '', 24, 760, 36, Theme.text);
    this.stats.node.setPosition(new Vec3(0, 8, 0));

    this.message = makeLabel('Message', this.node, '', 22, 820, 42, Theme.muted);
    this.message.node.setPosition(new Vec3(0, -38, 0));
  }

  render(snapshot: GameSnapshot): void {
    const jamPercent = Math.round(snapshot.jam * 100);
    this.stats.string = `分数 ${snapshot.score}  |  步数 ${snapshot.movesLeft}  |  连击 ${snapshot.combo}  |  堵塞 ${jamPercent}%`;
    this.message.string = snapshot.message;
    this.message.color = snapshot.isGameOver ? (snapshot.isWin ? Theme.success : Theme.danger) : Theme.muted;
  }
}

