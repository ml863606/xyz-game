export type PlayerSide = 'red' | 'blue';

export type PieceKind = 'rat' | 'cat' | 'dog' | 'wolf' | 'leopard' | 'tiger' | 'lion' | 'elephant';

export type Terrain = 'land' | 'water' | 'red-trap' | 'blue-trap' | 'red-den' | 'blue-den';

export type GameStatus = 'waiting' | 'playing' | 'finished';

export type WinReason = 'den' | 'capture' | 'no-moves' | 'resign' | 'timeout' | 'disconnect';

export interface Position {
  x: number;
  y: number;
}

export interface PieceDef {
  kind: PieceKind;
  rank: number;
  name: string;
  shortName: string;
}

export interface PieceState {
  id: string;
  side: PlayerSide;
  kind: PieceKind;
  position: Position;
  alive: boolean;
}

export interface MoveRecord {
  pieceId: string;
  side: PlayerSide;
  from: Position;
  to: Position;
  capturedId?: string;
  winner?: PlayerSide;
  reason?: WinReason;
}

export interface GameState {
  board: {
    width: number;
    height: number;
  };
  status: GameStatus;
  turn: PlayerSide;
  moveNumber: number;
  pieces: Record<string, PieceState>;
  winner?: PlayerSide;
  reason?: WinReason;
  message: string;
  lastMove?: MoveRecord;
}

export interface MoveValidation {
  ok: boolean;
  reason?: string;
}

export interface LegalMove {
  pieceId: string;
  from: Position;
  to: Position;
  captureId?: string;
}

export const BOARD_WIDTH = 7;
export const BOARD_HEIGHT = 9;

export const PIECE_DEFS: Record<PieceKind, PieceDef> = {
  rat: { kind: 'rat', rank: 1, name: '老鼠', shortName: '鼠' },
  cat: { kind: 'cat', rank: 2, name: '猫', shortName: '猫' },
  dog: { kind: 'dog', rank: 3, name: '狗', shortName: '狗' },
  wolf: { kind: 'wolf', rank: 4, name: '狼', shortName: '狼' },
  leopard: { kind: 'leopard', rank: 5, name: '豹', shortName: '豹' },
  tiger: { kind: 'tiger', rank: 6, name: '老虎', shortName: '虎' },
  lion: { kind: 'lion', rank: 7, name: '狮子', shortName: '狮' },
  elephant: { kind: 'elephant', rank: 8, name: '大象', shortName: '象' },
};

export const PIECE_ORDER: PieceKind[] = ['rat', 'cat', 'dog', 'wolf', 'leopard', 'tiger', 'lion', 'elephant'];

export function opponentOf(side: PlayerSide): PlayerSide {
  return side === 'red' ? 'blue' : 'red';
}
