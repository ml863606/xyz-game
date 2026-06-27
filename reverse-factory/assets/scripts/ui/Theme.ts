import { Color } from 'cc';

export const Theme = {
  background: new Color(30, 34, 42, 255),
  panel: new Color(48, 55, 66, 255),
  panelAlt: new Color(60, 68, 82, 255),
  text: new Color(248, 250, 252, 255),
  muted: new Color(203, 213, 225, 255),
  accent: new Color(250, 204, 21, 255),
  danger: new Color(248, 113, 113, 255),
  success: new Color(74, 222, 128, 255),
  emptyCell: new Color(71, 85, 105, 255),
};

export function colorFromHex(hex: string): Color {
  const normalized = hex.replace('#', '');
  const value = Number.parseInt(normalized, 16);
  return new Color((value >> 16) & 255, (value >> 8) & 255, value & 255, 255);
}

