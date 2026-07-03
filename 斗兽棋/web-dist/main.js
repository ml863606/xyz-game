// assets/scripts/core/AnimalChessTypes.ts
var BOARD_WIDTH = 4;
var BOARD_HEIGHT = 4;
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
var PIECE_ORDER = ["rat", "cat", "dog", "wolf", "leopard", "tiger", "lion", "elephant"];
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
      if (!piece.alive || !piece.revealed || piece.side !== side || piece.hiddenUnderId) {
        continue;
      }
      for (const to of this.getCandidateDestinations(piece)) {
        const validation = this.validatePieceMove(piece, to, side);
        if (!validation.ok) {
          continue;
        }
        const target = getTopPieceAt(this.state, to);
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
    const piece = getMovablePieceAt(this.state, from);
    if (!piece) {
      return { ok: false, reason: "\u8D77\u70B9\u6CA1\u6709\u53EF\u79FB\u52A8\u68CB\u5B50" };
    }
    return this.validatePieceMove(piece, to, side);
  }
  flip(position, side = this.state.turn, playerId2) {
    const validation = this.validateFlip(position, side);
    if (!validation.ok) {
      return { ok: false, state: this.snapshot(), reason: validation.reason };
    }
    const piece = getBasePieceAt(this.state, position);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: "\u8FD9\u91CC\u6CA1\u6709\u53EF\u7FFB\u5F00\u7684 \u724C" };
    }
    piece.revealed = true;
    const assignedSide = this.assignFirstFlipSide(side, piece.side, playerId2);
    const nextTurn = assignedSide ? opponentOf(assignedSide) : opponentOf(side);
    const record = {
      pieceId: piece.id,
      side,
      from: { ...position },
      to: { ...position },
      action: "flip"
    };
    this.state.moveNumber += 1;
    this.state.turn = nextTurn;
    this.state.lastMove = record;
    this.state.message = `${sideName(assignedSide ?? side)}\u7FFB\u51FA${sideName(piece.side)}${PIECE_DEFS[piece.kind].name}`;
    this.applyEndState(record);
    return { ok: true, state: this.snapshot(), assignedSide };
  }
  movePiece(from, to, side = this.state.turn) {
    const piece = getMovablePieceAt(this.state, from);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: "\u8D77\u70B9\u6CA1\u6709\u53EF\u79FB\u52A8\u68CB\u5B50" };
    }
    const validation = this.validatePieceMove(piece, to, side);
    if (!validation.ok) {
      return { ok: false, state: this.snapshot(), reason: validation.reason };
    }
    this.leaveStack(piece);
    const target = getTopPieceAt(this.state, to);
    const base = getBasePieceAt(this.state, to);
    if (target) {
      target.alive = false;
    }
    const record = {
      pieceId: piece.id,
      side,
      from: { ...from },
      to: { ...to },
      capturedId: target?.id,
      action: "move"
    };
    if (!target && base && !base.revealed) {
      if (piece.kind === "rat") {
        piece.hiddenUnderId = base.id;
      } else if (canClimbMountain(piece.kind)) {
        piece.coveringId = base.id;
      }
    }
    piece.position = { ...to };
    this.state.moveNumber += 1;
    this.state.turn = opponentOf(side);
    this.state.lastMove = record;
    this.state.message = `${sideName(piece.side)}${PIECE_DEFS[piece.kind].name}\u79FB\u52A8`;
    this.applyEndState(record);
    return { ok: true, state: this.snapshot() };
  }
  resign(side) {
    this.finish(opponentOf(side), "resign", `${sideName(side)}\u8BA4\u8F93`);
    return this.snapshot();
  }
  finishByTimeout(side) {
    this.finish(opponentOf(side), "timeout", `${sideName(side)}\u8D85\u65F6`);
    return this.snapshot();
  }
  validateFlip(position, side) {
    if (this.state.status !== "playing") {
      return { ok: false, reason: "\u68CB\u5C40\u5C1A\u672A\u5F00\u59CB\u6216\u5DF2\u7ECF\u7ED3\u675F" };
    }
    if (side !== this.state.turn) {
      return { ok: false, reason: "\u8FD8\u6CA1\u8F6E\u5230\u4F60" };
    }
    if (!isInside(position)) {
      return { ok: false, reason: "\u76EE\u6807\u8D85\u51FA\u68CB\u76D8" };
    }
    const piece = getBasePieceAt(this.state, position);
    if (!piece) {
      return { ok: false, reason: "\u8FD9\u91CC\u6CA1\u6709\u53EF\u7FFB\u5F00\u7684 \u724C" };
    }
    if (piece.revealed) {
      return { ok: false, reason: "\u8FD9\u5F20 \u724C\u5DF2\u7ECF\u7FFB\u5F00" };
    }
    if (getCoveringPiece(this.state, piece.id) || getHiddenPiece(this.state, piece.id)) {
      return { ok: false, reason: "\u724C\u4E0A\u6216 \u724C\u4E0B\u6709\u68CB\u5B50\uFF0C\u6682\u65F6\u4E0D\u80FD\u7FFB" };
    }
    return { ok: true };
  }
  validatePieceMove(piece, to, side) {
    if (this.state.status !== "playing") {
      return { ok: false, reason: "\u68CB\u5C40\u5C1A\u672A\u5F00\u59CB\u6216\u5DF2\u7ECF\u7ED3\u675F" };
    }
    if (side !== this.state.turn) {
      return { ok: false, reason: "\u8FD8\u6CA1\u8F6E\u5230\u4F60" };
    }
    if (!piece.alive) {
      return { ok: false, reason: "\u68CB\u5B50\u5DF2\u7ECF\u88AB\u5403\u6389" };
    }
    if (!piece.revealed) {
      return { ok: false, reason: "\u672A\u6380\u5F00\u7684\u68CB\u5B50\u4E0D\u80FD\u79FB\u52A8" };
    }
    if (piece.side !== side) {
      return { ok: false, reason: "\u4E0D\u80FD\u79FB\u52A8\u5BF9\u65B9\u68CB\u5B50" };
    }
    if (!isInside(to)) {
      return { ok: false, reason: "\u76EE\u6807\u8D85\u51FA\u68CB\u76D8" };
    }
    const distance = Math.abs(to.x - piece.position.x) + Math.abs(to.y - piece.position.y);
    if (distance !== 1) {
      return { ok: false, reason: "\u53EA\u80FD\u6A2A\u7AD6\u79FB\u52A8\u4E00\u683C" };
    }
    const target = getTopPieceAt(this.state, to);
    if (target?.side === side) {
      return { ok: false, reason: "\u76EE\u6807\u683C\u5DF2\u6709\u5DF1\u65B9\u68CB\u5B50" };
    }
    if (target && !this.canCapture(piece, target)) {
      return { ok: false, reason: "\u68CB\u5B50\u7B49\u7EA7\u4E0D\u5141\u8BB8\u5403\u5B50" };
    }
    const base = getBasePieceAt(this.state, to);
    if (!target && base && !base.revealed && piece.kind === "elephant") {
      return { ok: false, reason: "\u5927\u8C61\u4E0D\u80FD\u4E0A\u5C71" };
    }
    return { ok: true };
  }
  getCandidateDestinations(piece) {
    return DIRECTIONS.map((direction) => addPosition(piece.position, direction)).filter(isInside);
  }
  canCapture(attacker, defender) {
    if (!defender.revealed || defender.hiddenUnderId) {
      return false;
    }
    if (attacker.kind === "rat" && defender.kind === "elephant") {
      return true;
    }
    return PIECE_DEFS[attacker.kind].rank >= PIECE_DEFS[defender.kind].rank;
  }
  leaveStack(piece) {
    piece.coveringId = void 0;
    piece.hiddenUnderId = void 0;
  }
  assignFirstFlipSide(turnSide, flippedSide, playerId2) {
    if (Object.keys(this.state.sideOwners).length > 0 || !playerId2) {
      return void 0;
    }
    this.state.sideOwners[flippedSide] = playerId2;
    this.state.sideOwners[opponentOf(flippedSide)] = `pending-${opponentOf(flippedSide)}`;
    return flippedSide;
  }
  applyEndState(record) {
    const opponent = opponentOf(record.side);
    const opponentPieces = Object.values(this.state.pieces).filter((piece) => piece.side === opponent && piece.alive);
    if (opponentPieces.length === 0) {
      this.finish(record.side, "capture", `${sideName(record.side)}\u5403\u5149\u5BF9\u65B9\u68CB\u5B50`, record);
      return;
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
  const positions = shuffledPositions();
  let positionIndex = 0;
  for (const side of ["red", "blue"]) {
    for (const kind of PIECE_ORDER) {
      const id = `${side}-${kind}`;
      pieces[id] = {
        id,
        side,
        kind,
        position: positions[positionIndex],
        alive: true,
        revealed: false
      };
      positionIndex += 1;
    }
  }
  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    status: status2,
    turn: "red",
    moveNumber: 0,
    pieces,
    sideOwners: {},
    message: status2 === "playing" ? "\u7FFB\u5F00\u7B2C\u4E00\u5F20 \u724C\u786E\u5B9A\u9635\u8425" : "\u7B49\u5F85\u53CC\u65B9\u51C6\u5907"
  };
}
function cloneState(state2) {
  return {
    board: { ...state2.board },
    status: state2.status,
    turn: state2.turn,
    moveNumber: state2.moveNumber,
    sideOwners: { ...state2.sideOwners },
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
function getMovablePieceAt(state2, position) {
  return Object.values(state2.pieces).find(
    (piece) => piece.alive && piece.revealed && samePosition(piece.position, position) && !piece.coveringId
  );
}
function getBasePieceAt(state2, position) {
  return Object.values(state2.pieces).find(
    (piece) => piece.alive && !piece.coveringId && !piece.hiddenUnderId && samePosition(piece.position, position)
  );
}
function getTopPieceAt(state2, position) {
  const base = getBasePieceAt(state2, position);
  if (base) {
    return getCoveringPiece(state2, base.id) ?? (base.revealed ? base : void 0);
  }
  return Object.values(state2.pieces).find(
    (piece) => piece.alive && piece.revealed && !piece.coveringId && !piece.hiddenUnderId && samePosition(piece.position, position)
  );
}
function getCoveringPiece(state2, baseId) {
  return Object.values(state2.pieces).find((piece) => piece.alive && piece.coveringId === baseId);
}
function getHiddenPiece(state2, baseId) {
  return Object.values(state2.pieces).find((piece) => piece.alive && piece.hiddenUnderId === baseId);
}
function isInside(position) {
  return position.x >= 0 && position.x < BOARD_WIDTH && position.y >= 0 && position.y < BOARD_HEIGHT;
}
function samePosition(a, b) {
  return a.x === b.x && a.y === b.y;
}
function shuffledPositions() {
  const positions = [];
  for (let y = 0; y < BOARD_HEIGHT; y += 1) {
    for (let x = 0; x < BOARD_WIDTH; x += 1) {
      positions.push({ x, y });
    }
  }
  for (let i = positions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  return positions;
}
function sideName(side) {
  return side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9";
}
function addPosition(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}
function canClimbMountain(kind) {
  return kind !== "rat" && kind !== "elephant";
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
var localPlayerSide;
var connected = false;
var mode = roomId ? "online" : "local";
var connecting = false;
var rulesOpen = true;
var rulesStep = 0;
var lastRulesMoveNumber = -1;
var board = mustGet("board");
var status = mustGet("status");
var players = mustGet("players");
var message = mustGet("message");
var roomCode = mustGet("roomCode");
var createRoom = mustGet("createRoom");
var joinRoom = mustGet("joinRoom");
var ready = mustGet("ready");
var share = mustGet("share");
var localMode = mustGet("localMode");
var onlineMode = mustGet("onlineMode");
var restart = mustGet("restart");
var resign = mustGet("resign");
var rulesOverlay = mustGet("rulesOverlay");
var rulesDemo = mustGet("rulesDemo");
var rulesText = mustGet("rulesText");
var rulesPrev = mustGet("rulesPrev");
var rulesNext = mustGet("rulesNext");
var rulesStart = mustGet("rulesStart");
var ruleDots = Array.from(document.querySelectorAll(".rule-dot"));
var ruleSteps = [
  "\u7B2C 1 \u6B65\uFF1A\u53CC\u65B9\u5404\u6709 8 \u5F20 \u724C\u3002\u7EA2\u65B9 8 \u5F20\uFF0C\u84DD\u65B9 8 \u5F20\uFF0C\u5F00\u5C40\u5168\u90E8\u76D6\u4F4F\u3002",
  "\u7B2C 2 \u6B65\uFF1A\u5927\u5C0F\u987A\u5E8F\u662F \u8C61 > \u72EE > \u864E > \u8C79 > \u72FC > \u72D7 > \u732B > \u9F20\u3002\u7279\u6B8A\uFF1A\u8C61\u80FD\u5403\u9F20\uFF0C\u9F20\u4E5F\u80FD\u5403\u8C61\u3002",
  "\u7B2C 3 \u6B65\uFF1A\u8F6E\u5230\u4F60\u65F6\uFF0C\u53EF\u4EE5\u70B9\u4E00\u5F20\u80CC \u724C\u7FFB\u5F00\u3002\u7FFB\u51FA\u6765\u662F\u4EC0\u4E48\u989C\u8272\uFF0C\u5C31\u51B3\u5B9A\u9635\u8425\u3002",
  "\u7B2C 4 \u6B65\uFF1A\u72EE\u3001\u864E\u3001\u8C79\u3001\u72FC\u3001\u72D7\u3001\u732B\u53EF\u4EE5\u4E0A\u5C71\u3002\u8D70\u5230\u80CC \u724C\u90A3\u683C\u540E\uFF0C\u4F1A\u538B\u5728\u80CC \u724C\u4E0A\u9762\u3002",
  "\u7B2C 5 \u6B65\uFF1A\u8001\u9F20\u4E0D\u80FD\u4E0A\u5C71\u3002\u8001\u9F20\u8D70\u5230\u80CC \u724C\u90A3\u683C\u540E\uFF0C\u4F1A\u94BB\u5230\u80CC \u724C\u4E0B\u9762\uFF0C\u663E\u793A\u5730\u9053\u6807\u8BB0\u3002"
];
localMode.addEventListener("click", () => switchMode("local"));
onlineMode.addEventListener("click", () => switchMode("online"));
rulesPrev.addEventListener("click", () => {
  rulesStep = Math.max(0, rulesStep - 1);
  renderRules();
});
rulesNext.addEventListener("click", () => {
  rulesStep = Math.min(ruleSteps.length - 1, rulesStep + 1);
  renderRules();
});
rulesStart.addEventListener("click", () => {
  rulesOpen = false;
  renderRules();
});
createRoom.addEventListener("click", () => {
  if (mode !== "online") {
    switchMode("online");
    return;
  }
  if (!connected) {
    setMessage("\u6B63\u5728\u8FDE\u63A5\u623F\u95F4\u670D\u52A1");
    void ensureConnected();
    return;
  }
  socket.send({ type: "create_room", playerId, nickname });
});
joinRoom.addEventListener("click", () => {
  if (mode !== "online") {
    switchMode("online");
    return;
  }
  if (!connected) {
    setMessage("\u6B63\u5728\u8FDE\u63A5\u623F\u95F4\u670D\u52A1");
    void ensureConnected();
    return;
  }
  const input = window.prompt("\u8F93\u5165\u623F\u95F4\u53F7", roomId);
  if (input) {
    roomId = input.trim().toUpperCase();
    socket.send({ type: "join_room", roomId, playerId, nickname });
  }
});
ready.addEventListener("click", () => {
  if (!roomId) {
    setMessage("\u8BF7\u5148\u521B\u5EFA\u6216\u52A0\u5165\u623F\u95F4");
    return;
  }
  socket.send({ type: "ready", roomId, playerId });
});
share.addEventListener("click", async () => {
  if (!roomId) {
    setMessage("\u8FD8\u6CA1\u6709\u623F\u95F4\u53F7");
    return;
  }
  await navigator.clipboard?.writeText(roomId);
  setMessage(`\u623F\u53F7 ${roomId} \u5DF2\u590D\u5236`);
});
restart.addEventListener("click", () => {
  if (mode === "online") {
    setMessage("\u8054\u7F51\u6A21\u5F0F\u8BF7\u91CD\u65B0\u521B\u5EFA\u623F\u95F4");
    return;
  }
  game.reset();
  state = game.snapshot();
  mySide = "red";
  localPlayerSide = void 0;
  selected = void 0;
  showRules();
  render();
});
resign.addEventListener("click", () => {
  if (mode === "online" && roomId) {
    socket.send({ type: "resign", roomId, playerId });
    return;
  }
  state = game.resign(mySide);
  selected = void 0;
  render();
});
socket.onStatus((next) => {
  connected = next === "open";
  if (connected) {
    if (mode === "online") {
      status.textContent = "\u623F\u95F4\u670D\u52A1\u5DF2\u8FDE\u63A5";
    }
    return;
  }
  if (mode === "online") {
    status.textContent = `\u8FDE\u63A5\u72B6\u6001\uFF1A${connectionLabel(next)}`;
  }
});
socket.onMessage((serverMessage) => {
  if (serverMessage.type === "room_created" || serverMessage.type === "room_joined") {
    mySide = serverMessage.side;
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === "room_state") {
    applyRoom(serverMessage.room);
  } else if (serverMessage.type === "move_rejected") {
    state = serverMessage.state;
    setMessage(serverMessage.reason);
    selected = void 0;
    render();
  } else if (serverMessage.type === "error") {
    setMessage(serverMessage.message);
  }
});
if (mode === "online") {
  void ensureConnected().then(() => {
    if (roomId && connected) {
      socket.send({ type: "join_room", roomId, playerId, nickname });
    }
  });
}
renderRules();
render();
function switchMode(next) {
  mode = next;
  selected = void 0;
  if (mode === "local") {
    roomId = "";
    game.reset();
    state = game.snapshot();
    mySide = "red";
    localPlayerSide = void 0;
    setMessage(state.message);
    showRules();
    render();
    return;
  }
  setMessage(connected ? "\u53EF\u521B\u5EFA\u6216\u52A0\u5165\u597D\u53CB\u623F" : "\u6B63\u5728\u8FDE\u63A5\u623F\u95F4\u670D\u52A1");
  void ensureConnected();
  render();
}
async function ensureConnected() {
  if (connected || connecting) {
    return;
  }
  connecting = true;
  await socket.connect().catch(() => {
    connected = false;
    if (mode === "online") {
      status.textContent = "\u672A\u8FDE\u63A5\u623F\u95F4\u670D\u52A1\uFF0C\u8BF7\u5148\u542F\u52A8\u8054\u7F51\u670D\u52A1";
    }
  }).finally(() => {
    connecting = false;
  });
}
function applyRoom(room) {
  const shouldShowRules = state.status !== "playing" && room.state.status === "playing";
  roomId = room.roomId;
  state = room.state;
  game.replaceState(room.state);
  const me = room.players.find((player) => player.id === playerId);
  if (me?.side) {
    mySide = me.side;
  }
  if (shouldShowRules || state.moveNumber === 0 && lastRulesMoveNumber !== 0) {
    showRules();
  }
  render(room);
}
function render(room) {
  lastRulesMoveNumber = state.moveNumber;
  document.body.classList.toggle("local-mode", mode === "local");
  document.body.classList.toggle("online-mode", mode === "online");
  localMode.classList.toggle("active", mode === "local");
  onlineMode.classList.toggle("active", mode === "online");
  roomCode.textContent = mode === "online" ? roomId || "\u8054\u7F51\u6A21\u5F0F" : "\u672C\u5730\u5BF9\u5F08";
  setMessage(state.winner ? `${sideName2(state.winner)}\u83B7\u80DC\uFF1A${state.message}` : state.message);
  status.textContent = mode === "online" ? `${sideName2(mySide)}\u89C6\u89D2\uFF0C\u5F53\u524D${sideName2(state.turn)}\u884C\u52A8` : `\u672C\u5730\u5BF9\u5F08\uFF0C\u5F53\u524D${sideName2(state.turn)}\u884C\u52A8`;
  players.innerHTML = "";
  const roomPlayers = mode === "online" ? room?.players ?? [
    { id: "online-self", nickname: "\u6211", side: mySide, connected, ready: Boolean(roomId) },
    { id: "online-opponent", nickname: "\u5BF9\u624B", side: mySide === "red" ? "blue" : "red", connected: false, ready: false }
  ] : [
    { id: "red-local", nickname: "\u672C\u5730\u7EA2\u65B9", side: "red", connected: true, ready: true },
    { id: "blue-local", nickname: "\u672C\u5730\u84DD\u65B9", side: "blue", connected: true, ready: true }
  ];
  for (const player of roomPlayers) {
    const item = document.createElement("div");
    const side = player.side ?? "red";
    item.className = `player ${side}`;
    item.classList.toggle("active", side === state.turn && state.status === "playing");
    const badge = document.createElement("span");
    badge.className = `side-badge ${side}`;
    badge.textContent = sideName2(side);
    const name = document.createElement("span");
    name.textContent = ` ${player.nickname} ${player.ready ? "\u5DF2\u51C6\u5907" : "\u672A\u51C6\u5907"} ${player.connected ? "" : "\u79BB\u7EBF"}`;
    item.append(badge, name);
    players.appendChild(item);
  }
  const selectedPiece = selected ? getMovablePieceAt(state, selected) : void 0;
  const legalKeys = new Set(
    selectedPiece ? game.getLegalMovesForPiece(selectedPiece.id, selectedPiece.side).map((move) => keyOf(move.to)) : []
  );
  board.innerHTML = "";
  for (let y = 0; y < state.board.height; y += 1) {
    for (let x = 0; x < state.board.width; x += 1) {
      const position = { x, y };
      const cell = document.createElement("button");
      const base = getBasePieceAt(state, position);
      const top = base ? getCoveringPiece(state, base.id) : getMovablePieceAt(state, position);
      const hidden = base ? getHiddenPiece(state, base.id) : void 0;
      cell.type = "button";
      cell.className = "cell land";
      cell.classList.toggle("selected", selected ? keyOf(selected) === keyOf(position) : false);
      cell.classList.toggle("legal", legalKeys.has(keyOf(position)));
      cell.setAttribute("aria-label", cellLabel(base, top, hidden, position));
      cell.addEventListener("click", () => tapCell(position));
      if (base) {
        cell.appendChild(makePieceToken(base, "base"));
      }
      if (top) {
        cell.appendChild(makePieceToken(top, "top"));
      }
      if (hidden) {
        const marker = document.createElement("span");
        marker.className = `tunnel ${hidden.side}`;
        marker.textContent = `\u5730\u9053:${PIECE_DEFS[hidden.kind].shortName}`;
        cell.appendChild(marker);
      }
      board.appendChild(cell);
    }
  }
}
function tapCell(position) {
  if (rulesOpen) {
    return;
  }
  const piece = getMovablePieceAt(state, position);
  const activeSide = mode === "local" ? state.turn : mySide;
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
    setMessage(state.turn === activeSide ? "\u8BF7\u9009\u62E9\u5DF1\u65B9\u68CB\u5B50\u6216\u7FFB\u5F00\u80CC \u724C" : "\u7B49\u5F85\u5BF9\u65B9\u884C\u52A8");
    return;
  }
  if (mode === "online" && roomId) {
    socket.send({ type: "move_piece", roomId, playerId, from: selected, to: position, moveNumber: state.moveNumber });
    selected = void 0;
    return;
  }
  const result = game.movePiece(selected, position, activeSide);
  state = result.state;
  setMessage(result.reason ?? state.message);
  selected = void 0;
  render();
}
function flipCell(position) {
  if (rulesOpen) {
    return;
  }
  const activeSide = mode === "local" ? state.turn : mySide;
  if (state.turn !== activeSide) {
    setMessage("\u7B49\u5F85\u5BF9\u65B9\u884C\u52A8");
    return;
  }
  if (mode === "online" && roomId) {
    socket.send({ type: "flip_piece", roomId, playerId, position, moveNumber: state.moveNumber });
    return;
  }
  const result = game.flip(position, activeSide, mode === "local" ? `local-${activeSide}` : playerId);
  state = result.state;
  if (mode === "local" && result.assignedSide) {
    localPlayerSide = result.assignedSide;
    mySide = result.assignedSide;
  } else if (mode === "online" && result.assignedSide) {
    mySide = result.assignedSide;
  } else {
    mySide = mode === "local" ? localPlayerSide ?? mySide : mySide;
  }
  setMessage(result.reason ?? state.message);
  selected = void 0;
  render();
}
function makePieceToken(piece, layer) {
  const token = document.createElement("span");
  const visibleClass = piece.revealed ? piece.side : "back";
  token.className = `piece ${visibleClass} ${layer}`;
  token.textContent = piece.revealed ? PIECE_DEFS[piece.kind].shortName : "\u80CC";
  return token;
}
function setMessage(text) {
  message.innerHTML = "";
  const normalized = text.replace(/背牌/g, "\u80CC \u724C").replace(/翻牌/g, "\u7FFB \u724C").replace(/张牌/g, "\u5F20 \u724C").replace(/开牌/g, "\u5F00 \u724C");
  const pattern = /(红方|蓝方)/g;
  let cursor = 0;
  for (const match of normalized.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > cursor) {
      message.append(document.createTextNode(normalized.slice(cursor, index)));
    }
    const side = match[0] === "\u7EA2\u65B9" ? "red" : "blue";
    const badge = document.createElement("span");
    badge.className = `message-side ${side}`;
    badge.textContent = match[0];
    message.append(badge);
    cursor = index + match[0].length;
  }
  if (cursor < normalized.length) {
    message.append(document.createTextNode(normalized.slice(cursor)));
  }
}
function showRules() {
  rulesOpen = true;
  rulesStep = 0;
  renderRules();
}
function renderRules() {
  rulesOverlay.classList.toggle("hidden", !rulesOpen);
  rulesText.textContent = ruleSteps[rulesStep];
  rulesDemo.className = `rules-demo step-${rulesStep}`;
  rulesPrev.disabled = rulesStep === 0;
  rulesNext.disabled = rulesStep === ruleSteps.length - 1;
  rulesStart.disabled = rulesStep !== ruleSteps.length - 1;
  rulesNext.textContent = rulesStep === ruleSteps.length - 2 ? "\u6700\u540E\u4E00\u6B65" : "\u4E0B\u4E00\u6B65";
  rulesStart.textContent = "\u6211\u77E5\u9053\u4E86\uFF0C\u5F00\u59CB";
  ruleDots.forEach((dot, index) => dot.classList.toggle("active", index === rulesStep));
}
function sideName2(side) {
  return side === "red" ? "\u7EA2\u65B9" : "\u84DD\u65B9";
}
function connectionLabel(next) {
  const labels = {
    idle: "\u672A\u8FDE\u63A5",
    connecting: "\u8FDE\u63A5\u4E2D",
    closed: "\u5DF2\u65AD\u5F00",
    error: "\u8FDE\u63A5\u5931\u8D25"
  };
  return labels[next] ?? next;
}
function cellLabel(base, top, hidden, position) {
  const parts = [`${position.x + 1}\u5217${position.y + 1}\u884C`];
  if (base) {
    parts.push(base.revealed ? `${sideName2(base.side)}${PIECE_DEFS[base.kind].name}` : "\u80CC \u724C");
  }
  if (top) {
    parts.push(`\u4E0A\u65B9${sideName2(top.side)}${PIECE_DEFS[top.kind].name}`);
  }
  if (hidden) {
    parts.push(`\u5730\u9053${sideName2(hidden.side)}${PIECE_DEFS[hidden.kind].name}`);
  }
  return parts.join(" ");
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
