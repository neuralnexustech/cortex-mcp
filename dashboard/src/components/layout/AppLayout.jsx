import { lazy, Suspense } from 'react'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import useAppStore from '../../stores/useAppStore'
import { useProjectData } from '../../hooks/useProjectData'
import { StatsSkeleton } from '../LoadingSkeleton'
import ErrorBoundary from '../ErrorBoundary'

const Overview = lazy(() => import('../../tabs/Overview'))
const Features = lazy(() => import('../../tabs/Features'))
const FileTree = lazy(() => import('../../tabs/FileTree'))
const Tests = lazy(() => import('../../tabs/Tests'))
const Progress = lazy(() => import('../../tabs/Progress'))
const Issues = lazy(() => import('../../tabs/Issues'))
const Library = lazy(() => import('../../tabs/Library'))
const Research = lazy(() => import('../../tabs/Research'))
const Dictionary = lazy(() => import('../../tabs/Dictionary'))
const Graph = lazy(() => import('../../tabs/Graph'))
const Settings = lazy(() => import('../../tabs/Settings'))

const TABS = {
  overview: Overview,
  features: Features,
  files: FileTree,
  tests: Tests,
  progress: Progress,
  issues: Issues,
  library: Library,
  research: Research,
  dictionary: Dictionary,
  graph: Graph,
  settings: Settings,
}

function TabFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-cortex-cyan border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-cortex-muted">Loading...</span>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const activeTab = useAppStore((s) => s.activeTab)
  const { data, isLoading } = useProjectData()

  const ActiveTab = TABS[activeTab] || Overview

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'linear-gradient(135deg, #f8f9fc 0%, #f0f2f9 50%, #eef1f8 100%)' }}>
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <TopBar projectName={data?.project?.name || 'Cortex'} />

        <main className="flex-1 overflow-auto p-4 md:p-6">
          {isLoading ? (
            <StatsSkeleton />
          ) : (
            <ErrorBoundary key={activeTab}>
              <Suspense fallback={<TabFallback />}>
                <ActiveTab data={data} />
              </Suspense>
            </ErrorBoundary>
          )}
        </main>
      </div>
    </div>
  )
}
