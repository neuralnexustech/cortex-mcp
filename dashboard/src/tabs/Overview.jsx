import { useState } from 'react'
import { Badge } from '../components/ui/badge'
import { Progress } from '../components/ui/progress'
import { FolderKanban, FileCode, CheckCircle, Bug, Activity, Clock, ChevronDown, ChevronRight, Circle, Target, Zap, Layers } from 'lucide-react'

function CircleCheck({ checked, onClick }) {
  return (
    <button onClick={onClick} className="flex-shrink-0">
      {checked ? (
        <div className="w-5 h-5 rounded-full bg-cortex-green flex items-center justify-center">
          <CheckCircle className="w-3.5 h-3.5 text-white" />
        </div>
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-cortex-cyan hover:bg-purple-50 transition-all" />
      )}
    </button>
  )
}

function StatCard({ icon: Icon, label, value, color, bgColor }) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-cortex card-hover border border-gray-100">
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm text-cortex-muted font-medium">{label}</p>
          <p className="text-2xl font-bold text-cortex-text">{value}</p>
        </div>
      </div>
    </div>
  )
}

function StatusSection({ status, label, color, items, renderItem, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  if (items.length === 0) return null

  return (
    <div className="status-group mb-4">
      <button
        onClick={() => setOpen(!open)}
        className="section-header w-full"
      >
        {open ? <ChevronDown className="w-4 h-4 text-cortex-muted" /> : <ChevronRight className="w-4 h-4 text-cortex-muted" />}
        <div className={`w-2 h-2 rounded-full ${color}`} />
        <span className="font-semibold text-sm text-cortex-text">{label}</span>
        <Badge variant="outline" className="ml-1 text-[10px]">{items.length}</Badge>
      </button>
      {open && (
        <div className="divide-y divide-gray-50">
          {items.map((item, i) => renderItem(item, i))}
        </div>
      )}
    </div>
  )
}

function FeatureRow({ item, index }) {
  const isDone = item.status === 'done'
  const priorityColors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-orange-100 text-orange-700',
    low: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="todo-row" key={item.id || index}>
      <CircleCheck checked={isDone} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isDone ? 'line-through-animated text-cortex-muted' : 'text-cortex-text'}`}>
          {item.name}
        </p>
        {item.description && (
          <p className={`text-xs mt-0.5 ${isDone ? 'text-gray-400' : 'text-cortex-muted'}`}>
            {item.description.length > 80 ? item.description.slice(0, 80) + '...' : item.description}
          </p>
        )}
      </div>
      <div className={`status-pill ${priorityColors[item.priority] || priorityColors.medium}`}>
        {item.priority || 'medium'}
      </div>
    </div>
  )
}

function FileRow({ item, index }) {
  const isDone = item.status === 'done'

  return (
    <div className="todo-row" key={item.id || index}>
      <CircleCheck checked={isDone} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-mono ${isDone ? 'line-through-animated text-cortex-muted' : 'text-cortex-text'}`}>
          {item.file_path}
        </p>
      </div>
      {isDone && (
        <div className="status-pill bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          done
        </div>
      )}
    </div>
  )
}

