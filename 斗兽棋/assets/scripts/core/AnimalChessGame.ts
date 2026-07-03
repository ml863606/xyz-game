import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PIECE_DEFS,
  PIECE_ORDER,
  type GameState,
  type LegalMove,
  type MoveRecord,
  type MoveValidation,
  type PieceKind,
  type PieceState,
  type PlayerSide,
  type Position,
  type Terrain,
  type WinReason,
  opponentOf,
} from './AnimalChessTypes';

const DIRECTIONS: Position[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export class AnimalChessGame {
  private state: GameState;

  constructor(state?: GameState) {
    this.state = state ? cloneState(state) : createInitialState();
  }

  snapshot(): GameState {
    return cloneState(this.state);
  }

  reset(): GameState {
    this.state = createInitialState();
    return this.snapshot();
  }

  replaceState(state: GameState): void {
    this.state = cloneState(state);
  }

  getLegalMoves(side = this.state.turn): LegalMove[] {
    if (this.state.status !== 'playing') {
      return [];
    }

    const moves: LegalMove[] = [];
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
          captureId: target?.id,
        });
      }
    }

    return moves;
  }

  getLegalMovesForPiece(pieceId: string, side = this.state.turn): LegalMove[] {
    return this.getLegalMoves(side).filter((move) => move.pieceId === pieceId);
  }

  validateMove(from: Position, to: Position, side = this.state.turn): MoveValidation {
    const piece = getMovablePieceAt(this.state, from);
    if (!piece) {
      return { ok: false, reason: '起点没有可移动棋子' };
    }

    return this.validatePieceMove(piece, to, side);
  }

  flip(position: Position, side = this.state.turn, playerId?: string): { ok: boolean; state: GameState; reason?: string; assignedSide?: PlayerSide } {
    const validation = this.validateFlip(position, side);
    if (!validation.ok) {
      return { ok: false, state: this.snapshot(), reason: validation.reason };
    }

    const piece = getBasePieceAt(this.state, position);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: '这里没有可翻开的 牌' };
    }

    piece.revealed = true;
    const assignedSide = this.assignFirstFlipSide(side, piece.side, playerId);
    const nextTurn = assignedSide ? opponentOf(assignedSide) : opponentOf(side);
    const record: MoveRecord = {
      pieceId: piece.id,
      side,
      from: { ...position },
      to: { ...position },
      action: 'flip',
    };

    this.state.moveNumber += 1;
    this.state.turn = nextTurn;
    this.state.lastMove = record;
    this.state.message = `${sideName(assignedSide ?? side)}翻出${sideName(piece.side)}${PIECE_DEFS[piece.kind].name}`;

    this.applyEndState(record);
    return { ok: true, state: this.snapshot(), assignedSide };
  }

  movePiece(from: Position, to: Position, side = this.state.turn): { ok: boolean; state: GameState; reason?: string } {
    const piece = getMovablePieceAt(this.state, from);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: '起点没有可移动棋子' };
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

    const record: MoveRecord = {
      pieceId: piece.id,
      side,
      from: { ...from },
      to: { ...to },
      capturedId: target?.id,
      action: 'move',
    };

    if (!target && base && !base.revealed) {
      if (piece.kind === 'rat') {
        piece.hiddenUnderId = base.id;
      } else if (canClimbMountain(piece.kind)) {
        piece.coveringId = base.id;
      }
    }

    piece.position = { ...to };
    this.state.moveNumber += 1;
    this.state.turn = opponentOf(side);
    this.state.lastMove = record;
    this.state.message = `${sideName(piece.side)}${PIECE_DEFS[piece.kind].name}移动`;

    this.applyEndState(record);
    return { ok: true, state: this.snapshot() };
  }

  resign(side: PlayerSide): GameState {
    this.finish(opponentOf(side), 'resign', `${sideName(side)}认输`);
    return this.snapshot();
  }

  finishByTimeout(side: PlayerSide): GameState {
    this.finish(opponentOf(side), 'timeout', `${sideName(side)}超时`);
    return this.snapshot();
  }

  private validateFlip(position: Position, side: PlayerSide): MoveValidation {
    if (this.state.status !== 'playing') {
      return { ok: false, reason: '棋局尚未开始或已经结束' };
    }

    if (side !== this.state.turn) {
      return { ok: false, reason: '还没轮到你' };
    }

    if (!isInside(position)) {
      return { ok: false, reason: '目标超出棋盘' };
    }

    const piece = getBasePieceAt(this.state, position);
    if (!piece) {
      return { ok: false, reason: '这里没有可翻开的 牌' };
    }

    if (piece.revealed) {
      return { ok: false, reason: '这张 牌已经翻开' };
    }

    if (getCoveringPiece(this.state, piece.id) || getHiddenPiece(this.state, piece.id)) {
      return { ok: false, reason: '牌上或 牌下有棋子，暂时不能翻' };
    }

    return { ok: true };
  }

  private validatePieceMove(piece: PieceState, to: Position, side: PlayerSide): MoveValidation {
    if (this.state.status !== 'playing') {
      return { ok: false, reason: '棋局尚未开始或已经结束' };
    }

    if (side !== this.state.turn) {
      return { ok: false, reason: '还没轮到你' };
    }

    if (!piece.alive) {
      return { ok: false, reason: '棋子已经被吃掉' };
    }

    if (!piece.revealed) {
      return { ok: false, reason: '未掀开的棋子不能移动' };
    }

    if (piece.side !== side) {
      return { ok: false, reason: '不能移动对方棋子' };
    }

    if (!isInside(to)) {
      return { ok: false, reason: '目标超出棋盘' };
    }

    const distance = Math.abs(to.x - piece.position.x) + Math.abs(to.y - piece.position.y);
    if (distance !== 1) {
      return { ok: false, reason: '只能横竖移动一格' };
    }

    const target = getTopPieceAt(this.state, to);
    if (target?.side === side) {
      return { ok: false, reason: '目标格已有己方棋子' };
    }

    if (target && !this.canCapture(piece, target)) {
      return { ok: false, reason: '棋子等级不允许吃子' };
    }

    const base = getBasePieceAt(this.state, to);
    if (!target && base && !base.revealed && piece.kind === 'elephant') {
      return { ok: false, reason: '大象不能上山' };
    }

    return { ok: true };
  }

  private getCandidateDestinations(piece: PieceState): Position[] {
    return DIRECTIONS.map((direction) => addPosition(piece.position, direction)).filter(isInside);
  }

  private canCapture(attacker: PieceState, defender: PieceState): boolean {
    if (!defender.revealed || defender.hiddenUnderId) {
      return false;
    }

    if (attacker.kind === 'rat' && defender.kind === 'elephant') {
      return true;
    }

    return PIECE_DEFS[attacker.kind].rank >= PIECE_DEFS[defender.kind].rank;
  }

  private leaveStack(piece: PieceState): void {
    piece.coveringId = undefined;
    piece.hiddenUnderId = undefined;
  }

  private assignFirstFlipSide(turnSide: PlayerSide, flippedSide: PlayerSide, playerId?: string): PlayerSide | undefined {
    if (Object.keys(this.state.sideOwners).length > 0 || !playerId) {
      return undefined;
    }

    this.state.sideOwners[flippedSide] = playerId;
    this.state.sideOwners[opponentOf(flippedSide)] = `pending-${opponentOf(flippedSide)}`;
    return flippedSide;
  }

  private applyEndState(record: MoveRecord): void {
    const opponent = opponentOf(record.side);
    const opponentPieces = Object.values(this.state.pieces).filter((piece) => piece.side === opponent && piece.alive);
    if (opponentPieces.length === 0) {
      this.finish(record.side, 'capture', `${sideName(record.side)}吃光对方棋子`, record);
      return;
    }

  }

  private finish(winner: PlayerSide, reason: WinReason, message: string, record = this.state.lastMove): void {
    this.state.status = 'finished';
    this.state.winner = winner;
    this.state.reason = reason;
    this.state.message = message;
    if (record) {
      record.winner = winner;
      record.reason = reason;
      this.state.lastMove = record;
    }
  }
}

