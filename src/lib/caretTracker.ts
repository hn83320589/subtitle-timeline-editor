/**
 * 記住最後一次在字幕文字欄的游標位置，供「分割」決定文字拆開的位置。
 * 只是 UI 暫存資訊，放在 store 會讓每次移動游標都觸發訂閱。
 */
let last: { id: string; position: number } | null = null

export const caretTracker = {
  set(id: string, position: number) {
    last = { id, position }
  },
  /** 取得該字幕的游標位置；沒有記錄時回傳 null */
  get(id: string): number | null {
    return last?.id === id ? last.position : null
  },
}
