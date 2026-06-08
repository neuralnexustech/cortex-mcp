import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FileCode, Search, ChevronDown, ChevronRight } from 'lucide-react'

const STATUS_COLORS = {
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function FileTree({ data }) {
  const files = data?.files || []
  const dictionary = data?.dictionary || []
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState(null)

  const dictMap = Object.fromEntries(dictionary.map((d) => [d.key, d]))

  const filtered = files.filter((f) =>
    f.file_path?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <FileCode className="w-5 h-5 text-blue-400" />
          File Tree
        </h2>
        <Badge variant="outline">{files.length} files</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
        <Input
          placeholder="Search files..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No files found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>File Path</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dictionary</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => {
                const dict = dictMap[f.file_path]
                const isExpanded = expanded === f.id
                return (
                  <>
                    <TableRow
                      key={f.id}
                      className="cursor-pointer"
                      onClick={() => setExpanded(isExpanded ? null : f.id)}
                    >
                      <TableCell>
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-cortex-muted" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-cortex-muted" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-sm text-cortex-text">
                        {f.file_path}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${STATUS_COLORS[f.status] || ''}`}>
                          {f.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {dict ? (
                          <Badge className="text-[10px] bg-cortex-cyan/20 text-cortex-cyan border-cortex-cyan/30">
                            documented
                          </Badge>
                        ) : (
                          <span className="text-xs text-cortex-muted italic">none</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow key={`${f.id}-detail`}>
                        <TableCell colSpan={4} className="bg-cortex-bg/50">
                          {dict ? (
                            <div className="py-2 space-y-2">
                              <p className="text-xs text-cortex-muted font-medium">Summary</p>
                              <p className="text-sm text-cortex-text">{dict.short_summary}</p>
                              {dict.full_description && (
                                <>
                                  <p className="text-xs text-cortex-muted font-medium mt-3">Full Description</p>
                                  <p className="text-sm text-cortex-text whitespace-pre-wrap">{dict.full_description}</p>
                                </>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-cortex-muted py-2 italic">
                              No dictionary entry. Use cortex_write_dictionary to add one.
                            </p>
                          )}
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