function TestRow({ item, index }) {
  const isPassed = item.status === 'passed'
  const isFailed = item.status === 'failed'

  return (
    <div className="todo-row" key={item.id || index}>
      <CircleCheck checked={isPassed} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isPassed ? 'line-through-animated text-cortex-muted' : isFailed ? 'text-cortex-red' : 'text-cortex-text'}`}>
          {item.name}
        </p>
      </div>
      {item.agent && (
        <Badge variant="outline" className="text-[10px]">{item.agent}</Badge>
      )}
      {isPassed && (
        <div className="status-pill bg-green-100 text-green-700">
          <CheckCircle className="w-3 h-3" />
          passed
        </div>
      )}
      {isFailed && (
        <div className="status-pill bg-red-100 text-red-700">
          <Bug className="w-3 h-3" />
          failed
        </div>
      )}
    </div>
  )
}

function IssueRow({ item, index }) {
  const isOpen = item.status === 'open'

  return (
    <div className="todo-row" key={item.id || index}>
      <CircleCheck checked={!isOpen} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isOpen ? 'text-cortex-text' : 'line-through-animated text-cortex-muted'}`}>
          {item.title}
        </p>
        {item.description && (
          <p className={`text-xs mt-0.5 ${isOpen ? 'text-cortex-muted' : 'text-gray-400'}`}>
            {item.description.length > 80 ? item.description.slice(0, 80) + '...' : item.description}
          </p>
        )}
      </div>
      {item.fix_applied && (
        <p className="text-xs text-cortex-green max-w-[200px] truncate">{item.fix_applied}</p>
      )}
    </div>
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

  const featureGroups = {
    pending: features.filter((f) => f.status === 'pending'),
    'in-progress': features.filter((f) => f.status === 'in-progress'),
    done: features.filter((f) => f.status === 'done'),
  }

  const fileGroups = {
    pending: files.filter((f) => f.status === 'pending'),
    'in-progress': files.filter((f) => f.status === 'in-progress'),
    done: files.filter((f) => f.status === 'done'),
  }

  const testGroups = {
    pending: tests.filter((t) => t.status === 'pending'),
    'in-progress': tests.filter((t) => t.status === 'in-progress'),
    passed: tests.filter((t) => t.status === 'passed'),
    failed: tests.filter((t) => t.status === 'failed'),
  }

  const issueGroups = {
    open: issues.filter((i) => i.status === 'open'),
    resolved: issues.filter((i) => i.status === 'resolved'),
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Features" value={`${featuresDone}/${features.length}`} color="text-cortex-cyan" bgColor="bg-purple-100" />
        <StatCard icon={FileCode} label="Files" value={`${filesDone}/${files.length}`} color="text-cortex-blue" bgColor="bg-blue-100" />
        <StatCard icon={CheckCircle} label="Tests" value={`${testsPassed}/${tests.length}`} color="text-cortex-green" bgColor="bg-green-100" />
        <StatCard icon={Bug} label="Issues" value={issuesOpen} color="text-cortex-orange" bgColor="bg-orange-100" />
      </div>

      {/* Progress */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-cortex border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-cortex-cyan" />
              <span className="text-sm font-medium text-cortex-text">Feature Progress</span>
            </div>
            <span className="text-sm font-bold text-cortex-cyan">{featureProgress}%</span>
          </div>
          <Progress value={featureProgress} className="h-2" />
          <p className="text-xs text-cortex-muted mt-2">{featuresDone} of {features.length} complete</p>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-cortex border border-gray-100">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-cortex-green" />
              <span className="text-sm font-medium text-cortex-text">Test Coverage</span>
            </div>
            <span className="text-sm font-bold text-cortex-green">{testProgress}%</span>
          </div>
          <Progress value={testProgress} className="h-2" />
          <p className="text-xs text-cortex-muted mt-2">{testsPassed} of {tests.length} passing</p>
        </div>
      </div>

      {/* Features Todo */}
      {features.length > 0 && (
        <div className="bg-white rounded-2xl shadow-cortex border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
              <Target className="w-5 h-5 text-cortex-cyan" />
            </div>
            <div>
              <h3 className="font-semibold text-cortex-text">Features</h3>
              <p className="text-xs text-cortex-muted">{features.length} total</p>
            </div>
          </div>
          <StatusSection status="pending" label="Pending" color="bg-gray-400" items={featureGroups.pending} renderItem={(item, i) => <FeatureRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="in-progress" label="In Progress" color="bg-blue-500" items={featureGroups['in-progress']} renderItem={(item, i) => <FeatureRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="done" label="Completed" color="bg-green-500" items={featureGroups.done} renderItem={(item, i) => <FeatureRow item={item} index={i} />} defaultOpen={true} />
        </div>
      )}

      {/* Files Todo */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl shadow-cortex border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <FileCode className="w-5 h-5 text-cortex-blue" />
            </div>
            <div>
              <h3 className="font-semibold text-cortex-text">Files</h3>
              <p className="text-xs text-cortex-muted">{files.length} total</p>
            </div>
          </div>
          <StatusSection status="pending" label="Pending" color="bg-gray-400" items={fileGroups.pending} renderItem={(item, i) => <FileRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="in-progress" label="In Progress" color="bg-blue-500" items={fileGroups['in-progress']} renderItem={(item, i) => <FileRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="done" label="Completed" color="bg-green-500" items={fileGroups.done} renderItem={(item, i) => <FileRow item={item} index={i} />} defaultOpen={true} />
        </div>
      )}

      {/* Tests Todo */}
      {tests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-cortex border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-cortex-green" />
            </div>
            <div>
              <h3 className="font-semibold text-cortex-text">Tests</h3>
              <p className="text-xs text-cortex-muted">{tests.length} total</p>
            </div>
          </div>
          <StatusSection status="pending" label="Pending" color="bg-gray-400" items={testGroups.pending} renderItem={(item, i) => <TestRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="in-progress" label="In Progress" color="bg-blue-500" items={testGroups['in-progress']} renderItem={(item, i) => <TestRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="passed" label="Passed" color="bg-green-500" items={testGroups.passed} renderItem={(item, i) => <TestRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="failed" label="Failed" color="bg-red-500" items={testGroups.failed} renderItem={(item, i) => <TestRow item={item} index={i} />} defaultOpen={true} />
        </div>
      )}

      {/* Issues Todo */}
      {issues.length > 0 && (
        <div className="bg-white rounded-2xl shadow-cortex border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
              <Bug className="w-5 h-5 text-cortex-orange" />
            </div>
            <div>
              <h3 className="font-semibold text-cortex-text">Issues</h3>
              <p className="text-xs text-cortex-muted">{issues.length} total</p>
            </div>
          </div>
          <StatusSection status="open" label="Open" color="bg-orange-500" items={issueGroups.open} renderItem={(item, i) => <IssueRow item={item} index={i} />} defaultOpen={true} />
          <StatusSection status="resolved" label="Resolved" color="bg-green-500" items={issueGroups.resolved} renderItem={(item, i) => <IssueRow item={item} index={i} />} defaultOpen={true} />
        </div>
      )}

      {/* Recent Activity */}
      {progress.length > 0 && (
        <div className="bg-white rounded-2xl shadow-cortex border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
              <Activity className="w-5 h-5 text-cortex-muted" />
            </div>
            <div>
              <h3 className="font-semibold text-cortex-text">Recent Activity</h3>
              <p className="text-xs text-cortex-muted">{progress.length} entries</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {progress.slice(0, 8).map((p, i) => (
              <div className="todo-row" key={i}>
                <div className="w-2 h-2 rounded-full bg-cortex-cyan flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-cortex-text">{p.task}</p>
                </div>
                {p.agent && (
                  <Badge variant="outline" className="text-[10px]">{p.agent}</Badge>
                )}
                <span className="text-xs text-cortex-muted flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(p.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
