import { beforeEach, describe, expect, it } from 'vitest'
import { HISTORY_LIMIT, useEditorStore } from './editorStore'

const SRT = [
  '1', '00:00:01,000 --> 00:00:02,000', '一', '',
  '2', '00:00:03,000 --> 00:00:04,000', '二', '',
  '3', '00:00:05,000 --> 00:00:06,000', '三', '',
].join('\n')

const store = () => useEditorStore.getState()

beforeEach(() => {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  store().importSrt(SRT, 'a.srt')
})

describe('editorStore', () => {
  it('匯入後記錄檔名與解析錯誤', () => {
    store().importSrt('x\n00:00:01,000 --> 00:00:02,000\nA\n', 'b.srt')
    expect(store().fileName).toBe('b.srt')
    expect(store().cues).toEqual([])
    expect(store().parseErrors).toHaveLength(1)
  })

  it('文字確認一次算一步，內容沒變則不記錄', () => {
    const id = store().cues[0].id
    const before = store().past.length
    store().updateCue(id, { text: '一' })
    expect(store().past.length).toBe(before)
    store().updateCue(id, { text: '改過的一' })
    expect(store().past.length).toBe(before + 1)
    store().undo()
    expect(store().cues[0].text).toBe('一')
    store().redo()
    expect(store().cues[0].text).toBe('改過的一')
  })

  it('更新文字時會正規化空白行', () => {
    const id = store().cues[0].id
    store().updateCue(id, { text: '上\n\n下\n' })
    expect(store().cues[0].text).toBe('上\n下')
  })

  it('只有被修改的字幕產生新物件，其餘保持相同參照', () => {
    const [a, b, c] = store().cues
    store().updateCue(b.id, { text: '新' })
    expect(store().cues[0]).toBe(a)
    expect(store().cues[1]).not.toBe(b)
    expect(store().cues[2]).toBe(c)
  })

  it('連續 60 次編輯後可以復原 50 步，重做後完全回到原本', () => {
    const id = store().cues[1].id
    for (let i = 1; i <= 60; i++) store().updateCue(id, { text: `第 ${i} 次` })
    const finalCues = store().cues

    for (let i = 0; i < 50; i++) store().undo()
    expect(store().cues[1].text).toBe('第 10 次')

    for (let i = 0; i < 50; i++) store().redo()
    expect(store().cues).toEqual(finalCues)
    expect(store().future).toHaveLength(0)
  })

  it('歷史超過上限時丟棄最舊的步驟', () => {
    const id = store().cues[0].id
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) store().updateCue(id, { start: i })
    expect(store().past).toHaveLength(HISTORY_LIMIT)
  })

  it('新的編輯會清空重做堆疊', () => {
    const id = store().cues[0].id
    store().updateCue(id, { text: 'A' })
    store().undo()
    store().updateCue(id, { text: 'B' })
    expect(store().future).toHaveLength(0)
  })

  it('批次位移被拒絕時不改變狀態也不記錄歷史', () => {
    const before = store().cues
    const pastLength = store().past.length
    const result = store().shift(-1500, 'all')
    expect(result).toEqual({ ok: false, negativeSeqs: [1] })
    expect(store().cues).toBe(before)
    expect(store().past.length).toBe(pastLength)
  })

  it('批次位移只作用在選取範圍（含 Shift 範圍選取）', () => {
    const [a, , c] = store().cues
    store().toggleSelect(a.id, false)
    store().toggleSelect(c.id, true)
    const result = store().shift(500, 'selected')
    expect(result.ok).toBe(true)
    expect(store().cues.map((cue) => cue.start)).toEqual([1500, 3500, 5500])
  })

  it('分割與合併可以復原', () => {
    store().split(0, 1500, 0)
    expect(store().cues).toHaveLength(4)
    store().merge(0)
    expect(store().cues).toHaveLength(3)
    store().undo()
    store().undo()
    expect(store().cues).toHaveLength(3)
    expect(store().cues[0]).toMatchObject({ start: 1000, end: 2000, text: '一' })
  })

  it('依播放時間計算當前字幕', () => {
    store().setCurrentTime(3500)
    expect(store().activeIndex).toBe(1)
    store().setCurrentTime(2500)
    expect(store().activeIndex).toBe(-1)
  })
})
