import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { m, AnimatePresence } from 'framer-motion'
import { Search, FileText, Layers, Bug, TestTube, BookOpen, Database } from 'lucide-react'

const API_BASE = window.location.origin

const TYPE_ICONS = {
  feature: Layers,
  file: FileText,
  issue: Bug,
  test: TestTube,
  snippet: BookOpen,
  dictionary: Database,
}

const TYPE_COLORS = {
  feature: '#00f5d4',
  file: '#f5c400',
  issue: '#ff3a3a',
  test: '#39ff14',
  snippet: '#a855f7',
  dictionary: '#00f5d4',
}

const TYPE_TAB_MAP = {
  feature: 'features',
  file: 'files',
  issue: 'issues',
  test: 'tests',
  snippet: 'library',
  dictionary: 'dictionary',
  research: 'research',
  progress: 'progress',
  decision: 'dictionary',
}

function GlobalSearch({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  const search = useCallback(async (q) => {
    if (!q || q.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/search?q=${encodeURIComponent(q)}&mode=keyword`)
      const data = await res.json()
      setResults(data.results || [])
      setSelectedIndex(0)
    } catch (e) {
      console.error('Search failed:', e)
      setResults([])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 200)
    return () => clearTimeout(timer)
  }, [query, search])

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      const r = results[selectedIndex]
      const tab = TYPE_TAB_MAP[r.source_table] || 'dictionary'
      onNavigate(tab)
      onClose()
    } else if (e.key === 'Escape') {
      onClose()
    }
  }, [results, selectedIndex, onNavigate, onClose])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <m.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          <m.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.15 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-full max-w-xl z-50"
          >
            <Card className="glass-panel border-cortex-border shadow-2xl">
              <CardContent className="p-0">
                <div className="flex items-center gap-3 px-4 py-3 border-b border-cortex-border">
                  <Search size={18} className="text-gray-500" />
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search features, files, issues, tests, snippets..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="flex-1 bg-transparent text-white outline-none placeholder-gray-500"
                  />
                  <kbd className="text-[10px] text-gray-500 bg-cortex-border px-1.5 py-0.5 rounded">ESC</kbd>
                </div>

                <ScrollArea className="max-h-80">
                  {loading && (
                    <div className="p-4 text-center text-gray-500 text-sm">Searching...</div>
                  )}

                  {!loading && query.length >= 2 && results.length === 0 && (
                    <div className="p-4 text-center text-gray-500 text-sm">No results found</div>
                  )}

                  {!loading && results.length > 0 && (
                    <div className="py-2">
                      {results.map((r, i) => {
                        const Icon = TYPE_ICONS[r.source_table] || FileText
                        const color = TYPE_COLORS[r.source_table] || '#888'
                        return (
                          <button
                            key={`${r.source_table}-${r.id}`}
                            onClick={() => {
                              const tab = TYPE_TAB_MAP[r.source_table] || 'dictionary'
                              onNavigate(tab)
                              onClose()
                            }}
                            onMouseEnter={() => setSelectedIndex(i)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                              i === selectedIndex ? 'bg-cortex-border/50' : 'hover:bg-cortex-border/30'
                            }`}
                          >
                            <Icon size={16} style={{ color }} />
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm truncate">{r.title || r.key || 'Untitled'}</div>
                              {r.snippet && (
                                <div className="text-xs text-gray-500 truncate mt-0.5">{r.snippet.slice(0, 80)}</div>
                              )}
                            </div>
                            <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                              {r.source_table}
                            </Badge>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {!loading && query.length < 2 && (
                    <div className="p-4 text-center text-gray-500 text-sm">
                      Type at least 2 characters to search
                    </div>
                  )}
                </ScrollArea>

                <div className="flex items-center gap-4 px-4 py-2 border-t border-cortex-border text-[10px] text-gray-500">
                  <span><kbd className="bg-cortex-border px-1 rounded">↑↓</kbd> navigate</span>
                  <span><kbd className="bg-cortex-border px-1 rounded">↵</kbd> open</span>
                  <span><kbd className="bg-cortex-border px-1 rounded">esc</kbd> close</span>
                </div>
              </CardContent>
            </Card>
          </m.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default GlobalSearch
