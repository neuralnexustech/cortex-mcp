import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { m } from 'framer-motion'
import { CheckCircle, XCircle, Clock } from 'lucide-react'

const statusIcons = {
  passed: <CheckCircle size={16} className="text-cortex-green" />,
  failed: <XCircle size={16} className="text-cortex-red" />,
  pending: <Clock size={16} className="text-cortex-gray" />,
}

const statusVariants = {
  passed: 'success',
  failed: 'destructive',
  pending: 'secondary',
}

function Tests({ data }) {
  const [filter, setFilter] = useState('all')
  
  const tests = data?.tests || []
  const features = data?.features || []
  
  const filtered = filter === 'all' ? tests : tests.filter(t => t.status === filter)
  const passed = tests.filter(t => t.status === 'passed').length
  const failed = tests.filter(t => t.status === 'failed').length
  const pending = tests.filter(t => t.status === 'pending').length

  const getFeatureName = (featureId) => {
    const feature = features.find(f => f.id === featureId)
    return feature?.name || '—'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Tests</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-cortex-panel border border-cortex-border rounded-lg px-3 py-2 text-sm text-white"
        >
          <option value="all">All</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      <div className="flex gap-4">
        <Card className="glass-panel border-cortex-border flex-1">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold"><Badge variant="success">{passed}</Badge></div>
            <div className="text-sm text-gray-400 mt-1">Passed</div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-cortex-border flex-1">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold"><Badge variant="destructive">{failed}</Badge></div>
            <div className="text-sm text-gray-400 mt-1">Failed</div>
          </CardContent>
        </Card>
        <Card className="glass-panel border-cortex-border flex-1">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold"><Badge variant="secondary">{pending}</Badge></div>
            <div className="text-sm text-gray-400 mt-1">Pending</div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-2">
        {filtered.map((test, i) => (
          <m.div
            key={test.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="glass-panel border-cortex-border">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {statusIcons[test.status] || statusIcons.pending}
                  <span className="flex-1 text-white">{test.name}</span>
                  <Badge variant="info">{getFeatureName(test.feature_id)}</Badge>
                  {test.agent && (
                    <span className="text-xs text-gray-500">{test.agent}</span>
                  )}
                </div>
                {test.error_output && (
                  <div className="mt-3 p-3 bg-cortex-bg rounded text-sm text-cortex-red font-mono">
                    {test.error_output}
                  </div>
                )}
              </CardContent>
            </Card>
          </m.div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8">No tests found</div>
        )}
      </div>
    </div>
  )
}

export default Tests
