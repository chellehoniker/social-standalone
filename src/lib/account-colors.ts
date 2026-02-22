/**
 * Deterministic per-account color assignment.
 * Uses a hash of the account _id to assign a consistent color from a 12-color palette.
 */

const PALETTE_LIGHT = [
  "#2563EB", // blue
  "#DC2626", // red
  "#16A34A", // green
  "#9333EA", // purple
  "#EA580C", // orange
  "#0891B2", // cyan
  "#CA8A04", // amber
  "#DB2777", // pink
  "#4F46E5", // indigo
  "#059669", // emerald
  "#7C3AED", // violet
  "#B45309", // rose
];

const PALETTE_DARK = [
  "#60A5FA", // blue
  "#F87171", // red
  "#4ADE80", // green
  "#C084FC", // purple
  "#FB923C", // orange
  "#22D3EE", // cyan
  "#FACC15", // amber
  "#F472B6", // pink
  "#818CF8", // indigo
  "#34D399", // emerald
  "#A78BFA", // violet
  "#FBBF24", // rose
];

function hashAccountId(accountId: string): number {
  // Use last 8 chars of the MongoDB _id as hex
  const slice = accountId.slice(-8);
  const num = parseInt(slice, 16);
  return Number.isNaN(num) ? 0 : num;
}

export function getAccountColorIndex(accountId: string): number {
  return hashAccountId(accountId) % PALETTE_LIGHT.length;
}

export function getAccountColor(accountId: string, isDark: boolean): string {
  const index = getAccountColorIndex(accountId);
  return isDark ? PALETTE_DARK[index] : PALETTE_LIGHT[index];
}

/**
 * Returns a hex color string with alpha for use as inline style background.
 * Format: rgba(r, g, b, alpha)
 */
export function getAccountColorWithAlpha(
  accountId: string,
  isDark: boolean,
  alpha: number
): string {
  const hex = getAccountColor(accountId, isDark);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
