import { modifierLabel } from '../lib/platform'

const SHORTCUTS: [string, string][] = [
  ['Enter', '確認文字並移到下一列'],
  ['Shift+Enter', '在同一條字幕內換行'],
  ['Esc', '取消本次編輯，還原內容'],
  [`${modifierLabel}+Z`, '復原'],
  [`${modifierLabel}+Shift+Z`, '重做'],
  ['Shift+點擊勾選框', '選取範圍'],
]

export function ShortcutHelp() {
  return (
    <details className="shortcut-help">
      <summary>快捷鍵</summary>
      <dl>
        {SHORTCUTS.map(([key, description]) => (
          <div key={key}>
            <dt>
              <kbd>{key}</kbd>
            </dt>
            <dd>{description}</dd>
          </div>
        ))}
      </dl>
    </details>
  )
}
