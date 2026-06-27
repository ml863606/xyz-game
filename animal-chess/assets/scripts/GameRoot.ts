import { _decorator, Component, Label, Node, UITransform, Vec3, view } from 'cc';
import { AnimalChessGame, getPieceAt } from './core/AnimalChessGame';
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
  private roomId = '';
  private state: GameState = this.localGame.snapshot();
  private selected?: Position;
  private board!: AnimalChessBoardView;
  private statusLabel!: Label;
  private titleLabel!: Label;
  private bottomLabel!: Label;

  onLoad(): void {
    this.ensureRootSize();
    this.buildScene();
    this.bindSocket();
  }

  async start(): Promise<void> {
    this.login = await this.platform.login();
    this.render();
    await this.socket.connect().catch(() => {
      this.statusLabel.string = '本地预览：未连接对战服务器';
    });
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

    this.bottomLabel = makeLabel('BottomStatus', this.node, '创建房间，分享给好友开始对战。', 22, 620, 70, Theme.text);
    this.bottomLabel.node.setPosition(new Vec3(0, -375, 0));

    const create = makeButton('CreateRoom', this.node, '创建房间', 160, 58, () => this.createRoom());
    create.node.setPosition(new Vec3(-180, -458, 0));

    const ready = makeButton('Ready', this.node, '准备', 130, 58, () => this.ready());
    ready.node.setPosition(new Vec3(0, -458, 0));

    const share = makeButton('ShareRoom', this.node, '分享', 130, 58, () => this.shareRoom());
    share.node.setPosition(new Vec3(160, -458, 0));

    const resign = makeButton('Resign', this.node, '认输', 130, 58, () => this.resign(), Theme.danger);
    resign.node.setPosition(new Vec3(0, -535, 0));
  }

  private bindSocket(): void {
    this.socket.onStatus((status) => {
      if (status === 'open') {
        this.statusLabel.string = '已连接服务器，可创建或加入好友房';
      }
      if (status === 'closed' || status === 'error') {
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

  private createRoom(): void {
    this.socket.send({ type: 'create_room', playerId: this.login.playerId, nickname: this.login.nickname });
  }

  private ready(): void {
    if (!this.roomId) {
      this.bottomLabel.string = '请先创建或加入房间';
      return;
    }

    this.socket.send({ type: 'ready', roomId: this.roomId, playerId: this.login.playerId });
  }

  private shareRoom(): void {
    if (!this.roomId) {
      this.bottomLabel.string = '还没有可分享的房间';
      return;
    }

    this.platform.shareRoom({ roomId: this.roomId, title: `来下斗兽棋，房间 ${this.roomId}` });
  }

  private resign(): void {
    if (this.roomId) {
      this.socket.send({ type: 'resign', roomId: this.roomId, playerId: this.login.playerId });
    }
  }

  private handleCellTap(position: Position): void {
    const piece = getPieceAt(this.state, position);
    if (piece?.side === this.mySide && this.state.turn === this.mySide) {
      this.selected = position;
      this.render();
      return;
    }

    if (!this.selected) {
      this.bottomLabel.string = this.state.turn === this.mySide ? '请选择己方棋子' : '等待对方行动';
      return;
    }

    if (this.roomId) {
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

    const result = this.localGame.movePiece(this.selected, position, this.mySide);
    this.state = result.state;
    this.bottomLabel.string = result.reason ?? this.state.message;
    this.selected = undefined;
    this.render();
  }

  private applyRoom(room: RoomSnapshot): void {
    this.roomId = room.roomId;
    this.state = room.state;
    this.localGame.replaceState(room.state);
    const me = room.players.find((player) => player.id === this.login.playerId);
    if (me?.side) {
      this.mySide = me.side;
    }
    this.render(room);
  }

  private render(room?: RoomSnapshot): void {
    const legalMoves = this.selected
      ? this.localGame
          .getLegalMovesForPiece(getPieceAt(this.state, this.selected)?.id ?? '', this.mySide)
          .map((move) => move.to)
      : [];

    this.board.render(this.state, this.selected, legalMoves);
    this.titleLabel.string = this.roomId ? `斗兽棋 ${this.roomId}` : '斗兽棋';
    const sideName = this.mySide === 'red' ? '红方' : '蓝方';
    const turnName = this.state.turn === 'red' ? '红方' : '蓝方';
    const players = room?.players.map((player) => `${player.side === 'red' ? '红' : '蓝'}:${player.nickname}${player.ready ? ' 已准备' : ''}`).join('  ');
    this.statusLabel.string = `${sideName}视角 · 当前${turnName}行动${players ? `\n${players}` : ''}`;
    this.bottomLabel.string = this.state.winner
      ? `${this.state.winner === 'red' ? '红方' : '蓝方'}获胜：${this.state.message}`
      : this.state.message;
  }

  private ensureRootSize(): void {
    const transform = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform);
    const visibleSize = view.getVisibleSize();
    transform.setContentSize(visibleSize.width || 720, visibleSize.height || 1280);
  }
}
