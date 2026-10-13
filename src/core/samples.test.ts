/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseSrt, serializeSrt } from './srt'

const read = (name: string) => readFileSync(resolve(process.cwd(), 'samples', name), 'utf8')

describe('範例檔', () => {
  it('basic-bom-crlf.srt：第一條的文字正確，沒有隱藏字元', () => {
    const { cues, errors } = parseSrt(read('basic-bom-crlf.srt'))
    expect(errors).toEqual([])
    expect(cues[0].text).toBe('大家好，歡迎收看本週的節目')
    expect(cues.every((cue) => !/[\uFEFF\r]/.test(cue.text))).toBe(true)
  })

  it('with-errors.srt：列出 3 個錯誤的行號，其餘 5 條全數匯入', () => {
    const { cues, errors } = parseSrt(read('with-errors.srt'))
    expect(errors.map((e) => e.line)).toEqual([9, 18, 26])
    expect(cues).toHaveLength(5)
  })

  it('large-2000.srt：2,000 條字幕可完整 round-trip', () => {
    const first = parseSrt(read('large-2000.srt')).cues
    expect(first).toHaveLength(2000)
    const again = parseSrt(serializeSrt(first)).cues
    expect(again.map(({ start, end, text }) => [start, end, text])).toEqual(first.map(({ start, end, text }) => [start, end, text]))
  })
})
