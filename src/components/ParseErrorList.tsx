import { useEditorStore } from '../state/editorStore'

export function ParseErrorList() {
  const errors = useEditorStore((s) => s.parseErrors)
  const fileName = useEditorStore((s) => s.fileName)
  if (errors.length === 0) return null

  return (
    <section className="parse-errors" role="alert" aria-label="匯入錯誤">
      <header>
        <strong>
          {fileName} 有 {errors.length} 個格式錯誤的區塊已跳過，其餘字幕已匯入：
        </strong>
        <button type="button" className="link-button" onClick={() => useEditorStore.getState().dismissParseErrors()}>
          關閉
        </button>
      </header>
      <ol>
        {errors.map((error) => (
          <li key={error.line}>
            第 {error.line} 行：{error.reason}
          </li>
        ))}
      </ol>
    </section>
  )
}
