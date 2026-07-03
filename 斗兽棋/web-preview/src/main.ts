import {
  AnimalChessGame,
  getBasePieceAt,
  getCoveringPiece,
  getHiddenPiece,
  getMovablePieceAt,
} from '../../assets/scripts/core/AnimalChessGame';
import { PIECE_DEFS, type GameState, type PlayerSide, type Position } from '../../assets/scripts/core/AnimalChessTypes';
import { DouyinSocketClient } from '../../assets/scripts/net/DouyinSocketClient';
import type { RoomSnapshot } from '../../assets/scripts/net/RoomProtocol';

const game = new AnimalChessGame();
const socket = new DouyinSocketClient('ws://localhost:8787');
const playerId = getPlayerId();
let nickname = `玩家${playerId.slice(-4)}`;
let state = game.snapshot();
let selected: Position | undefined;
let roomId = new URLSearchParams(location.search).get('roomId') ?? '';
let mySide: PlayerSide = 'red';
let localPlayerSide: PlayerSide | undefined;
let connected = false;
let mode: 'local' | 'online' = roomId ? 'online' : 'local';
let connecting = false;
let rulesOpen = true;
let rulesStep = 0;
let lastRulesMoveNumber = -1;

const board = mustGet<HTMLDivElement>('board');
const status = mustGet<HTMLParagraphElement>('status');
const players = mustGet<HTMLDivElement>('players');
const message = mustGet<HTMLDivElement>('message');
const roomCode = mustGet<HTMLDivElement>('roomCode');
const createRoom = mustGet<HTMLButtonElement>('createRoom');
const joinRoom = mustGet<HTMLButtonElement>('joinRoom');
const ready = mustGet<HTMLButtonElement>('ready');
const share = mustGet<HTMLButtonElement>('share');
const localMode = mustGet<HTMLButtonElement>('localMode');
const onlineMode = mustGet<HTMLButtonElement>('onlineMode');
const restart = mustGet<HTMLButtonElement>('restart');
const resign = mustGet<HTMLButtonElement>('resign');
const rulesOverlay = mustGet<HTMLElement>('rulesOverlay');
const rulesDemo = mustGet<HTMLDivElement>('rulesDemo');
const rulesText = mustGet<HTMLParagraphElement>('rulesText');
const rulesPrev = mustGet<HTMLButtonElement>('rulesPrev');
const rulesNext = mustGet<HTMLButtonElement>('rulesNext');
const rulesStart = mustGet<HTMLButtonElement>('rulesStart');
const ruleDots = Array.from(document.querySelectorAll<HTMLElement>('.rule-dot'));

const ruleSteps = [
  '第 1 步：双方各有 8 张 牌。红方 8 张，蓝方 8 张，开局全部盖住。',
  '第 2 步：大小顺序是 象 > 狮 > 虎 > 豹 > 狼 > 狗 > 猫 > 鼠。特殊：象能吃鼠，鼠也能吃象。',
  '第 3 步：轮到你时，可以点一张背 牌翻开。翻出来是什么颜色，就决定阵营。',
  '第 4 步：狮、虎、豹、狼、狗、猫可以上山。走到背 牌那格后，会压在背 牌上面。',
  '第 5 步：老鼠不能上山。老鼠走到背 牌那格后，会钻到背 牌下面，显示地道标记。',
];

localMode.addEventListener('click', () => switchMode('local'));

onlineMode.addEventListener('click', () => switchMode('online'));

rulesPrev.addEventListener('click', () => {
  rulesStep = Math.max(0, rulesStep - 1);
  renderRules();
});

rulesNext.addEventListener('click', () => {
  rulesStep = Math.min(ruleSteps.length - 1, rulesStep + 1);
  renderRules();
});

rulesStart.addEventListener('click', () => {
  rulesOpen = false;
  renderRules();
});

createRoom.addEventListener('click', () => {
  if (mode !== 'online') {
    switchMode('online');
    return;
  }
  if (!connected) {
    setMessage('正在连接房间服务');
    void ensureConnected();
    return;
  }

  socket.send({ type: 'create_room', playerId, nickname });
});

