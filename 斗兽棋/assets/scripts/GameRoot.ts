import { _decorator, Component, Label, Node, UITransform, Vec3, view } from 'cc';
import { AnimalChessGame, getBasePieceAt, getMovablePieceAt } from './core/AnimalChessGame';
import type { GameState, PlayerSide, Position } from './core/AnimalChessTypes';
import { DouyinSocketClient } from './net/DouyinSocketClient';
import type { RoomSnapshot } from './net/RoomProtocol';
import { createPlatformAdapter, type LoginResult, type PlatformAdapter } from './platform/PlatformAdapter';
import { AnimalChessBoardView } from './ui/AnimalChessBoardView';
import { Theme } from './ui/Theme';
import { makeButton, makeLabel, makePanel } from './ui/UiFactory';

const { ccclass } = _decorator;
const DEFAULT_WS_URL = 'ws://localhost:8787';

@ccclass('GameRoot')
export class GameRoot extends Component {
  private readonly localGame = new AnimalChessGame();
  private platform: PlatformAdapter = createPlatformAdapter();
  private socket = new DouyinSocketClient(DEFAULT_WS_URL);
  private login!: LoginResult;
  private mySide: PlayerSide = 'red';
  private localPlayerSide?: PlayerSide;
  private mode: 'local' | 'online' = 'local';
  private connected = false;
  private connecting = false;
  private roomId = '';
  private state: GameState = this.localGame.snapshot();
  private selected?: Position;
  private board!: AnimalChessBoardView;
  private statusLabel!: Label;
  private titleLabel!: Label;
  private bottomLabel!: Label;
  private rulesPanel!: Node;
  private rulesLabel!: Label;
  private rulesOpen = true;
  private rulesStep = 0;
  private readonly ruleSteps = [
    '第 1 步\n双方各有 8 张 牌。\n红方 8 张，蓝方 8 张，开局全部盖住。',
    '第 2 步\n大小：象 > 狮 > 虎 > 豹 > 狼 > 狗 > 猫 > 鼠。\n特殊：象能吃鼠，鼠也能吃象。',
    '第 3 步\n轮到你时，可以点一张背 牌翻开。\n翻出什么颜色，就决定阵营。',
    '第 4 步\n狮、虎、豹、狼、狗、猫可以上山。\n走到背 牌那格后，会压在背 牌上面。',
    '第 5 步\n老鼠不能上山。\n走到背 牌那格后，会钻到背 牌下面，显示地道标记。',
  ];

  onLoad(): void {
    this.ensureRootSize();
    this.buildScene();
    this.bindSocket();
  }

  async start(): Promise<void> {
    this.login = await this.platform.login();
    this.render();
  }

  private buildScene(): void {
    this.node.removeAllChildren();
    makePanel('Background', this.node, 720, 1280, Theme.background);

    this.titleLabel = makeLabel('Title', this.node, '斗兽棋', 40, 420, 64, Theme.text);
    this.titleLabel.node.setPosition(new Vec3(0, 560, 0));

    this.statusLabel = makeLabel('Status', this.node, '登录中...', 24, 620, 84, Theme.text);
    this.statusLabel.node.setPosition(new Vec3(0, 494, 0));

    const boardNode = new Node('AnimalChessBoard');
    this.node.addChild(boardNode);
    boardNode.addComponent(UITransform).setContentSize(520, 680);
    boardNode.setPosition(new Vec3(0, 40, 0));
    this.board = boardNode.addComponent(AnimalChessBoardView);
    this.board.build((position) => this.handleCellTap(position));

    this.bottomLabel = makeLabel('BottomStatus', this.node, '本地对弈：同屏轮流翻 牌或移动。', 22, 620, 70, Theme.text);
    this.bottomLabel.node.setPosition(new Vec3(0, -375, 0));

    const local = makeButton('LocalMode', this.node, '本地对弈', 150, 58, () => this.switchMode('local'), Theme.highlight);
    local.node.setPosition(new Vec3(-210, -458, 0));

    const online = makeButton('OnlineMode', this.node, '联网模式', 150, 58, () => this.switchMode('online'));
    online.node.setPosition(new Vec3(-50, -458, 0));

    const create = makeButton('CreateRoom', this.node, '创建房间', 140, 58, () => this.createRoom());
    create.node.setPosition(new Vec3(120, -458, 0));

    const ready = makeButton('Ready', this.node, '准备', 130, 58, () => this.ready());
    ready.node.setPosition(new Vec3(-160, -535, 0));

    const share = makeButton('ShareRoom', this.node, '分享', 130, 58, () => this.shareRoom());
    share.node.setPosition(new Vec3(0, -535, 0));

    const resign = makeButton('Resign', this.node, '认输', 130, 58, () => this.resign(), Theme.danger);
    resign.node.setPosition(new Vec3(160, -535, 0));

    this.rulesPanel = makePanel('RulesPanel', this.node, 620, 520, Theme.panel);
    this.rulesPanel.setPosition(new Vec3(0, 20, 0));
    this.rulesLabel = makeLabel('RulesText', this.rulesPanel, '', 28, 540, 300, Theme.text);
    this.rulesLabel.node.setPosition(new Vec3(0, 80, 0));
    const nextRule = makeButton('RulesNext', this.rulesPanel, '下一步', 150, 58, () => this.nextRule(), Theme.highlight);
    nextRule.node.setPosition(new Vec3(-90, -160, 0));
    const startRule = makeButton('RulesStart', this.rulesPanel, '开始游戏', 170, 58, () => this.closeRules(), Theme.blue);
    startRule.node.setPosition(new Vec3(110, -160, 0));
    this.renderRules();
  }

