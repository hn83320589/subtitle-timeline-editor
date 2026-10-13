import { memo, useEffect, useRef, type MouseEvent } from 'react'
import { overlaps } from '../core/validate'
import { videoController } from '../lib/videoController'
import { useEditorStore } from '../state/editorStore'
import { CueTextField } from './CueTextField'
import { TimeField } from './TimeField'

interface SubtitleRowProps {
  index: number
}

/**
 * 每列只依 index 從 store 訂閱自己需要的值：自己的字幕物件、相鄰字幕的時間（判斷重疊）、
 * 是否為播放中／已選取。編輯其他列時這些值不變，所以這列不會重新 render。
 */
export const SubtitleRow = memo(function SubtitleRow({ index }: SubtitleRowProps) {
  const cue = useEditorStore((s) => s.cues[index])
  const prevEnd = useEditorStore((s) => s.cues[index - 1]?.end)
  const nextStart = useEditorStore((s) => s.cues[index + 1]?.start)
  const isActive = useEditorStore((s) => s.activeIndex === index)
  const isSelected = useEditorStore((s) => s.cues[index] !== undefined && s.selected[s.cues[index].id] === true)
  const focusNonce = useEditorStore((s) => (s.focusRequest?.index === index ? s.focusRequest.nonce : null))
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (focusNonce === null) return
    const el = textRef.current
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
    useEditorStore.setState({ focusRequest: null })
  }, [focusNonce])

  if (!cue) return null

  const seq = index + 1
  const timingError = cue.end <= cue.start
  const overlapPrev = prevEnd !== undefined && overlaps(prevEnd, cue.start)
  const overlapNext = nextStart !== undefined && overlaps(cue.end, nextStart)
  const { updateCue, toggleSelect, merge, requestFocus } = useEditorStore.getState()

  const onMouseDown = (e: MouseEvent) => {
    const target = e.target as HTMLElement
    // 勾選框與按鈕有自己的用途，不跳轉影片
    if (target.closest('input[type="checkbox"], button')) return
    // 影片已在這條字幕內時，點欄位只是要編輯（例如放游標準備分割），不把影片拉回開始時間
    if (isActive && target.closest('[data-cue-field]')) return
    videoController.seek(cue.start)
  }

  const className = ['cue-row', isActive && 'is-active', isSelected && 'is-selected', timingError && 'has-error']
    .filter(Boolean)
    .join(' ')

  return (
    <div className={className} data-seq={seq} onMouseDown={onMouseDown}>
      <input
        type="checkbox"
        aria-label={`選取第 ${seq} 條`}
        checked={isSelected}
        onChange={() => {}}
        onClick={(e) => toggleSelect(cue.id, e.shiftKey)}
      />
      <span className="seq">{seq}</span>
      <div className="times">
        <TimeField
          label={`第 ${seq} 條開始時間`}
          value={cue.start}
          invalid={timingError}
          onCommit={(start) => updateCue(cue.id, { start })}
        />
        <TimeField
          label={`第 ${seq} 條結束時間`}
          value={cue.end}
          invalid={timingError}
          onCommit={(end) => updateCue(cue.id, { end })}
        />
      </div>
      <div className="text-cell">
        <CueTextField
          ref={textRef}
          cueId={cue.id}
          label={`第 ${seq} 條文字`}
          value={cue.text}
          onCommit={(text) => updateCue(cue.id, { text })}
          onEnter={() => {
            if (nextStart !== undefined) requestFocus(index + 1)
          }}
        />
        {(timingError || overlapPrev || overlapNext) && (
          <ul className="issues">
            {timingError && <li className="issue-error">結束時間必須晚於開始時間</li>}
            {overlapPrev && <li className="issue-warning">與上一條時間重疊</li>}
            {overlapNext && <li className="issue-warning">與下一條時間重疊</li>}
          </ul>
        )}
      </div>
      <div className="row-actions">
        {nextStart !== undefined && (
          <button type="button" className="icon-button" title="與下一條合併" aria-label={`合併第 ${seq} 條與下一條`} onClick={() => merge(index)}>
            ⤓
          </button>
        )}
      </div>
    </div>
  )
})
