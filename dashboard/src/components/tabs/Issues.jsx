import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { m, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle, Clock, Search } from 'lucide-react'

const statusIcons = {
  open: <AlertCircle size={16} className="text-cortex-red" />,
  'in-progress': <Clock size={16} className="text-cortex-yellow" />,
  resolved: <CheckCircle size={16} className="text-cortex-green" />,
}

const statusVariants = {
  open: 'destructive',
  'in-progress': 'warning',
  resolved: 'success',
}

function Issues({ data }) {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  
  const issues = data?.issues || []
  let filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter)
  if (search) {
    filtered = filtered.filter(i => 
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.file_path?.toLowerCase().includes(search.toLowerCase())
    )
  }

  const openCount = issues.filter(i => i.status === 'open').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Issues</h2>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-cortex-panel border border-cortex-border rounded-lg pl-9 pr-4 py-2 text-sm text-white w-48"
            />
          </div>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-cortex-panel border border-cortex-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {openCount > 0 && (
        <Card className="glass-panel border-l-4 border-l-cortex-red border-cortex-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-cortex-red" />
              <Badge variant="destructive">{openCount} open issue(s)</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {filtered.map((issue) => (
          <m.div key={issue.id} layout>
            <Card className="glass-panel border-cortex-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === issue.id ? null : issue.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-cortex-border/50 transition-colors"
              >
                {statusIcons[issue.status] || statusIcons.open}
                <span className="flex-1 text-left text-white">{issue.title}</span>
                {issue.file_path && (
                  <Badge variant="info">{issue.file_path}</Badge>
                )}
                {issue.agent && (
                  <span className="text-xs text-gray-500">{issue.agent}</span>
                )}
                <span className="text-xs text-gray-500">
                  {new Date(issue.created_at).toLocaleDateString()}
                </span>
              </button>
              
              <AnimatePresence>
                {expandedId === issue.id && (
                  <m.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                  >
                    <Separator />
                    <div className="p-4 space-y-3 text-sm">
                      {issue.description && (
                        <div>
                          <Badge variant="info">Description</Badge>
                          <p className="text-gray-400 mt-1">{issue.description}</p>
                        </div>
                      )}
                      {issue.cause && (
                        <div>
                          <Badge variant="warning">Cause</Badge>
                          <p className="text-gray-400 mt-1">{issue.cause}</p>
                        </div>
                      )}
                      {issue.fix_applied && (
                        <div>
                          <Badge variant="success">Fix Applied</Badge>
                          <p className="text-gray-400 mt-1">{issue.fix_applied}</p>
                        </div>
                      )}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </Card>
          </m.div>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8">No issues found</div>
        )}
      </div>
    </div>
  )
}

export default Issues
