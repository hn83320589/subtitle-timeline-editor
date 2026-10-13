// 產生 samples/ 下的三份範例 SRT。執行：npm run gen:samples
import { writeFileSync } from 'node:fs'

const pad = (n, width = 2) => String(n).padStart(width, '0')
const fmt = (ms) =>
  `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
const block = (seq, start, end, text) => `${seq}\n${fmt(start)} --> ${fmt(end)}\n${text}`

// 1. 一般 SRT：UTF-8 BOM + CRLF，刻意包含兩處重疊與一個 <i> 標籤
const basic = [
  [1000, 3200, '大家好，歡迎收看本週的節目'],
  [3000, 5600, '今天要介紹的是\n台灣的夜市文化'],
  [5800, 8200, '<i>（背景音樂）</i>'],
  [8000, 11000, '首先我們來到士林夜市'],
  [11200, 14000, '這裡最有名的就是大雞排'],
  [14200, 17500, '還有珍珠奶茶、蚵仔煎'],
  [17600, 20000, '我們下集再見！'],
].map(([s, e, t], i) => block(i + 1, s, e, t))
writeFileSync('samples/basic-bom-crlf.srt', '\uFEFF' + basic.join('\r\n\r\n').replaceAll('\n', '\r\n') + '\r\n')

// 2. 含 3 個錯誤區塊（序號非數字、箭頭錯誤、缺少時間軸），其餘 5 條應正常匯入
const withErrors = [
  block(1, 1000, 3000, '第一條正常'),
  block(2, 3500, 5000, '第二條正常'),
  `三\n${fmt(5500)} --> ${fmt(7000)}\n序號不是數字`,
  block(4, 7500, 9000, '第四條正常'),
  `5\n${fmt(9500)} -> ${fmt(11000)}\n箭頭少了一個減號`,
  block(6, 11500, 13000, '第六條正常'),
  `7\n只有文字，沒有時間軸`,
  block(8, 15000, 17000, '第八條正常'),
]
writeFileSync('samples/with-errors.srt', withErrors.join('\n\n') + '\n')

// 3. 2,000 條字幕，每條 2.5 秒、間隔 0.5 秒，約 1 小時 40 分
const phrases = ['今天天氣很好', '我們一起去走走', '這間店的牛肉麵很好吃', '記得按讚訂閱', '下一段更精彩', '謝謝大家的支持']
const large = Array.from({ length: 2000 }, (_, i) => {
  const start = i * 3000
  const text = i % 7 === 0 ? `${phrases[i % phrases.length]}\n（第 ${i + 1} 句）` : `${phrases[i % phrases.length]}（第 ${i + 1} 句）`
  return block(i + 1, start, start + 2500, text)
})
writeFileSync('samples/large-2000.srt', large.join('\n\n') + '\n')

console.log('已產生 samples/basic-bom-crlf.srt、samples/with-errors.srt、samples/large-2000.srt')
