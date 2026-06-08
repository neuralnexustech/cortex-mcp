import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react'
import { LazyMotion, domAnimation, m } from 'framer-motion'

const API_BASE = window.location.origin

const STATUS_COLORS = {
  done: '#00f5d4',
  'in-progress': '#f5c400',
  pending: '#444466',
  failed: '#ff3a3a',
  active: '#39ff14',
  blocked: '#ff3a3a',
  passed: '#00f5d4',
  open: '#ff3a3a',
  resolved: '#00f5d4',
}

const STAGE_COLORS = {
  files: '#00f5d4',
  features: '#f5c400',
  tests: '#39ff14',
  done: '#00f5d4',
}

const STAGE_LABELS = {
  files: 'FILE TREE',
  features: 'FEATURES',
  tests: 'TESTS',
  done: 'DONE',
}

const DONE_STATUSES = ['done', 'passed', 'resolved']
const IN_PROGRESS_STATUSES = ['in-progress', 'active']
const FAILED_STATUSES = ['failed', 'blocked', 'open']

function getStatusColor(status) {
  const s = (status || '').toLowerCase()
  return STATUS_COLORS[s] || '#444466'
}

function getStageColor(stage) {
  return STAGE_COLORS[stage] || '#444466'
}

function getStageStatus(items) {
  if (!items || items.length === 0) return 'PENDING'
  const doneCount = items.filter(i => 
    DONE_STATUSES.includes((i.status || '').toLowerCase())
  ).length
  if (doneCount === items.length) return 'DONE'
  if (items.some(i => IN_PROGRESS_STATUSES.includes((i.status || '').toLowerCase()))) return 'ACTIVE'
  if (items.some(i => FAILED_STATUSES.includes((i.status || '').toLowerCase()))) return 'BLOCKED'
  return 'PENDING'
}

function getProgress(items) {
  if (!items || items.length === 0) return { done: 0, total: 0, percent: 0 }
  const done = items.filter(i => DONE_STATUSES.includes((i.status || '').toLowerCase())).length
  return { done, total: items.length, percent: Math.round((done / items.length) * 100) }
}

function getFooterCounts(items) {
  if (!items || items.length === 0) return { done: 0, inProgress: 0, pending: 0, failed: 0 }
  const counts = { done: 0, inProgress: 0, pending: 0, failed: 0 }
  items.forEach(i => {
    const s = (i.status || '').toLowerCase()
    if (DONE_STATUSES.includes(s)) counts.done++
    else if (IN_PROGRESS_STATUSES.includes(s)) counts.inProgress++
    else if (FAILED_STATUSES.includes(s)) counts.failed++
    else counts.pending++
  })
  return counts
}

const StatusBadge = memo(function StatusBadge({ status, size = 'sm' }) {
  const color = getStatusColor(status)
  const sizeClasses = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1'
  return (
    <span
      className={`${sizeClasses} rounded-full font-medium`}
      style={{ backgroundColor: `${color}20`, color }}
    >
      {status?.toUpperCase() || 'PENDING'}
    </span>
  )
})

const ProgressBar = memo(function ProgressBar({ done, total, percent, color }) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1">
        <span className="text-[11px] text-gray-400">{done}/{total}</span>
        <span className="text-[11px] font-medium" style={{ color }}>{percent}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#1a1a2e] overflow-hidden">
        <m.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  )
})

const ChecklistItem = memo(function ChecklistItem({ item, getItemName, getItemStatus }) {
  const name = getItemName(item)
  const status = getItemStatus(item)
  const color = getStatusColor(status)
  const s = (status || '').toLowerCase()
  const isDone = DONE_STATUSES.includes(s)
  const isFailed = FAILED_STATUSES.includes(s)
  const isInProgress = IN_PROGRESS_STATUSES.includes(s)

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-[#1a1a2e] transition-colors">
      <span className="text-sm flex-shrink-0" style={{ color: isDone ? '#00f5d4' : '#444466' }}>
        {isDone ? '☑' : '☐'}
      </span>
      <span
        className={`text-xs flex-1 truncate ${
          isDone ? 'line-through text-gray-500' : 
          isFailed ? 'text-[#ff3a3a]' :
          isInProgress ? 'text-white' : 'text-gray-500'
        }`}
      >
        {name}
      </span>
      {isInProgress && (
        <span className="w-2 h-2 rounded-full bg-[#f5c400] flex-shrink-0 animate-pulse" />
      )}
      {isFailed && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ff3a3a20] text-[#ff3a3a] flex-shrink-0">
          FAIL
        </span>
      )}
      {isDone && (
        <span className="text-[#00f5d4] flex-shrink-0">✓</span>
      )}
    </div>
  )
})

