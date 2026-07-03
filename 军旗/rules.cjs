(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.JunqiRules = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const ROWS = 8;
  const COLS = 6;
  const SIDES = ["red", "blue"];
  const TURN_MS = 45000;

  const PIECES = {
    marshal: { label: "司令", short: "司", power: 9, count: 1 },
    general: { label: "军长", short: "军", power: 8, count: 1 },
    division: { label: "师长", short: "师", power: 7, count: 2 },
    brigade: { label: "旅长", short: "旅", power: 6, count: 2 },
    regiment: { label: "团长", short: "团", power: 5, count: 2 },
    battalion: { label: "营长", short: "营", power: 4, count: 2 },
    company: { label: "连长", short: "连", power: 3, count: 3 },
    platoon: { label: "排长", short: "排", power: 2, count: 3 },
    engineer: { label: "工兵", short: "工", power: 1, count: 3 },
    bomb: { label: "炸弹", short: "炸", power: 0, count: 2, special: "bomb" },
    mine: { label: "地雷", short: "雷", power: 0, count: 3, special: "mine" }
  };

  const TYPE_ORDER = [
    "marshal",
    "general",
    "division",
    "brigade",
    "regiment",
    "battalion",
    "company",
    "platoon",
    "engineer",
    "bomb",
    "mine"
  ];

  function createInitialState(status) {
    const pieces = [];
    SIDES.forEach((side) => {
      TYPE_ORDER.forEach((type) => {
        for (let i = 0; i < PIECES[type].count; i += 1) {
          pieces.push({ id: `${side}_${type}_${i}`, side, type, revealed: false });
        }
      });
    });
    shuffle(pieces);
    const board = [];
    for (let r = 0; r < ROWS; r += 1) {
      const row = [];
      for (let c = 0; c < COLS; c += 1) row.push(pieces[r * COLS + c]);
      board.push(row);
    }
    return {
      status: status || "playing",
      board,
      current: 0,
      firstFlipDone: false,
      players: [
        { name: "玩家 A", side: null, score: 0 },
        { name: "玩家 B", side: null, score: 0 }
      ],
      message: "翻开第一枚棋确定阵营",
      winner: null,
      result: null,
      moveNumber: 0,
      noCaptureTurns: 0,
      lastMove: null
    };
  }

  function cloneState(state) {
    return JSON.parse(JSON.stringify(state));
  }

  function getPiece(state, r, c) {
    if (!inBounds(r, c)) return null;
    return state.board[r][c];
  }

  function flipPiece(state, position, playerIndex) {
    const next = cloneState(state);
    if (next.status !== "playing") return rejected(next, "棋局尚未开始");
    if (playerIndex !== next.current) return rejected(next, "还没轮到你");
    const { r, c } = position;
    const piece = getPiece(next, r, c);
    if (!piece) return rejected(next, "这里没有棋子");
    if (piece.revealed) return rejected(next, "这枚棋已经翻开");

    piece.revealed = true;
    let assignedSide = null;
    if (!next.firstFlipDone) {
      assignedSide = piece.side;
      next.players[playerIndex].side = piece.side;
      next.players[1 - playerIndex].side = otherSide(piece.side);
      next.firstFlipDone = true;
      next.message = `${next.players[playerIndex].name} 是${sideName(piece.side)}`;
    } else {
      next.message = `翻出${sideName(piece.side)}${PIECES[piece.type].label}`;
    }

    next.lastMove = { kind: "flip", playerIndex, position, pieceId: piece.id };
    return finishTurn(next, false, assignedSide);
  }

  function movePiece(state, from, to, playerIndex) {
    const next = cloneState(state);
    if (next.status !== "playing") return rejected(next, "棋局尚未开始");
    if (playerIndex !== next.current) return rejected(next, "还没轮到你");
    const piece = getPiece(next, from.r, from.c);
    if (!piece || !piece.revealed) return rejected(next, "请选择自己的明棋");
    if (piece.side !== next.players[playerIndex].side) return rejected(next, "不能操作对方棋子");
    if (!isMovable(piece)) return rejected(next, "地雷不能移动");
    if (!isNeighbor(from, to)) return rejected(next, "只能上下左右走一格");
    const target = getPiece(next, to.r, to.c);
    if (target && !target.revealed) return rejected(next, "暗棋不能被攻击");
    if (target && target.side === piece.side) return rejected(next, "不能走到己方棋子上");

    if (!target) {
      next.board[to.r][to.c] = piece;
      next.board[from.r][from.c] = null;
      next.message = `${PIECES[piece.type].label}移动`;
      next.lastMove = { kind: "move", playerIndex, from, to, pieceId: piece.id };
      return finishTurn(next, false, null);
    }

    const result = resolveCombat(piece, target);
    let captured = true;
    if (result === "attacker") {
      next.board[to.r][to.c] = piece;
      next.board[from.r][from.c] = null;
      next.players[playerIndex].score += 1;
      next.message = `${PIECES[piece.type].label}吃掉${PIECES[target.type].label}`;
    } else if (result === "defender") {
      next.board[from.r][from.c] = null;
      next.message = `${PIECES[piece.type].label}撞上${PIECES[target.type].label}`;
    } else {
      next.board[from.r][from.c] = null;
      next.board[to.r][to.c] = null;
      next.message = `${PIECES[piece.type].label}与${PIECES[target.type].label}同归于尽`;
    }
    next.lastMove = { kind: "attack", playerIndex, from, to, pieceId: piece.id, targetId: target.id, result };
    return finishTurn(next, captured, null);
  }

  function resign(state, playerIndex) {
    const next = cloneState(state);
    next.status = "ended";
    next.winner = 1 - playerIndex;
    next.result = "resign";
    next.message = `${next.players[playerIndex].name}认输`;
    return { ok: true, state: next };
  }

  function finishByTimeout(state, playerIndex) {
    const next = cloneState(state);
    next.status = "ended";
    next.winner = 1 - playerIndex;
    next.result = "timeout";
    next.message = `${next.players[playerIndex].name}超时`;
    return { ok: true, state: next };
  }

  function finishTurn(state, captured, assignedSide) {
    state.moveNumber += 1;
    state.noCaptureTurns = captured ? 0 : state.noCaptureTurns + 1;
    const end = checkGameEnd(state);
    if (end) {
      state.status = "ended";
      state.winner = end.winner;
      state.result = end.result;
      state.message = end.message;
      return { ok: true, state, assignedSide };
    }
    state.current = 1 - state.current;
    return { ok: true, state, assignedSide };
  }

  function checkGameEnd(state) {
    if (!state.firstFlipDone) return null;
    const movable = [countMovablePieces(state, state.players[0].side), countMovablePieces(state, state.players[1].side)];
    if (movable[0] === 0) return { result: "normal", winner: 1, message: "玩家 B 获胜" };
    if (movable[1] === 0) return { result: "normal", winner: 0, message: "玩家 A 获胜" };
    if (!hasLegalAction(state, state.current)) return { result: "normal", winner: 1 - state.current, message: "无合法行动" };
    if (state.noCaptureTurns >= 40) return { result: "draw", winner: null, message: "连续 40 回合无吃子，和棋" };
    return null;
  }

  function hasLegalAction(state, playerIndex) {
    let hasDark = false;
    forEachPiece(state, (piece) => {
      if (!piece.revealed) hasDark = true;
    });
    if (hasDark) return true;
    const side = state.players[playerIndex].side;
    let hasAction = false;
    forEachPiece(state, (piece, r, c) => {
      if (piece.revealed && piece.side === side && isMovable(piece)) {
        for (const p of neighbors(r, c)) {
          const target = getPiece(state, p.r, p.c);
          if (!target || target.revealed && target.side !== side) hasAction = true;
        }
      }
    });
    return hasAction;
  }

  function countMovablePieces(state, side) {
    let count = 0;
    forEachPiece(state, (piece) => {
      if (piece.side === side && isMovable(piece)) count += 1;
    });
    return count;
  }

  function resolveCombat(attacker, defender) {
    if (attacker.type === "bomb" || defender.type === "bomb") return "both";
    if (defender.type === "mine") return attacker.type === "engineer" ? "attacker" : "defender";
    const ap = PIECES[attacker.type].power;
    const dp = PIECES[defender.type].power;
    if (ap > dp) return "attacker";
    if (ap < dp) return "defender";
    return "both";
  }

  function forEachPiece(state, fn) {
    for (let r = 0; r < ROWS; r += 1) {
      for (let c = 0; c < COLS; c += 1) {
        const piece = getPiece(state, r, c);
        if (piece) fn(piece, r, c);
      }
    }
  }

  function neighbors(r, c) {
    return [
      { r: r - 1, c },
      { r: r + 1, c },
      { r, c: c - 1 },
      { r, c: c + 1 }
    ].filter((p) => inBounds(p.r, p.c));
  }

  function inBounds(r, c) {
    return r >= 0 && r < ROWS && c >= 0 && c < COLS;
  }

  function isNeighbor(a, b) {
    return inBounds(b.r, b.c) && Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function isMovable(piece) {
    return piece && piece.type !== "mine";
  }

  function otherSide(side) {
    return side === "red" ? "blue" : "red";
  }

  function sideName(side) {
    return side === "red" ? "红方" : "蓝方";
  }

  function rejected(state, reason) {
    return { ok: false, reason, state };
  }

  function shuffle(items) {
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = items[i];
      items[i] = items[j];
      items[j] = t;
    }
  }

  return {
    ROWS,
    COLS,
    TURN_MS,
    PIECES,
    TYPE_ORDER,
    createInitialState,
    cloneState,
    flipPiece,
    movePiece,
    resign,
    finishByTimeout,
    checkGameEnd,
    hasLegalAction,
    resolveCombat,
    sideName
  };
});