joinRoom.addEventListener('click', () => {
  if (mode !== 'online') {
    switchMode('online');
    return;
  }
  if (!connected) {
    setMessage('正在连接房间服务');
    void ensureConnected();
    return;
  }

  const input = window.prompt('输入房间号', roomId);
  if (input) {
    roomId = input.trim().toUpperCase();
    socket.send({ type: 'join_room', roomId, playerId, nickname });
  }
});

ready.addEventListener('click', () => {
  if (!roomId) {
    setMessage('请先创建或加入房间');
    return;
  }

  socket.send({ type: 'ready', roomId, playerId });
});

share.addEventListener('click', async () => {
  if (!roomId) {
    setMessage('还没有房间号');
    return;
  }

  await navigator.clipboard?.writeText(roomId);
  setMessage(`房号 ${roomId} 已复制`);
});

restart.addEventListener('click', () => {
  if (mode === 'online') {
    setMessage('联网模式请重新创建房间');
    return;
  }

  game.reset();
  state = game.snapshot();
  mySide = 'red';
  localPlayerSide = undefined;
  selected = undefined;
  showRules();
  render();
});

resign.addEventListener('click', () => {
  if (mode === 'online' && roomId) {
    socket.send({ type: 'resign', roomId, playerId });
    return;
  }

  state = game.resign(mySide);
  selected = undefined;
  render();
});

socket.onStatus((next) => {
  connected = next === 'open';
  if (connected) {
    if (mode === 'online') {
      status.textContent = '房间服务已连接';
    }
    return;
  }

  if (mode === 'online') {
    status.textContent = `连接状态：${connectionLabel(next)}`;
  }
});

socket.onMessage((serverMessage) => {
  if (serverMessage.type === 'room_created' || serverMessage.type === 'room_joined') {
    mySide = serverMessage.side;
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === 'room_state') {
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === 'move_rejected') {
    state = serverMessage.state;
    setMessage(serverMessage.reason);
    selected = undefined;
    render();
  } else if (serverMessage.type === 'error') {
    setMessage(serverMessage.message);
  }
});

if (mode === 'online') {
  void ensureConnected().then(() => {
    if (roomId && connected) {
      socket.send({ type: 'join_room', roomId, playerId, nickname });
    }
  });
}

renderRules();
render();

function switchMode(next: 'local' | 'online'): void {
  mode = next;
  selected = undefined;
  if (mode === 'local') {
    roomId = '';
    game.reset();
    state = game.snapshot();
    mySide = 'red';
    localPlayerSide = undefined;
    setMessage(state.message);
    showRules();
    render();
    return;
  }

  setMessage(connected ? '可创建或加入好友房' : '正在连接房间服务');
  void ensureConnected();
  render();
}

async function ensureConnected(): Promise<void> {
  if (connected || connecting) {
    return;
  }

  connecting = true;
  await socket
    .connect()
    .catch(() => {
      connected = false;
      if (mode === 'online') {
        status.textContent = '未连接房间服务，请先启动联网服务';
      }
    })
    .finally(() => {
      connecting = false;
    });
}

function applyRoom(room: RoomSnapshot): void {
  const shouldShowRules = state.status !== 'playing' && room.state.status === 'playing';
  roomId = room.roomId;
  state = room.state;
  game.replaceState(room.state);
  const me = room.players.find((player) => player.id === playerId);
  if (me?.side) {
    mySide = me.side;
  }
  if (shouldShowRules || (state.moveNumber === 0 && lastRulesMoveNumber !== 0)) {
    showRules();
  }
  render(room);
}

