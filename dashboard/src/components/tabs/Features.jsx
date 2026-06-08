import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { m, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Plus } from 'lucide-react'

const priorityVariants = {
  high: 'destructive',
  medium: 'warning',
  low: 'success',
}

const statusVariants = {
  pending: 'secondary',
  'in-progress': 'warning',
  done: 'success',
  blocked: 'destructive',
}

function Features({ data }) {
  const [expandedId, setExpandedId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [filter, setFilter] = useState('all')
  
  const features = data?.features || []
  const filtered = filter === 'all' ? features : features.filter(f => f.status === filter)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Features</h2>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-cortex-panel border border-cortex-border rounded-lg px-3 py-2 text-sm text-white"
          >
            <option value="all">All</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
            <option value="blocked">Blocked</option>
          </select>
          <Button variant="outline" onClick={() => setShowAdd(!showAdd)}>
            <Plus size={16} className="mr-2" />
            Add Feature
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <m.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <Card className="glass-panel border-cortex-border">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Feature name"
                    className="bg-cortex-bg border border-cortex-border rounded-lg px-3 py-2 text-white"
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    className="bg-cortex-bg border border-cortex-border rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm">Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAdd(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </m.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {filtered.map((feature) => (
          <m.div key={feature.id} layout>
            <Card className="glass-panel border-cortex-border overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === feature.id ? null : feature.id)}
                className="w-full flex items-center gap-4 p-4 hover:bg-cortex-border/50 transition-colors"
              >
                {expandedId === feature.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                <span className="flex-1 text-left text-white">{feature.name}</span>
                <Badge variant={priorityVariants[feature.priority] || 'secondary'}>
                  {feature.priority}
                </Badge>
                <Badge variant={statusVariants[feature.status] || 'secondary'}>
                  {feature.status}
                </Badge>
                {feature.agent && (
                  <span className="text-xs text-gray-500">{feature.agent}</span>
                )}
              </button>
              
              <AnimatePresence>
                {expandedId === feature.id && (
                  <m.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                  >
                    <Separator />
                    <div className="p-4 text-sm text-gray-400">
                      <p>{feature.description || 'No description'}</p>
                      {feature.linked_files && (
                        <p className="mt-2"><Badge variant="info">Files:</Badge> {feature.linked_files}</p>
                      )}
                      {feature.linked_tests && (
                        <p className="mt-1"><Badge variant="success">Tests:</Badge> {feature.linked_tests}</p>
                      )}
                    </div>
                  </m.div>
                )}
              </AnimatePresence>
            </Card>
          </m.div>
        ))}
        
        {filtered.length === 0 && (
          <div className="text-center text-gray-500 py-8">No features found</div>
        )}
      </div>
    </div>
  )
}

export default Features
