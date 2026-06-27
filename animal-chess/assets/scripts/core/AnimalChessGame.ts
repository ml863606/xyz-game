import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  PIECE_DEFS,
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

const INITIAL_PIECES: Array<{ side: PlayerSide; kind: PieceKind; x: number; y: number }> = [
  { side: 'blue', kind: 'lion', x: 0, y: 0 },
  { side: 'blue', kind: 'tiger', x: 6, y: 0 },
  { side: 'blue', kind: 'dog', x: 1, y: 1 },
  { side: 'blue', kind: 'cat', x: 5, y: 1 },
  { side: 'blue', kind: 'rat', x: 0, y: 2 },
  { side: 'blue', kind: 'leopard', x: 2, y: 2 },
  { side: 'blue', kind: 'wolf', x: 4, y: 2 },
  { side: 'blue', kind: 'elephant', x: 6, y: 2 },
  { side: 'red', kind: 'elephant', x: 0, y: 6 },
  { side: 'red', kind: 'wolf', x: 2, y: 6 },
  { side: 'red', kind: 'leopard', x: 4, y: 6 },
  { side: 'red', kind: 'rat', x: 6, y: 6 },
  { side: 'red', kind: 'cat', x: 1, y: 7 },
  { side: 'red', kind: 'dog', x: 5, y: 7 },
  { side: 'red', kind: 'tiger', x: 0, y: 8 },
  { side: 'red', kind: 'lion', x: 6, y: 8 },
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
    const piece = getPieceAt(this.state, from);
    if (!piece) {
      return { ok: false, reason: '起点没有棋子' };
    }

    return this.validatePieceMove(piece, to, side);
  }

  movePiece(from: Position, to: Position, side = this.state.turn): { ok: boolean; state: GameState; reason?: string } {
    const piece = getPieceAt(this.state, from);
    if (!piece) {
      return { ok: false, state: this.snapshot(), reason: '起点没有棋子' };
    }

    const validation = this.validatePieceMove(piece, to, side);
    if (!validation.ok) {
      return { ok: false, state: this.snapshot(), reason: validation.reason };
    }

    const target = getPieceAt(this.state, to);
    if (target) {
      target.alive = false;
    }

    const record: MoveRecord = {
      pieceId: piece.id,
      side,
      from: { ...piece.position },
      to: { ...to },
      capturedId: target?.id,
    };
    piece.position = { ...to };
    this.state.moveNumber += 1;
    this.state.turn = opponentOf(side);
    this.state.lastMove = record;
    this.state.message = `${piece.side === 'red' ? '红方' : '蓝方'}${PIECE_DEFS[piece.kind].name}移动`;

    this.applyEndState(record);
    return { ok: true, state: this.snapshot() };
  }

  resign(side: PlayerSide): GameState {
    this.finish(opponentOf(side), 'resign', `${side === 'red' ? '红方' : '蓝方'}认输`);
    return this.snapshot();
  }

  finishByTimeout(side: PlayerSide): GameState {
    this.finish(opponentOf(side), 'timeout', `${side === 'red' ? '红方' : '蓝方'}超时`);
    return this.snapshot();
  }

  private validatePieceMove(piece: PieceState, to: Position, side: PlayerSide): MoveValidation {
    if (this.state.status !== 'playing') {
      return { ok: false, reason: '棋局尚未开始或已经结束' };
    }

    if (side !== this.state.turn) {
      return { ok: false, reason: '还没轮到你' };
    }

    if (!piece.alive) {
      return { ok: false, reason: '棋子已被吃掉' };
    }

    if (piece.side !== side) {
      return { ok: false, reason: '不能移动对方棋子' };
    }

    if (!isInside(to)) {
      return { ok: false, reason: '目标超出棋盘' };
    }

    if (samePosition(piece.position, to)) {
      return { ok: false, reason: '必须移动到相邻格' };
    }

    if (isOwnDen(to, side)) {
      return { ok: false, reason: '不能进入己方兽穴' };
    }

    const target = getPieceAt(this.state, to);
    if (target?.side === side) {
      return { ok: false, reason: '目标格已有己方棋子' };
    }

    const moveKind = this.classifyMove(piece, to);
    if (!moveKind.ok) {
      return moveKind;
    }

    if (target && !this.canCapture(piece, target, to)) {
      return { ok: false, reason: '棋子等级或地形不允许吃子' };
    }

    return { ok: true };
  }

  private classifyMove(piece: PieceState, to: Position): MoveValidation {
    const dx = to.x - piece.position.x;
    const dy = to.y - piece.position.y;
    const distance = Math.abs(dx) + Math.abs(dy);
    const terrain = terrainAt(to);

    if (distance === 1) {
      if (terrain === 'water' && piece.kind !== 'rat') {
        return { ok: false, reason: '只有老鼠可以下水' };
      }

      if (terrain !== 'water' && terrainAt(piece.position) === 'water' && getPieceAt(this.state, to)) {
        return { ok: false, reason: '河里的老鼠不能直接吃岸上棋子' };
      }

      return { ok: true };
    }

    if ((piece.kind !== 'lion' && piece.kind !== 'tiger') || (dx !== 0 && dy !== 0)) {
      return { ok: false, reason: '只能横竖移动一格' };
    }

    const landing = this.getRiverJumpLanding(piece.position, normalizeDirection({ x: dx, y: dy }));
    if (!landing || !samePosition(landing, to)) {
      return { ok: false, reason: '狮虎只能沿河道完整跳河' };
    }

    return { ok: true };
  }

  private getCandidateDestinations(piece: PieceState): Position[] {
    const candidates: Position[] = [];
    for (const direction of DIRECTIONS) {
      const adjacent = addPosition(piece.position, direction);
      if (isInside(adjacent)) {
        candidates.push(adjacent);
      }

      if (piece.kind === 'lion' || piece.kind === 'tiger') {
        const landing = this.getRiverJumpLanding(piece.position, direction);
        if (landing) {
          candidates.push(landing);
        }
      }
    }

    return uniquePositions(candidates);
  }

  private getRiverJumpLanding(from: Position, direction: Position): Position | null {
    let cursor = addPosition(from, direction);
    if (!isInside(cursor) || terrainAt(cursor) !== 'water') {
      return null;
    }

    while (isInside(cursor) && terrainAt(cursor) === 'water') {
      const blocker = getPieceAt(this.state, cursor);
      if (blocker?.kind === 'rat') {
        return null;
      }

      cursor = addPosition(cursor, direction);
    }

    return isInside(cursor) ? cursor : null;
  }

  private canCapture(attacker: PieceState, defender: PieceState, to: Position): boolean {
    const fromTerrain = terrainAt(attacker.position);
    const toTerrain = terrainAt(to);
    if (fromTerrain === 'water' && toTerrain !== 'water') {
      return false;
    }

    if (toTerrain === 'water') {
      return attacker.kind === 'rat' && defender.kind === 'rat';
    }

    const attackerRank = PIECE_DEFS[attacker.kind].rank;
    const defenderRank = isTrappedFor(defender, attacker.side) ? 0 : PIECE_DEFS[defender.kind].rank;

    if (attacker.kind === 'rat' && defender.kind === 'elephant') {
      return true;
    }

    if (attacker.kind === 'elephant' && defender.kind === 'rat') {
      return false;
    }

    return attackerRank >= defenderRank;
  }

  private applyEndState(record: MoveRecord): void {
    const movedPiece = this.state.pieces[record.pieceId];
    const opponent = opponentOf(record.side);

    if (isOpponentDen(movedPiece.position, record.side)) {
      this.finish(record.side, 'den', `${record.side === 'red' ? '红方' : '蓝方'}攻入兽穴`, record);
      return;
    }

    const opponentPieces = Object.values(this.state.pieces).filter((piece) => piece.side === opponent && piece.alive);
    if (opponentPieces.length === 0) {
      this.finish(record.side, 'capture', `${record.side === 'red' ? '红方' : '蓝方'}吃光对方棋子`, record);
      return;
    }

    if (this.getLegalMoves(opponent).length === 0) {
      this.finish(record.side, 'no-moves', `${opponent === 'red' ? '红方' : '蓝方'}无棋可走`, record);
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
  for (const item of INITIAL_PIECES) {
    const id = `${item.side}-${item.kind}`;
    pieces[id] = {
      id,
      side: item.side,
      kind: item.kind,
      position: { x: item.x, y: item.y },
      alive: true,
    };
  }

  return {
    board: { width: BOARD_WIDTH, height: BOARD_HEIGHT },
    status,
    turn: 'red',
    moveNumber: 0,
    pieces,
    message: status === 'playing' ? '红方先手' : '等待双方准备',
  };
}

export function cloneState(state: GameState): GameState {
  return {
    board: { ...state.board },
    status: state.status,
    turn: state.turn,
    moveNumber: state.moveNumber,
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
  return Object.values(state.pieces).find((piece) => piece.alive && samePosition(piece.position, position));
}

export function terrainAt(position: Position): Terrain {
  if ((position.x === 1 || position.x === 2 || position.x === 4 || position.x === 5) && position.y >= 3 && position.y <= 5) {
    return 'water';
  }

  if (position.x === 3 && position.y === 0) {
    return 'blue-den';
  }

  if (position.x === 3 && position.y === 8) {
    return 'red-den';
  }

  if ((position.y === 0 && (position.x === 2 || position.x === 4)) || (position.x === 3 && position.y === 1)) {
    return 'blue-trap';
  }

  if ((position.y === 8 && (position.x === 2 || position.x === 4)) || (position.x === 3 && position.y === 7)) {
    return 'red-trap';
  }

  return 'land';
}

export function isInside(position: Position): boolean {
  return position.x >= 0 && position.x < BOARD_WIDTH && position.y >= 0 && position.y < BOARD_HEIGHT;
}

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isOwnDen(position: Position, side: PlayerSide): boolean {
  return terrainAt(position) === `${side}-den`;
}

export function isOpponentDen(position: Position, side: PlayerSide): boolean {
  return terrainAt(position) === `${opponentOf(side)}-den`;
}

function isTrappedFor(piece: PieceState, attackerSide: PlayerSide): boolean {
  return terrainAt(piece.position) === `${attackerSide}-trap`;
}

function addPosition(a: Position, b: Position): Position {
  return { x: a.x + b.x, y: a.y + b.y };
}

function normalizeDirection(delta: Position): Position {
  return {
    x: Math.sign(delta.x),
    y: Math.sign(delta.y),
  };
}

function uniquePositions(positions: Position[]): Position[] {
  const seen = new Set<string>();
  return positions.filter((position) => {
    const key = `${position.x},${position.y}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}
