/** 一條字幕。時間單位皆為毫秒；序號不存放，於顯示與匯出時依位置編排。 */
export interface Cue {
  id: string
  start: number
  end: number
  text: string
}

export interface ParseError {
  /** 原檔中的行號（從 1 開始） */
  line: number
  reason: string
}
