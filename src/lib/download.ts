export function downloadText(text: string, fileName: string) {
  const blob = new Blob([text], { type: 'application/x-subrip;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // 讓瀏覽器有時間開始下載後再釋放
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
