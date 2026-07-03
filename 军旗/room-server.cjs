const http = require("http");
let WebSocketServer;
try {
  WebSocketServer = require("ws").WebSocketServer;
} catch (error) {
  WebSocketServer = require("../斗兽棋/node_modules/ws").WebSocketServer;
}

const Rules = require("./rules.cjs");

const PORT = Number(process.env.PORT || 8788);
const TURN_MS = Rules.TURN_MS;
const DISCONNECT_GRACE_MS = 60000;
const PHRASES = new Set(["hello", "your_turn", "nice", "thinking", "great", "again"]);
const EMOJIS = new Set(["thumb", "smile", "wow", "cool", "fire", "cry"]);

const server = http.createServer();
const wss = new WebSocketServer({ server });
const rooms = new Map();

wss.on("connection", (socket) => {
  socket.on("message", (raw) => {
    const message = parseMessage(raw.toString());
    if (!message) {
      send(socket, { type: "error", code: "bad_json", message: "请求无法解析" });
      return;
    }
    handleMessage(socket, message);
  });

  socket.on("close", () => {
    for (const room of rooms.values()) {
      const player = room.players.find((item) => room.sockets.get(item.id) === socket);
      if (player) markDisconnected(room, player.id);
    }
  });
});

server.on("request", (req, res) => {
  const url = new URL(req.url || "/", "http://127.0.0.1");
  if (url.pathname !== "/rooms") {
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify({ rooms: listRooms(), serverTime: Date.now() }));
});

function handleMessage(socket, message) {
  switch (message.type) {
    case "create_room":
      createRoom(socket, message);
      break;
    case "join_room":
      joinRoom(socket, message);
      break;
    case "ready":
      setReady(message.roomId, message.playerId);
      break;
    case "flip_piece":
      flipPiece(socket, message);
      break;
    case "move_piece":
      movePiece(socket, message);
      break;
    case "resign":
      resign(message.roomId, message.playerId);
      break;
    case "chat":
      chat(socket, message);
      break;
    case "heartbeat":
      heartbeat(message.roomId, message.playerId);
      break;
    case "reconnect":
      reconnect(socket, message);
      break;
    default:
      send(socket, { type: "error", code: "unknown_type", message: "未知消息" });
  }
}

function createRoom(socket, message) {
  const playerId = cleanId(message.playerId);
  const requestedRoomId = cleanRoomId(message.roomId);
  if (message.roomId && !requestedRoomId) {
    send(socket, { type: "error", code: "bad_room_id", message: "房间码只能用中文、字母、数字、_、-" });
    return;
  }
  if (requestedRoomId && rooms.has(requestedRoomId)) {
    send(socket, { type: "error", code: "room_exists", message: "房间码已存在，换一个试试" });
    return;
  }
  const room = {
    id: requestedRoomId || makeRoomId(),
    players: [{ id: playerId, nickname: cleanName(message.nickname) || "玩家 A", index: 0, connected: true, ready: false }],
    sockets: new Map([[playerId, socket]]),
    state: Rules.createInitialState("waiting"),
    turnDeadlineAt: undefined,
    timeoutTimer: undefined,
    disconnectTimers: new Map(),
    chat: []
  };
  room.state.players[0].name = room.players[0].nickname;
  rooms.set(room.id, room);
  send(socket, { type: "room_created", room: snapshotRoom(room), playerIndex: 0 });
}

function joinRoom(socket, message) {
  const room = rooms.get(cleanRoomId(message.roomId));
  if (!room) {
    send(socket, { type: "error", code: "missing_room", message: "房间不存在" });
    return;
  }
  const playerId = cleanId(message.playerId);
  const existing = room.players.find((player) => player.id === playerId);
  if (existing) {
    reconnect(socket, message);
    return;
  }
  if (room.players.length >= 2) {
    send(socket, { type: "error", code: "room_full", message: "房间已满" });
    return;
  }
  room.players.push({ id: playerId, nickname: cleanName(message.nickname) || "玩家 B", index: 1, connected: true, ready: false });
  room.sockets.set(playerId, socket);
  room.state.players[1].name = room.players[1].nickname;
  send(socket, { type: "room_joined", room: snapshotRoom(room), playerIndex: 1 });
  broadcast(room, { type: "room_state", room: snapshotRoom(room) });
}

