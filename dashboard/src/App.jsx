import { useEffect } from 'react'
import QueryProvider from './providers/QueryProvider'
import { WebSocketProvider } from './providers/WebSocketProvider'
import { ToastProvider } from './providers/ToastProvider'
import AppLayout from './components/layout/AppLayout'
import GlobalSearch from './components/GlobalSearch'
import useAppStore from './stores/useAppStore'

function App() {
  const searchOpen = useAppStore((s) => s.searchOpen)
  const setSearchOpen = useAppStore((s) => s.setSearchOpen)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  // Ctrl+K global search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        useAppStore.getState().toggleSearch()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <QueryProvider>
      <WebSocketProvider>
        <ToastProvider>
          <AppLayout />
          <GlobalSearch
            isOpen={searchOpen}
            onClose={() => setSearchOpen(false)}
            onNavigate={setActiveTab}
          />
        </ToastProvider>
      </WebSocketProvider>
    </QueryProvider>
  )
}

export default App
