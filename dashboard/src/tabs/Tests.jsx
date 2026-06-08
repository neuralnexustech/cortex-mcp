import { useState } from 'react'
import { Card, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Input } from '../components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FlaskConical, Search, CheckCircle, XCircle, Clock } from 'lucide-react'

const STATUS_ICONS = {
  passed: CheckCircle,
  failed: XCircle,
  pending: Clock,
}

const STATUS_COLORS = {
  passed: 'bg-green-500/20 text-green-400 border-green-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
}

export default function Tests({ data }) {
  const tests = data?.tests || []
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = tests
    .filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()))
    .filter((t) => filter === 'all' || t.status === filter)

  const counts = {
    all: tests.length,
    passed: tests.filter((t) => t.status === 'passed').length,
    failed: tests.filter((t) => t.status === 'failed').length,
    pending: tests.filter((t) => t.status === 'pending').length,
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-green-400" />
          Tests
        </h2>
        <Badge variant="outline">{tests.length} total</Badge>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cortex-muted" />
          <Input
            placeholder="Search tests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {['all', 'passed', 'failed', 'pending'].map((f) => (
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
            No tests found
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-cortex-card border-cortex-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Feature</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((t) => {
                const Icon = STATUS_ICONS[t.status] || Clock
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Icon className={`w-4 h-4 ${
                        t.status === 'passed' ? 'text-green-400' :
                        t.status === 'failed' ? 'text-red-400' :
                        'text-gray-400'
                      }`} />
                    </TableCell>
                    <TableCell className="font-medium text-cortex-text">{t.name}</TableCell>
                    <TableCell>
                      <Badge className={`text-[10px] border ${STATUS_COLORS[t.status] || ''}`}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-cortex-muted">
                      {t.feature_id ? `#${t.feature_id}` : '—'}
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
