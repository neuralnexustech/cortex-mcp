import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Checkbox } from '../components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FolderKanban, Search, ChevronDown, ChevronUp } from 'lucide-react'

const STATUS_COLORS = {
  done: 'bg-green-500/20 text-green-400 border-green-500/30',
  'in-progress': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  blocked: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export default function Features({ data }) {
  const features = data?.features || []
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState([])
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const filtered = features
    .filter((f) => f.name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey] || ''
      const bVal = b[sortKey] || ''
      return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
    })

  const toggleSelect = (id) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id])
  }

  const toggleSelectAll = () => {
    setSelected(selected.length === filtered.length ? [] : filtered.map((f) => f.id))
  }

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortKey !== col) return null
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <FolderKanban className="w-5 h-5 text-cortex-cyan" />
          Features
        </h2>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{features.length} total</Badge>
          {selected.length > 0 && (
            <Badge className="bg-cortex-cyan/20 text-cortex-cyan">{selected.length} selected</Badge>
          )}
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
          <Input
            placeholder="Search features..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        {selected.length > 0 && (
          <Button variant="outline" size="sm" className="text-xs">
            Bulk Actions ({selected.length})
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-8 text-center text-cortex-muted">
            No features found
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
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">Name <SortIcon col="name" /></div>
                </TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('status')}>
                  <div className="flex items-center gap-1">Status <SortIcon col="status" /></div>
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => handleSort('priority')}>
                  <div className="flex items-center gap-1">Priority <SortIcon col="priority" /></div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(f.id)}
                      onCheckedChange={() => toggleSelect(f.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium text-cortex-text">{f.name}</TableCell>
                  <TableCell className="text-cortex-muted max-w-xs truncate">
                    {f.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-[10px] border ${STATUS_COLORS[f.status] || ''}`}>
                      {f.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {f.priority || 'medium'}
                    </Badge>
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
