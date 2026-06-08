import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { LazyMotion, domAnimation, m, AnimatePresence } from 'framer-motion'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import GlobalSearch from './components/GlobalSearch'

const Overview = lazy(() => import('./components/tabs/Overview'))
const Features = lazy(() => import('./components/tabs/Features'))
const FileTree = lazy(() => import('./components/tabs/FileTree'))
const Tests = lazy(() => import('./components/tabs/Tests'))
const Progress = lazy(() => import('./components/tabs/Progress'))
const Issues = lazy(() => import('./components/tabs/Issues'))
const Library = lazy(() => import('./components/tabs/Library'))
const Research = lazy(() => import('./components/tabs/Research'))
const Dictionary = lazy(() => import('./components/tabs/Dictionary'))
const Settings = lazy(() => import('./components/tabs/Settings'))
const Graph = lazy(() => import('./components/tabs/Graph'))

const API_BASE = window.location.origin

function FallbackLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-cortex-cyan animate-pulse">Loading...</div>
    </div>
  )
}

const TABS_MAP = {
  overview: Overview,
  features: Features,
  files: FileTree,
  tests: Tests,
  progress: Progress,
  issues: Issues,
  library: Library,
  research: Research,
  dictionary: Dictionary,
  settings: Settings,
  graph: Graph,
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [projectData, setProjectData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [wsConnected, setWsConnected] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const wsRef = useRef(null)
  const fetchRef = useRef(null)
  const intervalRef = useRef(null)

  const fetchProjectData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/state`)
      const data = await response.json()
      setProjectData(data)
      setLoading(false)
    } catch (error) {
      console.error('Failed to fetch project data:', error)
      setLoading(false)
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev)
  }, [])

  useEffect(() => {
    fetchRef.current = fetchProjectData
    fetchProjectData()
    connectWebSocket()
    return () => {
      clearInterval(intervalRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [fetchProjectData])

  // Ctrl+K global search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Pause/resume polling based on page visibility
  useEffect(() => {
    function onVisibilityChange() {
      if (document.hidden) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      } else {
        fetchProjectData()
        intervalRef.current = setInterval(() => {
          if (fetchRef.current) fetchRef.current()
        }, 5000)
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [fetchProjectData])

  function connectWebSocket() {
    try {
      const ws = new WebSocket(`ws://${window.location.host}/ws`)
      wsRef.current = ws

      ws.onopen = () => {
        setWsConnected(true)
      }

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          if (msg.type === 'db_changed' && fetchRef.current) {
            fetchRef.current()
          }
        } catch (_) {}
      }

      ws.onclose = () => {
        setWsConnected(false)
        setTimeout(connectWebSocket, 3000)
      }

      ws.onerror = () => ws.close()
    } catch (_) {}
  }

  const ActiveTabComponent = TABS_MAP[activeTab] || Overview

  return (
    <LazyMotion features={domAnimation}>
      <div className="flex h-screen bg-cortex-bg">
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          collapsed={sidebarCollapsed}
          onToggle={toggleSidebar}
          projectData={projectData}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar
            projectName={projectData?.project?.name || 'Cortex'}
            onToggleSidebar={toggleSidebar}
            wsConnected={wsConnected}
          />

          <main className="flex-1 overflow-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-cortex-cyan animate-pulse">Loading...</div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <Suspense fallback={<FallbackLoader />}>
                  <m.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ActiveTabComponent data={projectData} onRefresh={fetchProjectData} />
                  </m.div>
                </Suspense>
              </AnimatePresence>
            )}
          </main>
        </div>
      </div>

      <GlobalSearch
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={setActiveTab}
      />
    </LazyMotion>
  )
}

export default App
