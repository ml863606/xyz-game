// assets/scripts/core/AnimalChessTypes.ts
var BOARD_WIDTH = 7;
var BOARD_HEIGHT = 9;
var PIECE_DEFS = {
  rat: { kind: "rat", rank: 1, name: "\u8001\u9F20", shortName: "\u9F20" },
  cat: { kind: "cat", rank: 2, name: "\u732B", shortName: "\u732B" },
  dog: { kind: "dog", rank: 3, name: "\u72D7", shortName: "\u72D7" },
  wolf: { kind: "wolf", rank: 4, name: "\u72FC", shortName: "\u72FC" },
  leopard: { kind: "leopard", rank: 5, name: "\u8C79", shortName: "\u8C79" },
  tiger: { kind: "tiger", rank: 6, name: "\u8001\u864E", shortName: "\u864E" },
  lion: { kind: "lion", rank: 7, name: "\u72EE\u5B50", shortName: "\u72EE" },
  elephant: { kind: "elephant", rank: 8, name: "\u5927\u8C61", shortName: "\u8C61" }
};
function opponentOf(side) {
  return side === "red" ? "blue" : "red";
}

// assets/scripts/core/AnimalChessGame.ts
var DIRECTIONS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 }
];
var INITIAL_PIECES = [
  { side: "blue", kind: "lion", x: 0, y: 0 },
  { side: "blue", kind: "tiger", x: 6, y: 0 },
  { side: "blue", kind: "dog", x: 1, y: 1 },
  { side: "blue", kind: "cat", x: 5, y: 1 },
  { side: "blue", kind: "rat", x: 0, y: 2 },
  { side: "blue", kind: "leopard", x: 2, y: 2 },
  { side: "blue", kind: "wolf", x: 4, y: 2 },
  { side: "blue", kind: "elephant", x: 6, y: 2 },
  { side: "red", kind: "elephant", x: 0, y: 6 },
  { side: "red", kind: "wolf", x: 2, y: 6 },
  { side: "red", kind: "leopard", x: 4, y: 6 },
  { side: "red", kind: "rat", x: 6, y: 6 },
  { side: "red", kind: "cat", x: 1, y: 7 },
  { side: "red", kind: "dog", x: 5, y: 7 },
  { side: "red", kind: "tiger", x: 0, y: 8 },
  { side: "red", kind: "lion", x: 6, y: 8 }
];
var AnimalChessGame = class {
  constructor(state2) {
    this.state = state2 ? cloneState(state2) : createInitialState();
  }
  snapshot() {
    return cloneState(this.state);
  }
  reset() {
    this.state = createInitialState();
    return this.snapshot();
  }
  replaceState(state2) {
    this.state = cloneState(state2);
  }
  getLegalMoves(side = this.state.turn) {
    if (this.state.status !== "playing") {
      return [];
    }
    const moves = [];
    for (const piece of Object.values(this.state.pieces)) {
      if (!piece.alive || piece.side !== side) {
        continue;
      }
      for (const to of this.getCandidateDestinations(piece)) {
        const validation = this.validatePieceMove(piece, to, side);
        if (!validation.ok) {
          continue;
        }
        const target = getPieceAt(this.state, to);
        moves.push({
          pieceId: piece.id,
          from: { ...piece.position },
          to: { ...to },
          captureId: target?.id
        });
      }
    }
    return moves;
  }
  getLegalMovesForPiece(pieceId, side = this.state.turn) {
    return this.getLegalMoves(side).filter((move) => move.pieceId === pieceId);
  }
  validateMove(from, to, side = this.state.turn) {
    const piece = getPieceAt(this.state, from);
    if (!piece) {
      return { ok: false, reason: "\u8D77\u70B9\u6CA1\u6709\u68CB\u5B50" };
    }
    return this.validatePieceMove(piece, to, side);
  }
  movePiece(from, to, side = this.state.turn) {
    const piece = getPieceAt(this.state, from);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: "\u8D77\u70B9\u6CA1\u6709\u68CB\u5B50" };
    }
    const validation = this.validatePieceMove(piece, to, side);
    if (!validation.ok) {
      return { ok: false, state: this.snapshot(), reason: validation.reason };
    }
    const target = getPieceAt(this.state, to);
    if (target) {
      target.alive = false;
    }
    const record = {
      pieceId: piece.id,
      side,
      from: { ...piece.position },
      to: { ...to },
      capturedId: target?.id
    };
    piece.position = { ...to };
    this.state.moveNumber += 1;
    this.state.turn = opponentOf(side);
    this.state.lastMove = record;
    this.state.message = `${piece.side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}${PIECE_DEFS[piece.kind].name}\u79FB\u52A8`;
    this.applyEndState(record);
    return { ok: true, state: this.snapshot() };
  }
  resign(side) {
    this.finish(opponentOf(side), "resign", `${side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u8BA4\u8F93`);
    return this.snapshot();
  }
  finishByTimeout(side) {
    this.finish(opponentOf(side), "timeout", `${side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u8D85\u65F6`);
    return this.snapshot();
  }
  validatePieceMove(piece, to, side) {
    if (this.state.status !== "playing") {
      return { ok: false, reason: "\u68CB\u5C40\u5C1A\u672A\u5F00\u59CB\u6216\u5DF2\u7ECF\u7ED3\u675F" };
    }
    if (side !== this.state.turn) {
      return { ok: false, reason: "\u8FD8\u6CA1\u8F6E\u5230\u4F60" };
    }
    if (!piece.alive) {
      return { ok: false, reason: "\u68CB\u5B50\u5DF2\u88AB\u5403\u6389" };
    }
    if (piece.side !== side) {
      return { ok: false, reason: "\u4E0D\u80FD\u79FB\u52A8\u5BF9\u65B9\u68CB\u5B50" };
    }
    if (!isInside(to)) {
      return { ok: false, reason: "\u76EE\u6807\u8D85\u51FA\u68CB\u76D8" };
    }
    if (samePosition(piece.position, to)) {
      return { ok: false, reason: "\u5FC5\u987B\u79FB\u52A8\u5230\u76F8\u90BB\u683C" };
    }
    if (isOwnDen(to, side)) {
      return { ok: false, reason: "\u4E0D\u80FD\u8FDB\u5165\u5DF1\u65B9\u517D\u7A74" };
    }
    const target = getPieceAt(this.state, to);
    if (target?.side === side) {
      return { ok: false, reason: "\u76EE\u6807\u683C\u5DF2\u6709\u5DF1\u65B9\u68CB\u5B50" };
    }
    const moveKind = this.classifyMove(piece, to);
    if (!moveKind.ok) {
      return moveKind;
    }
    if (target && !this.canCapture(piece, target, to)) {
      return { ok: false, reason: "\u68CB\u5B50\u7B49\u7EA7\u6216\u5730\u5F62\u4E0D\u5141\u8BB8\u5403\u5B50" };
    }
    return { ok: true };
  }
  classifyMove(piece, to) {
    const dx = to.x - piece.position.x;
    const dy = to.y - piece.position.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    const terrain = terrainAt(to);
    if (distance === 1) {
      if (terrain === "water" && piece.kind !== "rat") {
        return { ok: false, reason: "\u53EA\u6709\u8001\u9F20\u53EF\u4EE5\u4E0B\u6C34" };
      }
      if (terrain !== "water" && terrainAt(piece.position) === "water" && getPieceAt(this.state, to)) {
        return { ok: false, reason: "\u6CB3\u91CC\u7684\u8001\u9F20\u4E0D\u80FD\u76F4\u63A5\u5403\u5CB8\u4E0A\u68CB\u5B50" };
      }
      return { ok: true };
    }
    if (piece.kind !== "lion" && piece.kind !== "tiger" || dx !== 0 && dy !== 0) {
      return { ok: false, reason: "\u53EA\u80FD\u6A2A\u7AD6\u79FB\u52A8\u4E00\u683C" };
    }
    const landing = this.getRiverJumpLanding(piece.position, normalizeDirection({ x: dx, y: dy }));
    if (!landing || !samePosition(landing, to)) {
      return { ok: false, reason: "\u72EE\u864E\u53EA\u80FD\u6CBF\u6CB3\u9053\u5B8C\u6574\u8DF3\u6CB3" };
    }
    return { ok: true };
  }
  getCandidateDestinations(piece) {
    const candidates = [];
    for (const direction of DIRECTIONS) {
      const adjacent = addPosition(piece.position, direction);
      if (isInside(adjacent)) {
        candidates.push(adjacent);
      }
      if (piece.kind === "lion" || piece.kind === "tiger") {
        const landing = this.getRiverJumpLanding(piece.position, direction);
        if (landing) {
          candidates.push(landing);
        }
      }
    }
    return uniquePositions(candidates);
  }
  getRiverJumpLanding(from, direction) {
    let cursor = addPosition(from, direction);
    if (!isInside(cursor) || terrainAt(cursor) !== "water") {
      return null;
    }
    while (isInside(cursor) && terrainAt(cursor) === "water") {
      const blocker = getPieceAt(this.state, cursor);
      if (blocker?.kind === "rat") {
        return null;
      }
      cursor = addPosition(cursor, direction);
    }
    return isInside(cursor) ? cursor : null;
  }
  canCapture(attacker, defender, to) {
    const fromTerrain = terrainAt(attacker.position);
    const toTerrain = terrainAt(to);
    if (fromTerrain === "water" && toTerrain !== "water") {
      return false;
    }
    if (toTerrain === "water") {
      return attacker.kind === "rat" && defender.kind === "rat";
    }
    const attackerRank = PIECE_DEFS[attacker.kind].rank;
    const defenderRank = isTrappedFor(defender, attacker.side) ? 0 : PIECE_DEFS[defender.kind].rank;
    if (attacker.kind === "rat" && defender.kind === "elephant") {
      return true;
    }
    if (attacker.kind === "elephant" && defender.kind === "rat") {
      return false;
    }
    return attackerRank >= defenderRank;
  }
  applyEndState(record) {
    const movedPiece = this.state.pieces[record.pieceId];
    const opponent = opponentOf(record.side);
    if (isOpponentDen(movedPiece.position, record.side)) {
      this.finish(record.side, "den", `${record.side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u653B\u5165\u517D\u7A74`, record);
      return;
    }
    const opponentPieces = Object.values(this.state.pieces).filter((piece) => piece.side === opponent && piece.alive);
    if (opponentPieces.length === 0) {
      this.finish(record.side, "capture", `${record.side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u5403\u5149\u5BF9\u65B9\u68CB\u5B50`, record);
      return;
    }
    if (this.getLegalMoves(opponent).length === 0) {
      this.finish(record.side, "no-moves", `${opponent === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u65E0\u68CB\u53EF\u8D70`, record);
    }
  }
  finish(winner, reason, message2, record = this.state.lastMove) {
    this.state.status = "finished";
    this.state.winner = winner;
    this.state.reason = reason;
    this.state.message = message2;
    if (record) {
      record.winner = winner;
      record.reason = reason;
      this.state.lastMove = record;
    }
  }
};
function createInitialState(status2 = "playing") {
  const pieces = {};
  for (const item of INITIAL_PIECES) {
    const id = `${item.side}-${item.kind}`;
    pieces[id] = {
      id,
      side: item.side,
      kind: item.kind,
      position: { x: item.x, y: item.y },
      alive: true
    };
  }
  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    status: status2,
    turn: "red",
    moveNumber: 0,
    pieces,
    message: status2 === "playing" ? "\u7EA2\u65B9\u5148\u624B" : "\u7B49\u5F85\u53CC\u65B9\u51C6\u5907"
  };
}
function cloneState(state2) {
  return {
    board: { ...state2.board },
    status: state2.status,
    turn: state2.turn,
    moveNumber: state2.moveNumber,
    winner: state2.winner,
    reason: state2.reason,
    message: state2.message,
    lastMove: state2.lastMove ? {
      ...state2.lastMove,
      from: { ...state2.lastMove.from },
      to: { ...state2.lastMove.to }
    } : void 0,
    pieces: Object.fromEntries(
      Object.entries(state2.pieces).map(([id, piece]) => [
        id,
        {
          ...piece,
          position: { ...piece.position }
        }
      ])
    )
  };
}
function getPieceAt(state2, position) {
  return Object.values(state2.pieces).find((piece) => piece.alive && samePosition(piece.position, position));
}
function terrainAt(position) {
  if ((position.x === 1 || position.x === 2 || position.x === 4 || position.x === 5) && position.y >= 3 && position.y <= 5) {
    return "water";
  }
  if (position.x === 3 && position.y === 0) {
    return "blue-den";
  }
  if (position.x === 3 && position.y === 8) {
    return "red-den";
  }
  if (position.y === 0 && (position.x === 2 || position.x === 4) || position.x === 3 && position.y === 1) {
    return "blue-trap";
  }
  if (position.y === 8 && (position.x === 2 || position.x === 4) || position.x === 3 && position.y === 7) {
    return "red-trap";
  }
  return "land";
}
function isInside(position) {
  return position.x >= 0 && position.x < BOARD_WIDTH && position.y >= 0 && position.y < BOARD_HEIGHT;
}
function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
function isOwnDen(position, side) {
  return terrainAt(position) === `${side}-den`;
}
function isOpponentDen(position, side) {
  return terrainAt(position) === `${opponentOf(side)}-den`;
}
function isTrappedFor(piece, attackerSide) {
  return terrainAt(piece.position) === `${attackerSide}-trap`;
}
function addPosition(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function normalizeDirection(delta) {
  return {
    x: Math.sign(delta.x),
    y: Math.sign(delta.y)
  };
}
function uniquePositions(positions) {
  const seen = /* @__PURE__ */ new Set();
  return positions.filter((position) => {
    const key = `${position.x},${position.y}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

// assets/scripts/net/DouyinSocketClient.ts
var DouyinSocketClient = class {
  constructor(url) {
    this.url = url;
    this.socket = null;
    this.messageListeners = [];
    this.statusListeners = [];
    this.status = "idle";
  }
  connect() {
    this.setStatus("connecting");
    return typeof tt !== "undefined" && tt.connectSocket ? this.connectDouyin() : this.connectBrowser();
  }
  close() {
    this.socket?.close({ code: 1e3, reason: "client close" });
    this.socket = null;
    this.setStatus("closed");
  }
  send(message2) {
    const data = JSON.stringify(message2);
    if (this.socket instanceof WebSocket) {
      this.socket.send(data);
      return;
    }
    this.socket?.send({ data });
  }
  onMessage(listener) {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener);
    };
  }
  onStatus(listener) {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((item) => item !== listener);
    };
  }
  connectBrowser() {
    return new Promise((resolve, reject) => {
      const socket2 = new WebSocket(this.url);
      this.socket = socket2;
      socket2.addEventListener("open", () => {
        this.setStatus("open");
        resolve();
      });
      socket2.addEventListener("close", () => this.setStatus("closed"));
      socket2.addEventListener("error", (event) => {
        this.setStatus("error");
        reject(event);
      });
      socket2.addEventListener("message", (event) => this.emitMessage(String(event.data)));
    });
  }
  connectDouyin() {
    return new Promise((resolve, reject) => {
      const socket2 = tt.connectSocket({ url: this.url });
      this.socket = socket2;
      socket2.onOpen(() => {
        this.setStatus("open");
        resolve();
      });
      socket2.onClose(() => this.setStatus("closed"));
      socket2.onError((error) => {
        this.setStatus("error");
        reject(error);
      });
      socket2.onMessage((event) => this.emitMessage(event.data));
    });
  }
  emitMessage(raw) {
    try {
      const message2 = JSON.parse(raw);
      this.messageListeners.forEach((listener) => listener(message2));
    } catch {
      this.messageListeners.forEach(
        (listener) => listener({ type: "error", code: "bad_json", message: "\u670D\u52A1\u5668\u6D88\u606F\u65E0\u6CD5\u89E3\u6790" })
      );
    }
  }
  setStatus(status2) {
    this.status = status2;
    this.statusListeners.forEach((listener) => listener(status2));
  }
};

// web-preview/src/main.ts
var game = new AnimalChessGame();
var socket = new DouyinSocketClient("ws://localhost:8787");
var playerId = getPlayerId();
var nickname = `\u73A9\u5BB6${playerId.slice(-4)}`;
var state = game.snapshot();
var selected;
var roomId = new URLSearchParams(location.search).get("roomId") ?? "";
var mySide = "red";
var board = mustGet("board");
var status = mustGet("status");
var players = mustGet("players");
var message = mustGet("message");
var roomCode = mustGet("roomCode");
var createRoom = mustGet("createRoom");
var joinRoom = mustGet("joinRoom");
var ready = mustGet("ready");
var share = mustGet("share");
var resign = mustGet("resign");
var animalArt = {
  rat: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#f1d2b4" d="M15 33c0-12 8-21 19-21 9 0 16 6 18 15 5 1 8 4 8 8 0 6-6 10-14 10H25c-6 0-10-5-10-12Z"/><circle cx="21" cy="21" r="8" fill="#e8b992"/><circle cx="48" cy="34" r="2.8" fill="#2a2118"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="M18 43c-8 6-13 5-15 1"/></svg>',
  cat: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#f3c57b" d="m17 19 8 7 7-3 7 3 8-7 2 18c0 10-8 17-17 17s-17-7-17-17l2-18Z"/><circle cx="26" cy="37" r="3" fill="#2a2118"/><circle cx="38" cy="37" r="3" fill="#2a2118"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="m29 45 3 2 3-2"/></svg>',
  dog: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#d99b5e" d="M16 29c0-10 7-17 16-17s16 7 16 17v9c0 9-7 16-16 16s-16-7-16-16v-9Z"/><path fill="#7a4d2d" d="M13 21c-6 3-8 12-3 18 7 0 11-7 10-15l-7-3Zm38 0 7 3c1 8-3 15-10 15-5-6-3-15 3-18Z"/><circle cx="26" cy="35" r="3" fill="#2a2118"/><circle cx="38" cy="35" r="3" fill="#2a2118"/><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  wolf: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#a6ad9d" d="m14 15 12 11 6-4 6 4 12-11-3 24c-2 9-8 15-15 15s-13-6-15-15l-3-24Z"/><path fill="#fff8e6" d="M25 43h14l-7 8-7-8Z"/><circle cx="25" cy="34" r="3" fill="#2a2118"/><circle cx="39" cy="34" r="3" fill="#2a2118"/></svg>',
  leopard: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#e6b84f" d="M13 34c0-12 8-21 19-21s19 9 19 21-8 20-19 20-19-8-19-20Z"/><g fill="#6d4722"><circle cx="23" cy="27" r="3"/><circle cx="39" cy="27" r="3"/><circle cx="20" cy="42" r="2.6"/><circle cx="44" cy="42" r="2.6"/><circle cx="32" cy="35" r="2.4"/></g><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  tiger: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#dc8a2d" d="M14 31c0-11 8-20 18-20s18 9 18 20v5c0 10-8 18-18 18s-18-8-18-18v-5Z"/><path stroke="#2a2118" stroke-linecap="round" stroke-width="3" d="M25 15v10m14-10v10M19 29l10 4m16-4-10 4M19 42l10-2m16 2-10-2"/><circle cx="26" cy="36" r="3" fill="#2a2118"/><circle cx="38" cy="36" r="3" fill="#2a2118"/></svg>',
  lion: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#9f6128" d="M8 34c0-14 10-25 24-25s24 11 24 25S46 58 32 58 8 48 8 34Z"/><path fill="#e3ad4c" d="M18 35c0-8 6-14 14-14s14 6 14 14-6 14-14 14-14-6-14-14Z"/><circle cx="27" cy="35" r="3" fill="#2a2118"/><circle cx="37" cy="35" r="3" fill="#2a2118"/><path fill="#2a2118" d="M29 43h6l-3 4-3-4Z"/></svg>',
  elephant: '<svg viewBox="0 0 64 64" class="animal-art" aria-hidden="true"><path fill="#b8c0c9" d="M12 33c0-12 9-21 20-21s20 9 20 21v7c0 8-6 14-14 14H26c-8 0-14-6-14-14v-7Z"/><path fill="#9aa6b2" d="M8 28c-4 7-1 17 8 20 5-7 3-17-4-22l-4 2Zm48 0 4-2c7 5 9 15 4 22-9-3-12-13-8-20Z"/><path stroke="#eef3f7" stroke-linecap="round" stroke-width="5" d="M32 38v13"/><circle cx="25" cy="34" r="3" fill="#2a2118"/><circle cx="39" cy="34" r="3" fill="#2a2118"/></svg>'
};
createRoom.addEventListener("click", () => {
  socket.send({ type: "create_room", playerId, nickname });
});
joinRoom.addEventListener("click", () => {
  const input = window.prompt("\u8F93\u5165\u623F\u95F4\u53F7", roomId);
  if (input) {
    roomId = input.trim().toUpperCase();
    socket.send({ type: "join_room", roomId, playerId, nickname });
  }
});
ready.addEventListener("click", () => {
  if (roomId) {
    socket.send({ type: "ready", roomId, playerId });
  }
});
share.addEventListener("click", async () => {
  if (!roomId) {
    message.textContent = "\u8FD8\u6CA1\u6709\u623F\u95F4\u53F7";
    return;
  }
  await navigator.clipboard?.writeText(roomId);
  message.textContent = `\u623F\u53F7 ${roomId} \u5DF2\u590D\u5236`;
});
resign.addEventListener("click", () => {
  if (roomId) {
    socket.send({ type: "resign", roomId, playerId });
  }
});
socket.onStatus((next) => {
  status.textContent = next === "open" ? "\u670D\u52A1\u5668\u5DF2\u8FDE\u63A5" : `\u8FDE\u63A5\u72B6\u6001\uFF1A${next}`;
});
socket.onMessage((serverMessage) => {
  if (serverMessage.type === "room_created" || serverMessage.type === "room_joined") {
    mySide = serverMessage.side;
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === "room_state") {
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === "move_rejected") {
    state = serverMessage.state;
    message.textContent = serverMessage.reason;
    selected = void 0;
    render();
  } else if (serverMessage.type === "error") {
    message.textContent = serverMessage.message;
  }
});
socket.connect().then(() => {
  if (roomId) {
    socket.send({ type: "join_room", roomId, playerId, nickname });
  }
}).catch(() => {
  status.textContent = "\u672A\u8FDE\u63A5\u670D\u52A1\u5668\uFF0C\u5F53\u524D\u4E3A\u672C\u5730\u89C4\u5219\u9884\u89C8";
});
render();
function applyRoom(room) {
  roomId = room.roomId;
  state = room.state;
  game.replaceState(room.state);
  const me = room.players.find((player) => player.id === playerId);
  if (me?.side) {
    mySide = me.side;
  }
  render(room);
}
function render(room) {
  roomCode.textContent = roomId || "\u672A\u5EFA\u623F";
  message.textContent = state.winner ? `${state.winner === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u83B7\u80DC\uFF1A${state.message}` : state.message;
  status.textContent = `${mySide === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u89C6\u89D2 \xB7 \u5F53\u524D${state.turn === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}\u884C\u52A8`;
  players.innerHTML = "";
  const roomPlayers = room?.players ?? [
    { id: "red-local", nickname: "\u7EA2\u65B9", side: "red", connected: true, ready: true },
    { id: "blue-local", nickname: "\u84DD\u65B9", side: "blue", connected: true, ready: true }
  ];
  for (const player of roomPlayers) {
    const item = document.createElement("div");
    item.className = "player";
    item.classList.toggle("active", player.side === state.turn && state.status === "playing");
    item.textContent = `${player.side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"} ${player.nickname} ${player.ready ? "\u5DF2\u51C6\u5907" : "\u672A\u51C6\u5907"} ${player.connected ? "" : "\u79BB\u7EBF"}`;
    players.appendChild(item);
  }
  const selectedPiece = selected ? getPieceAt(state, selected) : void 0;
  const legalKeys = new Set(
    selectedPiece ? game.getLegalMovesForPiece(selectedPiece.id, mySide).map((move) => keyOf(move.to)) : []
  );
  board.innerHTML = "";
  for (let y = 0; y < state.board.height; y += 1) {
    for (let x = 0; x < state.board.width; x += 1) {
      const position = { x, y };
      const cell = document.createElement("button");
      const terrain = terrainAt(position);
      const piece = getPieceAt(state, position);
      cell.type = "button";
      cell.className = `cell ${terrainClass(terrain)}`;
      cell.classList.toggle("selected", selected ? keyOf(selected) === keyOf(position) : false);
      cell.classList.toggle("legal", legalKeys.has(keyOf(position)));
      cell.setAttribute("aria-label", cellLabel(piece, terrain, position));
      cell.addEventListener("click", () => tapCell(position));
      if (piece) {
        const token = document.createElement("span");
        token.className = `piece ${piece.side}`;
        token.innerHTML = `${animalArt[piece.kind]}<span class="piece-name">${PIECE_DEFS[piece.kind].shortName}</span>`;
        cell.appendChild(token);
      } else {
        const label = document.createElement("span");
        label.className = "terrain-label";
        label.textContent = terrainLabel(terrain);
        cell.appendChild(label);
      }
      board.appendChild(cell);
    }
  }
}
function tapCell(position) {
  const piece = getPieceAt(state, position);
  if (piece?.side === mySide && state.turn === mySide) {
    selected = position;
    render();
    return;
  }
  if (!selected) {
    message.textContent = state.turn === mySide ? "\u8BF7\u9009\u62E9\u5DF1\u65B9\u68CB\u5B50" : "\u7B49\u5F85\u5BF9\u65B9\u884C\u52A8";
    return;
  }
  if (roomId) {
    socket.send({ type: "move_piece", roomId, playerId, from: selected, to: position, moveNumber: state.moveNumber });
    selected = void 0;
    return;
  }
  const result = game.movePiece(selected, position, mySide);
  state = result.state;
  message.textContent = result.reason ?? state.message;
  selected = void 0;
  render();
}
function terrainClass(terrain) {
  if (terrain === "water") {
    return "water";
  }
  if (terrain.endsWith("trap")) {
    return "trap";
  }
  if (terrain.endsWith("den")) {
    return "den";
  }
  return "land";
}
function terrainLabel(terrain) {
  if (terrain === "water") {
    return "\u6CB3";
  }
  if (terrain.endsWith("trap")) {
    return "\u9677";
  }
  if (terrain.endsWith("den")) {
    return "\u7A74";
  }
  return "";
}
function cellLabel(piece, terrain, position) {
  if (piece) {
    return `${position.x + 1}\u5217${position.y + 1}\u884C ${piece.side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9"}${PIECE_DEFS[piece.kind].name}`;
  }
  return `${position.x + 1}\u5217${position.y + 1}\u884C ${terrainLabel(terrain) || "\u7A7A\u5730"}`;
}
function keyOf(position) {
  return `${position.x},${position.y}`;
}
function getPlayerId() {
  const stored = localStorage.getItem("animal-chess-player-id");
  if (stored) {
    return stored;
  }
  const id = `web-${Math.random().toString(36).slice(2, 10)}`;
  localStorage.setItem("animal-chess-player-id", id);
  return id;
}
function mustGet(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element;
}
