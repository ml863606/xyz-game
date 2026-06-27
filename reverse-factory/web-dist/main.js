// assets/scripts/data/items.ts
var ITEM_DEFS = {
  haunted_fridge: {
    id: "haunted_fridge",
    name: "\u95F9\u9B3C\u51B0\u7BB1",
    tier: 3,
    value: 90,
    color: "#7dd3fc",
    splitInto: ["expired_yogurt", "angry_milk", "plastic_spoon"]
  },
  expired_yogurt: {
    id: "expired_yogurt",
    name: "\u8FC7\u671F\u9178\u5976",
    tier: 2,
    value: 35,
    color: "#f9a8d4",
    splitInto: ["angry_milk", "plastic_spoon"]
  },
  angry_milk: {
    id: "angry_milk",
    name: "\u66B4\u8E81\u725B\u5976",
    tier: 1,
    value: 16,
    color: "#fef3c7",
    splitInto: []
  },
  plastic_spoon: {
    id: "plastic_spoon",
    name: "\u5851\u6599\u5C0F\u52FA",
    tier: 1,
    value: 12,
    color: "#e5e7eb",
    splitInto: []
  },
  office_printer: {
    id: "office_printer",
    name: "\u6028\u6C14\u6253\u5370\u673A",
    tier: 3,
    value: 95,
    color: "#c4b5fd",
    splitInto: ["paper_jam", "ink_gob", "tiny_screw"]
  },
  paper_jam: {
    id: "paper_jam",
    name: "\u5361\u7EB8\u56E2",
    tier: 2,
    value: 34,
    color: "#fef9c3",
    splitInto: ["tiny_screw"]
  },
  ink_gob: {
    id: "ink_gob",
    name: "\u58A8\u6C34\u5768",
    tier: 1,
    value: 18,
    color: "#a78bfa",
    splitInto: []
  },
  tiny_screw: {
    id: "tiny_screw",
    name: "\u8FF7\u4F60\u87BA\u4E1D",
    tier: 1,
    value: 10,
    color: "#94a3b8",
    splitInto: []
  },
  fake_smartphone: {
    id: "fake_smartphone",
    name: "\u5C71\u5BE8\u795E\u673A",
    tier: 3,
    value: 100,
    color: "#86efac",
    splitInto: ["cracked_screen", "dead_battery", "mystery_chip"]
  },
  cracked_screen: {
    id: "cracked_screen",
    name: "\u88C2\u7EB9\u5C4F\u5E55",
    tier: 2,
    value: 35,
    color: "#bae6fd",
    splitInto: ["mystery_chip"]
  },
  dead_battery: {
    id: "dead_battery",
    name: "\u865A\u5F31\u7535\u6C60",
    tier: 1,
    value: 17,
    color: "#bef264",
    splitInto: []
  },
  mystery_chip: {
    id: "mystery_chip",
    name: "\u795E\u79D8\u82AF\u7247",
    tier: 1,
    value: 20,
    color: "#f0abfc",
    splitInto: []
  },
  instant_noodle_throne: {
    id: "instant_noodle_throne",
    name: "\u6CE1\u9762\u738B\u5EA7",
    tier: 3,
    value: 88,
    color: "#fdba74",
    splitInto: ["noodle_brick", "soup_powder", "folding_fork"]
  },
  noodle_brick: {
    id: "noodle_brick",
    name: "\u9762\u997C\u7816",
    tier: 2,
    value: 32,
    color: "#fde68a",
    splitInto: ["soup_powder"]
  },
  soup_powder: {
    id: "soup_powder",
    name: "\u7075\u9B42\u7C89\u5305",
    tier: 1,
    value: 15,
    color: "#fb923c",
    splitInto: []
  },
  folding_fork: {
    id: "folding_fork",
    name: "\u6298\u53E0\u53C9",
    tier: 1,
    value: 13,
    color: "#d1d5db",
    splitInto: []
  }
};
var ENTRY_ITEMS = [
  "haunted_fridge",
  "office_printer",
  "fake_smartphone",
  "instant_noodle_throne"
];

