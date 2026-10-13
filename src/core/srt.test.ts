import { describe, expect, it } from 'vitest'
import { parseSrt, serializeSrt } from './srt'
import type { Cue } from './types'

const strip = (cues: Cue[]) => cues.map(({ start, end, text }) => ({ start, end, text }))

describe('parseSrt', () => {
  it('處理 UTF-8 BOM 與 CRLF，第一條沒有隱藏字元', () => {
    const input = '\uFEFF1\r\n00:00:01,000 --> 00:00:02,500\r\n大家好\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\n第二行\r\n'
    const { cues, errors } = parseSrt(input)
    expect(errors).toEqual([])
    expect(cues).toHaveLength(2)
    expect(cues[0]).toMatchObject({ start: 1000, end: 2500, text: '大家好' })
    expect(cues[0].text).not.toMatch(/[\uFEFF\r]/)
  })

  it('處理 LF 與多行字幕文字，並保留 <i> 標籤', () => {
    const input = '1\n00:00:01,000 --> 00:00:02,000\n第一行\n<i>第二行</i>\n'
    const { cues } = parseSrt(input)
    expect(cues[0].text).toBe('第一行\n<i>第二行</i>')
  })

  it('容許區塊間有多個空白行與檔尾沒有換行', () => {
    const input = '\n\n1\n00:00:01,000 --> 00:00:02,000\nA\n\n\n\n2\n00:00:03,000 --> 00:00:04,000\nB'
    expect(strip(parseSrt(input).cues)).toEqual([
      { start: 1000, end: 2000, text: 'A' },
      { start: 3000, end: 4000, text: 'B' },
    ])
  })

  it('跳過格式錯誤的區塊並回報原檔行號與原因，其餘照常匯入', () => {
    const input = [
      '1', '00:00:01,000 --> 00:00:02,000', '正常一', '', // 1-4
      'abc', '00:00:03,000 --> 00:00:04,000', '序號錯誤', '', // 5-8
      '3', '00:00:05,000 -> 00:00:06,000', '箭頭錯誤', '', // 9-12
      '4', '00:00:07,000 --> 00:00:08,000', '正常二', '', // 13-16
      '5', '', // 17-18：只有序號
    ].join('\n')
    const { cues, errors } = parseSrt(input)
    expect(cues.map((c) => c.text)).toEqual(['正常一', '正常二'])
    expect(errors).toHaveLength(3)
    expect(errors.map((e) => e.line)).toEqual([5, 10, 17])
    expect(errors[0].reason).toContain('序號')
    expect(errors[1].reason).toContain('時間')
    expect(errors[2].reason).toContain('時間')
  })

  it('字幕間漏掉空白行時，從「序號＋時間軸」處拆成兩條', () => {
    const input = '1\n00:00:01,000 --> 00:00:02,000\n第一條\n2\n00:00:03,000 --> 00:00:04,000\n第二條\n'
    const { cues, errors } = parseSrt(input)
    expect(errors).toEqual([])
    expect(strip(cues)).toEqual([
      { start: 1000, end: 2000, text: '第一條' },
      { start: 3000, end: 4000, text: '第二條' },
    ])
  })

  it('文字中出現沒有序號的時間軸時，回報該行缺少序號，前一條照常匯入', () => {
    const input = '1\n00:00:01,000 --> 00:00:02,000\n第一條\n00:00:03,000 --> 00:00:04,000\n沒有序號\n'
    const { cues, errors } = parseSrt(input)
    expect(strip(cues)).toEqual([{ start: 1000, end: 2000, text: '第一條' }])
    expect(errors).toHaveLength(1)
    expect(errors[0].line).toBe(4)
    expect(errors[0].reason).toContain('序號')
  })

  it('結束時間不晚於開始時間的區塊仍匯入，交由編輯器顯示錯誤', () => {
    const { cues, errors } = parseSrt('1\n00:00:05,000 --> 00:00:04,000\nX\n')
    expect(errors).toEqual([])
    expect(cues[0]).toMatchObject({ start: 5000, end: 4000 })
  })

  it('每條字幕有唯一 id', () => {
    const { cues } = parseSrt('1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:03,000 --> 00:00:04,000\nB\n')
    expect(new Set(cues.map((c) => c.id)).size).toBe(2)
  })
})

describe('serializeSrt', () => {
  it('重新編排序號並以 --> 輸出時間', () => {
    const cues: Cue[] = [
      { id: 'x', start: 1000, end: 2000, text: 'A' },
      { id: 'y', start: 3000, end: 4000, text: 'B\nC' },
    ]
    expect(serializeSrt(cues)).toBe(
      '1\n00:00:01,000 --> 00:00:02,000\nA\n\n2\n00:00:03,000 --> 00:00:04,000\nB\nC\n',
    )
  })

  it('匯入 → 匯出 → 再匯入後內容相同', () => {
    const original = '\uFEFF7\r\n00:00:01,000 --> 00:00:02,500\r\n你好，<b>世界</b>\r\n第二行  \r\n\r\n99\r\n01:00:00,001 --> 01:00:03,000\r\n♪ 音樂 ♪\r\n'
    const first = parseSrt(original).cues
    const exported = serializeSrt(first)
    const second = parseSrt(exported)
    expect(second.errors).toEqual([])
    expect(strip(second.cues)).toEqual(strip(first))
    // 匯出結果再匯出一次也應逐字相同
    expect(serializeSrt(second.cues)).toBe(exported)
  })
})
