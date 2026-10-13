import { useCallback, useEffect, useRef, useState, type DragEvent } from 'react'
import { ParseErrorList } from './components/ParseErrorList'
import { ShortcutHelp } from './components/ShortcutHelp'
import { SubtitleList } from './components/SubtitleList'
import { Toolbar, type Notice } from './components/Toolbar'
import { VideoPanel } from './components/VideoPanel'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useEditorStore } from './state/editorStore'

export default function App() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)
  const [dragging, setDragging] = useState(false)
  const dragDepth = useRef(0)
  const fileName = useEditorStore((s) => s.fileName)
  const count = useEditorStore((s) => s.cues.length)

  useGlobalShortcuts()

  const videoUrlRef = useRef<string | null>(null)
  const loadVideo = useCallback((file: File) => {
    if (videoUrlRef.current) URL.revokeObjectURL(videoUrlRef.current)
    videoUrlRef.current = URL.createObjectURL(file)
    setVideoUrl(videoUrlRef.current)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 6000)
    return () => clearTimeout(timer)
  }, [notice])

  const importFile = useCallback(async (file: File) => {
    // File.text() 以 UTF-8 解碼並去除 BOM
    const text = await file.text()
    useEditorStore.getState().importSrt(text, file.name)
    const { cues, parseErrors } = useEditorStore.getState()
    if (text.includes('�')) {
      setNotice({ kind: 'error', text: `${file.name} 可能不是 UTF-8 編碼（例如 Big5），文字可能出現亂碼。` })
    } else {
      setNotice({
        kind: parseErrors.length > 0 ? 'error' : 'info',
        text: `已匯入 ${cues.length} 條字幕${parseErrors.length > 0 ? `，跳過 ${parseErrors.length} 個錯誤區塊` : ''}。`,
      })
    }
  }, [])

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    for (const file of Array.from(e.dataTransfer.files)) {
      if (/\.srt$/i.test(file.name)) void importFile(file)
      else if (file.type.startsWith('video/')) loadVideo(file)
      else setNotice({ kind: 'error', text: `不支援的檔案：${file.name}（只接受 .srt 與影片檔）` })
    }
  }

  return (
    <div
      className="app"
      onDragEnter={(e) => {
        e.preventDefault()
        dragDepth.current += 1
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current === 0) setDragging(false)
      }}
      onDrop={onDrop}
    >
      <header className="app-header">
        <h1>字幕時間軸編輯器</h1>
        <span className="file-info">{fileName ? `${fileName} · ${count} 條` : '尚未匯入字幕'}</span>
        <ShortcutHelp />
      </header>
      <Toolbar onImportFile={importFile} notify={setNotice} />
      <div className="notice-area" aria-live="polite">
        {notice && <p className={`notice notice-${notice.kind}`}>{notice.text}</p>}
      </div>
      <ParseErrorList />
      <main className="workspace">
        <VideoPanel url={videoUrl} onPickFile={loadVideo} />
        <SubtitleList />
      </main>
      {dragging && (
        <div className="drop-overlay" aria-hidden="true">
          放開以匯入 SRT 或載入影片
        </div>
      )}
    </div>
  )
}
