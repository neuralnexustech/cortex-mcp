import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { BookMarked, Search, Download, ChevronDown, ChevronRight } from 'lucide-react'

export default function Dictionary({ data }) {
  const dictionary = data?.dictionary || []
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const filtered = dictionary.filter((d) =>
    d.key?.toLowerCase().includes(search.toLowerCase()) ||
    d.short_summary?.toLowerCase().includes(search.toLowerCase())
  )

  const handleExport = () => {
    const json = JSON.stringify(dictionary, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'dictionary.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <BookMarked className="w-5 h-5 text-indigo-400" />
          Dictionary
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{dictionary.length} entries</Badge>
          <Button variant="outline" size="sm" onClick={handleExport} className="text-xs">
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
        <Input
          placeholder="Search dictionary..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No dictionary entries found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Summary</TableHead>
                <TableHead className="w-20">Words</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => {
                const isExpanded = expanded === d.id
                const wordCount = d.full_description?.split(/\s+/).length || 0
                return (
                  <>
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : d.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-cortex-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-cortex-muted" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-cortex-cyan">
                        {d.key}
                      </TableCell>
                      <TableCell className="text-cortex-text text-sm max-w-md truncate">
                        {d.short_summary}
                      </TableCell>
                      <TableCell className="text-cortex-muted text-xs">
                        {wordCount}
                      </TableCell>
                    </TableRow>
                    {isExpanded && d.full_description && (
                      <TableRow key={`${d.id}-detail`}>
                        <TableCell colSpan={4} className="bg-cortex-bg/50">
                          <div className="py-3">
                            <p className="text-xs text-cortex-muted font-medium mb-2">Full Description</p>
                            <p className="text-sm text-cortex-text whitespace-pre-wrap leading-relaxed">
                              {d.full_description}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