  private bindSocket(): void {
    this.socket.onStatus((status) => {
      if (status === 'open') {
        this.connected = true;
        this.statusLabel.string = '已连接服务，可创建或加入好友房';
      }
      if (status === 'closed' || status === 'error') {
        this.connected = false;
        this.statusLabel.string = '连接中断，可继续本地预览棋局';
      }
    });
    this.socket.onMessage((message) => {
      if (message.type === 'room_created' || message.type === 'room_joined') {
        this.mySide = message.side;
        this.applyRoom(message.room);
      } else if (message.type === 'room_state') {
        this.applyRoom(message.room);
      } else if (message.type === 'move_rejected') {
        this.state = message.state;
        this.bottomLabel.string = message.reason;
        this.platform.vibrateShort();
        this.render();
      } else if (message.type === 'error') {
        this.bottomLabel.string = message.message;
      }
    });
  }

  private async createRoom(): Promise<void> {
    if (this.mode !== 'online') {
      await this.switchMode('online');
    }
    if (!this.connected) {
      this.bottomLabel.string = '未连接对战服务';
      return;
    }
    this.socket.send({ type: 'create_room', playerId: this.login.playerId, nickname: this.login.nickname });
  }

  private ready(): void {
    if (this.mode !== 'online') {
      this.bottomLabel.string = '本地对弈不需要准备';
      return;
    }
    if (!this.roomId) {
      this.bottomLabel.string = '请先创建或加入房间';
      return;
    }

    this.socket.send({ type: 'ready', roomId: this.roomId, playerId: this.login.playerId });
  }

  private shareRoom(): void {
    if (this.mode !== 'online') {
      this.bottomLabel.string = '本地对弈不需要分享房间';
      return;
    }
    if (!this.roomId) {
      this.bottomLabel.string = '还没有可分享的房间';
      return;
    }

    this.platform.shareRoom({ roomId: this.roomId, title: `来下斗兽棋，房间 ${this.roomId}` });
  }

  private resign(): void {
    if (this.mode === 'online' && this.roomId) {
      this.socket.send({ type: 'resign', roomId: this.roomId, playerId: this.login.playerId });
      return;
    }

    this.state = this.localGame.resign(this.mode === 'local' ? this.state.turn : this.mySide);
    this.selected = undefined;
    this.render();
  }

  private handleCellTap(position: Position): void {
    if (this.rulesOpen) {
      return;
    }

    const piece = getMovablePieceAt(this.state, position);
    const activeSide = this.mode === 'local' ? this.state.turn : this.mySide;
    if (!this.selected) {
      const base = getBasePieceAt(this.state, position);
      if (base && !base.revealed) {
        this.flipCell(position);
        return;
      }
    }

    if (piece?.side === activeSide && this.state.turn === activeSide) {
      this.selected = position;
      this.render();
      return;
    }

    if (!this.selected) {
      this.bottomLabel.string = this.state.turn === activeSide ? '请选择己方棋子或翻开背 牌' : '等待对方行动';
      return;
    }

    if (this.mode === 'online' && this.roomId) {
      this.socket.send({
        type: 'move_piece',
        roomId: this.roomId,
        playerId: this.login.playerId,
        from: this.selected,
        to: position,
        moveNumber: this.state.moveNumber,
      });
      this.selected = undefined;
      return;
    }

    const result = this.localGame.movePiece(this.selected, position, activeSide);
    this.state = result.state;
    this.bottomLabel.string = result.reason ?? this.state.message;
    this.selected = undefined;
    this.render();
  }

