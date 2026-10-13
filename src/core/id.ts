// 每次載入頁面產生不同的前綴，與自動儲存還原回來的舊 id 不會衝突。
// 不使用 crypto.randomUUID()：它只在 HTTPS 或 localhost 等安全環境可用。
const sessionPrefix = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
let counter = 0

export function createId(): string {
  counter += 1
  return `${sessionPrefix}-${counter.toString(36)}`
}
