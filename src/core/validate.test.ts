import { describe, expect, it } from 'vitest'
import type { Cue } from './types'
import { findOverlaps, hasTimingError, hasTimingErrors, overlaps } from './validate'

const cue = (start: number, end: number): Cue => ({ id: `${start}`, start, end, text: '' })

describe('validate', () => {
  it('結束時間早於或等於開始時間視為錯誤', () => {
    expect(hasTimingError(cue(1000, 1000))).toBe(true)
    expect(hasTimingError(cue(1000, 999))).toBe(true)
    expect(hasTimingError(cue(1000, 1001))).toBe(false)
    expect(hasTimingErrors([cue(0, 1), cue(5, 5)])).toBe(true)
    expect(hasTimingErrors([cue(0, 1), cue(5, 6)])).toBe(false)
  })

  it('前一條結束晚於下一條開始才算重疊，剛好相接不算', () => {
    expect(overlaps(2000, 1999)).toBe(true)
    expect(overlaps(2000, 2000)).toBe(false)
    expect(findOverlaps([cue(0, 2000), cue(1500, 3000), cue(3000, 4000)])).toEqual([0])
  })
})
