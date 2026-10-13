import { act, render, screen } from '@testing-library/react'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { useEditorStore } from '../state/editorStore'
import { makeSrt, mockLayout, resetStore } from '../test/helpers'
import { SubtitleList } from './SubtitleList'

// 以 Profiler 包住真正的 SubtitleRow，記錄每一列 render 的次數
const renderCounts = new Map<number, number>()
vi.mock('./SubtitleRow', async (importOriginal) => {
  const { Profiler, memo } = await import('react')
  const actual = await importOriginal<typeof import('./SubtitleRow')>()
  const CountedRow = memo(function CountedRow({ index }: { index: number }) {
    return (
      <Profiler id={`row-${index}`} onRender={() => renderCounts.set(index, (renderCounts.get(index) ?? 0) + 1)}>
        <actual.SubtitleRow index={index} />
      </Profiler>
    )
  })
  return { SubtitleRow: CountedRow }
})

let restoreLayout: () => void
beforeAll(() => {
  restoreLayout = mockLayout()
})
afterAll(() => restoreLayout())

beforeEach(() => {
  renderCounts.clear()
  resetStore(makeSrt(2000))
})

describe('SubtitleList（2,000 條）', () => {
  it('只 render 可視範圍附近的列', () => {
    render(<SubtitleList />)
    const rows = screen.getAllByRole('listitem')
    expect(rows.length).toBeGreaterThan(5)
    expect(rows.length).toBeLessThan(40)
  })

  it('編輯其中一列時，其他列不會重新 render', () => {
    render(<SubtitleList />)
    const mounted = [...renderCounts.keys()]
    expect(mounted).toContain(3)
    renderCounts.clear()

    const target = useEditorStore.getState().cues[3]
    act(() => useEditorStore.getState().updateCue(target.id, { text: '只改這一列' }))

    expect(screen.getByLabelText('第 4 條文字')).toHaveValue('只改這一列')
    expect([...renderCounts.keys()]).toEqual([3])
  })

  it('修改時間時只有自己與受重疊判斷影響的相鄰列重新 render', () => {
    render(<SubtitleList />)
    renderCounts.clear()

    const target = useEditorStore.getState().cues[3]
    act(() => useEditorStore.getState().updateCue(target.id, { end: target.end + 100 }))

    // 第 5 列（index 4）的重疊判斷依賴第 4 列的結束時間
    expect([...renderCounts.keys()].sort()).toEqual([3, 4])
  })

  it('播放時間改變時只有高亮狀態改變的列重新 render', () => {
    render(<SubtitleList />)
    act(() => useEditorStore.getState().setCurrentTime(2100)) // 第 2 條
    renderCounts.clear()

    act(() => useEditorStore.getState().setCurrentTime(4100)) // 第 3 條
    expect([...renderCounts.keys()].sort()).toEqual([1, 2])
    expect(screen.getByLabelText('第 3 條文字').closest('.cue-row')).toHaveClass('is-active')
  })
})
