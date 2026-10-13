interface NavigatorUAData {
  platform?: string
}

function detectMac(): boolean {
  if (typeof navigator === 'undefined') return false
  const uaData = (navigator as Navigator & { userAgentData?: NavigatorUAData }).userAgentData
  return /Mac|iPhone|iPad/i.test(uaData?.platform ?? navigator.platform ?? navigator.userAgent)
}

export const isMac = detectMac()

/** macOS 用 Cmd，其他系統用 Ctrl */
export function hasModifier(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey'>, mac = isMac): boolean {
  return mac ? event.metaKey : event.ctrlKey
}

export const modifierLabel = isMac ? '⌘' : 'Ctrl'
