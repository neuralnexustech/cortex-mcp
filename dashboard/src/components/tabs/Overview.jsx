import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { m } from 'framer-motion'
import FlowDiagram from '../FlowDiagram'

function Overview({ data }) {
  const features = data?.features || []
  const files = data?.files || []
  const issues = data?.issues || []
  const tests = data?.tests || []
  const progress = data?.progress || []
  
  const featuresDone = features.filter(f => f.status === 'done').length
  const filesDone = files.filter(f => f.status === 'done').length
  const openIssues = issues.filter(i => i.status === 'open').length
  const testsPassed = tests.filter(t => t.status === 'passed').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Overview</h2>
        <Badge variant={data?.project?.status === 'active' ? 'success' : 'secondary'}>
          {data?.project?.status?.toUpperCase() || 'ACTIVE'}
        </Badge>
      </div>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">{data?.project?.name || 'Project'}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-sm">{data?.project?.goal || 'No goal set'}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Files Created', value: filesDone, variant: 'info' },
          { label: 'Features Done', value: `${featuresDone}/${features.length}`, variant: 'warning' },
          { label: 'Open Issues', value: openIssues, variant: 'destructive' },
          { label: 'Tests Passed', value: testsPassed, variant: 'success' },
        ].map((stat, i) => (
          <m.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-panel border-cortex-border">
              <CardContent className="p-4">
                <div className="text-3xl font-bold"><Badge variant={stat.variant}>{stat.value}</Badge></div>
                <div className="text-sm text-gray-400 mt-1">{stat.label}</div>
              </CardContent>
            </Card>
          </m.div>
        ))}
      </div>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">Flow Diagram</CardTitle>
        </CardHeader>
        <CardContent>
          <FlowDiagram data={data} />
        </CardContent>
      </Card>

      <Card className="glass-panel border-cortex-border">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-48 overflow-auto">
            {progress.slice(0, 10).map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm">
                <Badge variant="success">{p.agent || 'system'}</Badge>
                <span className="text-gray-400">—</span>
                <span className="text-white">{p.task}</span>
                {p.file_path && (
                  <Badge variant="info" className="ml-auto">{p.file_path}</Badge>
                )}
              </div>
            ))}
            {progress.length === 0 && (
              <div className="text-gray-500 text-center py-4">No activity yet</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default Overview
