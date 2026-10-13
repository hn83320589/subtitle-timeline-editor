import type { Cue } from './types'

export function hasTimingError(cue: Cue): boolean {
  return cue.end <= cue.start
}

export function hasTimingErrors(cues: readonly Cue[]): boolean {
  return cues.some(hasTimingError)
}

/** 前一條的結束時間晚於下一條的開始時間才算重疊；剛好相接不算。 */
export function overlaps(prevEnd: number, nextStart: number): boolean {
  return prevEnd > nextStart
}

/** 回傳與下一條重疊的字幕索引。 */
export function findOverlaps(cues: readonly Cue[]): number[] {
  const result: number[] = []
  for (let i = 0; i < cues.length - 1; i++) {
    if (overlaps(cues[i].end, cues[i + 1].start)) result.push(i)
  }
  return result
}
