import useAppStore from '../../stores/useAppStore'
import { Search, Wifi, WifiOff } from 'lucide-react'

export default function TopBar({ projectName }) {
  const wsConnected = useAppStore((s) => s.wsConnected)
  const toggleSearch = useAppStore((s) => s.toggleSearch)
  const activeTab = useAppStore((s) => s.activeTab)

  return (
    <header className="h-14 bg-cortex-card border-b border-cortex-border flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-cortex-text">{projectName}</h1>
        <span className="text-xs text-cortex-muted capitalize">/ {activeTab}</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Search button */}
        <button
          onClick={toggleSearch}
          className="flex items-center gap-2 px-3 py-1.5 bg-cortex-bg border border-cortex-border rounded-lg text-cortex-muted hover:text-cortex-text text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search</span>
          <kbd className="hidden sm:inline text-[10px] bg-cortex-border px-1.5 py-0.5 rounded">Ctrl+K</kbd>
        </button>

        {/* WS Status */}
        <div className={`flex items-center gap-1.5 text-xs ${wsConnected ? 'text-green-400' : 'text-red-400'}`}>
          {wsConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{wsConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  )
}
