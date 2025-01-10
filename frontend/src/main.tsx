import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { WebSocketProvider } from './components/WebSocketContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <WebSocketProvider>
    <App />
  </WebSocketProvider>
)