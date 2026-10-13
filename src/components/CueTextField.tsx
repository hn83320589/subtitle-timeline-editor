import type { Ref } from 'react'
import { useDraft } from '../hooks/useDraft'
import { caretTracker } from '../lib/caretTracker'

interface CueTextFieldProps {
  cueId: string
  value: string
  label: string
  ref: Ref<HTMLTextAreaElement>
  onCommit: (text: string) => void
  /** Enter 確認後要做的事（移到下一列） */
  onEnter: () => void
}

export function CueTextField({ cueId, value, label, ref, onCommit, onEnter }: CueTextFieldProps) {
  const [draft, setDraft, draftRef] = useDraft<string>()
  const shown = draft ?? value

  const commit = () => {
    if (draftRef.current === null) return
    onCommit(draftRef.current)
    setDraft(null)
  }

  return (
    <textarea
      ref={ref}
      className="text-field"
      aria-label={label}
      data-cue-field="text"
      data-dirty={draft !== null && draft !== value}
      rows={Math.max(1, shown.split('\n').length)}
      value={shown}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onSelect={(e) => caretTracker.set(cueId, e.currentTarget.selectionStart)}
      onKeyDown={(e) => {
        // 注音等輸入法選字時的 Enter 不算確認；Safari 在 compositionend 之後才送出 keydown，需另外看 keyCode 229
        if (e.nativeEvent.isComposing || e.keyCode === 229) return
        if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey) {
          e.preventDefault()
          commit()
          onEnter()
        } else if (e.key === 'Escape') {
          e.preventDefault()
          setDraft(null)
        }
        // Shift+Enter 使用瀏覽器預設行為，在同一條字幕內換行
      }}
    />
  )
}
