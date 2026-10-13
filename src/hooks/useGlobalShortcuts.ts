import { useEffect } from 'react'
import { hasModifier, isMac } from '../lib/platform'
import { useEditorStore } from '../state/editorStore'

function isEditable(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
}

/**
 * 判斷這次快捷鍵是否應交給瀏覽器原生的文字復原：
 * 非字幕欄位（例如位移毫秒數）一律原生；字幕欄位有尚未確認的修改時也走原生。
 */
function shouldUseNativeUndo(target: EventTarget | null): boolean {
  if (!isEditable(target)) return false
  return target.dataset.cueField === undefined || target.dataset.dirty === 'true'
}

export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!hasModifier(event) || shouldUseNativeUndo(event.target)) return
      const key = event.key.toLowerCase()
      const { undo, redo } = useEditorStore.getState()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      } else if ((key === 'z' && event.shiftKey) || (key === 'y' && !isMac)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
