import useAppStore from '../../stores/useAppStore'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard, FolderKanban, FileCode, FlaskConical,
  Activity, Bug, BookOpen, Search, BookMarked,
  Settings, Network, ChevronLeft, Menu, Brain
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'features', label: 'Features', icon: FolderKanban },
  { id: 'files', label: 'File Tree', icon: FileCode },
  { id: 'tests', label: 'Tests', icon: FlaskConical },
  { id: 'progress', label: 'Progress', icon: Activity },
  { id: 'issues', label: 'Issues', icon: Bug },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'dictionary', label: 'Dictionary', icon: BookMarked },
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export default function Sidebar() {
  const activeTab = useAppStore((s) => s.activeTab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  return (
    <aside
      className={cn(
        'h-screen bg-white border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0 shadow-sm',
        collapsed ? 'w-16' : 'w-56',
        'max-md:fixed max-md:z-40 max-md:inset-y-0 max-md:left-0',
        collapsed && 'max-md:-translate-x-full',
        !collapsed && 'max-md:translate-x-0'
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-accent flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-cortex-text text-sm tracking-wide">CORTEX</span>
          </div>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 text-cortex-muted hover:text-cortex-text transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 mb-1',
                isActive
                  ? 'bg-purple-50 text-cortex-cyan font-medium shadow-sm'
                  : 'text-cortex-muted hover:text-cortex-text hover:bg-gray-50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className={cn('w-4.5 h-4.5 flex-shrink-0', isActive && 'text-cortex-cyan')} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50">
            <div className="w-2 h-2 rounded-full bg-cortex-green animate-pulse" />
            <span className="text-xs text-cortex-muted">Connected</span>
          </div>
        </div>
      )}
    </aside>
  )
}
