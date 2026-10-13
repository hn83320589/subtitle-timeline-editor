import { create } from 'zustand'
import { findCueAt, fixOverlaps, mergeCues, normalizeText, shiftCues, splitCue, type ShiftResult } from '../core/ops'
import { parseSrt } from '../core/srt'
import type { Cue, ParseError } from '../core/types'
import { hasTimingError } from '../core/validate'

/** 需求為至少 50 步，保留一些餘裕。 */
export const HISTORY_LIMIT = 100

export type CuePatch = Partial<Pick<Cue, 'start' | 'end' | 'text'>>

interface EditorState {
  cues: Cue[]
  fileName: string
  parseErrors: ParseError[]
  past: Cue[][]
  future: Cue[][]
  selected: Record<string, true>
  lastSelectedId: string | null
  currentTimeMs: number
  activeIndex: number
  /** 要求某列的文字欄取得焦點（nonce 讓同一列可以重複要求） */
  focusRequest: { index: number; nonce: number } | null

  importSrt: (text: string, fileName: string) => void
  restore: (cues: Cue[], fileName: string) => void
  updateCue: (id: string, patch: CuePatch) => void
  /** 回傳修正的條數，以及修正後結束時間不晚於開始時間的序號 */
  fixOverlaps: () => { fixedCount: number; invalidSeqs: number[] }
  shift: (deltaMs: number, scope: 'all' | 'selected') => ShiftResult
  split: (index: number, atMs: number, caret: number) => boolean
  merge: (index: number) => boolean
  undo: () => void
  redo: () => void
  toggleSelect: (id: string, range: boolean) => void
  clearSelection: () => void
  setCurrentTime: (ms: number) => void
  requestFocus: (index: number) => void
  dismissParseErrors: () => void
}

export const useEditorStore = create<EditorState>()((set, get) => {
  /** 以新的字幕陣列取代目前內容，並記錄為一步歷史。 */
  const commit = (next: Cue[], extra: Partial<EditorState> = {}) => {
    const { cues, past, currentTimeMs } = get()
    set({
      ...extra,
      cues: next,
      past: [...past, cues].slice(-HISTORY_LIMIT),
      future: [],
      activeIndex: findCueAt(next, currentTimeMs),
    })
  }

  return {
    cues: [],
    fileName: '',
    parseErrors: [],
    past: [],
    future: [],
    selected: {},
    lastSelectedId: null,
    currentTimeMs: 0,
    activeIndex: -1,
    focusRequest: null,

    importSrt: (text, fileName) => {
      const { cues, errors } = parseSrt(text)
      // 匯入也算一步，誤匯入時可以復原
      commit(cues, { fileName, parseErrors: errors, selected: {}, lastSelectedId: null })
    },

    restore: (cues, fileName) => {
      set({ cues, fileName, past: [], future: [], activeIndex: findCueAt(cues, get().currentTimeMs) })
    },

    updateCue: (id, patch) => {
      const { cues } = get()
      const index = cues.findIndex((cue) => cue.id === id)
      if (index === -1) return
      const current = cues[index]
      const updated: Cue = {
        ...current,
        ...patch,
        text: patch.text === undefined ? current.text : normalizeText(patch.text),
      }
      if (updated.start === current.start && updated.end === current.end && updated.text === current.text) return
      commit(cues.with(index, updated))
    },

    fixOverlaps: () => {
      const { cues } = get()
      const next = fixOverlaps(cues)
      const changed = next.flatMap((cue, i) => (cue !== cues[i] ? [i] : []))
      if (changed.length > 0) commit(next)
      return {
        fixedCount: changed.length,
        // 下一條開始得比這條還早時，依規則修正後會變成時間錯誤，需要使用者手動處理
        invalidSeqs: changed.filter((i) => hasTimingError(next[i])).map((i) => i + 1),
      }
    },

    shift: (deltaMs, scope) => {
      const { cues, selected } = get()
      const ids = scope === 'all' ? null : new Set(Object.keys(selected))
      const result = shiftCues(cues, ids, deltaMs)
      if (result.ok && deltaMs !== 0) commit(result.cues)
      return result
    },

    split: (index, atMs, caret) => {
      const next = splitCue(get().cues, index, atMs, caret)
      if (next) commit(next)
      return next !== null
    },

    merge: (index) => {
      const next = mergeCues(get().cues, index)
      if (next) commit(next)
      return next !== null
    },

    undo: () => {
      const { cues, past, future, currentTimeMs } = get()
      const previous = past.at(-1)
      if (!previous) return
      set({
        cues: previous,
        past: past.slice(0, -1),
        future: [cues, ...future],
        activeIndex: findCueAt(previous, currentTimeMs),
      })
    },

    redo: () => {
      const { cues, past, future, currentTimeMs } = get()
      const [next, ...rest] = future
      if (!next) return
      set({ cues: next, past: [...past, cues], future: rest, activeIndex: findCueAt(next, currentTimeMs) })
    },

    toggleSelect: (id, range) => {
      const { cues, selected, lastSelectedId } = get()
      const anchor = range && lastSelectedId ? cues.findIndex((cue) => cue.id === lastSelectedId) : -1
      const target = cues.findIndex((cue) => cue.id === id)
      if (anchor !== -1 && target !== -1) {
        const next = { ...selected }
        const [from, to] = anchor < target ? [anchor, target] : [target, anchor]
        for (let i = from; i <= to; i++) next[cues[i].id] = true
        set({ selected: next, lastSelectedId: id })
        return
      }
      const next = { ...selected }
      if (next[id]) delete next[id]
      else next[id] = true
      set({ selected: next, lastSelectedId: id })
    },

    clearSelection: () => set({ selected: {}, lastSelectedId: null }),

    setCurrentTime: (ms) => {
      set({ currentTimeMs: ms, activeIndex: findCueAt(get().cues, ms) })
    },

    requestFocus: (index) => set({ focusRequest: { index, nonce: Date.now() } }),

    dismissParseErrors: () => set({ parseErrors: [] }),
  }
})

export type EditorStore = typeof useEditorStore
