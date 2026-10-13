import { formatTime, parseTime } from '../core/time'
import { useDraft } from '../hooks/useDraft'

interface TimeFieldProps {
  value: number
  label: string
  invalid: boolean
  onCommit: (ms: number) => void
}

export function TimeField({ value, label, invalid, onCommit }: TimeFieldProps) {
  const [draft, setDraft, draftRef] = useDraft<string>()
  const formatted = formatTime(value)
  const formatError = draft !== null && parseTime(draft) === null

  const commit = () => {
    const current = draftRef.current
    if (current === null) return
    const ms = parseTime(current)
    // 格式錯誤時保留輸入內容與錯誤樣式，讓使用者修正或按 Esc 還原
    if (ms === null) return
    onCommit(ms)
    setDraft(null)
  }

  return (
    <input
      className="time-field"
      aria-label={label}
      aria-invalid={formatError || invalid}
      title={formatError ? '格式應為 HH:MM:SS,mmm' : undefined}
      data-cue-field="time"
      data-dirty={draft !== null && draft !== formatted}
      value={draft ?? formatted}
      spellCheck={false}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(null)
        }
      }}
    />
  )
}
