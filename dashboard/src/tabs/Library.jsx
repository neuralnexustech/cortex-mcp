import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { BookOpen, Search, Code, FileText } from 'lucide-react'

export default function Library({ data }) {
  const snippets = data?.snippets || []
  const decisions = data?.decisions || []
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState('snippets')

  const filteredSnippets = snippets.filter((s) =>
    s.title?.toLowerCase().includes(search.toLowerCase()) ||
    s.tags?.toLowerCase().includes(search.toLowerCase())
  )

  const filteredDecisions = decisions.filter((d) =>
    d.title?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-yellow-400" />
          Library
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{snippets.length} snippets</Badge>
          <Badge variant="outline">{decisions.length} decisions</Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {['snippets', 'decisions'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-cortex-cyan/20 text-cortex-cyan border border-cortex-cyan/30'
                : 'bg-cortex-card border border-cortex-border text-cortex-muted hover:text-cortex-text'
            }`}
          >
            {t === 'snippets' ? 'Code Snippets' : 'Decisions'}
          </button>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
        <Input
          placeholder={`Search ${tab}...`}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Snippets Table */}
      {tab === 'snippets' && (
        filteredSnippets.length === 0 ? (
          <Card className="bg-cortex-card border-cortex-border">
            <CardContent className="p-8 text-center text-cortex-muted">
              No snippets found
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-cortex-card border-cortex-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Tags</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSnippets.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <Code className="w-4 h-4 text-cortex-cyan" />
                    </TableCell>
                    <TableCell className="font-medium text-cortex-text">{s.title}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{s.language}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {s.tags?.split(',').slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="text-[10px]">
                            {tag.trim()}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}

      {/* Decisions Table */}
      {tab === 'decisions' && (
        filteredDecisions.length === 0 ? (
          <Card className="bg-cortex-card border-cortex-border">
            <CardContent className="p-8 text-center text-cortex-muted">
              No decisions found
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-cortex-card border-cortex-border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDecisions.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <FileText className="w-4 h-4 text-yellow-400" />
                    </TableCell>
                    <TableCell className="font-medium text-cortex-text">{d.title}</TableCell>
                    <TableCell className="text-cortex-muted text-sm max-w-md truncate">
                      {d.reason || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )
      )}
    </div>
  )
}
