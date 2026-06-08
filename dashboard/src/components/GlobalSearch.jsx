import { useState, useEffect, useRef } from 'react'
import { Search, X, ArrowRight } from 'lucide-react'
import useAppStore from '../stores/useAppStore'
import { useSearch } from '../hooks/useProjectData'

const TAB_MAP = {
  feature: 'features',
  file: 'files',
  test: 'tests',
  issue: 'issues',
  dictionary: 'dictionary',
  snippet: 'library',
  research: 'research',
  progress: 'progress',
}

export default function GlobalSearch({ isOpen, onClose, onNavigate }) {
  const [query, setQuery] = useState('')
  const inputRef = useRef(null)
  const { data } = useSearch(query)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) setQuery('')
  }, [isOpen])

  function handleSelect(item) {
    const tab = TAB_MAP[item.source] || 'overview'
    setActiveTab(tab)
    onClose()
  }

  if (!isOpen) return null

  const results = data?.results || []

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-cortex-card border border-cortex-border rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-cortex-border">
          <Search className="w-5 h-5 text-cortex-muted flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search features, files, issues, dictionary..."
            className="flex-1 bg-transparent text-sm text-cortex-text placeholder-cortex-muted outline-none"
          />
          <button onClick={onClose} className="p-1 hover:bg-cortex-border rounded">
            <X className="w-4 h-4 text-cortex-muted" />
          </button>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="p-4 text-center text-cortex-muted text-sm">
              Type at least 2 characters to search
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-center text-cortex-muted text-sm">
              No results found
            </div>
          ) : (
            <div className="py-2">
              {results.map((item, i) => (
                <button
                  key={`${item.source}-${item.id}-${i}`}
                  onClick={() => handleSelect(item)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-cortex-border/50 text-left transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-cortex-text truncate font-medium">
                        {item.title || item.key || item.name || `#${item.id}`}
                      </span>
                      <span className="text-[10px] text-cortex-muted px-1.5 py-0.5 bg-cortex-bg rounded">
                        {item.source}
                      </span>
                    </div>
                    {item.snippet && (
                      <p className="text-xs text-cortex-muted mt-0.5 truncate">{item.snippet}</p>
                    )}
                  </div>
                  <ArrowRight className="w-3 h-3 text-cortex-muted flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-cortex-border flex items-center gap-4 text-[10px] text-cortex-muted">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>esc Close</span>
        </div>
      </div>
    </div>
  )
}
