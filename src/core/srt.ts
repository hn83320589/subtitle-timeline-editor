import { createId } from './id'
import { formatTime, parseTime } from './time'
import type { Cue, ParseError } from './types'

export interface ParseResult {
  cues: Cue[]
  errors: ParseError[]
}

const INDEX_PATTERN = /^\d+$/
const ARROW = ' --> '

interface Block {
  /** 區塊第一行在原檔的行號（從 1 開始） */
  firstLine: number
  lines: string[]
}

/**
 * 以空白行切出區塊。若區塊的文字部分又出現時間軸，表示前一條漏了空白行：
 * 時間軸前一行是序號就連同序號拆成新區塊，否則從時間軸本身開始新區塊（之後回報缺少序號）。
 */
function splitBlocks(lines: string[]): Block[] {
  const blocks: Block[] = []
  let current: Block | null = null
  const startBlock = (firstLine: number, blockLines: string[]) => {
    current = { firstLine, lines: blockLines }
    blocks.push(current)
  }

  lines.forEach((line, i) => {
    if (line.trim() === '') {
      current = null
      return
    }
    if (!current) {
      startBlock(i + 1, [line])
      return
    }
    const block: Block = current
    if (block.lines.length >= 2 && parseTiming(line) !== null) {
      const previous = block.lines.at(-1) ?? ''
      if (block.lines.length >= 3 && INDEX_PATTERN.test(previous.trim())) {
        block.lines.pop()
        startBlock(i, [previous, line])
      } else {
        startBlock(i + 1, [line])
      }
      return
    }
    block.lines.push(line)
  })
  return blocks
}

function parseTiming(line: string): { start: number; end: number } | null {
  const parts = line.trim().split(ARROW.trim())
  if (parts.length !== 2) return null
  const start = parseTime(parts[0])
  // 時間後方可能有位置資訊（例如 X1:100），只取第一段
  const end = parseTime(parts[1].trim().split(/\s+/)[0] ?? '')
  if (start === null || end === null) return null
  return { start, end }
}

export function parseSrt(input: string): ParseResult {
  const normalized = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const cues: Cue[] = []
  const errors: ParseError[] = []

  for (const { firstLine, lines } of splitBlocks(normalized.split('\n'))) {
    const [indexLine, timingLine, ...textLines] = lines
    if (parseTiming(indexLine) !== null) {
      errors.push({ line: firstLine, reason: '缺少序號：時間軸前一行應為序號（可能是上一條字幕後漏了空白行）' })
      continue
    }
    if (!INDEX_PATTERN.test(indexLine.trim())) {
      errors.push({ line: firstLine, reason: `序號必須是正整數，實際為「${indexLine.trim()}」` })
      continue
    }
    if (timingLine === undefined) {
      errors.push({ line: firstLine, reason: '缺少時間軸行' })
      continue
    }
    const timing = parseTiming(timingLine)
    if (!timing) {
      errors.push({
        line: firstLine + 1,
        reason: `時間軸格式錯誤，應為「HH:MM:SS,mmm --> HH:MM:SS,mmm」，實際為「${timingLine.trim()}」`,
      })
      continue
    }
    cues.push({ id: createId(), ...timing, text: textLines.join('\n') })
  }

  return { cues, errors }
}

/** 輸出 UTF-8 文字（不含 BOM），序號依目前順序重新編排，換行為 LF。 */
export function serializeSrt(cues: readonly Cue[]): string {
  return cues
    .map((cue, i) => `${i + 1}\n${formatTime(cue.start)}${ARROW}${formatTime(cue.end)}\n${cue.text}`)
    .join('\n\n')
    .concat(cues.length > 0 ? '\n' : '')
}