function reconnect(socket, message) {
  const room = rooms.get(cleanRoomId(message.roomId));
  const playerId = cleanId(message.playerId);
  const player = room && room.players.find((item) => item.id === playerId);
  if (!room || !player) {
    send(socket, { type: "error", code: "missing_player", message: "无法恢复房间" });
    return;
  }
  player.connected = true;
  player.nickname = cleanName(message.nickname) || player.nickname;
  room.state.players[player.index].name = player.nickname;
  room.sockets.set(playerId, socket);
  const timer = room.disconnectTimers.get(playerId);
  if (timer) clearTimeout(timer);
  room.disconnectTimers.delete(playerId);
  send(socket, { type: "room_joined", room: snapshotRoom(room), playerIndex: player.index });
  broadcast(room, { type: "room_state", room: snapshotRoom(room) });
}

function setReady(roomId, playerId) {
  const found = findRoomPlayer(roomId, playerId);
  if (!found) return;
  found.player.ready = true;
  if (found.room.players.length === 2 && found.room.players.every((item) => item.ready) && found.room.state.status === "waiting") {
    const names = found.room.state.players.map((item) => item.name);
    found.room.state = Rules.createInitialState("playing");
    found.room.state.players[0].name = names[0] || "玩家 A";
    found.room.state.players[1].name = names[1] || "玩家 B";
    startTurnTimer(found.room);
  }
  broadcast(found.room, { type: "room_state", room: snapshotRoom(found.room) });
}

function flipPiece(socket, message) {
  const found = findRoomPlayer(message.roomId, message.playerId);
  if (!found) return send(socket, { type: "error", code: "missing_room", message: "房间或玩家不存在" });
  if (message.moveNumber !== found.room.state.moveNumber) {
    send(socket, { type: "move_rejected", reason: "棋局已更新，请同步后再走", state: found.room.state });
    return;
  }
  const result = Rules.flipPiece(found.room.state, message.position, found.player.index);
  applyMoveResult(socket, found.room, result);
}

function movePiece(socket, message) {
  const found = findRoomPlayer(message.roomId, message.playerId);
  if (!found) return send(socket, { type: "error", code: "missing_room", message: "房间或玩家不存在" });
  if (message.moveNumber !== found.room.state.moveNumber) {
    send(socket, { type: "move_rejected", reason: "棋局已更新，请同步后再走", state: found.room.state });
    return;
  }
  const result = Rules.movePiece(found.room.state, message.from, message.to, found.player.index);
  applyMoveResult(socket, found.room, result);
}

function applyMoveResult(socket, room, result) {
  if (!result.ok) {
    send(socket, { type: "move_rejected", reason: result.reason || "无法行动", state: result.state });
    return;
  }
  room.state = result.state;
  if (room.state.status === "playing") startTurnTimer(room);
  else clearTurnTimer(room);
  broadcast(room, { type: "room_state", room: snapshotRoom(room) });
}

function resign(roomId, playerId) {
  const found = findRoomPlayer(roomId, playerId);
  if (!found) return;
  const result = Rules.resign(found.room.state, found.player.index);
  found.room.state = result.state;
  clearTurnTimer(found.room);
  broadcast(found.room, { type: "room_state", room: snapshotRoom(found.room) });
}

function chat(socket, message) {
  const found = findRoomPlayer(message.roomId, message.playerId);
  if (!found) return send(socket, { type: "error", code: "missing_room", message: "房间或玩家不存在" });
  const payload = normalizeChat(message);
  if (!payload) {
    send(socket, { type: "error", code: "bad_chat", message: "消息不可用" });
    return;
  }
  const chatMessage = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    playerId: found.player.id,
    playerIndex: found.player.index,
    nickname: found.player.nickname,
    createdAt: Date.now(),
    ...payload
  };
  found.room.chat.push(chatMessage);
  found.room.chat = found.room.chat.slice(-20);
  broadcast(found.room, { type: "chat", message: chatMessage });
}

function heartbeat(roomId, playerId) {
  const found = findRoomPlayer(roomId, playerId);
  if (found) found.player.connected = true;
}

