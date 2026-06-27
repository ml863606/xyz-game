import { _decorator, Component, Node, UITransform, Vec3, view } from 'cc';
import { ReverseFactoryGame } from './core/ReverseFactoryGame';
import type { GameSnapshot } from './core/GameTypes';
import { createPlatformAdapter, type PlatformAdapter } from './platform/PlatformAdapter';
import { FactoryGridView } from './ui/FactoryGridView';
import { HudView } from './ui/HudView';
import { OrderPanelView } from './ui/OrderPanelView';
import { Theme } from './ui/Theme';
import { makeButton, makePanel } from './ui/UiFactory';

const { ccclass } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {
  private game = new ReverseFactoryGame();
  private platform: PlatformAdapter = createPlatformAdapter();
  private hud!: HudView;
  private grid!: FactoryGridView;
  private orders!: OrderPanelView;

  onLoad(): void {
    this.ensureRootSize();
    this.buildScene();
    this.game.onChange((snapshot) => this.render(snapshot));
  }

  start(): void {
    this.game.start();
  }

  private buildScene(): void {
    this.node.removeAllChildren();
    makePanel('Background', this.node, 1280, 720, Theme.background);

    const hudNode = new Node('Hud');
    this.node.addChild(hudNode);
    hudNode.addComponent(UITransform).setContentSize(900, 140);
    hudNode.setPosition(new Vec3(-120, 270, 0));
    this.hud = hudNode.addComponent(HudView);
    this.hud.build();

    const gridNode = new Node('FactoryGrid');
    this.node.addChild(gridNode);
    gridNode.addComponent(UITransform).setContentSize(600, 660);
    gridNode.setPosition(new Vec3(-240, -30, 0));
    this.grid = gridNode.addComponent(FactoryGridView);
    this.grid.build(
      (index) => {
        this.platform.vibrateShort();
        this.game.splitCell(index);
      },
      (index) => {
        this.platform.vibrateShort();
        this.game.deliverFromCell(index);
      },
    );

    const orderNode = new Node('OrderPanel');
    this.node.addChild(orderNode);
    orderNode.addComponent(UITransform).setContentSize(340, 420);
    orderNode.setPosition(new Vec3(390, 78, 0));
    this.orders = orderNode.addComponent(OrderPanelView);
    this.orders.build();

    const restart = makeButton('Restart', this.node, '重开今天', 160, 54, () => this.game.start());
    restart.node.setPosition(new Vec3(390, -198, 0));

    const shuffle = makeButton('Shuffle', this.node, '全厂洗牌', 160, 54, () => this.game.shuffleBoard());
    shuffle.node.setPosition(new Vec3(390, -264, 0));

    const share = makeButton('Share', this.node, '炫耀订单', 160, 54, () => {
      this.platform.share({ title: '我在反向合成工厂拆出了荒唐订单' });
    });
    share.node.setPosition(new Vec3(390, -330, 0));
  }

  private render(snapshot: GameSnapshot): void {
    this.hud.render(snapshot);
    this.grid.render(snapshot);
    this.orders.render(snapshot);
  }

  private ensureRootSize(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    const visibleSize = view.getVisibleSize();
    transform.setContentSize(visibleSize.width || 1280, visibleSize.height || 720);
  }
}

