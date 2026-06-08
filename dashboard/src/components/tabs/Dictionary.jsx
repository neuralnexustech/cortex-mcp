import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { m, AnimatePresence } from 'framer-motion'
import { Search, Download } from 'lucide-react'

function Dictionary({ data }) {
  const [search, setSearch] = useState('')
  const [selectedKey, setSelectedKey] = useState(null)
  const [showFull, setShowFull] = useState(false)
  
  const dictionary = data?.dictionary || []
  const filtered = search
    ? dictionary.filter(d => 
        d.key.toLowerCase().includes(search.toLowerCase()) ||
        d.short_summary.toLowerCase().includes(search.toLowerCase())
      )
    : dictionary

  const selectedEntry = selectedKey ? dictionary.find(d => d.key === selectedKey) : null

  const exportDictionary = () => {
    const blob = new Blob([JSON.stringify(dictionary, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cortex-dictionary.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Dictionary</h2>
        <Button variant="outline" onClick={exportDictionary}>
          <Download size={16} className="mr-2" />
          Export JSON
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-1 space-y-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              placeholder="Search keys..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-cortex-panel border border-cortex-border rounded-lg pl-9 pr-4 py-2 text-white text-sm"
            />
          </div>
          
          <ScrollArea className="h-[calc(100vh-300px)]">
            <div className="space-y-1 pr-4">
              {filtered.map((entry) => (
                <button
                  key={entry.id}
                  onClick={() => { setSelectedKey(entry.key); setShowFull(false) }}
                  className={`w-full flex items-center gap-2 p-3 rounded-lg text-left transition-colors ${
                    selectedKey === entry.key
                      ? 'bg-cortex-border text-cortex-cyan'
                      : 'hover:bg-cortex-border/50 text-gray-400'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full ${
                    entry.status === 'active' ? 'bg-cortex-green' : 'bg-cortex-red'
                  }`}></div>
                  <span className="truncate text-sm">{entry.key}</span>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center text-gray-500 py-4 text-sm">No entries found</div>
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="col-span-2">
          {selectedEntry ? (
            <Card className="glass-panel border-cortex-border sticky top-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-white">{selectedEntry.key}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={selectedEntry.status === 'active' ? 'success' : 'destructive'}>
                      {selectedEntry.status}
                    </Badge>
                    {selectedEntry.agent && (
                      <span className="text-xs text-gray-500">{selectedEntry.agent}</span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Badge variant="info">Short Summary</Badge>
                  <p className="text-white mt-1">{selectedEntry.short_summary}</p>
                </div>
                
                <Button variant="ghost" size="sm" onClick={() => setShowFull(!showFull)}>
                  {showFull ? 'Hide Full' : 'Show Full'}
                </Button>
                
                <AnimatePresence>
                  {showFull && selectedEntry.full_description && (
                    <m.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                    >
                      <Badge variant="info">Full Description</Badge>
                      <p className="text-gray-400 mt-1 whitespace-pre-wrap">{selectedEntry.full_description}</p>
                    </m.div>
                  )}
                </AnimatePresence>
                
                {selectedEntry.errors && (
                  <div>
                    <Badge variant="destructive">Errors</Badge>
                    <p className="text-gray-400 mt-1">{selectedEntry.errors}</p>
                  </div>
                )}
                
                {selectedEntry.fixes && (
                  <div>
                    <Badge variant="success">Fixes</Badge>
                    <p className="text-gray-400 mt-1">{selectedEntry.fixes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="glass-panel border-cortex-border">
              <CardContent className="p-6 text-center text-gray-500">
                Select a key to view details
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dictionary
