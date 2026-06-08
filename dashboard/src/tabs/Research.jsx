import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Search, ExternalLink } from 'lucide-react'

export default function Research({ data }) {
  const research = data?.research || []
  const [search, setSearch] = useState('')

  const filtered = research.filter((r) =>
    r.library_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.notes?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <Search className="w-5 h-5 text-cyan-400" />
          Research
        </h2>
        <Badge variant="outline">{research.length} entries</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
        <Input
          placeholder="Search research..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No research entries found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Library</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="w-20">Source</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-cortex-cyan">
                    {r.library_name || r.library}
                  </TableCell>
                  <TableCell>
                    {r.version ? (
                      <Badge variant="outline" className="text-[10px]">v{r.version}</Badge>
                    ) : (
                      <span className="text-cortex-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-cortex-text text-sm max-w-md truncate">
                    {r.notes}
                  </TableCell>
                  <TableCell>
                    {r.url ? (
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-cortex-cyan hover:underline inline-flex items-center gap-1 text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Link
                      </a>
                    ) : (
                      <span className="text-cortex-muted">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
