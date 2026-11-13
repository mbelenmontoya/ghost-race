import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app'
import { AppProvider } from './state/app-context'
import '@fontsource/lilita-one'
import '@fontsource/nunito/600.css'
import '@fontsource/nunito/700.css'
import '@fontsource/nunito/800.css'
import '@fontsource/nunito/900.css'
import './styles/tokens.css'
import './styles/base.css'
import './styles/ui.css'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element in index.html')

createRoot(root).render(
  <StrictMode>
    <AppProvider>
      <App />
    </AppProvider>
  </StrictMode>
)
