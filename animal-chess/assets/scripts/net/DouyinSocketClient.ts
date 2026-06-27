import type { ClientMessage, ConnectionStatus, RealtimeClient, ServerMessage } from './RoomProtocol';

declare const tt: any;

type NativeSocketTask = {
  send(options: { data: string; success?: () => void; fail?: (error: unknown) => void }): void;
  close(options?: { code?: number; reason?: string }): void;
  onOpen(callback: () => void): void;
  onClose(callback: () => void): void;
  onError(callback: (error: unknown) => void): void;
  onMessage(callback: (event: { data: string }) => void): void;
};

export class DouyinSocketClient implements RealtimeClient {
  private socket: WebSocket | NativeSocketTask | null = null;
  private messageListeners: Array<(message: ServerMessage) => void> = [];
  private statusListeners: Array<(status: ConnectionStatus) => void> = [];
  private status: ConnectionStatus = 'idle';

  constructor(private readonly url: string) {}

  connect(): Promise<void> {
    this.setStatus('connecting');
    return typeof tt !== 'undefined' && tt.connectSocket ? this.connectDouyin() : this.connectBrowser();
  }

  close(): void {
    this.socket?.close({ code: 1000, reason: 'client close' } as never);
    this.socket = null;
    this.setStatus('closed');
  }

  send(message: ClientMessage): void {
    const data = JSON.stringify(message);
    if (this.socket instanceof WebSocket) {
      this.socket.send(data);
      return;
    }

    this.socket?.send({ data });
  }

  onMessage(listener: (message: ServerMessage) => void): () => void {
    this.messageListeners.push(listener);
    return () => {
      this.messageListeners = this.messageListeners.filter((item) => item !== listener);
    };
  }

  onStatus(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.push(listener);
    listener(this.status);
    return () => {
      this.statusListeners = this.statusListeners.filter((item) => item !== listener);
    };
  }

  private connectBrowser(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new WebSocket(this.url);
      this.socket = socket;
      socket.addEventListener('open', () => {
        this.setStatus('open');
        resolve();
      });
      socket.addEventListener('close', () => this.setStatus('closed'));
      socket.addEventListener('error', (event) => {
        this.setStatus('error');
        reject(event);
      });
      socket.addEventListener('message', (event) => this.emitMessage(String(event.data)));
    });
  }

  private connectDouyin(): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = tt.connectSocket({ url: this.url }) as NativeSocketTask;
      this.socket = socket;
      socket.onOpen(() => {
        this.setStatus('open');
        resolve();
      });
      socket.onClose(() => this.setStatus('closed'));
      socket.onError((error) => {
        this.setStatus('error');
        reject(error);
      });
      socket.onMessage((event) => this.emitMessage(event.data));
    });
  }

  private emitMessage(raw: string): void {
    try {
      const message = JSON.parse(raw) as ServerMessage;
      this.messageListeners.forEach((listener) => listener(message));
    } catch {
      this.messageListeners.forEach((listener) =>
        listener({ type: 'error', code: 'bad_json', message: '服务器消息无法解析' }),
      );
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }
}
