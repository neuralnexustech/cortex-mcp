import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { m, AnimatePresence } from 'framer-motion'
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'

function Research({ data }) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState(null)
  
  const research = data?.research || []
  const filtered = search
    ? research.filter(r => r.library_name.toLowerCase().includes(search.toLowerCase()))
    : research

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Research</h2>
        <input
          type="text"
          placeholder="Search libraries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="bg-cortex-panel border border-cortex-border rounded-lg px-4 py-2 text-white w-64"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-250px)]">
        <div className="space-y-2 pr-4">
          {filtered.map((item) => (
            <m.div key={item.id} layout>
              <Card className="glass-panel border-cortex-border overflow-hidden">
                <button
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-cortex-border/50 transition-colors"
                >
                  {expandedId === item.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  <span className="flex-1 text-left text-white">{item.library_name}</span>
                  {item.version && (
                    <Badge variant="info">v{item.version}</Badge>
                  )}
                  {item.source_url && (
                    <a
                      href={item.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 hover:bg-cortex-border rounded"
                    >
                      <ExternalLink size={14} className="text-gray-400" />
                    </a>
                  )}
                  {item.agent && (
                    <span className="text-xs text-gray-500">{item.agent}</span>
                  )}
                </button>
                
                <AnimatePresence>
                  {expandedId === item.id && (
                    <m.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                    >
                      <Separator />
                      <div className="p-4">
                        <p className="text-gray-400 text-sm whitespace-pre-wrap">{item.notes}</p>
                        <div className="mt-3 text-xs text-gray-500">
                          Added: {new Date(item.created_at).toLocaleString()}
                        </div>
                      </div>
                    </m.div>
                  )}
                </AnimatePresence>
              </Card>
            </m.div>
          ))}
          
          {filtered.length === 0 && (
            <div className="text-center text-gray-500 py-8">No research entries found</div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export default Research
