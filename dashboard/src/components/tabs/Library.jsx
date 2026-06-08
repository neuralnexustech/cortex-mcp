import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { m } from 'framer-motion'
import { Code, Copy, Check } from 'lucide-react'

function Library({ data }) {
  const [search, setSearch] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  
  const snippets = data?.snippets || []
  const filtered = search
    ? snippets.filter(s => 
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.language?.toLowerCase().includes(search.toLowerCase()) ||
        s.tags?.toLowerCase().includes(search.toLowerCase())
      )
    : snippets

  const copyCode = (code, id) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white">Library</h2>
      </div>

      <Tabs defaultValue="snippets">
        <TabsList>
          <TabsTrigger value="snippets">Snippets</TabsTrigger>
          <TabsTrigger value="skills">Skills</TabsTrigger>
        </TabsList>

        <TabsContent value="snippets" className="space-y-4">
          <input
            type="text"
            placeholder="Search snippets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-cortex-panel border border-cortex-border rounded-lg px-4 py-2 text-white"
          />

          <div className="grid grid-cols-2 gap-4">
            {filtered.map((snippet) => (
              <m.div
                key={snippet.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <Card className="glass-panel border-cortex-border">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-white font-medium">{snippet.title}</h3>
                      <Button variant="ghost" size="sm" onClick={() => copyCode(snippet.code, snippet.id)}>
                        {copiedId === snippet.id ? (
                          <Check size={14} className="text-cortex-green" />
                        ) : (
                          <Copy size={14} className="text-gray-400" />
                        )}
                      </Button>
                    </div>
                    
                    {snippet.language && (
                      <Badge variant="info" className="mb-2">{snippet.language}</Badge>
                    )}
                    
                    {snippet.tags && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {snippet.tags.split(',').map((tag, i) => (
                          <span key={i} className="text-xs text-gray-500">#{tag.trim()}</span>
                        ))}
                      </div>
                    )}
                    
                    <pre className="bg-cortex-bg rounded p-3 text-xs text-gray-300 overflow-auto max-h-32">
                      {snippet.code.split('\n').slice(0, 5).join('\n')}
                      {snippet.code.split('\n').length > 5 && '\n...'}
                    </pre>
                  </CardContent>
                </Card>
              </m.div>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-2 text-center text-gray-500 py-8">No snippets found</div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="skills">
          <div className="text-center text-gray-500 py-8">
            Skills will be stored in .cortex/library/skills/
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default Library
