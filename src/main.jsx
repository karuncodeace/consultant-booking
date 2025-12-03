import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import 'preline/preline'
import { requestFCMPermission } from "./firebase";  // ADD THIS

const queryClient = new QueryClient()

// Register Firebase service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/firebase-messaging-sw.js')
    .then((registration) => {
      console.log('FCM Service Worker registered:', registration);
    })
    .catch((error) => {
      console.error('FCM SW registration failed:', error);
    });
}
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
)
