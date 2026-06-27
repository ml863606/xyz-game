import { createServer } from 'node:http';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import { AnimalChessGame, createInitialState } from '../assets/scripts/core/AnimalChessGame';
import type { PlayerSide } from '../assets/scripts/core/AnimalChessTypes';
import type { ClientMessage, PlayerInfo, RoomSnapshot, ServerMessage } from '../assets/scripts/net/RoomProtocol';

const PORT = Number(process.env.PORT ?? 8787);
const TURN_MS = 30_000;
const DISCONNECT_GRACE_MS = 60_000;

interface Room {
  id: string;
  game: AnimalChessGame;
  players: PlayerInfo[];
  sockets: Map<string, WebSocket>;
  turnDeadlineAt?: number;
  timeoutTimer?: NodeJS.Timeout;
  disconnectTimers: Map<string, NodeJS.Timeout>;
}

const rooms = new Map<string, Room>();
const server = createServer();
const wss = new WebSocketServer({ server });

wss.on('connection', (socket) => {
  socket.on('message', (raw) => {
    const parsed = parseMessage(raw.toString());
    if (!parsed) {
      send(socket, { type: 'error', code: 'bad_json', message: '请求无法解析' });
      return;
    }

    handleMessage(socket, parsed);
  });

  socket.on('close', () => {
    for (const room of rooms.values()) {
      const player = room.players.find((item) => room.sockets.get(item.id) === socket);
      if (player) {
        markDisconnected(room, player.id);
      }
    }
  });
});

export function startRoomServer(port = PORT): Promise<void> {
  return new Promise((resolveStart, reject) => {
    const onError = (error: Error): void => {
      server.off('listening', onListening);
      reject(error);
    };
    const onListening = (): void => {
      server.off('error', onError);
      console.log(`Animal Chess room server listening on ws://localhost:${port}`);
      resolveStart();
    };

    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port);
  });
}

export function stopRoomServer(): Promise<void> {
  for (const room of rooms.values()) {
    clearTurnTimer(room);
    room.disconnectTimers.forEach((timer) => clearTimeout(timer));
    room.sockets.forEach((socket) => socket.close());
  }
  rooms.clear();

  return new Promise((resolveStop) => {
    wss.close(() => {
      if (!server.listening) {
        resolveStop();
        return;
      }

      server.close(() => resolveStop());
    });
  });
}

function handleMessage(socket: WebSocket, message: ClientMessage): void {
  switch (message.type) {
    case 'create_room':
      createRoom(socket, message.playerId, message.nickname);
      break;
    case 'join_room':
      joinRoom(socket, message.roomId, message.playerId, message.nickname);
      break;
    case 'ready':
      setReady(message.roomId, message.playerId);
      break;
    case 'move_piece':
      movePiece(socket, message);
      break;
    case 'resign':
      resign(message.roomId, message.playerId);
      break;
    case 'heartbeat':
      heartbeat(message.roomId, message.playerId);
      break;
    case 'reconnect':
      reconnect(socket, message.roomId, message.playerId, message.nickname);
      break;
  }
}

function createRoom(socket: WebSocket, playerId: string, nickname: string): void {
  const room: Room = {
    id: makeRoomId(),
    game: new AnimalChessGame(createInitialState('waiting')),
    players: [{ id: playerId, nickname, side: 'red', connected: true, ready: false }],
    sockets: new Map([[playerId, socket]]),
    disconnectTimers: new Map(),
  };
  rooms.set(room.id, room);
  send(socket, { type: 'room_created', room: snapshotRoom(room), side: 'red' });
}

