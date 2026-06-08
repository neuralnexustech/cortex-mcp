import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Bug, Search, AlertTriangle, CheckCircle } from 'lucide-react'

const STATUS_ICONS = {
  open: AlertTriangle,
  resolved: CheckCircle,
}

const STATUS_COLORS = {
  open: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  resolved: 'bg-green-500/20 text-green-400 border-green-500/30',
}

export default function Issues({ data }) {
  const issues = data?.issues || []
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selected, setSelected] = useState([])

  const filtered = issues
    .filter((i) => i.title?.toLowerCase().includes(search.toLowerCase()))
    .filter((i) => filter === 'all' || i.status === filter)

  const counts = {
    all: issues.length,
    open: issues.filter((i) => i.status === 'open').length,
    resolved: issues.filter((i) => i.status === 'resolved').length,
  }

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <Bug className="w-5 h-5 text-orange-400" />
          Issues
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{issues.length} total</Badge>
          <Badge className="bg-orange-500/20 text-orange-400">{counts.open} open</Badge>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
          <Input
            placeholder="Search issues..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'open', 'resolved'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-cortex-cyan/20 text-cortex-cyan border border-cortex-cyan/30'
                  : 'bg-cortex-card border border-cortex-border text-cortex-muted hover:text-cortex-text'
              }`}
            >
              {f} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No issues found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onCheckedChange={() => setSelected(selected.length === filtered.length ? [] : filtered.map((i) => i.id))}
                  />
                </TableHead>
                <TableHead className="w-10"></TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fix</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((issue) => {
                const Icon = STATUS_ICONS[issue.status] || Bug
                return (
                  <TableRow key={issue.id}>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(issue.id)}
                        onCheckedChange={() => toggleSelect(issue.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Icon className={`w-4 h-4 ${
                        issue.status === 'open' ? 'text-orange-400' : 'text-green-400'
                      }`} />
                    </TableCell>
                    <TableCell className="font-medium text-cortex-text max-w-xs truncate">
                      {issue.title}
                    </TableCell>
                    <TableCell className="text-cortex-muted text-xs max-w-xs truncate">
                      {issue.description || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${STATUS_COLORS[issue.status] || ''}`}>
                        {issue.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-cortex-muted max-w-xs truncate">
                      {issue.fix_applied || '—'}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  )
}
