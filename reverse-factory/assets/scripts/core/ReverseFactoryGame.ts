import { ENTRY_ITEMS, ITEM_DEFS, type ItemId } from '../data/items';
import { LEVELS, type LevelDef, type OrderLine } from '../data/levels';
import { Random } from './Random';
import type { CellState, GameListener, GameSnapshot, OrderState } from './GameTypes';

export class ReverseFactoryGame {
  private readonly random = new Random();
  private level: LevelDef = LEVELS[0];
  private cells: CellState[] = [];
  private orders: OrderState[] = [];
  private listeners: GameListener[] = [];
  private nextOrderId = 1;
  private score = 0;
  private movesLeft = 0;
  private combo = 0;
  private message = '';
  private isGameOver = false;
  private isWin = false;

  start(levelId = LEVELS[0].id): GameSnapshot {
    this.level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
    this.cells = Array.from({ length: this.level.boardSize * this.level.boardSize }, (_, index) => ({
      index,
      itemId: null,
    }));
    this.orders = [];
    this.nextOrderId = 1;
    this.score = 0;
    this.movesLeft = this.level.maxMoves;
    this.combo = 0;
    this.message = this.level.title;
    this.isGameOver = false;
    this.isWin = false;

    this.level.startingItems.forEach((itemId) => this.placeItem(itemId));
    while (this.orders.length < this.level.activeOrderCount) {
      this.addOrder();
    }

    return this.emit();
  }

  onChange(listener: GameListener): () => void {
    this.listeners.push(listener);
    listener(this.snapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }

  splitCell(index: number): GameSnapshot {
    if (this.isGameOver) {
      return this.snapshot();
    }

    const cell = this.cells[index];
    if (!cell?.itemId) {
      this.message = '空位不能拆，老板看了都摇头。';
      return this.emit();
    }

    const def = ITEM_DEFS[cell.itemId];
    if (def.splitInto.length === 0) {
      this.message = `${def.name} 已经拆到底了。`;
      return this.emit();
    }

    const freeCount = this.freeCells().length;
    const extraSlotsNeeded = def.splitInto.length - 1;
    if (freeCount < extraSlotsNeeded) {
      this.message = '工位塞满了，先交付订单腾地方。';
      return this.emit();
    }

    cell.itemId = def.splitInto[0];
    for (const itemId of def.splitInto.slice(1)) {
      this.placeItem(itemId);
    }

    this.consumeMove();
    this.score += 4 + def.splitInto.length * 2;
    this.message = `${def.name} 被拆成了 ${def.splitInto.map((id) => ITEM_DEFS[id].name).join('、')}。`;
    this.checkEndState();
    return this.emit();
  }

  deliverFromCell(index: number): GameSnapshot {
    if (this.isGameOver) {
      return this.snapshot();
    }

    const cell = this.cells[index];
    if (!cell?.itemId) {
      this.message = '这个工位空空如也。';
      return this.emit();
    }

    const deliveredItemId = cell.itemId;
    const order = this.findOrderNeeding(deliveredItemId);
    if (!order) {
      this.message = `暂时没人要 ${ITEM_DEFS[cell.itemId].name}，离谱但真实。`;
      return this.emit();
    }

    order.delivered[deliveredItemId] = (order.delivered[deliveredItemId] ?? 0) + 1;
    const deliveredName = ITEM_DEFS[deliveredItemId].name;
    cell.itemId = null;
    this.consumeMove();

    if (this.isOrderComplete(order)) {
      const reward = this.calculateOrderReward(order.lines);
      this.combo += 1;
      this.score += reward + this.combo * 10;
      this.orders = this.orders.filter((item) => item.id !== order.id);
      this.addOrder();
      this.message = `订单完成！${deliveredName} 终于找到了下家。`;
    } else {
      this.score += ITEM_DEFS[deliveredItemId].value;
      this.message = `交付 ${deliveredName}，客户的荒唐需求少了一点。`;
    }

    this.spawnPressureItem();
    this.checkEndState();
    return this.emit();
  }

  shuffleBoard(): GameSnapshot {
    if (this.isGameOver) {
      return this.snapshot();
    }

    const items = this.random.shuffle(this.cells.map((cell) => cell.itemId).filter(Boolean) as ItemId[]);
    this.cells.forEach((cell) => {
      cell.itemId = items.pop() ?? null;
    });
    this.consumeMove(3);
    this.combo = 0;
    this.message = '全厂洗牌，谁也不知道零件去了哪里。';
    this.checkEndState();
    return this.emit();
  }

  snapshot(): GameSnapshot {
    const occupied = this.cells.filter((cell) => cell.itemId).length;
    return {
      boardSize: this.level.boardSize,
      cells: this.cells.map((cell) => ({ ...cell })),
      orders: this.orders.map((order) => ({
        id: order.id,
        lines: order.lines.map((line) => ({ ...line })),
        delivered: { ...order.delivered },
      })),
      score: this.score,
      movesLeft: this.movesLeft,
      combo: this.combo,
      jam: occupied / this.cells.length,
      isGameOver: this.isGameOver,
      isWin: this.isWin,
      message: this.message,
    };
  }

  private addOrder(): void {
    const template = this.random.pick(this.level.orderPool);
    this.orders.push({
      id: this.nextOrderId,
      lines: template.map((line) => ({ ...line })),
      delivered: {},
    });
    this.nextOrderId += 1;
  }

  private findOrderNeeding(itemId: ItemId): OrderState | null {
    return (
      this.orders.find((order) =>
        order.lines.some((line) => line.itemId === itemId && (order.delivered[itemId] ?? 0) < line.count),
      ) ?? null
    );
  }

  private isOrderComplete(order: OrderState): boolean {
    return order.lines.every((line) => (order.delivered[line.itemId] ?? 0) >= line.count);
  }

  private calculateOrderReward(lines: OrderLine[]): number {
    return lines.reduce((total, line) => total + ITEM_DEFS[line.itemId].value * line.count, 0);
  }

  private placeItem(itemId: ItemId): boolean {
    const free = this.freeCells();
    if (free.length === 0) {
      return false;
    }
    this.random.pick(free).itemId = itemId;
    return true;
  }

  private spawnPressureItem(): void {
    if (this.random.next() < 0.55) {
      this.placeItem(this.random.pick(ENTRY_ITEMS));
    }
  }

  private freeCells(): CellState[] {
    return this.cells.filter((cell) => !cell.itemId);
  }

  private consumeMove(amount = 1): void {
    this.movesLeft = Math.max(0, this.movesLeft - amount);
  }

  private checkEndState(): void {
    const noSpace = this.freeCells().length === 0;
    if (this.score >= this.level.targetScore) {
      this.isWin = true;
      this.isGameOver = true;
      this.message = '今日工厂逆向拆解 KPI 达标！';
      return;
    }

    if (this.movesLeft <= 0 || noSpace) {
      this.isGameOver = true;
      this.isWin = false;
      this.message = noSpace ? '全厂堵死，传送带开始怀疑人生。' : '步数用完，老板开始画饼。';
    }
  }

  private emit(): GameSnapshot {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }
}
