import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

const API = window.location.origin

async function fetchJSON(path) {
  const res = await fetch(`${API}${path}`)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export function useProjectData() {
  const queryClient = useQueryClient()

  useEffect(() => {
    function onWsMessage(e) {
      const msg = e.detail
      if (msg?.type === 'db_changed') {
        queryClient.invalidateQueries({ queryKey: ['project'] })
      }
    }
    window.addEventListener('cortex-ws', onWsMessage)
    return () => window.removeEventListener('cortex-ws', onWsMessage)
  }, [queryClient])

  return useQuery({
    queryKey: ['project'],
    queryFn: () => fetchJSON('/state'),
    select: (data) => ({
      project: data.project || {},
      features: data.features || [],
      files: data.files || [],
      tests: data.tests || [],
      todos: data.todos || [],
      issues: data.issues || [],
      progress: data.progress || [],
      snapshots: data.snapshots || [],
      dictionary: data.dictionary || [],
      snippets: data.snippets || [],
      research: data.research || [],
      decisions: data.decisions || [],
      relationships: data.relationships || [],
      agents: data.agents || [],
    }),
  })
}

export function useGraphData() {
  return useQuery({
    queryKey: ['graph'],
    queryFn: () => fetchJSON('/api/graph'),
  })
}

export function useSearch(query) {
  return useQuery({
    queryKey: ['search', query],
    queryFn: () => fetchJSON(`/api/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  })
}

export function useAudit(limit = 50) {
  return useQuery({
    queryKey: ['audit', limit],
    queryFn: () => fetchJSON(`/audit?limit=${limit}`),
  })
}

export function useEpisodic(limit = 30) {
  return useQuery({
    queryKey: ['episodic', limit],
    queryFn: () => fetchJSON(`/episodic?limit=${limit}`),
  })
}
