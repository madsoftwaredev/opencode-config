export const DEFAULT_WIDTH = 42;
const MIN_WIDTH = 28;
const TRANSCRIPT_WIDTH = 64;

export function preferredWidth(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.round(value)
    : DEFAULT_WIDTH;
}

export function clampWidth(preferred: number, available: number, overlay: boolean): number {
  const maximum = Math.max(1, Math.floor(available) - (overlay ? 2 : TRANSCRIPT_WIDTH));
  return Math.max(Math.min(MIN_WIDTH, maximum), Math.min(preferredWidth(preferred), maximum));
}

export function parseWidth(input: string): number | undefined {
  const value = input.trim();
  if (!/^\d+$/.test(value)) return undefined;
  const width = Number(value);
  return Number.isSafeInteger(width) && width > 0 ? width : undefined;
}