const FlowCard = memo(function FlowCard({ stage, items, getItemName, getItemStatus, index }) {
  const color = getStageColor(stage)
  const stageStatus = useMemo(() => getStageStatus(items), [items])
  const progress = useMemo(() => getProgress(items), [items])
  const footer = useMemo(() => getFooterCounts(items), [items])
  const displayItems = useMemo(() => items?.slice(0, 8) || [], [items])
  const hasMore = items && items.length > 8

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="flex-1 min-w-[240px] max-w-[320px]"
    >
      <div
        className="h-full rounded-xl overflow-hidden"
        style={{
          background: 'rgba(18, 18, 26, 0.85)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${color}30`,
          boxShadow: `0 0 20px ${color}15, inset 0 1px 0 ${color}10`,
        }}
      >
        <div className="px-4 py-3 border-b border-[#2a2a3e]">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-heading font-bold tracking-wide" style={{ color }}>
              {STAGE_LABELS[stage] || stage}
            </h4>
            <StatusBadge status={stageStatus} />
          </div>
        </div>

        <div className="px-4 py-3 border-b border-[#2a2a3e]">
          <ProgressBar done={progress.done} total={progress.total} percent={progress.percent} color={color} />
        </div>

        <div className="px-2 py-2 max-h-[200px] overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {displayItems.length > 0 ? (
            displayItems.map((item, i) => (
              <ChecklistItem
                key={item.id || i}
                item={item}
                getItemName={getItemName}
                getItemStatus={getItemStatus}
              />
            ))
          ) : (
            <div className="text-center py-4 text-gray-500 text-xs">
              No items yet
            </div>
          )}
          {hasMore && (
            <div className="text-center py-2 text-gray-500 text-[10px]">
              +{items.length - 8} more items
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#2a2a3e]">
          <div className="text-[10px] text-gray-500">
            {footer.done > 0 && <span className="text-[#00f5d4]">{footer.done} done</span>}
            {footer.inProgress > 0 && (
              <>
                {footer.done > 0 && ' · '}
                <span className="text-[#f5c400]">{footer.inProgress} in progress</span>
              </>
            )}
            {footer.pending > 0 && (
              <>
                {(footer.done > 0 || footer.inProgress > 0) && ' · '}
                <span>{footer.pending} pending</span>
              </>
            )}
            {footer.failed > 0 && (
              <>
                {(footer.done > 0 || footer.inProgress > 0 || footer.pending > 0) && ' · '}
                <span className="text-[#ff3a3a]">{footer.failed} failed</span>
              </>
            )}
          </div>
        </div>
      </div>
    </m.div>
  )
})

const ArrowConnector = memo(function ArrowConnector({ label, color }) {
  return (
    <div className="flex flex-col items-center justify-center px-2 min-w-[60px]">
      <div className="text-[10px] text-gray-500 mb-1">{label}</div>
      <div className="flex items-center">
        <div className="w-6 h-[2px]" style={{ backgroundColor: `${color}60` }} />
        <div
          className="w-0 h-0"
          style={{
            borderTop: '5px solid transparent',
            borderBottom: '5px solid transparent',
            borderLeft: `8px solid ${color}60`,
          }}
        />
      </div>
    </div>
  )
})

function getDoneItems(files, features, tests) {
  const done = []
  files.filter(f => ['done', 'created'].includes((f.status || '').toLowerCase())).forEach(f => {
    done.push({ name: f.file_path || f.path || f.name, type: 'file', status: 'done' })
  })
  features.filter(f => (f.status || '').toLowerCase() === 'done').forEach(f => {
    done.push({ name: f.name || f.title, type: 'feature', status: 'done' })
  })
  tests.filter(t => (t.status || '').toLowerCase() === 'passed').forEach(t => {
    done.push({ name: t.name || t.test_name, type: 'test', status: 'done' })
  })
  return done
}

function FlowDiagram({ data }) {
  const [flowData, setFlowData] = useState({
    files: [],
    features: [],
    tests: [],
    issues: [],
  })
  const containerRef = useRef(null)
  const isVisibleRef = useRef(true)

  const fetchFlowData = useCallback(async () => {
    try {
      const [filesRes, featuresRes, testsRes, issuesRes] = await Promise.all([
        fetch(`${API_BASE}/files`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/features`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/tests`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/issues`).then(r => r.json()).catch(() => []),
      ])
      setFlowData({
        files: Array.isArray(filesRes) ? filesRes : [],
        features: Array.isArray(featuresRes) ? featuresRes : [],
        tests: Array.isArray(testsRes) ? testsRes : [],
        issues: Array.isArray(issuesRes) ? issuesRes : [],
      })
    } catch (error) {
      console.error('Failed to fetch flow data:', error)
    }
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting
    }, { threshold: 0.1 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    fetchFlowData()
    const interval = setInterval(() => {
      if (isVisibleRef.current) fetchFlowData()
    }, 5000)
    return () => clearInterval(interval)
  }, [fetchFlowData])

  const { files, features, tests } = flowData

  const doneItems = useMemo(() => getDoneItems(files, features, tests), [files, features, tests])

  const stages = useMemo(() => [
    { stage: 'files', items: files },
    { stage: 'features', items: features },
    { stage: 'tests', items: tests },
    { stage: 'done', items: doneItems },
  ], [files, features, tests, doneItems])

  return (
    <div className="w-full">
      <div className="flex items-center gap-0 overflow-x-auto pb-2">
        {stages.map((s, i) => (
          <div key={s.stage} className="flex items-center">
            <FlowCard
              stage={s.stage}
              items={s.items}
              getItemName={ITEM_NAME_HELPERS[s.stage]}
              getItemStatus={ITEM_STATUS_HELPERS[s.stage]}
              index={i}
            />
            {i < stages.length - 1 && (
              <ArrowConnector
                label={getArrowLabel(s.stage, stages[i + 1].stage)}
                color={getStageColor(s.stage)}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function getArrowLabel(from, to) {
  if (from === 'files' && to === 'features') return 'passes to'
  if (from === 'features' && to === 'tests') return 'requires'
  if (from === 'tests' && to === 'done') return 'completes'
  return ''
}

const ITEM_NAME_HELPERS = {
  files: (item) => item.file_path || item.path || item.name || 'Unknown file',
  features: (item) => item.name || item.title || 'Unknown feature',
  tests: (item) => item.name || item.test_name || 'Unknown test',
  done: (item) => item.name || item.file_path || item.path || 'Unknown',
}

const ITEM_STATUS_HELPERS = {
  files: (item) => item.status || 'pending',
  features: (item) => item.status || 'pending',
  tests: (item) => item.status || 'pending',
  done: () => 'done',
}

export default FlowDiagram
