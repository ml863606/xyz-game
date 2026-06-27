export interface LoginResult {
  playerId: string;
  nickname: string;
}

export interface ShareRoomOptions {
  roomId: string;
  title: string;
}

export interface PlatformAdapter {
  readonly name: string;
  login(): Promise<LoginResult>;
  vibrateShort(): void;
  shareRoom(options: ShareRoomOptions): void;
}

declare const tt: any;

class BrowserLikeAdapter implements PlatformAdapter {
  readonly name: string = 'browser';

  async login(): Promise<LoginResult> {
    const stored = localStorage.getItem('animal-chess-player-id');
    const playerId = stored ?? `web-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem('animal-chess-player-id', playerId);
    return {
      playerId,
      nickname: '游客',
    };
  }

  vibrateShort(): void {
    navigator.vibrate?.(20);
  }

  shareRoom(options: ShareRoomOptions): void {
    console.log(`[share room] ${options.title} ${options.roomId}`);
  }
}

class DouyinAdapter extends BrowserLikeAdapter {
  readonly name: string = 'douyin';

  async login(): Promise<LoginResult> {
    return new Promise((resolve) => {
      tt?.login?.({
        success: (result: { code?: string }) => {
          resolve({
            playerId: result.code ? `tt-${result.code}` : `tt-${Math.random().toString(36).slice(2, 10)}`,
            nickname: '抖音玩家',
          });
        },
        fail: () => {
          resolve({
            playerId: `tt-fallback-${Math.random().toString(36).slice(2, 10)}`,
            nickname: '抖音玩家',
          });
        },
      });
    });
  }

  vibrateShort(): void {
    tt?.vibrateShort?.({});
  }

  shareRoom(options: ShareRoomOptions): void {
    tt?.shareAppMessage?.({
      title: options.title,
      query: `roomId=${encodeURIComponent(options.roomId)}`,
    });
  }
}

export function createPlatformAdapter(): PlatformAdapter {
  if (typeof tt !== 'undefined') {
    return new DouyinAdapter();
  }

  return new BrowserLikeAdapter();
}
