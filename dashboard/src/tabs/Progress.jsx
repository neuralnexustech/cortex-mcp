import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Activity, Search, Clock, User } from 'lucide-react'

export default function Progress({ data }) {
  const progress = data?.progress || []
  const [search, setSearch] = useState('')

  const filtered = progress.filter((p) =>
    p.task?.toLowerCase().includes(search.toLowerCase()) ||
    p.agent?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <Activity className="w-5 h-5 text-purple-400" />
          Progress Log
        </h2>
        <Badge variant="outline">{progress.length} entries</Badge>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
        <Input
          placeholder="Search progress..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No progress logged yet
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-8"></TableHead>
                <TableHead>Task</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p, i) => (
                <TableRow key={p.id || i}>
                  <TableCell>
                    <div className="w-2 h-2 rounded-full bg-cortex-cyan" />
                  </TableCell>
                  <TableCell className="font-medium text-cortex-text">{p.task}</TableCell>
                  <TableCell>
                    {p.agent ? (
                      <Badge variant="outline" className="text-[10px]">
                        <User className="w-3 h-3 mr-1" />
                        {p.agent}
                      </Badge>
                    ) : (
                      <span className="text-cortex-muted">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-cortex-muted text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(p.created_at).toLocaleString()}
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
