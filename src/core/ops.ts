import { createId } from './id'
import type { Cue } from './types'
import { overlaps } from './validate'

/**
 * 移除空白行與首尾換行。SRT 以空白行分隔區塊，
 * 文字中若殘留空白行，匯出後再匯入會被拆成兩個區塊。
 */
export function normalizeText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .join('\n')
}

/** 將與下一條重疊的字幕，結束時間改為下一條開始時間減 1 ms。 */
export function fixOverlaps(cues: readonly Cue[]): Cue[] {
  return cues.map((cue, i) => {
    const next = cues[i + 1]
    if (!next || !overlaps(cue.end, next.start)) return cue
    return { ...cue, end: Math.max(0, next.start - 1) }
  })
}

export type ShiftResult = { ok: true; cues: Cue[] } | { ok: false; negativeSeqs: number[] }

/**
 * 平移選取的字幕（ids 為 null 表示全部）。
 * 只要任何一條會變成負時間就整批拒絕，回傳受影響的序號（從 1 開始）。
 */
export function shiftCues(cues: readonly Cue[], ids: ReadonlySet<string> | null, deltaMs: number): ShiftResult {
  const isTarget = (cue: Cue) => ids === null || ids.has(cue.id)
  const negativeSeqs = cues.flatMap((cue, i) =>
    isTarget(cue) && Math.min(cue.start, cue.end) + deltaMs < 0 ? [i + 1] : [],
  )
  if (negativeSeqs.length > 0) return { ok: false, negativeSeqs }
  return {
    ok: true,
    cues: cues.map((cue) => (isTarget(cue) ? { ...cue, start: cue.start + deltaMs, end: cue.end + deltaMs } : cue)),
  }
}

/** 在 atMs 把第 index 條切成兩條，文字從 caret 位置拆開。時間點不在字幕內部時回傳 null。 */
export function splitCue(cues: readonly Cue[], index: number, atMs: number, caret: number): Cue[] | null {
  const target = cues[index]
  if (!target || atMs <= target.start || atMs >= target.end) return null
  const first: Cue = { ...target, end: atMs, text: target.text.slice(0, caret).trimEnd() }
  const second: Cue = { id: createId(), start: atMs, end: target.end, text: target.text.slice(caret).trimStart() }
  return [...cues.slice(0, index), first, second, ...cues.slice(index + 1)]
}

/** 合併第 index 與第 index + 1 條：時間取聯集，文字以換行串接。 */
export function mergeCues(cues: readonly Cue[], index: number): Cue[] | null {
  const a = cues[index]
  const b = cues[index + 1]
  if (!a || !b) return null
  const merged: Cue = {
    id: a.id,
    start: Math.min(a.start, b.start),
    end: Math.max(a.end, b.end),
    text: normalizeText(`${a.text}\n${b.text}`),
  }
  return [...cues.slice(0, index), merged, ...cues.slice(index + 2)]
}
