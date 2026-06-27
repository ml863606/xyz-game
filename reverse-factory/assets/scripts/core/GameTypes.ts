import type { ItemId } from '../data/items';
import type { OrderLine } from '../data/levels';

export interface CellState {
  index: number;
  itemId: ItemId | null;
}

export interface OrderState {
  id: number;
  lines: OrderLine[];
  delivered: Partial<Record<ItemId, number>>;
}

export interface GameSnapshot {
  boardSize: number;
  cells: CellState[];
  orders: OrderState[];
  score: number;
  movesLeft: number;
  combo: number;
  jam: number;
  isGameOver: boolean;
  isWin: boolean;
  message: string;
}

export type GameEvent = 'changed' | 'message' | 'game-over';

export type GameListener = (snapshot: GameSnapshot) => void;

