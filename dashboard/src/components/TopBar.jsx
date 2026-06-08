import { Activity } from 'lucide-react'

function TopBar({ projectName, onToggleSidebar, wsConnected = true }) {
  return (
    <header className="h-16 bg-cortex-panel border-b border-cortex-border flex items-center px-6 justify-between">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-heading font-bold text-white">{projectName}</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-cortex-green animate-pulse' : 'bg-cortex-red'}`}></div>
          <span className={`text-sm ${wsConnected ? 'text-cortex-green' : 'text-cortex-red'}`}>
            {wsConnected ? 'LIVE' : 'DISCONNECTED'}
          </span>
        </div>
      </div>
    </header>
  )
}

export default TopBar
