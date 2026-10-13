import type { Cue } from '../core/types'
import type { EditorStore } from './editorStore'

export const STORAGE_KEY = 'subtitle-timeline-editor:v1'
const SAVE_DELAY_MS = 300

interface SavedDocument {
  fileName: string
  cues: Cue[]
}

function isCue(value: unknown): value is Cue {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.start === 'number' && typeof v.end === 'number' && typeof v.text === 'string'
}

export function loadSaved(): SavedDocument | null {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw === null) return null
  try {
    const data: unknown = JSON.parse(raw)
    const doc = data as Partial<SavedDocument>
    if (typeof doc.fileName !== 'string' || !Array.isArray(doc.cues) || !doc.cues.every(isCue)) {
      throw new Error('格式不符')
    }
    return { fileName: doc.fileName, cues: doc.cues }
  } catch (error) {
    console.warn('自動儲存的資料無法讀取，已忽略。', error)
    return null
  }
}

function save(doc: SavedDocument) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(doc))
  } catch (error) {
    // 多半是超過儲存空間上限；編輯仍可繼續，只是無法自動儲存
    console.error('自動儲存失敗', error)
  }
}

/** 字幕內容變動後延遲寫入 localStorage；頁面隱藏或關閉前立即寫入。回傳停止函式。 */
export function startAutosave(store: EditorStore): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  let pending = false

  const flush = () => {
    clearTimeout(timer)
    if (!pending) return
    pending = false
    const { cues, fileName } = store.getState()
    save({ cues, fileName })
  }

  const unsubscribe = store.subscribe((state, prev) => {
    if (state.cues === prev.cues && state.fileName === prev.fileName) return
    pending = true
    clearTimeout(timer)
    timer = setTimeout(flush, SAVE_DELAY_MS)
  })

  const onHide = () => {
    if (document.visibilityState === 'hidden') flush()
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', onHide)

  return () => {
    flush()
    unsubscribe()
    window.removeEventListener('pagehide', flush)
    document.removeEventListener('visibilitychange', onHide)
  }
}
