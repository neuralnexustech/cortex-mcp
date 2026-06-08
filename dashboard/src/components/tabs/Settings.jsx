import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Save, Download } from 'lucide-react'
import { useState } from 'react'

function Settings({ data }) {
  const [settings, setSettings] = useState({
    project_name: data?.project?.name || '',
    goal: data?.project?.goal || '',
    stack: data?.project?.stack || '',
    ui_style: data?.project?.ui_style || '',
    preferred_libs: data?.project?.preferred_libs || '',
    forbidden_libs: data?.project?.forbidden_libs || '',
    complexity: data?.project?.complexity || 'medium',
  })

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const exportState = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cortex-project-state.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Settings</h2>
        <Button variant="outline" onClick={exportState}>
          <Download size={16} className="mr-2" />
          Export Project State
        </Button>
      </div>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">Project Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Project Name</label>
            <input
              type="text"
              value={settings.project_name}
              onChange={(e) => handleChange('project_name', e.target.value)}
              className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Goal</label>
            <textarea
              value={settings.goal}
              onChange={(e) => handleChange('goal', e.target.value)}
              rows={3}
              className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Tech Stack</label>
            <input
              type="text"
              value={settings.stack}
              onChange={(e) => handleChange('stack', e.target.value)}
              className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">UI Style</label>
              <input
                type="text"
                value={settings.ui_style}
                onChange={(e) => handleChange('ui_style', e.target.value)}
                className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Complexity</label>
              <select
                value={settings.complexity}
                onChange={(e) => handleChange('complexity', e.target.value)}
                className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Preferred Libraries</label>
            <input
              type="text"
              value={settings.preferred_libs}
              onChange={(e) => handleChange('preferred_libs', e.target.value)}
              className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Forbidden Libraries</label>
            <input
              type="text"
              value={settings.forbidden_libs}
              onChange={(e) => handleChange('forbidden_libs', e.target.value)}
              className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">Active Agents</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {['Claude', 'Gemini', 'OpenCode', 'Codex'].map((agent) => (
            <div key={agent} className="flex items-center justify-between">
              <span className="text-white">{agent}</span>
              <Switch defaultChecked={agent === 'Claude'} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">.cortexignore</CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            rows={4}
            placeholder="Enter file paths to ignore, one per line..."
            className="w-full bg-cortex-bg border border-cortex-border rounded-lg px-4 py-2 text-white font-mono text-sm resize-none"
          />
        </CardContent>
      </Card>
    </div>
  )
}

export default Settings
