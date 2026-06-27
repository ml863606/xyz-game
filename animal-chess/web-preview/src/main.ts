import { AnimalChessGame, getPieceAt, terrainAt } from '../../assets/scripts/core/AnimalChessGame';
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

const board = mustGet<HTMLDivElement>('board');
const status = mustGet<HTMLParagraphElement>('status');
const players = mustGet<HTMLDivElement>('players');
const message = mustGet<HTMLDivElement>('message');
const roomCode = mustGet<HTMLDivElement>('roomCode');
const createRoom = mustGet<HTMLButtonElement>('createRoom');
const joinRoom = mustGet<HTMLButtonElement>('joinRoom');
const ready = mustGet<HTMLButtonElement>('ready');
const share = mustGet<HTMLButtonElement>('share');
const resign = mustGet<HTMLButtonElement>('resign');

const animalArt: Record<string, string> = {
  rat: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#f1d2b4" d="M15 33c0-12 8-21 19-21 9 0 16 6 18 15 5 1 8 4 8 8 0 6-6 10-14 10H25c-6 0-10-5-10-12Z"/><circle cx="21" cy="21" r="8" fill="#e8b992"/><circle cx="48" cy="34" r="2.8" fill="#2a2118"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="M18 43c-8 6-13 5-15 1"/></svg>',
  cat: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#f3c57b" d="m17 19 8 7 7-3 7 3 8-7 2 18c0 10-8 17-17 17s-17-7-17-17l2-18Z"/><circle cx="26" cy="37" r="3" fill="#2a2118"/><circle cx="38" cy="37" r="3" fill="#2a2118"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="m29 45 3 2 3-2"/></svg>',
  dog: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#d99b5e" d="M16 29c0-10 7-17 16-17s16 7 16 17v9c0 9-7 16-16 16s-16-7-16-16v-9Z"/><path fill="#7a4d2d" d="M13 21c-6 3-8 12-3 18 7 0 11-7 10-15l-7-3Zm38 0 7 3c1 8-3 15-10 15-5-6-3-15 3-18Z"/><circle cx="26" cy="35" r="3" fill="#2a2118"/><circle cx="38" cy="35" r="3" fill="#2a2118"/><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  wolf: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#a6ad9d" d="m14 15 12 11 6-4 6 4 12-11-3 24c-2 9-8 15-15 15s-13-6-15-15l-3-24Z"/><path fill="#fff8e6" d="M25 43h14l-7 8-7-8Z"/><circle cx="25" cy="34" r="3" fill="#2a2118"/><circle cx="39" cy="34" r="3" fill="#2a2118"/></svg>',
  leopard: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#e6b84f" d="M13 34c0-12 8-21 19-21s19 9 19 21-8 20-19 20-19-8-19-20Z"/><g fill="#6d4722"><circle cx="23" cy="27" r="3"/><circle cx="39" cy="27" r="3"/><circle cx="20" cy="42" r="2.6"/><circle cx="44" cy="42" r="2.6"/><circle cx="32" cy="35" r="2.4"/></g><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  tiger: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#dc8a2d" d="M14 31c0-11 8-20 18-20s18 9 18 20v5c0 10-8 18-18 18s-18-8-18-18v-5Z"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="M25 15v10m14-10v10M19 29l10 4m16-4-10 4M19 42l10-2m16 2-10-2"/><circle cx="26" cy="36" r="3" fill="#2a2118"/><circle cx="38" cy="36" r="3" fill="#2a2118"/></svg>',
  lion: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#9f6128" d="M8 34c0-14 10-25 24-25s24 11 24 25S46 58 32 58 8 48 8 34Z"/><path fill="#e3ad4c" d="M18 35c0-8 6-14 14-14s14 6 14 14-6 14-14 14-14-6-14-14Z"/><circle cx="27" cy="35" r="3" fill="#2a2118"/><circle cx="37" cy="35" r="3" fill="#2a2118"/><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  elephant: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#b8c0c9" d="M12 33c0-12 9-21 20-21s20 9 20 21v7c0 8-6 14-14 14H26c-8 0-14-6-14-14v-7Z"/><path fill="#9aa6b2" d="M8 28c-4 7-1 17 8 20 5-7 3-17-4-22l-4 2Zm48 0 4-2c7 5 9 15 4 22-9-3-12-13-8-20Z"/><path stroke="#eef3f7" stroke-linecap="round" stroke-width="5" d="M32 38v13"/><circle cx="25" cy="34" r="3" fill="#2a2118"/><circle cx="39" cy="34" r="3" fill="#2a2118"/></svg>',
};

createRoom.addEventListener('click', () => {
  socket.send({ type: 'create_room', playerId, nickname });
});

joinRoom.addEventListener('click', () => {
  const input = window.prompt('输入房间号', roomId);
  if (input) {
    roomId = input.trim().toUpperCase();
    socket.send({ type: 'join_room', roomId, playerId, nickname });
  }
});

ready.addEventListener('click', () => {
  if (roomId) {
    socket.send({ type: 'ready', roomId, playerId });
  }
});

share.addEventListener('click', async () => {
  if (!roomId) {
    message.textContent = '还没有房间号';
    return;
  }

  await navigator.clipboard?.writeText(roomId);
  message.textContent = `房号 ${roomId} 已复制`;
});

