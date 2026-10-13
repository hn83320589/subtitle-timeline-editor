import { useCallback, useRef, useState } from 'react'

/**
 * 欄位編輯中的暫存值；null 表示沒有在編輯，顯示 store 中的值。
 * 同時提供 ref，讓 blur 等事件不會讀到上一次 render 的舊值。
 */
export function useDraft<T>() {
  const [draft, setDraftState] = useState<T | null>(null)
  const ref = useRef<T | null>(null)
  const setDraft = useCallback((value: T | null) => {
    ref.current = value
    setDraftState(value)
  }, [])
  return [draft, setDraft, ref] as const
}
