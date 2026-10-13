import { useState } from 'react'
import { serializeSrt } from '../core/srt'
import { findOverlaps, hasTimingErrors } from '../core/validate'
import { caretTracker } from '../lib/caretTracker'
import { downloadText } from '../lib/download'
import { modifierLabel } from '../lib/platform'
import { useEditorStore } from '../state/editorStore'

export type Notice = { kind: 'info' | 'error'; text: string }

interface ToolbarProps {
  onImportFile: (file: File) => void
  notify: (notice: Notice) => void
}

export function Toolbar({ onImportFile, notify }: ToolbarProps) {
  const count = useEditorStore((s) => s.cues.length)
  const hasErrors = useEditorStore((s) => hasTimingErrors(s.cues))
  const overlapCount = useEditorStore((s) => findOverlaps(s.cues).length)
  const canUndo = useEditorStore((s) => s.past.length > 0)
  const canRedo = useEditorStore((s) => s.future.length > 0)
  const selectedCount = useEditorStore((s) => Object.keys(s.selected).length)
  const [shiftInput, setShiftInput] = useState('100')
  const [scope, setScope] = useState<'all' | 'selected'>('all')

  const exportDisabledReason =
    count === 0 ? '沒有字幕可以匯出' : hasErrors ? '有字幕的結束時間不晚於開始時間，修正後才能匯出' : undefined

  const onExport = () => {
    const { cues, fileName } = useEditorStore.getState()
    downloadText(serializeSrt(cues), fileName || 'subtitles.srt')
  }

  const onShift = () => {
    const delta = Number(shiftInput)
    if (!Number.isInteger(delta)) {
      notify({ kind: 'error', text: '位移量必須是整數毫秒，例如 500 或 -1200。' })
      return
    }
    if (scope === 'selected' && selectedCount === 0) {
      notify({ kind: 'error', text: '尚未選取任何字幕。勾選列首的方塊選取，按住 Shift 可選取範圍。' })
      return
    }
    const result = useEditorStore.getState().shift(delta, scope)
    if (result.ok) {
      notify({ kind: 'info', text: `已將${scope === 'all' ? '全部' : `選取的 ${selectedCount} 條`}字幕位移 ${delta} ms。` })
    } else {
      notify({
        kind: 'error',
        text: `第 ${result.negativeSeqs.join('、')} 條會變成負時間，整批未套用。`,
      })
    }
  }

  const onSplit = () => {
    const { activeIndex, currentTimeMs, cues, split } = useEditorStore.getState()
    const cue = cues[activeIndex]
    if (!cue) {
      notify({ kind: 'error', text: '目前播放時間沒有字幕，無法分割。' })
      return
    }
    const caret = caretTracker.get(cue.id)
    if (!split(activeIndex, currentTimeMs, caret ?? Math.ceil(cue.text.length / 2))) {
      notify({ kind: 'error', text: '播放時間剛好在字幕的開始或結束，無法分割。' })
      return
    }
    notify({
      kind: 'info',
      text: caret === null ? `已分割第 ${activeIndex + 1} 條；沒有游標位置，文字從中間拆開。` : `已分割第 ${activeIndex + 1} 條。`,
    })
  }

  return (
    <div className="toolbar" role="toolbar" aria-label="編輯工具">
      <div className="tool-group">
        <label className="button">
          匯入 SRT
          <input
            type="file"
            accept=".srt"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) onImportFile(file)
              e.target.value = ''
            }}
          />
        </label>
        <button type="button" className="button primary" disabled={exportDisabledReason !== undefined} title={exportDisabledReason} onClick={onExport}>
          匯出 SRT
        </button>
      </div>

      <div className="tool-group">
        <button type="button" className="button" disabled={!canUndo} title={`復原（${modifierLabel}+Z）`} onClick={() => useEditorStore.getState().undo()}>
          復原
        </button>
        <button type="button" className="button" disabled={!canRedo} title={`重做（${modifierLabel}+Shift+Z）`} onClick={() => useEditorStore.getState().redo()}>
          重做
        </button>
      </div>

      <div className="tool-group">
        <button type="button" className="button" disabled={count === 0} title="在影片目前時間點分割該條字幕，文字依游標位置拆開" onClick={onSplit}>
          分割
        </button>
        <button type="button" className="button" disabled={overlapCount === 0} onClick={() => useEditorStore.getState().fixOverlaps()}>
          修正重疊{overlapCount > 0 && `（${overlapCount}）`}
        </button>
      </div>

      <div className="tool-group shift-group">
        <label>
          位移
          <input
            className="shift-input"
            type="number"
            step={100}
            value={shiftInput}
            aria-label="位移毫秒數"
            onChange={(e) => setShiftInput(e.target.value)}
          />
          ms
        </label>
        <select aria-label="位移範圍" value={scope} onChange={(e) => setScope(e.target.value as 'all' | 'selected')}>
          <option value="all">全部字幕</option>
          <option value="selected">選取的 {selectedCount} 條</option>
        </select>
        <button type="button" className="button" disabled={count === 0} onClick={onShift}>
          套用位移
        </button>
      </div>
    </div>
  )
}
