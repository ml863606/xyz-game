import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import { WebSocket } from 'ws';
import type { ClientMessage, ServerMessage } from '../assets/scripts/net/RoomProtocol';
import { startRoomServer, stopRoomServer } from '../server/roomServer';

const PORT = 8791;
const URL = `ws://localhost:${PORT}`;

test('room server supports create, join, ready, move rejection and reconnect', async () => {
  await startRoomServer(PORT);
  try {
    const red = await connect();
    const blue = await connect();

    red.sendJson({ type: 'create_room', playerId: 'red-player', nickname: '红' });
    const created = await red.next('room_created');
    assert.equal(created.side, 'red');
    const roomId = created.room.roomId;

    blue.sendJson({ type: 'join_room', roomId, playerId: 'blue-player', nickname: '蓝' });
    const joined = await blue.next('room_joined');
    assert.equal(joined.side, 'blue');

    red.sendJson({ type: 'ready', roomId, playerId: 'red-player' });
    blue.sendJson({ type: 'ready', roomId, playerId: 'blue-player' });
    const started = await blue.next('room_state', (message) => message.room.state.status === 'playing');
    assert.equal(started.room.state.turn, 'red');

    blue.sendJson({
      type: 'move_piece',
      roomId,
      playerId: 'blue-player',
      from: { x: 0, y: 2 },
      to: { x: 0, y: 3 },
      moveNumber: 0,
    });
    const rejected = await blue.next('move_rejected');
    assert.match(rejected.reason, /还没轮到你|不能移动/);

    red.sendJson({
      type: 'move_piece',
      roomId,
      playerId: 'red-player',
      from: { x: 6, y: 6 },
      to: { x: 6, y: 5 },
      moveNumber: 0,
    });
    const moved = await red.next('room_state', (message) => message.room.state.moveNumber === 1);
    assert.equal(moved.room.state.turn, 'blue');

    red.close();
    const replacement = await connect();
    replacement.sendJson({ type: 'reconnect', roomId, playerId: 'red-player', nickname: '红回来了' });
    const rejoined = await replacement.next('room_joined');
    assert.equal(rejoined.room.state.moveNumber, 1);
    assert.equal(rejoined.side, 'red');

    blue.close();
    replacement.close();
  } finally {
    await stopRoomServer();
  }
});

async function connect(): Promise<TestSocket> {
  const socket = new WebSocket(URL);
  await once(socket, 'open');
  return new TestSocket(socket);
}

class TestSocket {
  private queue: ServerMessage[] = [];
  private waiters: Array<() => void> = [];

  constructor(private readonly socket: WebSocket) {
    socket.on('message', (raw) => {
      this.queue.push(JSON.parse(String(raw)) as ServerMessage);
      this.waiters.splice(0).forEach((wake) => wake());
    });
  }

  sendJson(message: ClientMessage): void {
    this.socket.send(JSON.stringify(message));
  }

  close(): void {
    this.socket.close();
  }

  async next<T extends ServerMessage['type']>(
    type: T,
    predicate: (message: Extract<ServerMessage, { type: T }>) => boolean = () => true,
  ): Promise<Extract<ServerMessage, { type: T }>> {
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const index = this.queue.findIndex((message) => message.type === type && predicate(message as never));
      if (index >= 0) {
        return this.queue.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
      }

      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 100);
        this.waiters.push(() => {
          clearTimeout(timer);
          resolve();
        });
      });
    }

    throw new Error(`Timed out waiting for ${type}. Queue: ${JSON.stringify(this.queue)}`);
  }
}
