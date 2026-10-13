import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    await user.upload(input, srtFile('﻿1\r\n00:00:01,000 --> 00:00:02,000\r\n歡迎收看\r\n'))
    await waitFor(() => expect(screen.getByLabelText('第 1 條文字')).toHaveValue('歡迎收看'))
    expect(screen.getByText('demo.srt · 1 條')).toBeInTheDocument()
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
