const ELLIPSIS = "…"

const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" })

// Ranges that terminals render in two cells. Chat titles are usually ASCII, but
// a CJK or emoji title must not push the header text past its column.
const WIDE: [number, number][] = [
  [0x1100, 0x115f],
  [0x2e80, 0x303e],
  [0x3041, 0x33ff],
  [0x3400, 0x4dbf],
  [0x4e00, 0x9fff],
  [0xa000, 0xa4cf],
  [0xac00, 0xd7a3],
  [0xf900, 0xfaff],
  [0xfe30, 0xfe6f],
  [0xff00, 0xff60],
  [0xffe0, 0xffe6],
  [0x1f300, 0x1f64f],
  [0x1f900, 0x1f9ff],
  [0x20000, 0x3fffd],
]

function cellWidth(grapheme: string): number {
  const code = grapheme.codePointAt(0) ?? 0
  return WIDE.some(([low, high]) => code >= low && code <= high) ? 2 : 1
}

/** Terminal cells a string occupies, counting grapheme clusters. */
export function displayWidth(text: string): number {
  let total = 0
  for (const { segment } of segmenter.segment(text)) total += cellWidth(segment)
  return total
}

/**
 * Collapse whitespace the way a session title does when it is generated, then
 * shorten to `width` cells with a trailing ellipsis. Widths below one cell
 * yield an empty string so a zero-width header never paints text.
 */
export function fitTitle(title: string, width: number): string {
  const text = title.replace(/\s+/g, " ").trim()
  if (width < 1) return ""
  if (displayWidth(text) <= width) return text

  let used = 0
  let head = ""
  for (const { segment } of segmenter.segment(text)) {
    const next = cellWidth(segment)
    // One cell is held back for the ellipsis itself.
    if (used + next > width - 1) break
    head += segment
    used += next
  }
  return head.trimEnd() + ELLIPSIS
}