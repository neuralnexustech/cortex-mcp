import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Separator } from '../components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Settings as SettingsIcon, Download, RefreshCw, Database, Server } from 'lucide-react'

export default function Settings({ data }) {
  const handleExport = () => {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'cortex-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
        <SettingsIcon className="w-5 h-5 text-cortex-muted" />
        Settings
      </h2>

      {/* Project Info */}
      <Card className="bg-cortex-card border-cortex-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-cortex-text flex items-center gap-2">
            <Server className="w-4 h-4" />
            Project Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableBody>
              <TableRow>
                <TableCell className="text-cortex-muted font-medium w-40">Name</TableCell>
                <TableCell className="text-cortex-text">{data?.project?.name || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-cortex-muted font-medium">Goal</TableCell>
                <TableCell className="text-cortex-text max-w-md truncate">{data?.project?.goal || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-cortex-muted font-medium">Stack</TableCell>
                <TableCell className="text-cortex-text">{data?.project?.stack || 'N/A'}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="text-cortex-muted font-medium">Complexity</TableCell>
                <TableCell>
                  <Badge variant="outline">{data?.project?.complexity || 'N/A'}</Badge>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Data Summary */}
      <Card className="bg-cortex-card border-cortex-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-cortex-text flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[
                ['Features', data?.features?.length || 0, `${data?.features?.filter(f => f.status === 'done').length || 0} done`],
                ['Files', data?.files?.length || 0, `${data?.files?.filter(f => f.status === 'done').length || 0} tracked`],
                ['Tests', data?.tests?.length || 0, `${data?.tests?.filter(t => t.status === 'passed').length || 0} passed`],
                ['Issues', data?.issues?.length || 0, `${data?.issues?.filter(i => i.status === 'open').length || 0} open`],
                ['Dictionary', data?.dictionary?.length || 0, 'entries'],
                ['Snippets', data?.snippets?.length || 0, 'saved'],
                ['Research', data?.research?.length || 0, 'notes'],
                ['Decisions', data?.decisions?.length || 0, 'recorded'],
                ['Progress', data?.progress?.length || 0, 'entries'],
                ['Snapshots', data?.snapshots?.length || 0, 'saved'],
              ].map(([label, count, status]) => (
                <TableRow key={label}>
                  <TableCell className="text-cortex-text font-medium">{label}</TableCell>
                  <TableCell className="text-right text-cortex-text">{count}</TableCell>
                  <TableCell className="text-right text-cortex-muted text-xs">{status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Actions */}
      <Card className="bg-cortex-card border-cortex-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-cortex-text">Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-3">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
