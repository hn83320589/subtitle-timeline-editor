import { useEffect, useRef } from 'react'
import { formatTime } from '../core/time'
import { videoController } from '../lib/videoController'
import { useEditorStore } from '../state/editorStore'

interface VideoPanelProps {
  /** 本機影片的 Object URL；影片只在瀏覽器內播放，不會上傳 */
  url: string | null
  onPickFile: (file: File) => void
}

export function VideoPanel({ url, onPickFile }: VideoPanelProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const frameRef = useRef(0)
  const currentTimeMs = useEditorStore((s) => s.currentTimeMs)
  const activeText = useEditorStore((s) => s.cues[s.activeIndex]?.text)

  useEffect(() => {
    videoController.register(videoRef.current)
    return () => {
      videoController.register(null)
      cancelAnimationFrame(frameRef.current)
    }
  }, [url])

  const syncTime = () => {
    const video = videoRef.current
    if (video) useEditorStore.getState().setCurrentTime(Math.round(video.currentTime * 1000))
  }

  // timeupdate 約每 250ms 才觸發一次，播放中改用 requestAnimationFrame 讓高亮緊跟畫面
  const tick = () => {
    syncTime()
    if (videoController.isPlaying()) frameRef.current = requestAnimationFrame(tick)
  }

  return (
    <section className="video-panel" aria-label="影片預覽">
      <div className="video-frame">
        {url ? (
          <video
            ref={videoRef}
            src={url}
            controls
            onPlay={() => {
              cancelAnimationFrame(frameRef.current)
              tick()
            }}
            onPause={syncTime}
            onSeeked={syncTime}
            onTimeUpdate={syncTime}
            onLoadedMetadata={syncTime}
          />
        ) : (
          <label className="video-placeholder">
            <span>載入本機影片（只在瀏覽器內播放，不會上傳）</span>
            <input
              type="file"
              accept="video/*"
              onChange={(e) => {
                const picked = e.target.files?.[0]
                if (picked) onPickFile(picked)
                e.target.value = ''
              }}
            />
          </label>
        )}
        {url && activeText && <div className="caption-preview">{activeText}</div>}
      </div>
      <div className="video-meta">
        <span className="time-readout">{formatTime(currentTimeMs)}</span>
        {url && (
          <label className="link-button">
            更換影片
            <input
              type="file"
              accept="video/*"
              hidden
              onChange={(e) => {
                const picked = e.target.files?.[0]
                if (picked) onPickFile(picked)
                e.target.value = ''
              }}
            />
          </label>
        )}
      </div>
    </section>
  )
}
