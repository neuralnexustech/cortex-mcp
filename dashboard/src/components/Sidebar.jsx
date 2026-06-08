import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  Layers,
  FolderTree,
  TestTube,
  Activity,
  Bug,
  BookOpen,
  Search,
  Database,
  Settings,
  Menu,
  Network
} from 'lucide-react'

const navItems = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'features', label: 'Features', icon: Layers },
  { id: 'files', label: 'Files', icon: FolderTree },
  { id: 'tests', label: 'Tests', icon: TestTube },
  { id: 'progress', label: 'Progress', icon: Activity },
  { id: 'issues', label: 'Issues', icon: Bug },
  { id: 'library', label: 'Library', icon: BookOpen },
  { id: 'research', label: 'Research', icon: Search },
  { id: 'dictionary', label: 'Dict', icon: Database },
  { id: 'graph', label: 'Graph', icon: Network },
  { id: 'settings', label: 'Settings', icon: Settings },
]

function Sidebar({ activeTab, onTabChange, collapsed, onToggle, projectData }) {
  const openIssues = projectData?.issues?.filter(i => i.status === 'open')?.length || 0

  return (
    <motion.aside
      className="h-full bg-cortex-panel border-r border-cortex-border flex flex-col"
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2 }}
    >
      <div className="p-4 border-b border-cortex-border flex items-center justify-between">
        {!collapsed && (
          <span className="text-cortex-cyan font-heading font-bold text-lg">CORTEX</span>
        )}
        <button
          onClick={onToggle}
          className="p-2 hover:bg-cortex-border rounded-lg transition-colors"
        >
          <Menu size={20} className="text-gray-400" />
        </button>
      </div>

      <nav className="flex-1 py-4">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeTab === item.id
          const hasBadge = item.id === 'issues' && openIssues > 0

          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 transition-all ${
                isActive
                  ? 'bg-cortex-border text-cortex-cyan'
                  : 'text-gray-400 hover:bg-cortex-border hover:text-white'
              }`}
            >
              <Icon size={20} />
              {!collapsed && (
                <>
                  <span className="flex-1 text-left">{item.label}</span>
                  {hasBadge && (
                    <span className="bg-cortex-red text-white text-xs px-2 py-0.5 rounded-full">
                      {openIssues}
                    </span>
                  )}
                </>
              )}
            </button>
          )
        })}
      </nav>
    </motion.aside>
  )
}

export default Sidebar
