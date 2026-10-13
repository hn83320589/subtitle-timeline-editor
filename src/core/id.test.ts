import { afterEach, describe, expect, it, vi } from 'vitest'
import { createId } from './id'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createId', () => {
  it('在非安全環境（沒有 crypto.randomUUID，例如以 http 區網 IP 開啟）也能產生 id', () => {
    vi.stubGlobal('crypto', { getRandomValues: crypto.getRandomValues.bind(crypto) })
    expect(() => createId()).not.toThrow()
  })

  it('大量產生時不重複', () => {
    const ids = new Set(Array.from({ length: 10_000 }, createId))
    expect(ids.size).toBe(10_000)
  })
})
