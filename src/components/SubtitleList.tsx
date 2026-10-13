import { defaultRangeExtractor, useVirtualizer, type Range } from '@tanstack/react-virtual'
import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { videoController } from '../lib/videoController'
import { useEditorStore } from '../state/editorStore'
import { SubtitleRow } from './SubtitleRow'

const ESTIMATED_ROW_HEIGHT = 64

function indexOf(target: EventTarget | null): number | null {
  const item = target instanceof HTMLElement ? target.closest<HTMLElement>('[data-index]') : null
  return item ? Number(item.dataset.index) : null
}

function isCueFieldFocused(): boolean {
  return document.activeElement instanceof HTMLElement && document.activeElement.dataset.cueField !== undefined
}

export function SubtitleList() {
  // 只訂閱 id 清單：文字或時間變動不會讓整個列表重新 render
  const ids = useEditorStore(useShallow((s) => s.cues.map((cue) => cue.id)))
  const scrollRef = useRef<HTMLDivElement>(null)
  // 正在編輯的列即使捲出畫面也保持掛載，避免未確認的內容遺失
  const [pinnedIndex, setPinnedIndex] = useState<number | null>(null)

  const rangeExtractor = useCallback(
    (range: Range) => {
      const indexes = defaultRangeExtractor(range)
      if (pinnedIndex === null || pinnedIndex >= range.count || indexes.includes(pinnedIndex)) return indexes
      return [...indexes, pinnedIndex].sort((a, b) => a - b)
    },
    [pinnedIndex],
  )

  // 本專案未啟用 React Compiler，此規則針對的自動 memo 問題不適用
  // oxlint-disable-next-line react/incompatible-library
  const virtualizer = useVirtualizer({
    count: ids.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    getItemKey: (index) => ids[index],
    overscan: 8,
    rangeExtractor,
  })

  useEffect(
    () =>
      useEditorStore.subscribe((state, prev) => {
        if (state.focusRequest && state.focusRequest !== prev.focusRequest) {
          virtualizer.scrollToIndex(state.focusRequest.index, { align: 'auto' })
        } else if (
          state.activeIndex !== prev.activeIndex &&
          state.activeIndex >= 0 &&
          videoController.isPlaying() &&
          // 使用者正在編輯時不搶走畫面
          !isCueFieldFocused()
        ) {
          virtualizer.scrollToIndex(state.activeIndex, { align: 'auto' })
        }
      }),
    [virtualizer],
  )

  const onFocus = (e: FocusEvent) => setPinnedIndex(indexOf(e.target))
  const onBlur = (e: FocusEvent) => {
    if (!scrollRef.current?.contains(e.relatedTarget as Node | null)) setPinnedIndex(null)
  }

  if (ids.length === 0) {
    return (
      <div className="empty-list">
        <p>把 SRT 檔拖放到視窗中，或按「匯入 SRT」開始編輯。</p>
      </div>
    )
  }

  return (
    <div className="cue-list">
      <div className="cue-header" aria-hidden="true">
        <span />
        <span>#</span>
        <span>開始／結束</span>
        <span>文字</span>
        <span />
      </div>
      <div ref={scrollRef} className="cue-scroller" data-testid="cue-scroller" onFocus={onFocus} onBlur={onBlur}>
        <div role="list" aria-label="字幕列表" style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((item) => (
            <div
              key={item.key}
              role="listitem"
              data-index={item.index}
              ref={virtualizer.measureElement}
              className="cue-item"
              style={{ transform: `translateY(${item.start}px)` }}
            >
              <SubtitleRow index={item.index} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
