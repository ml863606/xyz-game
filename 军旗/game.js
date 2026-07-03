(function () {
  "use strict";

  const Rules = window.JunqiRules;
  const DESIGN_WIDTH = 390;
  const DESIGN_HEIGHT = 844;
  const SAVE_KEY = "childhood_flip_junqi_online_save";
  const PUBLIC_WS_URL = "ws://140.143.127.105:33332";
  const LOCAL_WS_URL = "ws://127.0.0.1:8788";
  const WS_URL = resolveWsUrl();
  const ROOMS_URL = WS_URL.replace(/^ws/, "http") + "/rooms";

  const SCENE = { loading: "loading", username: "username", home: "home", online: "online", rooms: "rooms", waiting: "waiting", rules: "rules", playing: "playing", paused: "paused", result: "result", error: "error" };
  const MODE = { ai: "ai", local: "local", online: "online" };
  const COLORS = {
    ink: "#211710", paper: "#f8e5c4", paper2: "#efd0a0", deepGreen: "#203a24",
    red: "#c83e31", blue: "#2f72bf", gold: "#e8b64f", brass: "#9f7440",
    danger: "#e75b49", success: "#69bd62", shadow: "rgba(22, 12, 6, 0.42)"
  };

  const PHRASES = { hello: "你好", your_turn: "轮到你了", nice: "这手可以", thinking: "我想想", great: "厉害", again: "再来一局" };
  const EMOJIS = { thumb: "👍", smile: "😄", wow: "😮", cool: "😎", fire: "🔥", cry: "😭" };

  const canvas = createCanvas();
  const ctx = canvas.getContext("2d");
  const platform = createPlatform();
  const online = new window.OnlineClient(WS_URL);

  function resolveWsUrl() {
    if (typeof window === "undefined" || !window.location) return LOCAL_WS_URL;
    const host = window.location.hostname;
    if (host === "127.0.0.1" || host === "localhost" || host === "") return LOCAL_WS_URL;
    return PUBLIC_WS_URL;
  }

  const game = {
    scene: SCENE.loading,
    width: DESIGN_WIDTH,
    height: DESIGN_HEIGHT,
    scale: 1,
    dpr: 1,
    safeTop: 24,
    safeBottom: 18,
    mode: MODE.ai,
    state: Rules.createInitialState("playing"),
    selected: null,
    legalMoves: [],
    legalAttacks: [],
    buttons: [],
    inputZones: [],
    particles: [],
    popups: [],
    pressedButton: null,
    boardRect: { x: 24, y: 208, w: 342, h: 456, cell: 57 },
    pulse: 0,
    transition: 0,
    loadingProgress: 0,
    aiThinkingUntil: 0,
    errorText: "",
    coins: 0,
    wins: 0,
    playerId: "",
    nickname: "玩家",
    usernameInput: "",
    usernameError: "",
    usernameConfirmed: false,
    roomId: "",
    roomInput: "",
    pendingShareRoomId: "",
    roomList: [],
    roomListMessage: "点击刷新查看房间",
    playerIndex: 0,
    onlineStatus: "idle",
    onlineMessage: "未连接",
    chatOpen: false,
    chatLog: [],
    roomPlayers: [],
    recentChat: null,
    turnLeftMs: 0
  };

  function createCanvas() {
    if (typeof document !== "undefined") return document.getElementById("gameCanvas") || document.createElement("canvas");
    if (typeof tt !== "undefined" && tt.createCanvas) return tt.createCanvas();
    throw new Error("No canvas environment found");
  }

  function createPlatform() {
    const hasTT = typeof tt !== "undefined";
    return {
      getSystemInfo() {
        if (hasTT && tt.getSystemInfoSync) return tt.getSystemInfoSync();
        return { screenWidth: typeof window !== "undefined" ? window.innerWidth : DESIGN_WIDTH, screenHeight: typeof window !== "undefined" ? window.innerHeight : DESIGN_HEIGHT, pixelRatio: typeof window !== "undefined" ? window.devicePixelRatio : 1, safeArea: null };
      },
      load() {
        try {
          const raw = hasTT && tt.getStorageSync ? tt.getStorageSync(SAVE_KEY) : localStorage.getItem(SAVE_KEY);
          return raw ? JSON.parse(raw) : {};
        } catch (error) {
          return {};
        }
      },
      save(data) {
        try {
          const raw = JSON.stringify(data);
          if (hasTT && tt.setStorageSync) tt.setStorageSync(SAVE_KEY, raw);
          else localStorage.setItem(SAVE_KEY, raw);
        } catch (error) {
          game.errorText = "本地存档暂不可用";
        }
      },
      vibrate(type) {
        if (!hasTT) return;
        if (type === "heavy" && tt.vibrateLong) tt.vibrateLong({});
        else if (tt.vibrateShort) tt.vibrateShort({});
      },
      share() {
        const link = buildShareLink();
        if (hasTT && tt.shareAppMessage) tt.shareAppMessage({ title: "来翻一盘童年军棋", query: game.roomId ? `roomId=${encodeURIComponent(game.roomId)}` : "from=share" });
        else shareWebLink(link);
      }
    };
  }

  function boot() {
    resize();
    const save = platform.load();
    game.coins = Number(save.coins || 0);
    game.wins = Number(save.wins || 0);
    game.playerId = save.playerId || makePlayerId();
    game.nickname = save.nickname || "";
    game.usernameInput = game.nickname;
    game.usernameConfirmed = isValidNickname(game.nickname);
    game.pendingShareRoomId = readShareRoomId();
    game.roomId = "";
    game.roomInput = game.roomId;
    if (game.pendingShareRoomId) game.roomInput = game.pendingShareRoomId;
    saveGame();
    bindInput();
    bindOnline();
    setScene(SCENE.loading);
    requestAnimationFrame(loop);
  }

  function bindOnline() {
    online.onStatus((status) => {
      game.onlineStatus = status;
      if (status === "connecting") game.onlineMessage = "正在连接房间服务";
      if (status === "open") game.onlineMessage = "已连接";
      if (status === "closed") game.onlineMessage = "连接已关闭";
      if (status === "error") game.onlineMessage = "连接失败，请确认房间服务已启动";
    });
    online.onMessage((message) => {
      if (message.type === "room_created" || message.type === "room_joined") {
        game.roomId = message.room.roomId;
        game.roomInput = game.roomId;
        game.playerIndex = message.playerIndex;
        applyRoom(message.room);
        saveGame();
        setScene(message.room.state.status === "playing" ? SCENE.playing : SCENE.waiting);
      } else if (message.type === "room_state") {
        applyRoom(message.room);
        setScene(message.room.state.status === "playing" ? SCENE.playing : message.room.state.status === "waiting" ? SCENE.waiting : SCENE.result);
      } else if (message.type === "move_rejected") {
        game.state = message.state;
        addPopup(message.reason, game.width / 2, game.boardRect.y - 18, COLORS.danger);
      } else if (message.type === "chat") {
        addChat(message.message);
      } else if (message.type === "error") {
        game.errorText = message.message;
        game.onlineMessage = message.message;
        addPopup(message.message, game.width / 2, game.height - 96, COLORS.danger);
      }
    });
  }

  function applyRoom(room) {
    game.roomId = room.roomId;
    game.state = room.state;
    game.roomPlayers = room.players || [];
    game.chatLog = (room.chat || game.chatLog || []).slice(-20);
    game.turnLeftMs = room.turnDeadlineAt ? Math.max(0, room.turnDeadlineAt - room.serverTime) : 0;
    const disconnected = room.players.find((player) => !player.connected);
    if (disconnected && game.state.status === "playing") game.onlineMessage = "等待对手重连";
    else if (game.state.status === "waiting") game.onlineMessage = room.players.length < 2 ? "等待对手加入" : "双方准备后开始";
    else game.onlineMessage = "对局同步中";
  }

  function enterAfterLoading() {
    if (!game.usernameConfirmed) {
      if (game.pendingShareRoomId) game.usernameError = "先设置用户名，再自动加入房间";
      setScene(SCENE.username);
      return;
    }
    if (game.pendingShareRoomId) {
      joinSharedRoom();
      return;
    }
    setScene(SCENE.home);
  }

  function resize() {
    const info = platform.getSystemInfo();
    const sw = info.screenWidth || DESIGN_WIDTH;
    const sh = info.screenHeight || DESIGN_HEIGHT;
    const dpr = Math.max(1, Math.min(2.5, info.pixelRatio || 1));
    canvas.width = Math.floor(sw * dpr);
    canvas.height = Math.floor(sh * dpr);
    if (canvas.style) {
      canvas.style.width = sw + "px";
      canvas.style.height = sh + "px";
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    game.dpr = dpr;
    game.scale = Math.min(sw / DESIGN_WIDTH, sh / DESIGN_HEIGHT);
    game.width = sw / game.scale;
    game.height = sh / game.scale;
    const safe = info.safeArea;
    game.safeTop = safe ? Math.max(20, safe.top / game.scale) : 24;
    game.safeBottom = safe ? Math.max(16, (sh - safe.bottom) / game.scale) : 18;
    updateBoardRect();
  }

  function updateBoardRect() {
    const maxW = Math.min(342, game.width - 34);
    const cell = Math.floor(maxW / Rules.COLS);
    const w = cell * Rules.COLS;
    const h = cell * Rules.ROWS;
    const y = Math.min(Math.max(game.safeTop + 156, 178), game.height - game.safeBottom - h - 128);
    game.boardRect = { x: (game.width - w) / 2, y, w, h, cell };
  }

  function bindInput() {
    const down = (x, y) => {
      const p = toGamePoint(x, y);
      const button = hitButton(p.x, p.y);
      if (button && !button.disabled) {
        game.pressedButton = button;
        button.pressed = true;
      }
    };
    const up = (x, y) => {
      const p = toGamePoint(x, y);
      if (game.pressedButton) {
        const pressed = game.pressedButton;
        pressed.pressed = false;
        game.pressedButton = null;
        if (isInsideButton(pressed, p.x, p.y) && !pressed.disabled) pressed.onTap();
        return;
      }
      const zone = hitInputZone(p.x, p.y);
      if (zone) {
        zone.onTap();
        return;
      }
      if (game.scene === SCENE.playing && canAct()) handleBoardTap(p.x, p.y);
    };

    if (canvas.addEventListener) {
      canvas.addEventListener("mousedown", (event) => down(event.clientX, event.clientY));
      canvas.addEventListener("mouseup", (event) => up(event.clientX, event.clientY));
      canvas.addEventListener("touchstart", (event) => {
        event.preventDefault();
        const touch = event.changedTouches[0];
        down(touch.clientX, touch.clientY);
      }, { passive: false });
      canvas.addEventListener("touchend", (event) => {
        event.preventDefault();
        const touch = event.changedTouches[0];
        up(touch.clientX, touch.clientY);
      }, { passive: false });
      window.addEventListener("resize", resize);
      window.addEventListener("keydown", (event) => {
        if (game.scene === SCENE.username) {
          handleUsernameKey(event);
        } else if (game.scene === SCENE.online && event.key.length === 1) handleRoomKey(event);
        else if (game.scene === SCENE.online && event.key === "Backspace") game.roomInput = game.roomInput.slice(0, -1);
        else if (event.key === "Escape" && game.scene === SCENE.playing) setScene(SCENE.paused);
      });
    }
  }

  function toGamePoint(x, y) {
    return { x: x / game.scale, y: y / game.scale };
  }

  function setScene(scene) {
    game.scene = scene;
    game.transition = 0;
    game.buttons = [];
    game.inputZones = [];
    if (scene === SCENE.loading) game.loadingProgress = 0;
    if (scene === SCENE.username) setupUsernameButtons();
    if (scene === SCENE.home) setupHomeButtons();
    if (scene === SCENE.online) setupOnlineButtons();
    if (scene === SCENE.rooms) setupRoomsButtons();
    if (scene === SCENE.waiting) setupWaitingButtons();
    if (scene === SCENE.rules) setupRulesButtons();
    if (scene === SCENE.playing) setupPlayingButtons();
    if (scene === SCENE.paused) setupPausedButtons();
    if (scene === SCENE.result) setupResultButtons();
    if (scene === SCENE.error) addButton("知道了", game.width / 2 - 106, game.height - game.safeBottom - 112, 212, 54, () => setScene(SCENE.home), "primary");
  }

  function setupHomeButtons() {
    const y = game.height - game.safeBottom - 268;
    addButton("人机练习", game.width / 2 - 118, y, 236, 54, () => startLocal(MODE.ai), "primary");
    addButton("本地双人", game.width / 2 - 118, y + 64, 112, 50, () => startLocal(MODE.local), "ghost");
    addButton("在线对战", game.width / 2 + 6, y + 64, 112, 50, () => setScene(SCENE.online), "gold");
    addButton("玩法规则", game.width / 2 - 118, y + 124, 112, 48, () => setScene(SCENE.rules), "ghost");
    addButton("每日奖励", game.width / 2 + 6, y + 124, 112, 48, claimDaily, "ghost");
    addButton("✎", game.width / 2 + 96, game.height - game.safeBottom - 50, 42, 42, () => setScene(SCENE.username), "icon");
  }

  function setupUsernameButtons() {
    addButton("确认进入", game.width / 2 - 118, 540, 236, 54, confirmUsername, "primary");
    addButton("清空", game.width / 2 - 54, 606, 108, 46, () => {
      game.usernameInput = "";
      game.usernameError = "";
    }, "ghost");
    addInputZone(game.width / 2 - 132, 362, 264, 58, () => promptUsername());
  }

  function setupOnlineButtons() {
    addButton("创建房间", game.width / 2 - 118, 474, 236, 54, createRoom, "primary");
    addButton("加入房间", game.width / 2 - 118, 538, 236, 54, joinRoom, "gold");
    addButton("查看房间", game.width / 2 - 118, 602, 236, 50, () => { setScene(SCENE.rooms); refreshRooms(); }, "ghost");
    addButton("返回", 28, game.height - game.safeBottom - 68, 106, 48, () => setScene(SCENE.home), "ghost");
    addButton("清空", game.width - 134, game.height - game.safeBottom - 68, 106, 48, () => { game.roomInput = ""; }, "ghost");
    addInputZone(game.width / 2 - 118, 396, 236, 54, () => promptRoomId());
  }

  function setupRoomsButtons() {
    addButton("刷新", 28, game.height - game.safeBottom - 68, 106, 48, refreshRooms, "gold");
    addButton("返回", game.width - 134, game.height - game.safeBottom - 68, 106, 48, () => setScene(SCENE.online), "ghost");
  }

  function setupWaitingButtons() {
    const me = getRoomPlayer(game.playerIndex);
    const ready = me && me.ready;
    const readyButton = addButton(ready ? "已准备" : "准备", game.width / 2 - 118, game.height - game.safeBottom - 160, 236, 54, readyRoom, ready ? "ghost" : "primary");
    readyButton.disabled = !!ready;
    addButton("分享房间", game.width / 2 - 118, game.height - game.safeBottom - 96, 112, 48, () => platform.share(), "gold");
    addButton("离开", game.width / 2 + 6, game.height - game.safeBottom - 96, 112, 48, leaveOnline, "ghost");
  }

  function setupRulesButtons() {
    addButton("返回", 24, game.height - game.safeBottom - 72, 106, 48, () => setScene(SCENE.home), "ghost");
    addButton("开一局", game.width - 154, game.height - game.safeBottom - 72, 130, 48, () => startLocal(MODE.ai), "primary");
  }

  function setupPlayingButtons() {
    addButton("Ⅱ", game.width - 66, game.safeTop + 12, 42, 38, () => setScene(SCENE.paused), "icon");
    if (game.mode === MODE.online) addButton("✉", game.width - 76, game.boardRect.y + game.boardRect.h + 6, 48, 42, () => { game.chatOpen = true; }, "gold");
  }

  function setupPausedButtons() {
    addButton("继续", game.width / 2 - 112, 382, 224, 56, () => setScene(SCENE.playing), "primary");
    if (game.mode === MODE.online) addButton("认输", game.width / 2 - 112, 448, 224, 52, resignOnline, "danger");
    else addButton("重新开始", game.width / 2 - 112, 448, 224, 52, () => startLocal(game.mode), "ghost");
    addButton("玩法规则", game.width / 2 - 112, 510, 224, 52, () => setScene(SCENE.rules), "gold");
    addButton("回首页", game.width / 2 - 112, 572, 224, 52, () => { if (game.mode === MODE.online) leaveOnline(); else setScene(SCENE.home); }, "ghost");
  }

  function setupResultButtons() {
    if (game.mode === MODE.online) addButton("回房间", game.width / 2 - 112, 544, 224, 58, () => setScene(SCENE.waiting), "primary");
    else addButton("再来一局", game.width / 2 - 112, 544, 224, 58, () => startLocal(game.mode), "primary");
    addButton("回首页", game.width / 2 - 112, 614, 224, 50, () => setScene(SCENE.home), "ghost");
  }

  function addButton(label, x, y, w, h, onTap, kind) {
    const button = { label, x, y, w, h, onTap, kind, pressed: false, disabled: false };
    game.buttons.push(button);
    return button;
  }

  function addInputZone(x, y, w, h, onTap) {
    game.inputZones.push({ x, y, w, h, onTap });
  }

  function hitButton(x, y) {
    for (let i = game.buttons.length - 1; i >= 0; i -= 1) {
      const b = game.buttons[i];
      if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b;
    }
    return null;
  }

  function isInsideButton(button, x, y) {
    return x >= button.x && x <= button.x + button.w && y >= button.y && y <= button.y + button.h;
  }

  function hitInputZone(x, y) {
    return game.inputZones.find((zone) => x >= zone.x && x <= zone.x + zone.w && y >= zone.y && y <= zone.y + zone.h);
  }

  function startLocal(mode) {
    game.mode = mode;
    game.chatOpen = false;
    game.state = Rules.createInitialState("playing");
    game.state.players[0].name = mode === MODE.ai ? "你" : "玩家 A";
    game.state.players[1].name = mode === MODE.ai ? "电脑" : "玩家 B";
    clearSelection();
    game.aiThinkingUntil = 0;
    setScene(SCENE.playing);
  }

  async function ensureOnline() {
    if (game.onlineStatus === "open") return true;
    try {
      await online.connect();
      return true;
    } catch (error) {
      game.onlineMessage = "连接失败，请先运行 npm run server";
      game.errorText = game.onlineMessage;
      return false;
    }
  }

  async function createRoom() {
    if (!(await ensureOnline())) return;
    game.mode = MODE.online;
    const roomId = normalizeRoomInput(game.roomInput);
    if (roomId !== game.roomInput.trim()) {
      game.onlineMessage = "房间码只能用中文、字母、数字、_、-";
      return;
    }
    game.roomInput = roomId;
    online.send({ type: "create_room", roomId, playerId: game.playerId, nickname: game.nickname });
  }

  async function joinRoom() {
    const roomId = normalizeRoomInput(game.roomInput);
    if (!roomId) {
      game.onlineMessage = "请输入房间码";
      return;
    }
    if (roomId !== game.roomInput.trim()) {
      game.onlineMessage = "房间码只能用中文、字母、数字、_、-";
      return;
    }
    if (!(await ensureOnline())) return;
    game.mode = MODE.online;
    game.roomInput = roomId;
    online.send({ type: "join_room", roomId, playerId: game.playerId, nickname: game.nickname });
  }

  async function joinRoomById(roomId) {
    game.roomInput = roomId;
    await joinRoom();
  }

  async function joinSharedRoom() {
    const roomId = game.pendingShareRoomId;
    game.pendingShareRoomId = "";
    game.roomInput = roomId;
    game.onlineMessage = "正在加入分享房间";
    setScene(SCENE.online);
    await joinRoom();
  }

  async function refreshRooms() {
    game.roomListMessage = "正在获取房间";
    try {
      const response = await fetch(ROOMS_URL, { cache: "no-store" });
      if (!response.ok) throw new Error("bad_status");
      const data = await response.json();
      game.roomList = Array.isArray(data.rooms) ? data.rooms : [];
      game.roomListMessage = game.roomList.length ? "点击未满房间可加入" : "暂无房间，先创建一个";
    } catch (error) {
      game.roomList = [];
      game.roomListMessage = "获取失败，请确认房间服务和 frp 已启动";
    }
  }

  function readyRoom() {
    if (!game.roomId) return;
    const me = getRoomPlayer(game.playerIndex);
    if (me) me.ready = true;
    game.onlineMessage = "已准备，等待对手";
    setScene(SCENE.waiting);
    online.send({ type: "ready", roomId: game.roomId, playerId: game.playerId });
  }

  function resignOnline() {
    if (game.roomId) online.send({ type: "resign", roomId: game.roomId, playerId: game.playerId });
    setScene(SCENE.playing);
  }

  function leaveOnline() {
    online.close();
    game.roomId = "";
    game.roomInput = "";
    game.mode = MODE.ai;
    saveGame();
    setScene(SCENE.home);
  }

  function promptRoomId() {
    if (typeof window === "undefined" || !window.prompt) return;
    const value = window.prompt("输入或自定义房间码", game.roomInput || "");
    if (value !== null) {
      game.roomInput = normalizeRoomInput(value);
      if (String(value).trim() !== game.roomInput) game.onlineMessage = "已去掉不支持的字符";
    }
  }

  function handleRoomKey(event) {
    const next = game.roomInput + event.key;
    const normalized = normalizeRoomInput(next);
    if (normalized === next && Array.from(next).length <= 12) game.roomInput = next;
    else game.onlineMessage = "房间码只能用中文、字母、数字、_、-";
  }

  function normalizeRoomInput(value) {
    return Array.from(String(value || "").trim().replace(/[^\w\u4e00-\u9fff-]/g, "")).slice(0, 12).join("");
  }

  function readShareRoomId() {
    if (typeof window === "undefined" || !window.location) return "";
    try {
      const params = new URLSearchParams(window.location.search || "");
      return normalizeRoomInput(params.get("roomId") || params.get("room") || "");
    } catch (error) {
      return "";
    }
  }

  function buildShareLink() {
    if (!game.roomId || typeof window === "undefined" || !window.location) return "";
    try {
      const url = new URL(window.location.href);
      url.searchParams.set("roomId", game.roomId);
      return url.toString();
    } catch (error) {
      return game.roomId;
    }
  }

  async function shareWebLink(link) {
    if (!link) {
      addPopup("还没有房间可分享", game.width / 2, game.height - 92, COLORS.danger);
      return;
    }
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(link);
        addPopup("房间链接已复制", game.width / 2, game.height - 92, COLORS.gold);
        return;
      }
    } catch (error) {
      // Clipboard may be blocked outside user gesture; fall back to prompt.
    }
    if (typeof window !== "undefined" && window.prompt) window.prompt("复制房间链接发给朋友", link);
    else addPopup(`房间 ${game.roomId}`, game.width / 2, game.height - 92, COLORS.gold);
  }

  function getRoomPlayer(index) {
    return (game.roomPlayers || []).find((player) => player.index === index) || (game.roomPlayers || [])[index];
  }

  function canAct() {
    if (game.state.status !== "playing") return false;
    if (game.mode === MODE.local) return true;
    if (game.mode === MODE.ai) return game.state.current === 0;
    return game.state.current === game.playerIndex && game.onlineStatus === "open";
  }

  function handleBoardTap(x, y) {
    if (game.chatOpen) return;
    const cell = pointToCell(x, y);
    if (!cell) return;
    const piece = getPiece(cell.r, cell.c);
    if (!piece) {
      if (game.selected && isLegalMove(cell.r, cell.c)) performMove(cell);
      return;
    }
    if (!piece.revealed) {
      clearSelection();
      performFlip(cell);
      return;
    }
    if (game.selected && isLegalAttack(cell.r, cell.c)) {
      performMove(cell);
      return;
    }
    if (isCurrentPlayerPiece(piece) && piece.type !== "mine") selectPiece(cell.r, cell.c);
    else {
      clearSelection();
      addPopup("请选择自己的明棋", game.width / 2, game.boardRect.y - 18, COLORS.danger);
    }
  }

  function performFlip(cell) {
    if (game.mode === MODE.online) {
      online.send({ type: "flip_piece", roomId: game.roomId, playerId: game.playerId, position: cell, moveNumber: game.state.moveNumber });
      return;
    }
    applyLocalResult(Rules.flipPiece(game.state, cell, game.state.current));
  }

  function performMove(to) {
    const from = game.selected;
    clearSelection();
    if (game.mode === MODE.online) {
      online.send({ type: "move_piece", roomId: game.roomId, playerId: game.playerId, from, to, moveNumber: game.state.moveNumber });
      return;
    }
    applyLocalResult(Rules.movePiece(game.state, from, to, game.state.current));
  }

  function applyLocalResult(result) {
    if (!result.ok) {
      addPopup(result.reason, game.width / 2, game.boardRect.y - 18, COLORS.danger);
      return;
    }
    game.state = result.state;
    platform.vibrate(result.state.lastMove && result.state.lastMove.kind === "attack" ? "heavy" : "light");
    const last = game.state.lastMove;
    if (last) {
      const p = last.to || last.position;
      if (p) burst(cellCenter(p.r, p.c).x, cellCenter(p.r, p.c).y, COLORS.gold, 12);
    }
    if (game.state.status === "ended") {
      settleLocalReward();
      setTimeoutSafe(() => setScene(SCENE.result), 320);
      return;
    }
    if (game.mode === MODE.ai && game.state.current === 1) game.aiThinkingUntil = performanceNow() + 600;
  }

  function aiAct() {
    if (game.mode !== MODE.ai || game.scene !== SCENE.playing || game.state.current !== 1 || game.state.status !== "playing") return;
    const attacks = [];
    const moves = [];
    const flips = [];
    forEachPiece((piece, r, c) => {
      if (!piece.revealed) flips.push({ r, c });
      else if (piece.side === game.state.players[1].side && piece.type !== "mine") {
        getNeighbors(r, c).forEach((p) => {
          const target = getPiece(p.r, p.c);
          if (!target) moves.push({ from: { r, c }, to: p });
          else if (target.revealed && target.side !== piece.side) attacks.push({ from: { r, c }, to: p });
        });
      }
    });
    if (attacks.length) {
      const action = attacks[Math.floor(Math.random() * attacks.length)];
      applyLocalResult(Rules.movePiece(game.state, action.from, action.to, 1));
    } else if (flips.length && (Math.random() < 0.68 || !moves.length)) {
      applyLocalResult(Rules.flipPiece(game.state, flips[Math.floor(Math.random() * flips.length)], 1));
    } else if (moves.length) {
      const action = moves[Math.floor(Math.random() * moves.length)];
      applyLocalResult(Rules.movePiece(game.state, action.from, action.to, 1));
    }
  }

  function settleLocalReward() {
    const reward = game.state.winner === null ? 18 : game.state.winner === 0 ? 36 : 12;
    game.coins += reward;
    if (game.state.winner === 0) game.wins += 1;
    saveGame();
  }

  function selectPiece(r, c) {
    game.selected = { r, c };
    game.legalMoves = getLegalMoves(r, c);
    game.legalAttacks = getLegalAttacks(r, c);
  }

  function clearSelection() {
    game.selected = null;
    game.legalMoves = [];
    game.legalAttacks = [];
  }

  function getLegalMoves(r, c) {
    const piece = getPiece(r, c);
    if (!piece || piece.type === "mine") return [];
    return getNeighbors(r, c).filter((p) => !getPiece(p.r, p.c));
  }

  function getLegalAttacks(r, c) {
    const piece = getPiece(r, c);
    if (!piece || piece.type === "mine") return [];
    return getNeighbors(r, c).filter((p) => {
      const target = getPiece(p.r, p.c);
      return target && target.revealed && target.side !== piece.side;
    });
  }

  function getNeighbors(r, c) {
    return [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }].filter((p) => p.r >= 0 && p.r < Rules.ROWS && p.c >= 0 && p.c < Rules.COLS);
  }

  function isLegalMove(r, c) {
    return game.legalMoves.some((p) => p.r === r && p.c === c);
  }

  function isLegalAttack(r, c) {
    return game.legalAttacks.some((p) => p.r === r && p.c === c);
  }

  function isCurrentPlayerPiece(piece) {
    return game.state.firstFlipDone && piece.revealed && piece.side === game.state.players[game.state.current].side;
  }

  function pointToCell(x, y) {
    const b = game.boardRect;
    if (x < b.x || x > b.x + b.w || y < b.y || y > b.y + b.h) return null;
    return { r: Math.floor((y - b.y) / b.cell), c: Math.floor((x - b.x) / b.cell) };
  }

  function getPiece(r, c) {
    if (r < 0 || r >= Rules.ROWS || c < 0 || c >= Rules.COLS) return null;
    return game.state.board[r][c];
  }

  function forEachPiece(fn) {
    for (let r = 0; r < Rules.ROWS; r += 1) {
      for (let c = 0; c < Rules.COLS; c += 1) {
        const piece = getPiece(r, c);
        if (piece) fn(piece, r, c);
      }
    }
  }

  function sendChat(kind, id) {
    if (game.mode !== MODE.online || !game.roomId) return;
    const message = { type: "chat", roomId: game.roomId, playerId: game.playerId };
    if (kind === "phrase") message.phraseId = id;
    else message.emojiId = id;
    online.send(message);
    game.chatOpen = false;
  }

  function addChat(message) {
    game.chatLog.push(message);
    game.chatLog = game.chatLog.slice(-20);
    game.recentChat = { ...message, life: 180 };
  }

  function chatText(message) {
    if (!message) return "";
    if (message.kind === "emoji") return EMOJIS[message.emojiId] || "";
    return PHRASES[message.phraseId] || "";
  }

  function claimDaily() {
    game.coins += 20;
    saveGame();
    addPopup("+20 铜钱", game.width / 2, game.height - game.safeBottom - 116, COLORS.gold);
  }

  function handleUsernameKey(event) {
    if (event.key === "Backspace") {
      game.usernameInput = Array.from(game.usernameInput).slice(0, -1).join("");
      game.usernameError = "";
      return;
    }
    if (event.key === "Enter") {
      confirmUsername();
      return;
    }
    if (event.key.length !== 1) return;
    const next = game.usernameInput + event.key;
    if (Array.from(next).length <= 12) {
      game.usernameInput = next;
      game.usernameError = "";
    }
  }

  function promptUsername() {
    if (typeof window === "undefined" || !window.prompt) return;
    const value = window.prompt("输入用户名", game.usernameInput || "");
    if (value !== null) {
      game.usernameInput = value.trim().slice(0, 12);
      game.usernameError = "";
    }
  }

  function confirmUsername() {
    const name = game.usernameInput.trim();
    const error = validateNickname(name);
    if (error) {
      game.usernameError = error;
      return;
    }
    game.nickname = name;
    game.usernameConfirmed = true;
    game.usernameError = "";
    saveGame();
    if (game.pendingShareRoomId) joinSharedRoom();
    else setScene(SCENE.home);
  }

  function validateNickname(name) {
    const chars = Array.from(name);
    if (!chars.length) return "请先输入用户名";
    if (chars.length < 2) return "用户名至少 2 个字符";
    if (chars.length > 12) return "用户名最多 12 个字符";
    if (!/^[A-Za-z0-9_\-\u4e00-\u9fff]+$/.test(name)) return "只能用字母、数字、_、- 或汉字";
    return "";
  }

  function isValidNickname(name) {
    return !validateNickname(String(name || ""));
  }

  function saveGame() {
    platform.save({ coins: game.coins, wins: game.wins, playerId: game.playerId, nickname: game.nickname });
  }

  function makePlayerId() {
    return "p_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }

  function setTimeoutSafe(fn, ms) {
    if (typeof setTimeout !== "undefined") setTimeout(fn, ms);
    else fn();
  }

  function performanceNow() {
    if (typeof performance !== "undefined" && performance.now) return performance.now();
    return Date.now();
  }

  function loop(now) {
    if (!now) now = performanceNow();
    update(now);
    draw();
    requestAnimationFrame(loop);
  }

  function update(now) {
    game.pulse += 0.016;
    game.transition = Math.min(1, game.transition + 0.05);
    if (game.scene === SCENE.loading) {
      game.loadingProgress = Math.min(1, game.loadingProgress + 0.025);
      if (game.loadingProgress >= 1) enterAfterLoading();
    }
    updateEffects();
    if (game.mode === MODE.ai && game.aiThinkingUntil && now >= game.aiThinkingUntil) {
      game.aiThinkingUntil = 0;
      aiAct();
    }
    if (game.recentChat) {
      game.recentChat.life -= 1;
      if (game.recentChat.life <= 0) game.recentChat = null;
    }
    if (game.mode === MODE.online && game.turnLeftMs > 0) game.turnLeftMs = Math.max(0, game.turnLeftMs - 16);
  }

  function updateEffects() {
    game.particles = game.particles.filter((p) => {
      p.life -= 1;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.06;
      return p.life > 0;
    });
    game.popups = game.popups.filter((p) => {
      p.life -= 1;
      p.y -= 0.55;
      return p.life > 0;
    });
  }

  function addPopup(text, x, y, color) {
    game.popups.push({ text, x, y, color, life: 58 });
  }

  function burst(x, y, color, count) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.2 + Math.random() * 2.8;
      game.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, r: 2 + Math.random() * 3, color, life: 28 + Math.random() * 18 });
    }
  }

  function cellCenter(r, c) {
    const b = game.boardRect;
    return { x: b.x + c * b.cell + b.cell / 2, y: b.y + r * b.cell + b.cell / 2 };
  }

  function draw() {
    ctx.save();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(game.scale, game.scale);
    game.buttons = game.buttons.filter((button) => !button.chatTemp);
    drawBackground();
    if (game.scene === SCENE.loading) drawLoading();
    if (game.scene === SCENE.username) drawUsername();
    if (game.scene === SCENE.home) drawHome();
    if (game.scene === SCENE.online) drawOnline();
    if (game.scene === SCENE.rooms) drawRooms();
    if (game.scene === SCENE.waiting) drawWaiting();
    if (game.scene === SCENE.rules) drawRules();
    if ([SCENE.playing, SCENE.paused, SCENE.result].includes(game.scene)) drawGame();
    if (game.scene === SCENE.paused) drawPause();
    if (game.scene === SCENE.result) drawResult();
    if (game.scene === SCENE.error) drawError();
    if (game.chatOpen) drawChatPanel();
    drawParticles();
    drawPopups();
    drawButtons();
    ctx.restore();
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, game.height);
    g.addColorStop(0, "#24180f");
    g.addColorStop(0.5, "#4c2f1b");
    g.addColorStop(1, "#1b120d");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, game.width, game.height);
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#f0c56e";
    for (let y = 48; y < game.height; y += 72) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(game.width - 20, y + 16);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawLoading() {
    drawTitle(game.safeTop + 92);
    drawMiniBoard(game.width / 2, 350, 0.82);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "700 15px sans-serif";
    ctx.fillText("正在摆棋", game.width / 2, 478);
    roundRect(game.width / 2 - 118, 512, 236, 14, 7, true, "rgba(248,229,196,0.18)");
    roundRect(game.width / 2 - 118, 512, 236 * game.loadingProgress, 14, 7, true, COLORS.gold);
  }

  function drawHome() {
    drawTopStats();
    drawTitle(game.safeTop + 70);
    drawMiniBoard(game.width / 2, 292, 0.95);
    drawPanel(32, 438, game.width - 64, 92, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "800 17px sans-serif";
    ctx.fillText("房间码联机，边翻棋边发消息", game.width / 2, 472);
    ctx.font = "600 13px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.78)";
    ctx.fillText("无军旗、无铁路，保留炸弹和地雷", game.width / 2, 500);
    drawHomeNickname();
  }

  function drawHomeNickname() {
    const y = game.height - game.safeBottom - 58;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(248,229,196,0.72)";
    ctx.font = "700 12px sans-serif";
    ctx.fillText("游戏名", game.width / 2, y);
    ctx.fillStyle = COLORS.paper;
    ctx.font = "900 24px sans-serif";
    const name = game.nickname || "未设置";
    ctx.fillText(name, game.width / 2, y + 30);
  }

  function drawUsername() {
    drawTitle(game.safeTop + 86);
    drawPanel(32, 260, game.width - 64, 360, 20);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "900 22px sans-serif";
    ctx.fillText("设置用户名", game.width / 2, 306);
    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.76)";
    ctx.fillText("用于房间列表和对局显示，先简单规避重名", game.width / 2, 334);

    ctx.fillStyle = "rgba(248,229,196,0.12)";
    roundRect(game.width / 2 - 132, 362, 264, 58, 14, true);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.8;
    roundRect(game.width / 2 - 132, 362, 264, 58, 14, false);
    ctx.fillStyle = game.usernameInput ? COLORS.paper : "rgba(248,229,196,0.52)";
    ctx.font = "900 22px sans-serif";
    ctx.fillText(game.usernameInput || "点击输入用户名", game.width / 2, 398);

    ctx.textAlign = "left";
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.74)";
    ctx.fillText("规则：2-12 个字符", 70, 444);
    ctx.fillText("只能用字母、数字、_、- 或汉字", 70, 470);
    ctx.fillText("不能包含空格和其他特殊字符", 70, 496);
    if (game.usernameError) {
      ctx.textAlign = "center";
      ctx.fillStyle = COLORS.danger;
      ctx.font = "900 13px sans-serif";
      ctx.fillText(game.usernameError, game.width / 2, 536);
    }
  }

  function drawOnline() {
    drawTopStats();
    drawTitle(game.safeTop + 72);
    drawPanel(32, 250, game.width - 64, 320, 20);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "900 22px sans-serif";
    ctx.fillText("在线对战", game.width / 2, 292);
    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.76)";
    ctx.fillText(game.onlineMessage, game.width / 2, 324);
    ctx.fillStyle = "rgba(248,229,196,0.12)";
    roundRect(game.width / 2 - 118, 396, 236, 54, 14, true);
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.6;
    roundRect(game.width / 2 - 118, 396, 236, 54, 14, false);
    ctx.fillStyle = game.roomInput ? COLORS.paper : "rgba(248,229,196,0.52)";
    ctx.font = "900 24px sans-serif";
    ctx.fillText(game.roomInput || "输入房间码", game.width / 2, 430);
    ctx.font = "600 12px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.62)";
    ctx.fillText("点输入框填写，或直接键盘输入", game.width / 2, 462);
  }

  function drawWaiting() {
    drawTopStats();
    drawTitle(game.safeTop + 64);
    drawPanel(28, 220, game.width - 56, 360, 20);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 34px sans-serif";
    ctx.fillText(game.roomId || "------", game.width / 2, 284);
    ctx.fillStyle = "rgba(248,229,196,0.76)";
    ctx.font = "700 13px sans-serif";
    ctx.fillText("把房间码发给朋友，双方准备后开局", game.width / 2, 314);
    drawWaitingPlayers(260);
    ctx.fillStyle = COLORS.paper;
    ctx.font = "800 15px sans-serif";
    ctx.fillText(game.onlineMessage, game.width / 2, 510);
  }

  function drawRooms() {
    drawTopStats();
    drawTitle(game.safeTop + 58);
    drawPanel(24, 178, game.width - 48, game.height - game.safeBottom - 268, 18);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "900 22px sans-serif";
    ctx.fillText("房间列表", game.width / 2, 218);
    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.76)";
    ctx.fillText(game.roomListMessage, game.width / 2, 246);

    const startY = 276;
    const itemH = 66;
    game.roomList.slice(0, 6).forEach((room, index) => {
      const y = startY + index * itemH;
      const isJoinable = !room.full && room.status === "waiting";
      drawPanel(44, y, game.width - 88, 54, 14, isJoinable ? "rgba(248,229,196,0.12)" : "rgba(100,80,64,0.18)");
      ctx.textAlign = "left";
      ctx.fillStyle = COLORS.paper;
      ctx.font = "900 16px sans-serif";
      ctx.fillText(room.roomId, 62, y + 21);
      ctx.font = "700 12px sans-serif";
      ctx.fillStyle = isJoinable ? COLORS.success : COLORS.danger;
      const statusText = room.full ? "已满" : room.status === "waiting" ? "未满" : "对局中";
      ctx.fillText(`${statusText} ${room.playerCount}/${room.capacity}`, 62, y + 41);
      ctx.textAlign = "right";
      ctx.fillStyle = "rgba(248,229,196,0.76)";
      ctx.fillText((room.players || []).map((p) => p.nickname).join(" / ") || "等待玩家", game.width - 68, y + 31);
      if (isJoinable) {
        addButton("加入", game.width - 112, y + 9, 54, 36, () => joinRoomById(room.roomId), "gold").chatTemp = true;
      }
    });
  }

  function drawWaitingPlayers(y) {
    const players = game.roomPlayers || [];
    [0, 1].forEach((index) => {
      const player = players[index];
      const x = index === 0 ? 52 : game.width / 2 + 14;
      drawPanel(x, y + 92, game.width / 2 - 66, 94, 14, "rgba(248,229,196,0.1)");
      ctx.textAlign = "center";
      ctx.fillStyle = player ? COLORS.paper : "rgba(248,229,196,0.52)";
      ctx.font = "900 16px sans-serif";
      ctx.fillText(player ? player.nickname : "等待加入", x + (game.width / 2 - 66) / 2, y + 126);
      ctx.font = "700 12px sans-serif";
      ctx.fillStyle = "rgba(248,229,196,0.62)";
      ctx.fillText(player ? (player.ready ? "已准备" : "未准备") : "空位", x + (game.width / 2 - 66) / 2, y + 154);
    });
  }

  function drawRules() {
    drawTopStats();
    drawTitle(game.safeTop + 58);
    drawPanel(24, game.safeTop + 130, game.width - 48, game.height - game.safeTop - game.safeBottom - 228, 18);
    const lines = ["1. 第一次翻出的颜色，就是当前玩家阵营。", "2. 每回合只能翻棋、移动或攻击一次。", "3. 棋子只能上下左右移动一格。", "4. 暗棋不能被移动或攻击，必须先翻开。", "5. 司令最大，依次到工兵最小。", "6. 同级相遇，双方同时移除。", "7. 炸弹碰任意明棋，双方同归于尽。", "8. 工兵能排雷，炸弹能炸雷。", "9. 地雷不能移动，非工兵撞雷会被移除。", "10. 联机时服务端判定棋局，断线 60 秒判负。"];
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "700 14px sans-serif";
    lines.forEach((line, index) => wrapText(line, 44, game.safeTop + 160 + index * 38, game.width - 88, 18));
  }

  function drawGame() {
    drawHud();
    drawBoard();
    drawMessage();
    drawRecentChat();
  }

  function drawHud() {
    const y = game.safeTop + 58;
    drawPlayerCard(24, y, game.state.players[0], game.state.current === 0);
    drawPlayerCard(game.width - 154, y, game.state.players[1], game.state.current === 1);
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "900 15px sans-serif";
    ctx.fillText(`第 ${game.state.moveNumber + 1} 手`, game.width / 2, y + 25);
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.72)";
    const modeText = game.mode === MODE.online ? `房间 ${game.roomId}` : game.mode === MODE.ai ? "人机练习" : "本地双人";
    ctx.fillText(modeText, game.width / 2, y + 47);
    if (game.mode === MODE.online && game.turnLeftMs > 0) {
      ctx.fillStyle = game.turnLeftMs < 10000 ? COLORS.danger : COLORS.gold;
      ctx.font = "900 13px sans-serif";
      ctx.fillText(Math.ceil(game.turnLeftMs / 1000) + "s", game.width / 2, y + 67);
    }
  }

  function drawPlayerCard(x, y, player, active) {
    const side = player && player.side;
    const color = side ? sideColor(side) : COLORS.brass;
    drawPanel(x, y, 130, 64, 14, active ? "rgba(232,182,79,0.28)" : "rgba(248,229,196,0.1)");
    ctx.fillStyle = color;
    roundRect(x + 10, y + 15, 12, 34, 6, true);
    ctx.textAlign = "left";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "800 15px sans-serif";
    ctx.fillText(player ? player.name : "玩家", x + 30, y + 24);
    ctx.font = "700 12px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.74)";
    ctx.fillText(side ? sideName(side) : "未定阵营", x + 30, y + 47);
  }

  function drawBoard() {
    const b = game.boardRect;
    drawPanel(b.x - 10, b.y - 10, b.w + 20, b.h + 20, 18, "#5b371f");
    for (let r = 0; r < Rules.ROWS; r += 1) {
      for (let c = 0; c < Rules.COLS; c += 1) {
        const x = b.x + c * b.cell;
        const y = b.y + r * b.cell;
        ctx.fillStyle = (r + c) % 2 === 0 ? "#7a502c" : "#694326";
        roundRect(x + 3, y + 3, b.cell - 6, b.cell - 6, 8, true);
        ctx.strokeStyle = "rgba(248,229,196,0.18)";
        ctx.lineWidth = 1;
        roundRect(x + 3, y + 3, b.cell - 6, b.cell - 6, 8, false);
        drawCellHint(r, c);
        const piece = getPiece(r, c);
        if (piece) drawPiece(piece, x + b.cell / 2, y + b.cell / 2, b.cell * 0.78, game.selected && game.selected.r === r && game.selected.c === c);
      }
    }
  }

  function drawCellHint(r, c) {
    const b = game.boardRect;
    const x = b.x + c * b.cell + b.cell / 2;
    const y = b.y + r * b.cell + b.cell / 2;
    if (isLegalMove(r, c)) {
      ctx.fillStyle = "rgba(105,189,98,0.35)";
      ctx.beginPath();
      ctx.arc(x, y, b.cell * 0.18, 0, Math.PI * 2);
      ctx.fill();
    }
    if (isLegalAttack(r, c)) {
      ctx.strokeStyle = "rgba(231,91,73,0.9)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, y, b.cell * 0.38, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawPiece(piece, cx, cy, size, selected) {
    ctx.save();
    ctx.translate(cx, cy);
    if (selected) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
      ctx.stroke();
    }
    const color = piece.revealed ? sideColor(piece.side) : COLORS.deepGreen;
    ctx.fillStyle = COLORS.shadow;
    roundRect(-size / 2, -size / 2 + 4, size, size, 12, true);
    ctx.fillStyle = color;
    roundRect(-size / 2, -size / 2, size, size, 12, true);
    ctx.strokeStyle = piece.revealed ? COLORS.paper2 : COLORS.gold;
    ctx.lineWidth = 2;
    roundRect(-size / 2, -size / 2, size, size, 12, false);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (piece.revealed) {
      ctx.fillStyle = COLORS.paper;
      ctx.font = "900 " + Math.floor(size * 0.42) + "px sans-serif";
      ctx.fillText(Rules.PIECES[piece.type].short, 0, -2);
      ctx.font = "700 " + Math.floor(size * 0.16) + "px sans-serif";
      ctx.fillText(Rules.PIECES[piece.type].label, 0, size * 0.3);
    } else {
      ctx.fillStyle = COLORS.gold;
      ctx.font = "900 " + Math.floor(size * 0.48) + "px sans-serif";
      ctx.fillText("?", 0, 0);
    }
    ctx.restore();
  }

  function drawMessage() {
    const y = game.boardRect.y + game.boardRect.h + 24;
    drawPanel(28, y, game.width - 56, 66, 16, "rgba(33,23,16,0.78)");
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.paper;
    ctx.font = "800 14px sans-serif";
    const text = game.mode === MODE.online && game.onlineMessage === "等待对手重连" ? "等待对手重连" : game.state.message || "轮到你行动";
    wrapText(text, game.width / 2, y + 19, game.width - 92, 19);
  }

  function drawRecentChat() {
    if (!game.recentChat || game.mode !== MODE.online) return;
    const x = game.recentChat.playerIndex === 0 ? 42 : game.width - 188;
    const y = game.boardRect.y - 42;
    drawPanel(x, y, 146, 38, 14, "rgba(248,229,196,0.92)");
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.ink;
    ctx.font = "900 15px sans-serif";
    ctx.fillText(chatText(game.recentChat), x + 73, y + 24);
  }

  function drawPause() {
    drawOverlay();
    drawModal("暂停", "棋局已停住，回来继续翻。", 298);
  }

  function drawResult() {
    drawOverlay();
    const title = game.state.winner === null ? "和棋" : game.state.winner === myResultIndex() ? "胜利" : "失败";
    const desc = game.state.result === "timeout" ? "超时判负，节奏也很重要。" : game.state.message || "本局结束";
    drawModal(title, desc, 292);
    ctx.textAlign = "center";
    ctx.fillStyle = title === "胜利" ? COLORS.gold : COLORS.paper;
    ctx.font = "900 36px sans-serif";
    ctx.fillText(title === "胜利" ? "+36" : title === "和棋" ? "+18" : "+12", game.width / 2, 430);
    ctx.font = "700 13px sans-serif";
    ctx.fillStyle = "rgba(248,229,196,0.76)";
    ctx.fillText(game.mode === MODE.online ? "联机对局结束" : "本局铜钱奖励", game.width / 2, 458);
  }

  function drawError() {
    drawOverlay();
    drawModal("提示", game.errorText || "当前功能暂不可用", 330);
  }

  function drawChatPanel() {
    drawOverlay();
    drawPanel(24, 214, game.width - 48, 390, 20, "#54321f");
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 24px sans-serif";
    ctx.fillText("发送消息", game.width / 2, 254);
    Object.entries(PHRASES).forEach(([id, text], index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      addButton(text, 52 + col * 146, 286 + row * 56, 132, 42, () => sendChat("phrase", id), "ghost").chatTemp = true;
    });
    Object.entries(EMOJIS).forEach(([id, text], index) => {
      addButton(text, 48 + index * 48, 472, 40, 40, () => sendChat("emoji", id), "gold").chatTemp = true;
    });
    addButton("关闭", game.width / 2 - 68, 538, 136, 42, () => { game.chatOpen = false; }, "ghost").chatTemp = true;
  }

  function drawOverlay() {
    ctx.fillStyle = "rgba(18,10,6,0.62)";
    ctx.fillRect(0, 0, game.width, game.height);
  }

  function drawModal(title, body, y) {
    drawPanel(32, y, game.width - 64, 250, 22, "#54321f");
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 30px sans-serif";
    ctx.fillText(title, game.width / 2, y + 62);
    ctx.fillStyle = "rgba(248,229,196,0.82)";
    ctx.font = "700 14px sans-serif";
    wrapText(body, game.width / 2, y + 91, game.width - 92, 20);
  }

  function drawButtons() {
    const drawn = new Set();
    game.buttons.forEach((b) => {
      const key = `${b.label}_${b.x}_${b.y}`;
      if (drawn.has(key)) return;
      drawn.add(key);
      const offset = b.pressed ? 3 : 0;
      ctx.save();
      ctx.globalAlpha = b.disabled ? 0.58 : 1;
      ctx.translate(0, offset);
      let fill = "rgba(248,229,196,0.12)";
      let stroke = "rgba(248,229,196,0.36)";
      let text = COLORS.paper;
      if (b.kind === "primary") {
        fill = COLORS.red;
        stroke = COLORS.gold;
      } else if (b.kind === "gold") {
        fill = COLORS.gold;
        stroke = "#ffe39a";
        text = COLORS.ink;
      } else if (b.kind === "danger") {
        fill = COLORS.danger;
        stroke = COLORS.gold;
      } else if (b.kind === "icon") {
        fill = "rgba(248,229,196,0.15)";
      }
      ctx.fillStyle = COLORS.shadow;
      roundRect(b.x, b.y + 5, b.w, b.h, Math.min(16, b.h / 2), true);
      ctx.fillStyle = fill;
      roundRect(b.x, b.y, b.w, b.h, Math.min(16, b.h / 2), true);
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.8;
      roundRect(b.x, b.y, b.w, b.h, Math.min(16, b.h / 2), false);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = text;
      ctx.font = b.kind === "icon" ? "900 21px sans-serif" : "900 16px sans-serif";
      ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 1);
      ctx.restore();
    });
  }

  function drawParticles() {
    game.particles.forEach((p) => {
      ctx.globalAlpha = Math.max(0, p.life / 42);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
  }

  function drawPopups() {
    game.popups.forEach((p) => {
      ctx.globalAlpha = Math.min(1, p.life / 18);
      ctx.textAlign = "center";
      ctx.font = "900 18px sans-serif";
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, p.y);
      ctx.globalAlpha = 1;
    });
  }

  function drawTopStats() {
    ctx.textAlign = "left";
    ctx.fillStyle = "rgba(248,229,196,0.9)";
    ctx.font = "800 14px sans-serif";
    ctx.fillText("胜场 " + game.wins, 26, game.safeTop + 26);
    ctx.textAlign = "right";
    ctx.fillText("铜钱 " + game.coins, game.width - 26, game.safeTop + 26);
  }

  function drawTitle(y) {
    ctx.textAlign = "center";
    ctx.fillStyle = COLORS.gold;
    ctx.font = "900 42px sans-serif";
    ctx.fillText("童年翻军棋", game.width / 2, y);
    ctx.fillStyle = "rgba(248,229,196,0.78)";
    ctx.font = "700 14px sans-serif";
    ctx.fillText("纯格子地摊翻棋", game.width / 2, y + 34);
  }

  function drawMiniBoard(cx, cy, scale) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    drawPanel(-142, -112, 284, 224, 18);
    for (let r = 0; r < 4; r += 1) {
      for (let c = 0; c < 6; c += 1) {
        const x = -124 + c * 43;
        const y = -88 + r * 43;
        const face = (r + c) % 4 === 0;
        roundRect(x, y, 33, 33, 7, true, face ? (c % 2 ? COLORS.blue : COLORS.red) : COLORS.deepGreen);
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 1.8;
        roundRect(x, y, 33, 33, 7, false);
        ctx.fillStyle = COLORS.paper;
        ctx.font = "900 17px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(face ? (c % 2 ? "军" : "炸") : "?", x + 16.5, y + 17.5);
      }
    }
    ctx.restore();
  }

  function drawPanel(x, y, w, h, r, color) {
    ctx.fillStyle = COLORS.shadow;
    roundRect(x, y + 5, w, h, r, true);
    ctx.fillStyle = color || "rgba(248,229,196,0.1)";
    roundRect(x, y, w, h, r, true);
    ctx.strokeStyle = "rgba(232,182,79,0.55)";
    ctx.lineWidth = 1.6;
    roundRect(x, y, w, h, r, false);
  }

  function roundRect(x, y, w, h, r, fill, color) {
    if (color) ctx.fillStyle = color;
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    if (fill) ctx.fill();
    else ctx.stroke();
  }

  function wrapText(text, x, y, maxWidth, lineHeight) {
    const chars = String(text).split("");
    let line = "";
    let yy = y;
    chars.forEach((char, index) => {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        ctx.fillText(line, x, yy);
        line = char;
        yy += lineHeight;
      } else {
        line = test;
      }
      if (index === chars.length - 1 && line) ctx.fillText(line, x, yy);
    });
  }

  function sideColor(side) {
    return side === "red" ? COLORS.red : COLORS.blue;
  }

  function sideName(side) {
    return side === "red" ? "红方" : "蓝方";
  }

  function myResultIndex() {
    return game.mode === MODE.online ? game.playerIndex : 0;
  }

  boot();
})();

