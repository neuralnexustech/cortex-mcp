import { useState } from 'react'
import useAppStore from '../stores/useAppStore'
import { useProjectData, useProjects } from '../hooks/useProjectData'
import { FolderKanban, Check, ArrowRight, Database, FileCode, FlaskConical, Activity, RefreshCw } from 'lucide-react'

function ProjectCard({ project, onSwitch, switching }) {
  const isActive = project.is_active
  return (
    <div
      className={`rounded-2xl border transition-all ${
        isActive
          ? 'border-cortex-cyan/30 bg-white shadow-cortex-md ring-1 ring-cortex-cyan/10'
          : 'border-gray-100 bg-white hover:shadow-cortex-md hover:border-gray-200'
      }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-cortex-text truncate">{project.name}</h3>
              {isActive && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-green-50 text-green-600">
                  <Check className="w-3 h-3" /> Active
                </span>
              )}
            </div>
            {project.goal && (
              <p className="text-sm text-cortex-muted mt-1 line-clamp-2">{project.goal}</p>
            )}
            {project.stack && (
              <p className="text-xs text-cortex-muted/70 mt-1.5 font-mono">{project.stack}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-50">
          <div className="flex items-center gap-1.5 text-xs text-cortex-muted">
            <Database className="w-3.5 h-3.5" />
            <span>{project.features} features</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cortex-muted">
            <FileCode className="w-3.5 h-3.5" />
            <span>{project.files} files</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-cortex-muted">
            <FlaskConical className="w-3.5 h-3.5" />
            <span>{project.tests} tests</span>
          </div>
          <div className="ml-auto">
            {!isActive && (
              <button
                onClick={() => onSwitch(project.path)}
                disabled={switching}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-purple-50 text-cortex-cyan hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                {switching ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" /> Switching...
                  </>
                ) : (
                  <>
                    Switch <ArrowRight className="w-3 h-3" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
        <p className="text-xs text-cortex-muted/50 mt-3 font-mono truncate">{project.path}</p>
      </div>
    </div>
  )
}

export default function Projects() {
  const [switching, setSwitching] = useState(null)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const { data } = useProjectData()
  const { data: projectsData, isLoading, refetch } = useProjects()

  const projects = projectsData?.projects || data?.projects_available || []

  async function handleSwitch(projectPath) {
    setSwitching(projectPath)
    try {
      const res = await fetch('/api/projects/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: projectPath })
      })
      const result = await res.json()
      if (result.success) {
        window.location.reload()
      }
    } catch (err) {
      console.error('Switch failed:', err)
    }
    setSwitching(null)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-cortex-text flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-cortex-cyan" />
            Projects
          </h2>
          <p className="text-sm text-cortex-muted mt-1">Switch between cortex-initialized projects</p>
        </div>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-cortex-muted hover:text-cortex-text hover:bg-gray-100 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-cortex-muted">Scanning for projects...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-white border border-gray-100 p-8 text-center">
          <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <h3 className="font-medium text-cortex-text">No projects found</h3>
          <p className="text-sm text-cortex-muted mt-1">
            Initialize a project first with <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">cortex_init</code>
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((p) => (
            <ProjectCard
              key={p.path}
              project={p}
              onSwitch={handleSwitch}
              switching={switching === p.path}
            />
          ))}
        </div>
      )}
    </div>
  )
}
