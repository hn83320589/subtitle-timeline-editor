/**
 * 讓字幕列表與工具列可以操作影片，而不必透過 store 傳遞 DOM 元素。
 * 影片時間以毫秒為單位，與字幕時間一致。
 */
let video: HTMLVideoElement | null = null

export const videoController = {
  register(element: HTMLVideoElement | null) {
    video = element
  },
  seek(ms: number) {
    if (video) video.currentTime = ms / 1000
  },
  isPlaying(): boolean {
    return video !== null && !video.paused && !video.ended
  },
}
