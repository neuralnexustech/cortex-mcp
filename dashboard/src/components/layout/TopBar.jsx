import useAppStore from '../../stores/useAppStore'
import { Search, Wifi, WifiOff, Bell, Command } from 'lucide-react'

export default function TopBar({ projectName }) {
  const wsConnected = useAppStore((s) => s.wsConnected)
  const toggleSearch = useAppStore((s) => s.toggleSearch)
  const activeTab = useAppStore((s) => s.activeTab)

  return (
    <header className="h-16 bg-white/80 backdrop-blur-sm border-b border-gray-100 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-cortex-text">{projectName}</h1>
        <span className="text-sm text-cortex-muted">/ {activeTab}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Search button */}
        <button
          onClick={toggleSearch}
          className="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-cortex-muted hover:text-cortex-text hover:bg-gray-100 text-sm transition-all"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-mono">
            <Command className="w-2.5 h-2.5 inline" /> K
          </kbd>
        </button>

        {/* Notifications */}
        <button className="p-2 rounded-xl hover:bg-gray-50 text-cortex-muted hover:text-cortex-text transition-colors relative">
          <Bell className="w-4.5 h-4.5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cortex-red rounded-full" />
        </button>

        {/* WS Status */}
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium ${wsConnected ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  )
}
