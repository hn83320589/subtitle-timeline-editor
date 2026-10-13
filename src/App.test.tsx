import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useEditorStore } from './state/editorStore'
import { makeSrt, mockLayout, resetStore } from './test/helpers'

let restoreLayout: () => void
beforeAll(() => {
  restoreLayout = mockLayout()
})
afterAll(() => restoreLayout())

beforeEach(() => resetStore())

const srtFile = (content: string, name = 'demo.srt') => new File([content], name, { type: 'application/x-subrip' })

describe('App', () => {
  it('選檔匯入含 BOM 與 CRLF 的 SRT', async () => {
    const user = userEvent.setup()
    render(<App />)
    const input = document.querySelector<HTMLInputElement>('input[accept=".srt"]')!
    await user.upload(input, srtFile('\uFEFF1\r\n00:00:01,000 --> 00:00:02,000\r\n歡迎收看\r\n'))
    await waitFor(() => expect(screen.getByLabelText('第 1 條文字')).toHaveValue('歡迎收看'))
    expect(screen.getByText('demo.srt · 1 條')).toBeInTheDocument()
  })

  it('匯入 Big5 編碼的檔案時提示可能不是 UTF-8', async () => {
    const user = userEvent.setup()
    render(<App />)
    // 「你好」的 Big5 編碼（A7 41 A6 6E）不是合法的 UTF-8
    const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0))
    const bytes = new Uint8Array([...ascii('1\n00:00:01,000 --> 00:00:02,000\n'), 0xa7, 0x41, 0xa6, 0x6e, ...ascii('\n')])
    const input = document.querySelector<HTMLInputElement>('input[accept=".srt"]')!
    await user.upload(input, new File([bytes], 'big5.srt'))
    expect(await screen.findByText('big5.srt 可能不是 UTF-8 編碼（例如 Big5），文字可能出現亂碼。')).toBeInTheDocument()
  })

  it('拖放匯入時列出錯誤區塊的行號與原因', async () => {
    render(<App />)
    const content = '1\n00:00:01,000 --> 00:00:02,000\nOK\n\nX\n00:00:03,000 --> 00:00:04,000\nBAD\n'
    fireEvent.drop(screen.getByRole('main'), { dataTransfer: { files: [srtFile(content)] } })
    const alert = await screen.findByRole('alert', { name: '匯入錯誤' })
    expect(alert).toHaveTextContent('第 5 行')
    expect(alert).toHaveTextContent('序號')
  })

  it('有時間錯誤時匯出按鈕不可用，修正後恢復', async () => {
    const user = userEvent.setup()
    resetStore('1\n00:00:05,000 --> 00:00:05,000\nA\n')
    render(<App />)
    const exportButton = screen.getByRole('button', { name: '匯出 SRT' })
    expect(exportButton).toBeDisabled()

    const end = screen.getByLabelText('第 1 條結束時間')
    await user.clear(end)
    await user.type(end, '00:00:06,000{Enter}')
    expect(exportButton).toBeEnabled()
  })

  it('批次位移產生負時間時整批不套用，並提示受影響的序號', async () => {
    const user = userEvent.setup()
    resetStore(makeSrt(3))
    render(<App />)
    const input = screen.getByLabelText('位移毫秒數')
    await user.clear(input)
    await user.type(input, '-3000')
    await user.click(screen.getByRole('button', { name: '套用位移' }))
    expect(screen.getByText('第 1、2 條會變成負時間，整批未套用。')).toBeInTheDocument()
    expect(useEditorStore.getState().cues[2].start).toBe(4000)
  })

  it('分割依游標位置拆開文字；沒有游標位置時不分割並提示', async () => {
    const user = userEvent.setup()
    resetStore('1\n00:00:01,000 --> 00:00:05,000\n前半段後半段\n')
    render(<App />)
    act(() => useEditorStore.getState().setCurrentTime(3000))

    await user.click(screen.getByRole('button', { name: '分割' }))
    expect(screen.getByText('請先在第 1 條的文字中點一下，決定要從哪裡拆開。')).toBeInTheDocument()
    expect(useEditorStore.getState().cues).toHaveLength(1)

    const text = screen.getByLabelText('第 1 條文字') as HTMLTextAreaElement
    text.focus()
    text.setSelectionRange(3, 3)
    fireEvent.select(text)
    await user.click(screen.getByRole('button', { name: '分割' }))
    expect(useEditorStore.getState().cues.map(({ start, end, text }) => [start, end, text])).toEqual([
      [1000, 3000, '前半段'],
      [3000, 5000, '後半段'],
    ])
  })

  it('修正重疊後若有字幕的結束時間不晚於開始時間，提示其序號', async () => {
    const user = userEvent.setup()
    resetStore('1\n00:00:02,000 --> 00:00:05,000\nA\n\n2\n00:00:01,000 --> 00:00:06,000\nB\n')
    render(<App />)
    await user.click(screen.getByRole('button', { name: /修正重疊/ }))
    expect(screen.getByText('已修正 1 處重疊；第 1 條修正後結束時間不晚於開始時間，請手動調整。')).toBeInTheDocument()
  })

  it('Ctrl/Cmd+Z 復原、Ctrl/Cmd+Shift+Z 重做', async () => {
    const user = userEvent.setup()
    resetStore(makeSrt(2))
    render(<App />)
    const id = useEditorStore.getState().cues[0].id
    useEditorStore.getState().updateCue(id, { text: '改過' })
    const mod = /Mac/.test(navigator.platform) ? 'Meta' : 'Control'

    await user.keyboard(`{${mod}>}z{/${mod}}`)
    expect(useEditorStore.getState().cues[0].text).toBe('第 1 條字幕')
    await user.keyboard(`{${mod}>}{Shift>}z{/Shift}{/${mod}}`)
    expect(useEditorStore.getState().cues[0].text).toBe('改過')
  })

  it('匯出的檔案再匯入後內容一致', async () => {
    resetStore(makeSrt(3, (i) => `<i>第 ${i + 1} 條</i>\n第二行`))
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:mock')
    URL.createObjectURL = createObjectURL
    URL.revokeObjectURL = vi.fn()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: '匯出 SRT' }))

    const exported = await createObjectURL.mock.calls[0][0].text()
    const before = useEditorStore.getState().cues.map(({ start, end, text }) => ({ start, end, text }))
    useEditorStore.getState().importSrt(exported, 'again.srt')
    const after = useEditorStore.getState().cues.map(({ start, end, text }) => ({ start, end, text }))
    expect(after).toEqual(before)
    click.mockRestore()
  })
})
