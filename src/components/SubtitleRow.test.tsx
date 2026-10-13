import { act, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { videoController } from '../lib/videoController'
import { useEditorStore } from '../state/editorStore'
import { makeSrt, mockLayout, resetStore } from '../test/helpers'
import { SubtitleList } from './SubtitleList'

let restoreLayout: () => void
beforeAll(() => {
  restoreLayout = mockLayout()
})
afterAll(() => restoreLayout())

beforeEach(() => {
  resetStore(makeSrt(5))
})

const cues = () => useEditorStore.getState().cues

describe('字幕列編輯', () => {
  it('輸入繁體中文後按 Enter，確認並跳到下一列的文字欄', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    const first = screen.getByLabelText('第 1 條文字')
    await user.clear(first)
    await user.type(first, '大家好，歡迎收看')
    expect(cues()[0].text).toBe('第 1 條字幕') // 確認前不寫入 store
    await user.keyboard('{Enter}')

    expect(cues()[0].text).toBe('大家好，歡迎收看')
    expect(screen.getByLabelText('第 2 條文字')).toHaveFocus()
    expect(useEditorStore.getState().past).toHaveLength(2) // 匯入 + 一次確認
  })

  it('Shift+Enter 在同一條字幕內換行', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    const first = screen.getByLabelText('第 1 條文字')
    await user.click(first)
    await user.keyboard('{Shift>}{Enter}{/Shift}第二行')
    expect(first).toHaveFocus()
    await user.tab()
    expect(cues()[0].text).toBe('第 1 條字幕\n第二行')
  })

  it('輸入法選字中的 Enter 不會確認', () => {
    render(<SubtitleList />)
    const first = screen.getByLabelText('第 1 條文字')
    fireEvent.change(first, { target: { value: '注音' } })
    fireEvent.keyDown(first, { key: 'Enter', keyCode: 229 })
    expect(cues()[0].text).toBe('第 1 條字幕')
    fireEvent.keyDown(first, { key: 'Enter', isComposing: true })
    expect(cues()[0].text).toBe('第 1 條字幕')
  })

  it('Esc 還原編輯前的文字與時間', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    const text = screen.getByLabelText('第 2 條文字')
    await user.clear(text)
    await user.type(text, '打錯了')
    await user.keyboard('{Escape}')
    expect(text).toHaveValue('第 2 條字幕')

    const start = screen.getByLabelText('第 2 條開始時間')
    await user.clear(start)
    await user.type(start, '00:09:09,999')
    await user.keyboard('{Escape}')
    expect(start).toHaveValue('00:00:02,000')

    await user.tab()
    expect(cues()[1]).toMatchObject({ start: 2000, text: '第 2 條字幕' })
  })

  it('時間格式錯誤時不寫入並標示錯誤', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    const end = screen.getByLabelText('第 1 條結束時間')
    await user.clear(end)
    await user.type(end, '1.5{Enter}')
    expect(end).toHaveAttribute('aria-invalid', 'true')
    expect(cues()[0].end).toBe(1500)
  })

  it('結束時間不晚於開始時間時顯示錯誤', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    const end = screen.getByLabelText('第 1 條結束時間')
    await user.clear(end)
    await user.type(end, '00:00:00,000{Enter}')
    expect(screen.getByText('結束時間必須晚於開始時間')).toBeInTheDocument()
  })

  it('點擊列時影片跳到該列的開始時間', () => {
    const seek = vi.spyOn(videoController, 'seek')
    render(<SubtitleList />)
    fireEvent.mouseDown(screen.getByLabelText('第 3 條文字'))
    expect(seek).toHaveBeenCalledWith(4000)
    seek.mockRestore()
  })

  it('影片已在該列範圍內時，點文字欄不跳轉，以便先定位影片再放游標分割', () => {
    const seek = vi.spyOn(videoController, 'seek')
    act(() => useEditorStore.getState().setCurrentTime(4800)) // 第 3 條：4000–5500
    render(<SubtitleList />)
    fireEvent.mouseDown(screen.getByLabelText('第 3 條文字'))
    fireEvent.mouseDown(screen.getByLabelText('第 3 條開始時間'))
    expect(seek).not.toHaveBeenCalled()

    // 點序號等非欄位區域仍然跳到開始時間
    fireEvent.mouseDown(screen.getByText('3', { selector: '.seq' }))
    expect(seek).toHaveBeenCalledWith(4000)
    seek.mockRestore()
  })

  it('合併按鈕把這一列與下一列合併', async () => {
    const user = userEvent.setup()
    render(<SubtitleList />)
    await user.click(screen.getByRole('button', { name: '合併第 1 條與下一條' }))
    expect(cues()).toHaveLength(4)
    expect(cues()[0]).toMatchObject({ start: 0, end: 3500, text: '第 1 條字幕\n第 2 條字幕' })
  })

  it('勾選框支援 Shift 範圍選取', () => {
    render(<SubtitleList />)
    fireEvent.click(screen.getByLabelText('選取第 2 條'))
    fireEvent.click(screen.getByLabelText('選取第 4 條'), { shiftKey: true })
    const selected = useEditorStore.getState().selected
    expect(Object.keys(selected)).toEqual([cues()[1].id, cues()[2].id, cues()[3].id])
  })

  it('復原後畫面顯示的內容跟著更新', () => {
    render(<SubtitleList />)
    act(() => useEditorStore.getState().updateCue(cues()[0].id, { text: '新' }))
    act(() => useEditorStore.getState().undo())
    expect(screen.getByLabelText('第 1 條文字')).toHaveValue('第 1 條字幕')
  })
})