// assets/scripts/data/levels.ts
var LEVELS = [
  {
    id: "day-1",
    title: "\u79BB\u8C31\u8FD4\u4FEE\u65E5",
    boardSize: 5,
    maxMoves: 45,
    targetScore: 500,
    activeOrderCount: 3,
    startingItems: [
      "haunted_fridge",
      "office_printer",
      "fake_smartphone",
      "instant_noodle_throne",
      "expired_yogurt",
      "cracked_screen"
    ],
    orderPool: [
      [
        { itemId: "angry_milk", count: 2 },
        { itemId: "plastic_spoon", count: 1 }
      ],
      [
        { itemId: "tiny_screw", count: 2 },
        { itemId: "ink_gob", count: 1 }
      ],
      [
        { itemId: "dead_battery", count: 1 },
        { itemId: "mystery_chip", count: 2 }
      ],
      [
        { itemId: "soup_powder", count: 2 },
        { itemId: "folding_fork", count: 1 }
      ],
      [
        { itemId: "paper_jam", count: 1 },
        { itemId: "tiny_screw", count: 1 }
      ]
    ]
  }
];

// assets/scripts/core/Random.ts
var Random = class {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0;
  }
  next() {
    this.seed = 1664525 * this.seed + 1013904223 >>> 0;
    return this.seed / 4294967296;
  }
  int(maxExclusive) {
    return Math.floor(this.next() * maxExclusive);
  }
  pick(items) {
    return items[this.int(items.length)];
  }
  shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
};

