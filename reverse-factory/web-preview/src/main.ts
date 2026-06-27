import { ReverseFactoryGame } from '../../assets/scripts/core/ReverseFactoryGame';
import { ITEM_DEFS } from '../../assets/scripts/data/items';
import type { GameSnapshot } from '../../assets/scripts/core/GameTypes';
import type { ItemId } from '../../assets/scripts/data/items';

const game = new ReverseFactoryGame();
let selectedIndex = -1;

const board = mustGet<HTMLDivElement>('board');
const orders = mustGet<HTMLDivElement>('orders');
const score = mustGet<HTMLSpanElement>('score');
const moves = mustGet<HTMLSpanElement>('moves');
const combo = mustGet<HTMLSpanElement>('combo');
const jam = mustGet<HTMLSpanElement>('jam');
const message = mustGet<HTMLParagraphElement>('message');
const deliver = mustGet<HTMLButtonElement>('deliver');
const shuffle = mustGet<HTMLButtonElement>('shuffle');
const restart = mustGet<HTMLButtonElement>('restart');
const burst = mustGet<HTMLDivElement>('burst');

const itemIcons: Record<ItemId, string> = {
  haunted_fridge: '🧊',
  expired_yogurt: '🥛',
  angry_milk: '💢',
  plastic_spoon: '🥄',
  office_printer: '🖨',
  paper_jam: '📄',
  ink_gob: '🟣',
  tiny_screw: '🔩',
  fake_smartphone: '📱',
  cracked_screen: '🪟',
  dead_battery: '🔋',
  mystery_chip: '🧩',
  instant_noodle_throne: '🍜',
  noodle_brick: '🧱',
  soup_powder: '✨',
  folding_fork: '🍴',
};

deliver.addEventListener('click', () => {
  if (selectedIndex >= 0) {
    game.deliverFromCell(selectedIndex);
  }
});

shuffle.addEventListener('click', () => {
  selectedIndex = -1;
  game.shuffleBoard();
});

restart.addEventListener('click', () => {
  selectedIndex = -1;
  game.start();
});

game.onChange(render);
game.start();

function render(snapshot: GameSnapshot): void {
  score.textContent = String(snapshot.score);
  moves.textContent = String(snapshot.movesLeft);
  combo.textContent = String(snapshot.combo);
  jam.textContent = `${Math.round(snapshot.jam * 100)}%`;
  message.textContent = snapshot.message;
  message.classList.toggle('game-over', snapshot.isGameOver);

  board.innerHTML = '';
  for (const cell of snapshot.cells) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'cell';
    button.dataset.index = String(cell.index);
    button.classList.toggle('selected', selectedIndex === cell.index);

    if (cell.itemId) {
      const item = ITEM_DEFS[cell.itemId];
      button.innerHTML = `<span class="item-icon">${itemIcons[cell.itemId]}</span><span class="item-name">${item.name}</span>`;
      button.style.background = item.color;
      button.style.setProperty('--item-color', item.color);
      button.title = item.splitInto.length > 0 ? `点击拆解：${item.name}` : `${item.name} 已拆到底`;
    } else {
      button.innerHTML = '<span class="socket-dot"></span>';
      button.style.removeProperty('--item-color');
      button.classList.add('empty');
      button.title = '空工位';
    }

    button.addEventListener('click', () => {
      selectedIndex = cell.index;
      popBurst(button, cell.itemId ? '拆!' : '空');
      game.splitCell(cell.index);
    });

    board.appendChild(button);
  }

  orders.innerHTML = '';
  snapshot.orders.forEach((order, index) => {
    const section = document.createElement('section');
    section.className = 'order';

    const title = document.createElement('strong');
    title.textContent = `订单 ${index + 1}`;
    section.appendChild(title);

    order.lines.forEach((line) => {
      const row = document.createElement('div');
      row.className = 'order-line';

      const name = document.createElement('span');
      name.textContent = ITEM_DEFS[line.itemId].name;

      const count = document.createElement('span');
      count.textContent = `${order.delivered[line.itemId] ?? 0}/${line.count}`;

      row.append(name, count);
      section.appendChild(row);
    });

    orders.appendChild(section);
  });
}

function popBurst(target: HTMLElement, text: string): void {
  const rect = target.getBoundingClientRect();
  burst.textContent = text;
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top + rect.height / 2}px`;
  burst.classList.remove('show');
  void burst.offsetWidth;
  burst.classList.add('show');
}

function mustGet<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }

  return element as T;
}