  private flipCell(position: Position): void {
    if (this.rulesOpen) {
      return;
    }

    const activeSide = this.mode === 'local' ? this.state.turn : this.mySide;
    if (this.state.turn !== activeSide) {
      this.bottomLabel.string = '等待对方行动';
      return;
    }

    if (this.mode === 'online' && this.roomId) {
      this.socket.send({ type: 'flip_piece', roomId: this.roomId, playerId: this.login.playerId, position, moveNumber: this.state.moveNumber });
      return;
    }

    const result = this.localGame.flip(position, activeSide, this.mode === 'local' ? `local-${activeSide}` : this.login?.playerId);
    this.state = result.state;
    if (this.mode === 'local' && result.assignedSide) {
      this.localPlayerSide = result.assignedSide;
      this.mySide = result.assignedSide;
    } else if (this.mode === 'online' && result.assignedSide) {
      this.mySide = result.assignedSide;
    } else {
      this.mySide = this.mode === 'local' ? this.localPlayerSide ?? this.mySide : this.mySide;
    }
    this.bottomLabel.string = result.reason ?? this.state.message;
    this.render();
  }

  private applyRoom(room: RoomSnapshot): void {
    this.mode = 'online';
    this.roomId = room.roomId;
    this.state = room.state;
    this.localGame.replaceState(room.state);
    const me = room.players.find((player) => player.id === this.login.playerId);
    if (me?.side) {
      this.mySide = me.side;
    }
    this.render(room);
  }

  private async switchMode(mode: 'local' | 'online'): Promise<void> {
    this.mode = mode;
    this.selected = undefined;
    if (mode === 'local') {
      this.roomId = '';
      this.localGame.reset();
      this.state = this.localGame.snapshot();
      this.mySide = 'red';
      this.localPlayerSide = undefined;
      this.showRules();
      this.render();
      return;
    }

    this.bottomLabel.string = '联网模式：创建或加入好友房。';
    await this.ensureConnected();
    this.render();
  }

  private async ensureConnected(): Promise<void> {
    if (this.connected || this.connecting) {
      return;
    }

    this.connecting = true;
    await this.socket
      .connect()
      .catch(() => {
        this.connected = false;
        this.statusLabel.string = '未连接对战服务，可先启动房间服务';
      })
      .finally(() => {
        this.connecting = false;
      });
  }

  private render(room?: RoomSnapshot): void {
    const legalMoves = this.selected
      ? this.localGame
          .getLegalMovesForPiece(getMovablePieceAt(this.state, this.selected)?.id ?? '', this.mySide)
          .map((move) => move.to)
      : [];

    this.board.render(this.state, this.selected, legalMoves, this.mode === 'local' ? this.localPlayerSide ?? this.mySide : this.mySide);
    this.titleLabel.string = this.roomId ? `斗兽棋 ${this.roomId}` : `斗兽棋 ${this.mode === 'local' ? '本地' : '联网'}`;
    const sideName = this.mySide === 'red' ? '红方' : '蓝方';
    const turnName = this.state.turn === 'red' ? '红方' : '蓝方';
    const players = room?.players
      .map((player) => `${player.side === 'red' ? '红' : '蓝'}:${player.nickname}${player.ready ? ' 已准备' : ''}`)
      .join('  ');
    this.statusLabel.color = this.state.turn === 'red' ? Theme.red : Theme.blue;
    this.statusLabel.string =
      this.mode === 'local' ? `本地对弈，当前${turnName}行动` : `${sideName}视角，当前${turnName}行动${players ? `\n${players}` : ''}`;
    this.bottomLabel.string = this.state.winner
      ? `${this.state.winner === 'red' ? '红方' : '蓝方'}获胜：${this.state.message}`
      : this.state.message;
  }

  private showRules(): void {
    this.rulesOpen = true;
    this.rulesStep = 0;
    this.renderRules();
  }

  private nextRule(): void {
    this.rulesStep = Math.min(this.ruleSteps.length - 1, this.rulesStep + 1);
    this.renderRules();
  }

  private closeRules(): void {
    if (this.rulesStep < this.ruleSteps.length - 1) {
      this.nextRule();
      return;
    }

    this.rulesOpen = false;
    this.renderRules();
  }

  private renderRules(): void {
    if (!this.rulesPanel || !this.rulesLabel) {
      return;
    }

    (this.rulesPanel as unknown as { active: boolean }).active = this.rulesOpen;
    this.rulesLabel.string = this.ruleSteps[this.rulesStep];
  }

  private ensureRootSize(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    const visibleSize = view.getVisibleSize();
    transform.setContentSize(visibleSize.width || 720, visibleSize.height || 1280);
  }
}
