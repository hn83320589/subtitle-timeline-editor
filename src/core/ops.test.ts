import { describe, expect, it } from 'vitest'
import { fixOverlaps, mergeCues, normalizeText, shiftCues, splitCue } from './ops'
import type { Cue } from './types'
import { findOverlaps } from './validate'

const cue = (id: string, start: number, end: number, text = id): Cue => ({ id, start, end, text })

describe('fixOverlaps', () => {
  it('把前一條的結束時間改成下一條開始時間減 1 ms', () => {
    const cues = [cue('a', 0, 2000), cue('b', 1500, 3000), cue('c', 3000, 4000)]
    const fixed = fixOverlaps(cues)
    expect(fixed.map((c) => c.end)).toEqual([1499, 3000, 4000])
  })

  it('執行後所有相鄰字幕都不再重疊', () => {
    const cues = [
      cue('a', 0, 5000),
      cue('b', 1000, 6000),
      cue('c', 2000, 2500),
      cue('d', 2400, 9000),
      cue('e', 8000, 8500),
    ]
    expect(findOverlaps(cues).length).toBeGreaterThan(0)
    const fixed = fixOverlaps(cues)
    expect(findOverlaps(fixed)).toEqual([])
  })

  it('未重疊的字幕保持相同參照，原陣列不被修改', () => {
    const cues = [cue('a', 0, 1000), cue('b', 900, 2000), cue('c', 3000, 4000)]
    const fixed = fixOverlaps(cues)
    expect(cues[0].end).toBe(1000)
    expect(fixed[1]).toBe(cues[1])
    expect(fixed[2]).toBe(cues[2])
  })
})

describe('shiftCues', () => {
  const cues = [cue('a', 500, 1000), cue('b', 2000, 3000), cue('c', 4000, 5000)]

  it('對全部字幕平移 +N 毫秒', () => {
    const result = shiftCues(cues, null, 250)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.cues.map((c) => [c.start, c.end])).toEqual([[750, 1250], [2250, 3250], [4250, 5250]])
  })

  it('只平移選取的字幕', () => {
    const result = shiftCues(cues, new Set(['b']), -1000)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.cues[0]).toBe(cues[0])
      expect(result.cues[1]).toMatchObject({ start: 1000, end: 2000 })
      expect(result.cues[2]).toBe(cues[2])
    }
  })

  it('任何一條會變成負時間就整批拒絕，並列出受影響的序號', () => {
    const result = shiftCues(cues, null, -2500)
    expect(result).toEqual({ ok: false, negativeSeqs: [1, 2] })
  })

  it('剛好變成 0 是允許的', () => {
    const result = shiftCues(cues, null, -500)
    expect(result.ok).toBe(true)
  })
})

describe('splitCue', () => {
  it('在指定時間點切成兩條，文字依游標位置拆開', () => {
    const cues = [cue('a', 0, 1000), cue('b', 1000, 5000, '前半段後半段'), cue('c', 5000, 6000)]
    const result = splitCue(cues, 1, 3000, 3)
    expect(result).not.toBeNull()
    const [, first, second] = result!
    expect(result).toHaveLength(4)
    expect(first).toMatchObject({ id: 'b', start: 1000, end: 3000, text: '前半段' })
    expect(second).toMatchObject({ start: 3000, end: 5000, text: '後半段' })
    expect(second.id).not.toBe('b')
    expect(result![3]).toBe(cues[2])
  })

  it('去除切點兩側的換行與空白', () => {
    const result = splitCue([cue('a', 0, 2000, '第一行\n第二行')], 0, 1000, 3)
    expect(result!.map((c) => c.text)).toEqual(['第一行', '第二行'])
  })

  it('時間點不在字幕內部時回傳 null', () => {
    const cues = [cue('a', 1000, 2000)]
    expect(splitCue(cues, 0, 1000, 0)).toBeNull()
    expect(splitCue(cues, 0, 2000, 0)).toBeNull()
    expect(splitCue(cues, 0, 2500, 0)).toBeNull()
  })
})

describe('mergeCues', () => {
  it('合併相鄰兩條，時間取聯集，文字以換行串接', () => {
    const cues = [cue('a', 0, 1000), cue('b', 1200, 2000, '上'), cue('c', 1800, 3500, '下'), cue('d', 4000, 5000)]
    const result = mergeCues(cues, 1)
    expect(result).toHaveLength(3)
    expect(result![1]).toEqual({ id: 'b', start: 1200, end: 3500, text: '上\n下' })
    expect(result![2]).toBe(cues[3])
  })

  it('時間聯集考慮後一條包住前一條的情況', () => {
    const result = mergeCues([cue('a', 1000, 2000, 'A'), cue('b', 500, 3000, 'B')], 0)
    expect(result![0]).toMatchObject({ start: 500, end: 3000 })
  })

  it('其中一條文字為空時不產生多餘空行', () => {
    const result = mergeCues([cue('a', 0, 1000, ''), cue('b', 1000, 2000, 'B')], 0)
    expect(result![0].text).toBe('B')
  })

  it('最後一條沒有下一條可合併時回傳 null', () => {
    expect(mergeCues([cue('a', 0, 1000)], 0)).toBeNull()
  })
})

describe('normalizeText', () => {
  it('移除空白行與首尾換行，避免破壞 SRT 區塊分隔', () => {
    expect(normalizeText('\n第一行\r\n\n  \n第二行\n')).toBe('第一行\n第二行')
  })
})
