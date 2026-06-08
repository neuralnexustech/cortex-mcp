import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { FolderKanban, FileCode, CheckCircle, Bug, Activity, Clock, ArrowUpRight, ArrowDownRight } from 'lucide-react'

function StatCard({ icon: Icon, label, value, change, color = 'text-cortex-cyan' }) {
  const isPositive = change?.startsWith('+')
  return (
    <Card className="bg-cortex-card border-cortex-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-cortex-muted font-medium uppercase tracking-wider">{label}</p>
            <p className="text-3xl font-bold text-cortex-text mt-1">{value}</p>
          </div>
          <div className={`p-2.5 rounded-xl bg-cortex-bg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {change && (
          <div className={`flex items-center gap-1 mt-3 text-xs font-medium ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {change}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function Overview({ data }) {
  const features = data?.features || []
  const files = data?.files || []
  const tests = data?.tests || []
  const issues = data?.issues || []
  const progress = data?.progress || []

  const featuresDone = features.filter((f) => f.status === 'done').length
  const filesDone = files.filter((f) => f.status === 'done').length
  const testsPassed = tests.filter((t) => t.status === 'passed').length
  const issuesOpen = issues.filter((i) => i.status === 'open').length

  const featureProgress = features.length ? Math.round((featuresDone / features.length) * 100) : 0
  const testProgress = tests.length ? Math.round((testsPassed / tests.length) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FolderKanban}
          label="Features"
          value={`${featuresDone}/${features.length}`}
          change={`+${featuresDone} done`}
          color="text-cortex-cyan"
        />
        <StatCard
          icon={FileCode}
          label="Files"
          value={`${filesDone}/${files.length}`}
          change={`+${filesDone} tracked`}
          color="text-blue-400"
        />
        <StatCard
          icon={CheckCircle}
          label="Tests"
          value={`${testsPassed}/${tests.length}`}
          change={`${testProgress}% passing`}
          color="text-green-400"
        />
        <StatCard
          icon={Bug}
          label="Issues"
          value={issuesOpen}
          change={issuesOpen === 0 ? 'All resolved' : `${issuesOpen} open`}
          color="text-orange-400"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-cortex-card border-cortex-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cortex-text">Feature Progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs text-cortex-muted">
              <span>{featuresDone} of {features.length} complete</span>
              <span className="text-cortex-cyan font-medium">{featureProgress}%</span>
            </div>
            <Progress value={featureProgress} className="h-2" />
          </CardContent>
        </Card>

        <Card className="bg-cortex-card border-cortex-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-cortex-text">Test Coverage</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-xs text-cortex-muted">
              <span>{testsPassed} of {tests.length} passing</span>
              <span className="text-green-400 font-medium">{testProgress}%</span>
            </div>
            <Progress value={testProgress} className="h-2" />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table */}
      <Card className="bg-cortex-card border-cortex-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-cortex-text flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {progress.length === 0 ? (
            <p className="text-xs text-cortex-muted text-center py-4">No activity yet</p>
          ) : (
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
                {progress.slice(0, 8).map((p, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <div className="w-2 h-2 rounded-full bg-cortex-cyan" />
                    </TableCell>
                    <TableCell className="font-medium text-cortex-text text-sm">{p.task}</TableCell>
                    <TableCell>
                      {p.agent ? (
                        <Badge variant="outline" className="text-[10px]">{p.agent}</Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
