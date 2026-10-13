import { describe, expect, it } from 'vitest'
import { formatTime, parseTime } from './time'

describe('parseTime', () => {
  it('解析 HH:MM:SS,mmm 為毫秒', () => {
    expect(parseTime('00:00:00,000')).toBe(0)
    expect(parseTime('01:02:03,456')).toBe(3_723_456)
  })

  it('容許前後空白與以句點分隔毫秒', () => {
    expect(parseTime(' 00:00:01.500 ')).toBe(1500)
  })

  it('格式錯誤或分秒超出範圍時回傳 null', () => {
    expect(parseTime('00:00:01')).toBeNull()
    expect(parseTime('00:60:00,000')).toBeNull()
    expect(parseTime('00:00:61,000')).toBeNull()
    expect(parseTime('aa:bb:cc,ddd')).toBeNull()
    expect(parseTime('')).toBeNull()
  })
})

describe('formatTime', () => {
  it('格式化毫秒為 HH:MM:SS,mmm', () => {
    expect(formatTime(0)).toBe('00:00:00,000')
    expect(formatTime(3_723_456)).toBe('01:02:03,456')
  })

  it('與 parseTime 互為反函式', () => {
    for (const ms of [0, 1, 999, 59_999, 3_599_999, 36_000_000]) {
      expect(parseTime(formatTime(ms))).toBe(ms)
    }
  })
})