// assets/scripts/core/ReverseFactoryGame.ts
var ReverseFactoryGame = class {
  constructor() {
    this.random = new Random();
    this.level = LEVELS[0];
    this.cells = [];
    this.orders = [];
    this.listeners = [];
    this.nextOrderId = 1;
    this.score = 0;
    this.movesLeft = 0;
    this.combo = 0;
    this.message = "";
    this.isGameOver = false;
    this.isWin = false;
  }
  start(levelId = LEVELS[0].id) {
    this.level = LEVELS.find((item) => item.id === levelId) ?? LEVELS[0];
    this.cells = Array.from({ length: this.level.boardSize * this.level.boardSize }, (_, index) => ({
      index,
      itemId: null
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
  onChange(listener) {
    this.listeners.push(listener);
    listener(this.snapshot());
    return () => {
      this.listeners = this.listeners.filter((item) => item !== listener);
    };
  }
  splitCell(index) {
    if (this.isGameOver) {
      return this.snapshot();
    }
    const cell = this.cells[index];
    if (!cell?.itemId) {
      this.message = "\u7A7A\u4F4D\u4E0D\u80FD\u62C6\uFF0C\u8001\u677F\u770B\u4E86\u90FD\u6447\u5934\u3002";
      return this.emit();
    }
    const def = ITEM_DEFS[cell.itemId];
    if (def.splitInto.length === 0) {
      this.message = `${def.name} \u5DF2\u7ECF\u62C6\u5230\u5E95\u4E86\u3002`;
      return this.emit();
    }
    const freeCount = this.freeCells().length;
    const extraSlotsNeeded = def.splitInto.length - 1;
    if (freeCount < extraSlotsNeeded) {
      this.message = "\u5DE5\u4F4D\u585E\u6EE1\u4E86\uFF0C\u5148\u4EA4\u4ED8\u8BA2\u5355\u817E\u5730\u65B9\u3002";
      return this.emit();
    }
    cell.itemId = def.splitInto[0];
    for (const itemId of def.splitInto.slice(1)) {
      this.placeItem(itemId);
    }
    this.consumeMove();
    this.score += 4 + def.splitInto.length * 2;
    this.message = `${def.name} \u88AB\u62C6\u6210\u4E86 ${def.splitInto.map((id) => ITEM_DEFS[id].name).join("\u3001")}\u3002`;
    this.checkEndState();
    return this.emit();
  }
  deliverFromCell(index) {
    if (this.isGameOver) {
      return this.snapshot();
    }
    const cell = this.cells[index];
    if (!cell?.itemId) {
      this.message = "\u8FD9\u4E2A\u5DE5\u4F4D\u7A7A\u7A7A\u5982\u4E5F\u3002";
      return this.emit();
    }
    const deliveredItemId = cell.itemId;
    const order = this.findOrderNeeding(deliveredItemId);
    if (!order) {
      this.message = `\u6682\u65F6\u6CA1\u4EBA\u8981 ${ITEM_DEFS[cell.itemId].name}\uFF0C\u79BB\u8C31\u4F46\u771F\u5B9E\u3002`;
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
      this.message = `\u8BA2\u5355\u5B8C\u6210\uFF01${deliveredName} \u7EC8\u4E8E\u627E\u5230\u4E86\u4E0B\u5BB6\u3002`;
    } else {
      this.score += ITEM_DEFS[deliveredItemId].value;
      this.message = `\u4EA4\u4ED8 ${deliveredName}\uFF0C\u5BA2\u6237\u7684\u8352\u5510\u9700\u6C42\u5C11\u4E86\u4E00\u70B9\u3002`;
    }
    this.spawnPressureItem();
    this.checkEndState();
    return this.emit();
  }
  shuffleBoard() {
    if (this.isGameOver) {
      return this.snapshot();
    }
    const items = this.random.shuffle(this.cells.map((cell) => cell.itemId).filter(Boolean));
    this.cells.forEach((cell) => {
      cell.itemId = items.pop() ?? null;
    });
    this.consumeMove(3);
    this.combo = 0;
    this.message = "\u5168\u5382\u6D17\u724C\uFF0C\u8C01\u4E5F\u4E0D\u77E5\u9053\u96F6\u4EF6\u53BB\u4E86\u54EA\u91CC\u3002";
    this.checkEndState();
    return this.emit();
  }
  snapshot() {
    const occupied = this.cells.filter((cell) => cell.itemId).length;
    return {
      boardSize: this.level.boardSize,
      cells: this.cells.map((cell) => ({ ...cell })),
      orders: this.orders.map((order) => ({
        id: order.id,
        lines: order.lines.map((line) => ({ ...line })),
        delivered: { ...order.delivered }
      })),
      score: this.score,
      movesLeft: this.movesLeft,
      combo: this.combo,
      jam: occupied / this.cells.length,
      isGameOver: this.isGameOver,
      isWin: this.isWin,
      message: this.message
    };
  }
  addOrder() {
    const template = this.random.pick(this.level.orderPool);
    this.orders.push({
      id: this.nextOrderId,
      lines: template.map((line) => ({ ...line })),
      delivered: {}
    });
    this.nextOrderId += 1;
  }
  findOrderNeeding(itemId) {
    return this.orders.find(
      (order) => order.lines.some((line) => line.itemId === itemId && (order.delivered[itemId] ?? 0) < line.count)
    ) ?? null;
  }
  isOrderComplete(order) {
    return order.lines.every((line) => (order.delivered[line.itemId] ?? 0) >= line.count);
  }
  calculateOrderReward(lines) {
    return lines.reduce((total, line) => total + ITEM_DEFS[line.itemId].value * line.count, 0);
  }
  placeItem(itemId) {
    const free = this.freeCells();
    if (free.length === 0) {
      return false;
    }
    this.random.pick(free).itemId = itemId;
    return true;
  }
  spawnPressureItem() {
    if (this.random.next() < 0.55) {
      this.placeItem(this.random.pick(ENTRY_ITEMS));
    }
  }
  freeCells() {
    return this.cells.filter((cell) => !cell.itemId);
  }
  consumeMove(amount = 1) {
    this.movesLeft = Math.max(0, this.movesLeft - amount);
  }
  checkEndState() {
    const noSpace = this.freeCells().length === 0;
    if (this.score >= this.level.targetScore) {
      this.isWin = true;
      this.isGameOver = true;
      this.message = "\u4ECA\u65E5\u5DE5\u5382\u9006\u5411\u62C6\u89E3 KPI \u8FBE\u6807\uFF01";
      return;
    }
    if (this.movesLeft <= 0 || noSpace) {
      this.isGameOver = true;
      this.isWin = false;
      this.message = noSpace ? "\u5168\u5382\u5835\u6B7B\uFF0C\u4F20\u9001\u5E26\u5F00\u59CB\u6000\u7591\u4EBA\u751F\u3002" : "\u6B65\u6570\u7528\u5B8C\uFF0C\u8001\u677F\u5F00\u59CB\u753B\u997C\u3002";
    }
  }
  emit() {
    const snapshot = this.snapshot();
    this.listeners.forEach((listener) => listener(snapshot));
    return snapshot;
  }
};

// web-preview/src/main.ts
var game = new ReverseFactoryGame();
var selectedIndex = -1;
var board = mustGet("board");
var orders = mustGet("orders");
var score = mustGet("score");
var moves = mustGet("moves");
var combo = mustGet("combo");
var jam = mustGet("jam");
var message = mustGet("message");
var deliver = mustGet("deliver");
var shuffle = mustGet("shuffle");
var restart = mustGet("restart");
var burst = mustGet("burst");
var itemIcons = {
  haunted_fridge: "\u{1F9CA}",
  expired_yogurt: "\u{1F95B}",
  angry_milk: "\u{1F4A2}",
  plastic_spoon: "\u{1F944}",
  office_printer: "\u{1F5A8}",
  paper_jam: "\u{1F4C4}",
  ink_gob: "\u{1F7E3}",
  tiny_screw: "\u{1F529}",
  fake_smartphone: "\u{1F4F1}",
  cracked_screen: "\u{1FA9F}",
  dead_battery: "\u{1F50B}",
  mystery_chip: "\u{1F9E9}",
  instant_noodle_throne: "\u{1F35C}",
  noodle_brick: "\u{1F9F1}",
  soup_powder: "\u2728",
  folding_fork: "\u{1F374}"
};
deliver.addEventListener("click", () => {
  if (selectedIndex >= 0) {
    game.deliverFromCell(selectedIndex);
  }
});
shuffle.addEventListener("click", () => {
  selectedIndex = -1;
  game.shuffleBoard();
});
restart.addEventListener("click", () => {
  selectedIndex = -1;
  game.start();
});
game.onChange(render);
game.start();
function render(snapshot) {
  score.textContent = String(snapshot.score);
  moves.textContent = String(snapshot.movesLeft);
  combo.textContent = String(snapshot.combo);
  jam.textContent = `${Math.round(snapshot.jam * 100)}%`;
  message.textContent = snapshot.message;
  message.classList.toggle("game-over", snapshot.isGameOver);
  board.innerHTML = "";
  for (const cell of snapshot.cells) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "cell";
    button.dataset.index = String(cell.index);
    button.classList.toggle("selected", selectedIndex === cell.index);
    if (cell.itemId) {
      const item = ITEM_DEFS[cell.itemId];
      button.innerHTML = `<span class="item-icon">${itemIcons[cell.itemId]}</span><span class="item-name">${item.name}</span>`;
      button.style.background = item.color;
      button.style.setProperty("--item-color", item.color);
      button.title = item.splitInto.length > 0 ? `\u70B9\u51FB\u62C6\u89E3\uFF1A${item.name}` : `${item.name} \u5DF2\u62C6\u5230\u5E95`;
    } else {
      button.innerHTML = '<span class="socket-dot"></span>';
      button.style.removeProperty("--item-color");
      button.classList.add("empty");
      button.title = "\u7A7A\u5DE5\u4F4D";
    }
    button.addEventListener("click", () => {
      selectedIndex = cell.index;
      popBurst(button, cell.itemId ? "\u62C6!" : "\u7A7A");
      game.splitCell(cell.index);
    });
    board.appendChild(button);
  }
  orders.innerHTML = "";
  snapshot.orders.forEach((order, index) => {
    const section = document.createElement("section");
    section.className = "order";
    const title = document.createElement("strong");
    title.textContent = `\u8BA2\u5355 ${index + 1}`;
    section.appendChild(title);
    order.lines.forEach((line) => {
      const row = document.createElement("div");
      row.className = "order-line";
      const name = document.createElement("span");
      name.textContent = ITEM_DEFS[line.itemId].name;
      const count = document.createElement("span");
      count.textContent = `${order.delivered[line.itemId] ?? 0}/${line.count}`;
      row.append(name, count);
      section.appendChild(row);
    });
    orders.appendChild(section);
  });
}
function popBurst(target, text) {
  const rect = target.getBoundingClientRect();
  burst.textContent = text;
  burst.style.left = `${rect.left + rect.width / 2}px`;
  burst.style.top = `${rect.top + rect.height / 2}px`;
  burst.classList.remove("show");
  void burst.offsetWidth;
  burst.classList.add("show");
}
function mustGet(id) {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element;
}