function markDisconnected(room, playerId) {
  const player = room.players.find((item) => item.id === playerId);
  if (!player) return;
  if (room.state.status === "waiting") {
    removeWaitingPlayer(room, playerId);
    return;
  }
  player.connected = false;
  room.sockets.delete(playerId);
  clearTurnTimer(room);
  const existing = room.disconnectTimers.get(playerId);
  if (existing) clearTimeout(existing);
  room.disconnectTimers.set(playerId, setTimeout(() => {
    const latest = room.players.find((item) => item.id === playerId);
    if (latest && !latest.connected && room.state.status === "playing") {
      room.state = Rules.finishByTimeout(room.state, latest.index).state;
      clearTurnTimer(room);
      broadcast(room, { type: "room_state", room: snapshotRoom(room) });
    }
  }, DISCONNECT_GRACE_MS));
  broadcast(room, { type: "room_state", room: snapshotRoom(room) });
}

function removeWaitingPlayer(room, playerId) {
  room.sockets.delete(playerId);
  const existing = room.disconnectTimers.get(playerId);
  if (existing) clearTimeout(existing);
  room.disconnectTimers.delete(playerId);
  room.players = room.players.filter((item) => item.id !== playerId);
  room.players.forEach((item, index) => {
    item.index = index;
    item.ready = false;
    room.state.players[index].name = item.nickname;
  });
  if (!room.players.length) {
    rooms.delete(room.id);
    return;
  }
  room.state.players[1].name = "玩家 B";
  broadcast(room, { type: "room_state", room: snapshotRoom(room) });
}

function startTurnTimer(room) {
  clearTurnTimer(room);
  room.turnDeadlineAt = Date.now() + TURN_MS;
  room.timeoutTimer = setTimeout(() => {
    if (room.state.status === "playing") {
      room.state = Rules.finishByTimeout(room.state, room.state.current).state;
      clearTurnTimer(room);
      broadcast(room, { type: "room_state", room: snapshotRoom(room) });
    }
  }, TURN_MS);
}

function clearTurnTimer(room) {
  if (room.timeoutTimer) clearTimeout(room.timeoutTimer);
  room.timeoutTimer = undefined;
  room.turnDeadlineAt = undefined;
}

function snapshotRoom(room) {
  return {
    roomId: room.id,
    players: room.players.map((player) => ({ ...player })),
    state: Rules.cloneState(room.state),
    turnDeadlineAt: room.state.status === "playing" ? room.turnDeadlineAt : undefined,
    serverTime: Date.now(),
    chat: room.chat.slice(-10)
  };
}

function listRooms() {
  return Array.from(rooms.values())
    .map((room) => ({
      roomId: room.id,
      playerCount: room.players.length,
      capacity: 2,
      full: room.players.length >= 2,
      status: room.state.status,
      message: room.state.message,
      players: room.players.map((player) => ({
        nickname: player.nickname,
        connected: player.connected,
        ready: player.ready
      }))
    }))
    .sort((a, b) => {
      if (a.full !== b.full) return a.full ? 1 : -1;
      if (a.status !== b.status) return a.status === "waiting" ? -1 : 1;
      return a.roomId.localeCompare(b.roomId);
    });
}

function broadcast(room, message) {
  room.players.forEach((player) => {
    const socket = room.sockets.get(player.id);
    if (socket) send(socket, message);
  });
}

function send(socket, message) {
  if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(message));
}

function findRoomPlayer(roomId, playerId) {
  const room = rooms.get(cleanRoomId(roomId));
  const id = cleanId(playerId);
  const player = room && room.players.find((item) => item.id === id);
  return room && player ? { room, player } : null;
}

function normalizeChat(message) {
  if (message.phraseId && PHRASES.has(message.phraseId)) return { kind: "phrase", phraseId: message.phraseId };
  if (message.emojiId && EMOJIS.has(message.emojiId)) return { kind: "emoji", emojiId: message.emojiId };
  return null;
}

function cleanId(value) {
  return String(value || "").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 48) || "player";
}

function cleanName(value) {
  return String(value || "").trim().slice(0, 12);
}

function cleanRoomId(value) {
  return Array.from(String(value || "").trim().replace(/[^\w\u4e00-\u9fff-]/g, "")).slice(0, 12).join("");
}

function parseMessage(raw) {
  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function makeRoomId() {
  let id = "";
  do {
    id = Math.random().toString(36).slice(2, 8).toUpperCase();
  } while (rooms.has(id));
  return id;
}

function startRoomServer(port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port || PORT, "127.0.0.1", () => {
      console.log(`童年翻军棋房间服务: ws://127.0.0.1:${port || PORT}`);
      resolve();
    });
  });
}

if (require.main === module) {
  startRoomServer();
}

module.exports = { startRoomServer };
