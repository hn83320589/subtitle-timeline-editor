import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { useEditorStore } from './state/editorStore'
import { loadSaved, startAutosave } from './state/persistence'

const saved = loadSaved()
if (saved) useEditorStore.getState().restore(saved.cues, saved.fileName)
startAutosave(useEditorStore)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
