import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from './editorStore'
import { loadSaved, startAutosave, STORAGE_KEY } from './persistence'

beforeEach(() => {
  localStorage.clear()
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('persistence', () => {
  it('編輯後自動儲存，重新載入時還原最後一次的內容', () => {
    const stop = startAutosave(useEditorStore)
    useEditorStore.getState().importSrt('1\n00:00:01,000 --> 00:00:02,000\n原文\n', 'demo.srt')
    const id = useEditorStore.getState().cues[0].id
    useEditorStore.getState().updateCue(id, { text: '最後一次編輯' })
    vi.runAllTimers()
    stop()

    const saved = loadSaved()
    expect(saved?.fileName).toBe('demo.srt')
    expect(saved?.cues).toEqual(useEditorStore.getState().cues)
  })

  it('儲存空間已滿時記錄錯誤，不中斷編輯', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    const stop = startAutosave(useEditorStore)
    useEditorStore.getState().importSrt('1\n00:00:01,000 --> 00:00:02,000\nA\n', 'a.srt')
    expect(() => vi.runAllTimers()).not.toThrow()
    expect(error).toHaveBeenCalledWith('自動儲存失敗', expect.any(DOMException))

    const id = useEditorStore.getState().cues[0].id
    useEditorStore.getState().updateCue(id, { text: '仍可編輯' })
    expect(useEditorStore.getState().cues[0].text).toBe('仍可編輯')
    stop()
    setItem.mockRestore()
    error.mockRestore()
  })

  it('儲存的資料毀損時回傳 null 並發出警告', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem(STORAGE_KEY, '{not json')
    expect(loadSaved()).toBeNull()
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})
