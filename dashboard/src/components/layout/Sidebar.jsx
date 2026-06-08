import useAppStore from '../../stores/useAppStore'
import { cn } from '../../lib/utils'
import {
  LayoutDashboard, FolderKanban, FileCode, FlaskConical,
  Activity, Bug, BookOpen, Search, BookMarked,
  Settings, Network, ChevronLeft, Menu
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
        'h-screen bg-cortex-card border-r border-cortex-border flex flex-col transition-all duration-300 flex-shrink-0',
        collapsed ? 'w-16' : 'w-56',
        'max-md:fixed max-md:z-40 max-md:inset-y-0 max-md:left-0',
        collapsed && 'max-md:-translate-x-full',
        !collapsed && 'max-md:translate-x-0'
      )}
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-3 border-b border-cortex-border">
        {!collapsed && (
          <span className="font-bold text-cortex-cyan text-sm tracking-wider">CORTEX</span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-1.5 rounded-md hover:bg-cortex-border text-cortex-muted hover:text-cortex-text transition-colors"
        >
          {collapsed ? <Menu className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2 px-1.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all duration-150 mb-0.5',
                isActive
                  ? 'bg-cortex-cyan/10 text-cortex-cyan font-medium'
                  : 'text-cortex-muted hover:text-cortex-text hover:bg-cortex-border/50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
