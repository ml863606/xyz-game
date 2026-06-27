export type ItemId =
  | 'haunted_fridge'
  | 'expired_yogurt'
  | 'angry_milk'
  | 'plastic_spoon'
  | 'office_printer'
  | 'paper_jam'
  | 'ink_gob'
  | 'tiny_screw'
  | 'fake_smartphone'
  | 'cracked_screen'
  | 'dead_battery'
  | 'mystery_chip'
  | 'instant_noodle_throne'
  | 'noodle_brick'
  | 'soup_powder'
  | 'folding_fork';

export interface ItemDef {
  id: ItemId;
  name: string;
  tier: number;
  value: number;
  color: string;
  splitInto: ItemId[];
}

export const ITEM_DEFS: Record<ItemId, ItemDef> = {
  haunted_fridge: {
    id: 'haunted_fridge',
    name: '闹鬼冰箱',
    tier: 3,
    value: 90,
    color: '#7dd3fc',
    splitInto: ['expired_yogurt', 'angry_milk', 'plastic_spoon'],
  },
  expired_yogurt: {
    id: 'expired_yogurt',
    name: '过期酸奶',
    tier: 2,
    value: 35,
    color: '#f9a8d4',
    splitInto: ['angry_milk', 'plastic_spoon'],
  },
  angry_milk: {
    id: 'angry_milk',
    name: '暴躁牛奶',
    tier: 1,
    value: 16,
    color: '#fef3c7',
    splitInto: [],
  },
  plastic_spoon: {
    id: 'plastic_spoon',
    name: '塑料小勺',
    tier: 1,
    value: 12,
    color: '#e5e7eb',
    splitInto: [],
  },
  office_printer: {
    id: 'office_printer',
    name: '怨气打印机',
    tier: 3,
    value: 95,
    color: '#c4b5fd',
    splitInto: ['paper_jam', 'ink_gob', 'tiny_screw'],
  },
  paper_jam: {
    id: 'paper_jam',
    name: '卡纸团',
    tier: 2,
    value: 34,
    color: '#fef9c3',
    splitInto: ['tiny_screw'],
  },
  ink_gob: {
    id: 'ink_gob',
    name: '墨水坨',
    tier: 1,
    value: 18,
    color: '#a78bfa',
    splitInto: [],
  },
  tiny_screw: {
    id: 'tiny_screw',
    name: '迷你螺丝',
    tier: 1,
    value: 10,
    color: '#94a3b8',
    splitInto: [],
  },
  fake_smartphone: {
    id: 'fake_smartphone',
    name: '山寨神机',
    tier: 3,
    value: 100,
    color: '#86efac',
    splitInto: ['cracked_screen', 'dead_battery', 'mystery_chip'],
  },
  cracked_screen: {
    id: 'cracked_screen',
    name: '裂纹屏幕',
    tier: 2,
    value: 35,
    color: '#bae6fd',
    splitInto: ['mystery_chip'],
  },
  dead_battery: {
    id: 'dead_battery',
    name: '虚弱电池',
    tier: 1,
    value: 17,
    color: '#bef264',
    splitInto: [],
  },
  mystery_chip: {
    id: 'mystery_chip',
    name: '神秘芯片',
    tier: 1,
    value: 20,
    color: '#f0abfc',
    splitInto: [],
  },
  instant_noodle_throne: {
    id: 'instant_noodle_throne',
    name: '泡面王座',
    tier: 3,
    value: 88,
    color: '#fdba74',
    splitInto: ['noodle_brick', 'soup_powder', 'folding_fork'],
  },
  noodle_brick: {
    id: 'noodle_brick',
    name: '面饼砖',
    tier: 2,
    value: 32,
    color: '#fde68a',
    splitInto: ['soup_powder'],
  },
  soup_powder: {
    id: 'soup_powder',
    name: '灵魂粉包',
    tier: 1,
    value: 15,
    color: '#fb923c',
    splitInto: [],
  },
  folding_fork: {
    id: 'folding_fork',
    name: '折叠叉',
    tier: 1,
    value: 13,
    color: '#d1d5db',
    splitInto: [],
  },
};

export const ENTRY_ITEMS: ItemId[] = [
  'haunted_fridge',
  'office_printer',
  'fake_smartphone',
  'instant_noodle_throne',
];