export function createInitialState(status: GameState['status'] = 'playing'): GameState {
  const pieces: Record<string, PieceState> = {};
  const positions = shuffledPositions();
  let positionIndex = 0;

  for (const side of ['red', 'blue'] as const) {
    for (const kind of PIECE_ORDER) {
      const id = `${side}-${kind}`;
      pieces[id] = {
        id,
        side,
        kind,
        position: positions[positionIndex],
        alive: true,
        revealed: false,
      };
      positionIndex += 1;
    }
  }

  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    status,
    turn: 'red',
    moveNumber: 0,
    pieces,
    sideOwners: {},
    message: status === 'playing' ? '翻开第一张 牌确定阵营' : '等待双方准备',
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: { ...state.board },
    status: state.status,
    turn: state.turn,
    moveNumber: state.moveNumber,
    sideOwners: { ...state.sideOwners },
    winner: state.winner,
    reason: state.reason,
    message: state.message,
    lastMove: state.lastMove
      ? {
          ...state.lastMove,
          from: { ...state.lastMove.from },
          to: { ...state.lastMove.to },
        }
      : undefined,
    pieces: Object.fromEntries(
      Object.entries(state.pieces).map(([id, piece]) => [
        id,
        {
          ...piece,
          position: { ...piece.position },
        },
      ]),
    ),
  };
}