function render(room?: RoomSnapshot): void {
  lastRulesMoveNumber = state.moveNumber;
  document.body.classList.toggle('local-mode', mode === 'local');
  document.body.classList.toggle('online-mode', mode === 'online');
  localMode.classList.toggle('active', mode === 'local');
  onlineMode.classList.toggle('active', mode === 'online');
  roomCode.textContent = mode === 'online' ? roomId || '联网模式' : '本地对弈';
  setMessage(state.winner ? `${sideName(state.winner)}获胜：${state.message}` : state.message);
  status.textContent =
    mode === 'online'
      ? `${sideName(mySide)}视角，当前${sideName(state.turn)}行动`
      : `本地对弈，当前${sideName(state.turn)}行动`;

  players.innerHTML = '';
  const roomPlayers =
    mode === 'online'
      ? room?.players ?? [
          { id: 'online-self', nickname: '我', side: mySide, connected: connected, ready: Boolean(roomId) },
          { id: 'online-opponent', nickname: '对手', side: mySide === 'red' ? ('blue' as const) : ('red' as const), connected: false, ready: false },
        ]
      : [
          { id: 'red-local', nickname: '本地红方', side: 'red' as const, connected: true, ready: true },
          { id: 'blue-local', nickname: '本地蓝方', side: 'blue' as const, connected: true, ready: true },
        ];
  for (const player of roomPlayers) {
    const item = document.createElement('div');
    const side = player.side ?? 'red';
    item.className = `player ${side}`;
    item.classList.toggle('active', side === state.turn && state.status === 'playing');
    const badge = document.createElement('span');
    badge.className = `side-badge ${side}`;
    badge.textContent = sideName(side);
    const name = document.createElement('span');
    name.textContent = ` ${player.nickname} ${player.ready ? '已准备' : '未准备'} ${player.connected ? '' : '离线'}`;
    item.append(badge, name);
    players.appendChild(item);
  }

  const selectedPiece = selected ? getMovablePieceAt(state, selected) : undefined;
  const legalKeys = new Set(
    selectedPiece ? game.getLegalMovesForPiece(selectedPiece.id, selectedPiece.side).map((move) => keyOf(move.to)) : [],
  );

  board.innerHTML = '';
  for (let y = 0; y < state.board.height; y += 1) {
    for (let x = 0; x < state.board.width; x += 1) {
      const position = { x, y };
      const cell = document.createElement('button');
      const base = getBasePieceAt(state, position);
      const top = base ? getCoveringPiece(state, base.id) : getMovablePieceAt(state, position);
      const hidden = base ? getHiddenPiece(state, base.id) : undefined;
      cell.type = 'button';
      cell.className = 'cell land';
      cell.classList.toggle('selected', selected ? keyOf(selected) === keyOf(position) : false);
      cell.classList.toggle('legal', legalKeys.has(keyOf(position)));
      cell.setAttribute('aria-label', cellLabel(base, top, hidden, position));
      cell.addEventListener('click', () => tapCell(position));

      if (base) {
        cell.appendChild(makePieceToken(base, 'base'));
      }
      if (top) {
        cell.appendChild(makePieceToken(top, 'top'));
      }
      if (hidden) {
        const marker = document.createElement('span');
        marker.className = `tunnel ${hidden.side}`;
        marker.textContent = `地道:${PIECE_DEFS[hidden.kind].shortName}`;
        cell.appendChild(marker);
      }

      board.appendChild(cell);
    }
  }
}

function tapCell(position: Position): void {
  if (rulesOpen) {
    return;
  }

  const piece = getMovablePieceAt(state, position);
  const activeSide = mode === 'local' ? state.turn : mySide;
  if (!selected) {
    const base = getBasePieceAt(state, position);
    if (base && !base.revealed) {
      flipCell(position);
      return;
    }
  }

  if (piece?.side === activeSide && state.turn === activeSide) {
    selected = position;
    render();
    return;
  }

  if (!selected) {
    setMessage(state.turn === activeSide ? '请选择己方棋子或翻开背 牌' : '等待对方行动');
    return;
  }

  if (mode === 'online' && roomId) {
    socket.send({ type: 'move_piece', roomId, playerId, from: selected, to: position, moveNumber: state.moveNumber });
    selected = undefined;
    return;
  }

  const result = game.movePiece(selected, position, activeSide);
  state = result.state;
  setMessage(result.reason ?? state.message);
  selected = undefined;
  render();
}

