import { formatTime } from '../core/time'
import { useEditorStore } from '../state/editorStore'

export function makeSrt(count: number, textOf = (i: number) => `第 ${i + 1} 條字幕`): string {
  return Array.from({ length: count }, (_, i) => {
    const start = i * 2000
    return `${i + 1}\n${formatTime(start)} --> ${formatTime(start + 1500)}\n${textOf(i)}`
  }).join('\n\n')
}

export function resetStore(srt?: string) {
  useEditorStore.setState(useEditorStore.getInitialState(), true)
  if (srt !== undefined) useEditorStore.getState().importSrt(srt, 'test.srt')
}

/**
 * jsdom 不做排版，所有元素的 offsetHeight 都是 0。
 * 讓捲動容器有 600px 高、每列 60px，虛擬化列表才會只 render 可視範圍。
 */
export function mockLayout() {
  const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      return this.dataset.testid === 'cue-scroller' ? 600 : 60
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, get: () => 800 })
  return () => {
    if (original) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', original)
  }
}