export function getPieceAt(state: GameState, position: Position): PieceState | undefined {
  return getTopPieceAt(state, position) ?? getBasePieceAt(state, position);
}

export function getMovablePieceAt(state: GameState, position: Position): PieceState | undefined {
  return Object.values(state.pieces).find(
    (piece) => piece.alive && piece.revealed && samePosition(piece.position, position) && !piece.coveringId,
  );
}

export function getBasePieceAt(state: GameState, position: Position): PieceState | undefined {
  return Object.values(state.pieces).find(
    (piece) => piece.alive && !piece.coveringId && !piece.hiddenUnderId && samePosition(piece.position, position),
  );
}

export function getTopPieceAt(state: GameState, position: Position): PieceState | undefined {
  const base = getBasePieceAt(state, position);
  if (base) {
    return getCoveringPiece(state, base.id) ?? (base.revealed ? base : undefined);
  }

  return Object.values(state.pieces).find(
    (piece) => piece.alive && piece.revealed && !piece.coveringId && !piece.hiddenUnderId && samePosition(piece.position, position),
  );
}

export function getCoveringPiece(state: GameState, baseId: string): PieceState | undefined {
  return Object.values(state.pieces).find((piece) => piece.alive && piece.coveringId === baseId);
}

export function getHiddenPiece(state: GameState, baseId: string): PieceState | undefined {
  return Object.values(state.pieces).find((piece) => piece.alive && piece.hiddenUnderId === baseId);
}

export function terrainAt(_position: Position): Terrain {
  return 'land';
}

export function isInside(position: Position): boolean {
  return position.x >= 0 && position.x < BOARD_WIDTH && position.y >= 0 && position.y < BOARD_HEIGHT;
}

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

function shuffledPositions(): Position[] {
  const positions: Position[] = [];
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

function sideName(side: PlayerSide): string {
  return side === 'red' ? '红方' : '蓝方';
}

function addPosition(a: Position, b: Position): Position {
  return { x: a.x + b.x, y: a.y + b.y };
}

function canClimbMountain(kind: PieceKind): boolean {
  return kind !== 'rat' && kind !== 'elephant';
}