resign.addEventListener('click', () => {
  if (roomId) {
    socket.send({ type: 'resign', roomId, playerId });
  }
});

socket.onStatus((next) => {
  status.textContent = next === 'open' ? '服务器已连接' : `连接状态：${next}`;
});

socket.onMessage((serverMessage) => {
  if (serverMessage.type === 'room_created' || serverMessage.type === 'room_joined') {
    mySide = serverMessage.side;
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === 'room_state') {
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === 'move_rejected') {
    state = serverMessage.state;
    message.textContent = serverMessage.reason;
    selected = undefined;
    render();
  } else if (serverMessage.type === 'error') {
    message.textContent = serverMessage.message;
  }
});

socket.connect().then(() => {
  if (roomId) {
    socket.send({ type: 'join_room', roomId, playerId, nickname });
  }
}).catch(() => {
  status.textContent = '未连接服务器，当前为本地规则预览';
});

render();

function applyRoom(room: RoomSnapshot): void {
  roomId = room.roomId;
  state = room.state;
  game.replaceState(room.state);
  const me = room.players.find((player) => player.id === playerId);
  if (me?.side) {
    mySide = me.side;
  }
  render(room);
}

function render(room?: RoomSnapshot): void {
  roomCode.textContent = roomId || '未建房';
  message.textContent = state.winner
    ? `${state.winner === 'red' ? '红方' : '蓝方'}获胜：${state.message}`
    : state.message;
  status.textContent = `${mySide === 'red' ? '红方' : '蓝方'}视角 · 当前${state.turn === 'red' ? '红方' : '蓝方'}行动`;

  players.innerHTML = '';
  const roomPlayers = room?.players ?? [
    { id: 'red-local', nickname: '红方', side: 'red' as const, connected: true, ready: true },
    { id: 'blue-local', nickname: '蓝方', side: 'blue' as const, connected: true, ready: true },
  ];
  for (const player of roomPlayers) {
    const item = document.createElement('div');
    item.className = 'player';
    item.classList.toggle('active', player.side === state.turn && state.status === 'playing');
    item.textContent = `${player.side === 'red' ? '红方' : '蓝方'} ${player.nickname} ${player.ready ? '已准备' : '未准备'} ${player.connected ? '' : '离线'}`;
    players.appendChild(item);
  }

  const selectedPiece = selected ? getPieceAt(state, selected) : undefined;
  const legalKeys = new Set(
    selectedPiece ? game.getLegalMovesForPiece(selectedPiece.id, mySide).map((move) => keyOf(move.to)) : [],
  );

  board.innerHTML = '';
  for (let y = 0; y < state.board.height; y += 1) {
    for (let x = 0; x < state.board.width; x += 1) {
      const position = { x, y };
      const cell = document.createElement('button');
      const terrain = terrainAt(position);
      const piece = getPieceAt(state, position);
      cell.type = 'button';
      cell.className = `cell ${terrainClass(terrain)}`;
      cell.classList.toggle('selected', selected ? keyOf(selected) === keyOf(position) : false);
      cell.classList.toggle('legal', legalKeys.has(keyOf(position)));
      cell.setAttribute('aria-label', cellLabel(piece, terrain, position));
      cell.addEventListener('click', () => tapCell(position));

      if (piece) {
        const token = document.createElement('span');
        token.className = `piece ${piece.side}`;
        token.innerHTML = `${animalArt[piece.kind]}<span class="piece-name">${PIECE_DEFS[piece.kind].shortName}</span>`;
        cell.appendChild(token);
      } else {
        const label = document.createElement('span');
        label.className = 'terrain-label';
        label.textContent = terrainLabel(terrain);
        cell.appendChild(label);
      }

      board.appendChild(cell);
    }
  }
}

function tapCell(position: Position): void {
  const piece = getPieceAt(state, position);
  if (piece?.side === mySide && state.turn === mySide) {
    selected = position;
    render();
    return;
  }

  if (!selected) {
    message.textContent = state.turn === mySide ? '请选择己方棋子' : '等待对方行动';
    return;
  }

  if (roomId) {
    socket.send({ type: 'move_piece', roomId, playerId, from: selected, to: position, moveNumber: state.moveNumber });
    selected = undefined;
    return;
  }

  const result = game.movePiece(selected, position, mySide);
  state = result.state;
  message.textContent = result.reason ?? state.message;
  selected = undefined;
  render();
}

function terrainClass(terrain: string): string {
  if (terrain === 'water') {
    return 'water';
  }
  if (terrain.endsWith('trap')) {
    return 'trap';
  }
  if (terrain.endsWith('den')) {
    return 'den';
  }
  return 'land';
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

function cellLabel(piece: ReturnType<typeof getPieceAt>, terrain: string, position: Position): string {
  if (piece) {
    return `${position.x + 1}列${position.y + 1}行 ${piece.side === 'red' ? '红方' : '蓝方'}${PIECE_DEFS[piece.kind].name}`;
  }

  return `${position.x + 1}列${position.y + 1}行 ${terrainLabel(terrain) || '空地'}`;
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