function joinRoom(socket: WebSocket, roomId: string, playerId: string, nickname: string): void {
  const room = rooms.get(roomId);
  if (!room) {
    send(socket, { type: 'error', code: 'missing_room', message: '房间不存在' });
    return;
  }

  const existing = room.players.find((player) => player.id === playerId);
  if (existing) {
    reconnect(socket, roomId, playerId, nickname);
    return;
  }

  if (room.players.length >= 2) {
    send(socket, { type: 'error', code: 'room_full', message: '房间已满' });
    return;
  }

  room.players.push({ id: playerId, nickname, side: 'blue', connected: true, ready: false });
  room.sockets.set(playerId, socket);
  send(socket, { type: 'room_joined', room: snapshotRoom(room), side: 'blue' });
  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function reconnect(socket: WebSocket, roomId: string, playerId: string, nickname: string): void {
  const room = rooms.get(roomId);
  const player = room?.players.find((item) => item.id === playerId);
  if (!room || !player) {
    send(socket, { type: 'error', code: 'missing_player', message: '无法恢复房间' });
    return;
  }

  player.connected = true;
  player.nickname = nickname || player.nickname;
  room.sockets.set(playerId, socket);
  const timer = room.disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    room.disconnectTimers.delete(playerId);
  }

  send(socket, { type: 'room_joined', room: snapshotRoom(room), side: player.side ?? 'red' });
  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function setReady(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  const player = room?.players.find((item) => item.id === playerId);
  if (!room || !player) {
    return;
  }

  player.ready = true;
  if (room.players.length === 2 && room.players.every((item) => item.ready) && room.game.snapshot().status === 'waiting') {
    room.game.replaceState(createInitialState('playing'));
    startTurnTimer(room);
  }

  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function movePiece(socket: WebSocket, message: Extract<ClientMessage, { type: 'move_piece' }>): void {
  const room = rooms.get(message.roomId);
  const player = room?.players.find((item) => item.id === message.playerId);
  if (!room || !player?.side) {
    send(socket, { type: 'error', code: 'missing_room', message: '房间或玩家不存在' });
    return;
  }

  const current = room.game.snapshot();
  if (message.moveNumber !== current.moveNumber) {
    send(socket, { type: 'move_rejected', reason: '棋局状态已更新，请同步后再走', state: current });
    return;
  }

  const result = room.game.movePiece(message.from, message.to, player.side);
  if (!result.ok) {
    send(socket, { type: 'move_rejected', reason: result.reason ?? '无法移动', state: result.state });
    return;
  }

  startTurnTimer(room);
  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function resign(roomId: string, playerId: string): void {
  const room = rooms.get(roomId);
  const player = room?.players.find((item) => item.id === playerId);
  if (!room || !player?.side) {
    return;
  }

  room.game.resign(player.side);
  clearTurnTimer(room);
  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function heartbeat(roomId: string | undefined, playerId: string): void {
  if (!roomId) {
    return;
  }

  const room = rooms.get(roomId);
  const player = room?.players.find((item) => item.id === playerId);
  if (player) {
    player.connected = true;
  }
}

function markDisconnected(room: Room, playerId: string): void {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) {
    return;
  }

  player.connected = false;
  room.sockets.delete(playerId);
  const existing = room.disconnectTimers.get(playerId);
  if (existing) {
    clearTimeout(existing);
  }

  room.disconnectTimers.set(
    playerId,
    setTimeout(() => {
      const latest = room.players.find((item) => item.id === playerId);
      if (!latest?.connected && latest?.side && room.game.snapshot().status === 'playing') {
        room.game.finishByTimeout(latest.side);
        clearTurnTimer(room);
        broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
      }
    }, DISCONNECT_GRACE_MS),
  );

  broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
}

function startTurnTimer(room: Room): void {
  clearTurnTimer(room);
  const state = room.game.snapshot();
  if (state.status !== 'playing') {
    return;
  }

  room.turnDeadlineAt = Date.now() + TURN_MS;
  room.timeoutTimer = setTimeout(() => {
    const latest = room.game.snapshot();
    if (latest.status === 'playing') {
      room.game.finishByTimeout(latest.turn);
      clearTurnTimer(room);
      broadcast(room, { type: 'room_state', room: snapshotRoom(room) });
    }
  }, TURN_MS);
}

function clearTurnTimer(room: Room): void {
  if (room.timeoutTimer) {
    clearTimeout(room.timeoutTimer);
    room.timeoutTimer = undefined;
  }
  room.turnDeadlineAt = undefined;
}

function snapshotRoom(room: Room): RoomSnapshot {
  const state = room.game.snapshot();
  return {
    roomId: room.id,
    players: room.players.map((player) => ({ ...player })),
    state,
    turnDeadlineAt: state.status === 'playing' ? room.turnDeadlineAt : undefined,
    serverTime: Date.now(),
  };
}

function broadcast(room: Room, message: ServerMessage): void {
  for (const player of room.players) {
    const socket = room.sockets.get(player.id);
    if (socket) {
      send(socket, message);
    }
  }
}

function send(socket: WebSocket, message: ServerMessage): void {
  if (socket.readyState === socket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function parseMessage(raw: string): ClientMessage | null {
  try {
    return JSON.parse(raw) as ClientMessage;
  } catch {
    return null;
  }
}

function makeRoomId(): string {
  let roomId = '';
  do {
    roomId = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(roomId));

  return roomId;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void startRoomServer();
}
