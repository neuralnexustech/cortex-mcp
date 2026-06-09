import { useState } from 'react'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Progress } from '../components/ui/progress'
import { usePipelineStatus, usePipelineHistory, useProjectData } from '../hooks/useProjectData'
import { Play, Pause, StopCircle, History, Target, CheckCircle, XCircle, Clock, AlertCircle, ChevronRight, Layers } from 'lucide-react'

const API = window.location.origin

const STATUS_COLORS = {
  planning: 'bg-purple-100 text-purple-700',
  running: 'bg-blue-100 text-blue-700',
  paused: 'bg-orange-100 text-orange-700',
  waiting_human: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
}

const TASK_STATUS_ICON = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle,
  failed: XCircle,
}

const TASK_STATUS_COLORS = {
  pending: 'text-gray-400',
  in_progress: 'text-blue-500',
  completed: 'text-green-500',
  failed: 'text-red-500',
}

function sendCommand(url, method = 'POST', body = {}) {
  return fetch(`${API}${url}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())
}

export default function Pipeline({ data }) {
  const activeRun = data?.pipeline_active
  const [selectedPipelineId, setSelectedPipelineId] = useState(activeRun?.id || null)
  const { data: pipelineData, isLoading } = usePipelineStatus(selectedPipelineId)
  const { data: history } = usePipelineHistory()
  const [goal, setGoal] = useState('')
  const [starting, setStarting] = useState(false)

  const run = pipelineData?.run
  const tasks = pipelineData?.tasks || []
  const counts = pipelineData?.counts || {}
  const progress = tasks.length > 0 ? Math.round((counts.completed / tasks.length) * 100) : 0

  async function handleStartPipeline() {
    if (!goal.trim()) return
    setStarting(true)
    try {
      const res = await sendCommand('/api/pipeline/start', 'POST', { goal: goal.trim() })
      if (res?.pipeline_id) {
        setSelectedPipelineId(res.pipeline_id)
        setGoal('')
      }
    } finally {
      setStarting(false)
    }
  }

  async function handlePause() {
    await sendCommand('/api/pipeline/pause', 'POST', { id: selectedPipelineId })
  }

  async function handleResume() {
    await sendCommand('/api/pipeline/resume', 'POST', { id: selectedPipelineId })
  }

  async function handleCancel() {
    await sendCommand('/api/pipeline/cancel', 'POST', { id: selectedPipelineId })
  }

  const isActive = run && ['running', 'paused', 'waiting_human', 'planning'].includes(run?.status)

  return (
    <div className="space-y-6">
      {/* Start New Pipeline */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="w-5 h-5 text-cortex-cyan" />
            Start New Pipeline
          </CardTitle>
          <p className="text-sm text-cortex-muted">Enter a goal and Cortex will plan, execute, and verify it autonomously</p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Build authentication system with login/register"
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              onKeyDown={(e) => e.key === 'Enter' && handleStartPipeline()}
            />
            <Button onClick={handleStartPipeline} disabled={!goal.trim() || starting} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              {starting ? 'Starting...' : 'Start'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active Pipeline */}
      {run && (
        <Card>
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="w-5 h-5 text-cortex-cyan" />
                Active Pipeline
              </CardTitle>
              <Badge className={`${STATUS_COLORS[run.status] || 'bg-gray-100 text-gray-700'}`}>
                {run.status}
              </Badge>
            </div>
            <p className="text-sm font-medium text-cortex-text mt-1">{run.goal}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-cortex-muted">
                <span>{counts.completed || 0} of {tasks.length} tasks</span>
                <span className="font-medium text-cortex-cyan">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-4 text-xs text-cortex-muted">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {counts.pending || 0} pending
                </span>
                <span className="flex items-center gap-1">
                  <Play className="w-3 h-3 text-blue-500" /> {counts.in_progress || 0} active
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 text-green-500" /> {counts.completed || 0} done
                </span>
                <span className="flex items-center gap-1">
                  <XCircle className="w-3 h-3 text-red-500" /> {counts.failed || 0} failed
                </span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              {run.status === 'running' && (
                <Button variant="outline" onClick={handlePause} className="flex items-center gap-2">
                  <Pause className="w-4 h-4" />
                  Pause
                </Button>
              )}
              {run.status === 'paused' && (
                <Button variant="outline" onClick={handleResume} className="flex items-center gap-2">
                  <Play className="w-4 h-4" />
                  Resume
                </Button>
              )}
              {isActive && (
                <Button variant="destructive" onClick={handleCancel} className="flex items-center gap-2">
                  <StopCircle className="w-4 h-4" />
                  Cancel
                </Button>
              )}
            </div>

            {/* Task List */}
            <div className="space-y-1">
              {tasks.map((task) => {
                const Icon = TASK_STATUS_ICON[task.status] || Clock
                return (
                  <div key={task.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                    <Icon className={`w-4 h-4 ${TASK_STATUS_COLORS[task.status] || 'text-gray-400'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.label}
                      </p>
                      {task.error_output && (
                        <p className="text-xs text-red-500 mt-0.5 truncate">{task.error_output}</p>
                      )}
                    </div>
                    {task.retry_count > 0 && (
                      <Badge variant="warning" className="text-[10px]">retry {task.retry_count}</Badge>
                    )}
                    <Badge variant="outline" className="text-[10px]">{task.action_type}</Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {history && history.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="w-5 h-5" />
              Pipeline History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 10).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedPipelineId(r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors text-left ${selectedPipelineId === r.id ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50 hover:bg-gray-100 border border-transparent'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${r.status === 'completed' ? 'bg-green-500' : r.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{r.goal}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.status} — {r.started_at}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