function flipCell(position: Position): void {
  if (rulesOpen) {
    return;
  }

  const activeSide = mode === 'local' ? state.turn : mySide;
  if (state.turn !== activeSide) {
    setMessage('等待对方行动');
    return;
  }

  if (mode === 'online' && roomId) {
    socket.send({ type: 'flip_piece', roomId, playerId, position, moveNumber: state.moveNumber });
    return;
  }

  const result = game.flip(position, activeSide, mode === 'local' ? `local-${activeSide}` : playerId);
  state = result.state;
  if (mode === 'local' && result.assignedSide) {
    localPlayerSide = result.assignedSide;
    mySide = result.assignedSide;
  } else if (mode === 'online' && result.assignedSide) {
    mySide = result.assignedSide;
  } else {
    mySide = mode === 'local' ? localPlayerSide ?? mySide : mySide;
  }
  setMessage(result.reason ?? state.message);
  selected = undefined;
  render();
}

function makePieceToken(piece: NonNullable<ReturnType<typeof getBasePieceAt>>, layer: 'base' | 'top'): HTMLSpanElement {
  const token = document.createElement('span');
  const visibleClass = piece.revealed ? piece.side : 'back';
  token.className = `piece ${visibleClass} ${layer}`;
  token.textContent = piece.revealed ? PIECE_DEFS[piece.kind].shortName : '背';
  return token;
}

function setMessage(text: string): void {
  message.innerHTML = '';
  const normalized = text.replace(/背牌/g, '背 牌').replace(/翻牌/g, '翻 牌').replace(/张牌/g, '张 牌').replace(/开牌/g, '开 牌');
  const pattern = /(红方|蓝方)/g;
  let cursor = 0;
  for (const match of normalized.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      message.append(document.createTextNode(normalized.slice(cursor, index)));
    }
    const side = match[0] === '红方' ? 'red' : 'blue';
    const badge = document.createElement('span');
    badge.className = `message-side ${side}`;
    badge.textContent = match[0];
    message.append(badge);
    cursor = index + match[0].length;
  }
  if (cursor < normalized.length) {
    message.append(document.createTextNode(normalized.slice(cursor)));
  }
}

function showRules(): void {
  rulesOpen = true;
  rulesStep = 0;
  renderRules();
}

function renderRules(): void {
  rulesOverlay.classList.toggle('hidden', !rulesOpen);
  rulesText.textContent = ruleSteps[rulesStep];
  rulesDemo.className = `rules-demo step-${rulesStep}`;
  rulesPrev.disabled = rulesStep === 0;
  rulesNext.disabled = rulesStep === ruleSteps.length - 1;
  rulesStart.disabled = rulesStep !== ruleSteps.length - 1;
  rulesNext.textContent = rulesStep === ruleSteps.length - 2 ? '最后一步' : '下一步';
  rulesStart.textContent = '我知道了，开始';
  ruleDots.forEach((dot, index) => dot.classList.toggle('active', index === rulesStep));
}

function sideName(side: PlayerSide): string {
  return side === 'red' ? '红方' : '蓝方';
}

function connectionLabel(next: string): string {
  const labels: Record<string, string> = {
    idle: '未连接',
    connecting: '连接中',
    closed: '已断开',
    error: '连接失败',
  };
  return labels[next] ?? next;
}

function cellLabel(
  base: ReturnType<typeof getBasePieceAt>,
  top: ReturnType<typeof getMovablePieceAt>,
  hidden: ReturnType<typeof getHiddenPiece>,
  position: Position,
): string {
  const parts = [`${position.x + 1}列${position.y + 1}行`];
  if (base) {
    parts.push(base.revealed ? `${sideName(base.side)}${PIECE_DEFS[base.kind].name}` : '背 牌');
  }
  if (top) {
    parts.push(`上方${sideName(top.side)}${PIECE_DEFS[top.kind].name}`);
  }
  if (hidden) {
    parts.push(`地道${sideName(hidden.side)}${PIECE_DEFS[hidden.kind].name}`);
  }
  return parts.join(' ');
}

function keyOf(position: Position): string {
  return `${position.x},${position.y}`;
}

function getPlayerId(): string {
  const stored = localStorage.getItem('animal-chess-player-id');
  if (stored) {
    return stored;
  }

  const id = `web-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem('animal-chess-player-id', id);
  return id;
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
}
