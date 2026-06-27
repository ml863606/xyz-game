import type { ItemId } from './items';

export interface OrderLine {
  itemId: ItemId;
  count: number;
}

export interface LevelDef {
  id: string;
  title: string;
  boardSize: number;
  maxMoves: number;
  targetScore: number;
  activeOrderCount: number;
  startingItems: ItemId[];
  orderPool: OrderLine[][];
}

export const LEVELS: LevelDef[] = [
  {
    id: 'day-1',
    title: '离谱返修日',
    boardSize: 5,
    maxMoves: 45,
    targetScore: 500,
    activeOrderCount: 3,
    startingItems: [
      'haunted_fridge',
      'office_printer',
      'fake_smartphone',
      'instant_noodle_throne',
      'expired_yogurt',
      'cracked_screen',
    ],
    orderPool: [
      [
        { itemId: 'angry_milk', count: 2 },
        { itemId: 'plastic_spoon', count: 1 },
      ],
      [
        { itemId: 'tiny_screw', count: 2 },
        { itemId: 'ink_gob', count: 1 },
      ],
      [
        { itemId: 'dead_battery', count: 1 },
        { itemId: 'mystery_chip', count: 2 },
      ],
      [
        { itemId: 'soup_powder', count: 2 },
        { itemId: 'folding_fork', count: 1 },
      ],
      [
        { itemId: 'paper_jam', count: 1 },
        { itemId: 'tiny_screw', count: 1 },
      ],
    ],
  },
];

