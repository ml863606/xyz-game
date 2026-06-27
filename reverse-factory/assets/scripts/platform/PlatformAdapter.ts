export interface ShareOptions {
  title: string;
  imageUrl?: string;
}

export interface PlatformAdapter {
  readonly name: string;
  vibrateShort(): void;
  showRewardedAd(placement: string): Promise<boolean>;
  share(options: ShareOptions): void;
  saveData(key: string, value: unknown): void;
  loadData<T>(key: string, fallback: T): T;
}

declare const tt: any;
declare const wx: any;

class BrowserLikeAdapter implements PlatformAdapter {
  readonly name: string = 'browser';

  vibrateShort(): void {
    // Browser preview fallback.
  }

  async showRewardedAd(): Promise<boolean> {
    return true;
  }

  share(options: ShareOptions): void {
    console.log(`[share] ${options.title}`);
  }

  saveData(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }

  loadData<T>(key: string, fallback: T): T {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      return fallback;
    }
  }
}

class DouyinAdapter extends BrowserLikeAdapter {
  readonly name: string = 'douyin';

  vibrateShort(): void {
    tt?.vibrateShort?.({});
  }

  share(options: ShareOptions): void {
    tt?.shareAppMessage?.({
      title: options.title,
      imageUrl: options.imageUrl,
    });
  }
}

class WechatAdapter extends BrowserLikeAdapter {
  readonly name: string = 'wechat';

  vibrateShort(): void {
    wx?.vibrateShort?.({});
  }

  share(options: ShareOptions): void {
    wx?.shareAppMessage?.({
      title: options.title,
      imageUrl: options.imageUrl,
    });
  }
}

export function createPlatformAdapter(): PlatformAdapter {
  if (typeof tt !== 'undefined') {
    return new DouyinAdapter();
  }

  if (typeof wx !== 'undefined') {
    return new WechatAdapter();
  }

  return new BrowserLikeAdapter();
}
