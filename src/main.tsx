import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { FileSystemProvider } from './contexts/FileSystemContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <FileSystemProvider>
      <App />
    </FileSystemProvider>
  </React.StrictMode>,
)
