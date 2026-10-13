const TIME_PATTERN = /^(\d+):(\d{2}):(\d{2})[,.](\d{3})$/

/** 解析 HH:MM:SS,mmm（毫秒分隔也接受句點），格式錯誤回傳 null。 */
export function parseTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim())
  if (!match) return null
  const [h, m, s, ms] = match.slice(1).map(Number)
  if (m > 59 || s > 59) return null
  return ((h * 60 + m) * 60 + s) * 1000 + ms
}

export function formatTime(totalMs: number): string {
  const ms = totalMs % 1000
  const totalSeconds = Math.floor(totalMs / 1000)
  const s = totalSeconds % 60
  const m = Math.floor(totalSeconds / 60) % 60
  const h = Math.floor(totalSeconds / 3600)
  const pad = (n: number, width = 2) => String(n).padStart(width, '0')
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`
}
