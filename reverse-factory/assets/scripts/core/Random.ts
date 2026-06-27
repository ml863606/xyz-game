export class Random {
  private seed: number;

  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }

  next(): number {
    this.seed = (1664525 * this.seed + 1013904223) >>> 0;
    return this.seed / 0x100000000;
  }

  int(maxExclusive: number): number {
    return Math.floor(this.next() * maxExclusive);
  }

  pick<T>(items: T[]): T {
    return items[this.int(items.length)];
  }

  shuffle<T>(items: T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

