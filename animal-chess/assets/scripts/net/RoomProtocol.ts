import type { GameState, PlayerSide, Position } from '../core/AnimalChessTypes';

export interface PlayerInfo {
  id: string;
  nickname: string;
  side?: PlayerSide;
  connected: boolean;
  ready: boolean;
}

export interface RoomSnapshot {
  roomId: string;
  players: PlayerInfo[];
  state: GameState;
  turnDeadlineAt?: number;
  serverTime: number;
}

export type ClientMessage =
  | { type: 'create_room'; playerId: string; nickname: string }
  | { type: 'join_room'; roomId: string; playerId: string; nickname: string }
  | { type: 'ready'; roomId: string; playerId: string }
  | { type: 'move_piece'; roomId: string; playerId: string; from: Position; to: Position; moveNumber: number }
  | { type: 'resign'; roomId: string; playerId: string }
  | { type: 'heartbeat'; roomId?: string; playerId: string }
  | { type: 'reconnect'; roomId: string; playerId: string; nickname: string };

export type ServerMessage =
  | { type: 'room_created'; room: RoomSnapshot; side: PlayerSide }
  | { type: 'room_joined'; room: RoomSnapshot; side: PlayerSide }
  | { type: 'room_state'; room: RoomSnapshot }
  | { type: 'move_rejected'; reason: string; state: GameState }
  | { type: 'error'; code: string; message: string };

export interface RealtimeClient {
  connect(): Promise<void>;
  close(): void;
  send(message: ClientMessage): void;
  onMessage(listener: (message: ServerMessage) => void): () => void;
  onStatus(listener: (status: ConnectionStatus) => void): () => void;
}

export type ConnectionStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';
