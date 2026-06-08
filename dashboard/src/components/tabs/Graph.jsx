import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { m } from 'framer-motion'
import { Network, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const API_BASE = window.location.origin

const NODE_COLORS = {
  feature: '#00f5d4',
  file: '#f5c400',
  test: '#39ff14',
  issue: '#ff3a3a',
  decision: '#a855f7',
}

const NODE_SHAPES = {
  feature: 'circle',
  file: 'rect',
  test: 'diamond',
  issue: 'hexagon',
  decision: 'triangle',
}

function Graph() {
  const svgRef = useRef(null)
  const simulationRef = useRef(null)
  const [graphData, setGraphData] = useState({ nodes: [], edges: [] })
  const [selectedNode, setSelectedNode] = useState(null)
  const [hoveredNode, setHoveredNode] = useState(null)
  const [dimensions, setDimensions] = useState({ width: 900, height: 500 })
  const containerRef = useRef(null)

  const fetchGraph = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/graph`)
      const data = await res.json()
      setGraphData(data)
    } catch (e) {
      console.error('Failed to fetch graph:', e)
    }
  }, [])

  useEffect(() => {
    fetchGraph()
  }, [fetchGraph])

  useEffect(() => {
    if (!containerRef.current) return
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setDimensions({ width: Math.max(width, 400), height: Math.max(height, 300) })
    })
    obs.observe(containerRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!svgRef.current || graphData.nodes.length === 0) return
    let cancelled = false

    async function init() {
      const d3 = await import('d3')
      if (cancelled || !svgRef.current) return

      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const { width, height } = dimensions
      const g = svg.append('g')

      const zoom = d3.zoom()
        .scaleExtent([0.3, 4])
        .on('zoom', (event) => g.attr('transform', event.transform))
      svg.call(zoom)

      svg.call(zoom.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(0.8))

      const nodes = graphData.nodes.map(n => ({
        ...n,
        x: (Math.random() - 0.5) * 400,
        y: (Math.random() - 0.5) * 300,
      }))

      const links = graphData.edges.map(e => ({
        source: e.source,
        target: e.target,
        relationship: e.relationship,
      }))

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(0, 0))
        .force('collision', d3.forceCollide().radius(30))
      simulationRef.current = simulation

      const link = g.append('g')
        .selectAll('line')
        .data(links)
        .join('line')
        .attr('stroke', '#2a2a3e')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.6)

      const nodeGroup = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .call(d3.drag()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            d.fx = d.x
            d.fy = d.y
          })
          .on('drag', (event, d) => {
            d.fx = event.x
            d.fy = event.y
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0)
            d.fx = null
            d.fy = null
          }))

      nodeGroup.each(function(d) {
        const el = d3.select(this)
        const color = NODE_COLORS[d.type] || '#444466'
        const shape = NODE_SHAPES[d.type] || 'circle'

        if (shape === 'rect') {
          el.append('rect')
            .attr('width', 20)
            .attr('height', 20)
            .attr('x', -10)
            .attr('y', -10)
            .attr('rx', 4)
            .attr('fill', color)
            .attr('fill-opacity', 0.15)
            .attr('stroke', color)
            .attr('stroke-width', 2)
        } else if (shape === 'diamond') {
          el.append('polygon')
            .attr('points', '0,-12 12,0 0,12 -12,0')
            .attr('fill', color)
            .attr('fill-opacity', 0.15)
            .attr('stroke', color)
            .attr('stroke-width', 2)
        } else if (shape === 'hexagon') {
          el.append('polygon')
            .attr('points', '0,-12 10,-6 10,6 0,12 -10,6 -10,-6')
            .attr('fill', color)
            .attr('fill-opacity', 0.15)
            .attr('stroke', color)
            .attr('stroke-width', 2)
        } else if (shape === 'triangle') {
          el.append('polygon')
            .attr('points', '0,-13 12,8 -12,8')
            .attr('fill', color)
            .attr('fill-opacity', 0.15)
            .attr('stroke', color)
            .attr('stroke-width', 2)
        } else {
          el.append('circle')
            .attr('r', 12)
            .attr('fill', color)
            .attr('fill-opacity', 0.15)
            .attr('stroke', color)
            .attr('stroke-width', 2)
        }

        el.append('circle')
          .attr('r', 3)
          .attr('fill', color)
          .attr('fill-opacity', 0.8)

        el.append('text')
          .text(d.label.length > 20 ? d.label.slice(0, 18) + '…' : d.label)
          .attr('dy', d.type === 'file' ? 24 : 26)
          .attr('text-anchor', 'middle')
          .attr('fill', '#888')
          .attr('font-size', '10px')
          .attr('font-family', 'monospace')
      })

      nodeGroup
        .on('mouseover', function(event, d) {
          d3.select(this).select('circle, rect, polygon')
            .transition().duration(200)
            .attr('fill-opacity', 0.3)
            .attr('stroke-width', 3)
          setHoveredNode(d)
        })
        .on('mouseout', function(event, d) {
          d3.select(this).select('circle, rect, polygon')
            .transition().duration(200)
            .attr('fill-opacity', 0.15)
            .attr('stroke-width', 2)
          setHoveredNode(null)
        })
        .on('click', function(event, d) {
          setSelectedNode(prev => prev?.id === d.id ? null : d)
        })

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y)
        nodeGroup.attr('transform', d => `translate(${d.x},${d.y})`)
      })

      window._graphSimulation = simulation
      window._graphZoom = zoom
      window._graphSvg = svg
    }

    init()
    return () => { cancelled = true }
  }, [graphData, dimensions])

  const handleZoomIn = useCallback(() => {
    if (!window._graphSvg || !window._graphZoom) return
    window._graphSvg.transition().duration(300).call(window._graphZoom.scaleBy, 1.3)
  }, [])

  const handleZoomOut = useCallback(() => {
    if (!window._graphSvg || !window._graphZoom) return
    window._graphSvg.transition().duration(300).call(window._graphZoom.scaleBy, 0.7)
  }, [])

  const handleReset = useCallback(() => {
    if (!window._graphSvg || !window._graphZoom) return
    const { width, height } = dimensions
    window._graphSvg.transition().duration(500).call(
      window._graphZoom.transform,
      window._graphZoom.identity.translate(width / 2, height / 2).scale(0.8)
    )
  }, [dimensions])

  const stats = useMemo(() => {
    const counts = { feature: 0, file: 0, test: 0, issue: 0, decision: 0 }
    graphData.nodes.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1 })
    return counts
  }, [graphData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-heading font-bold text-white flex items-center gap-2">
          <Network size={24} />
          Knowledge Graph
        </h2>
        <div className="flex items-center gap-2">
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <Badge key={type} variant="secondary" className="text-[10px]">
              <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: color }}></span>
              {type} ({stats[type] || 0})
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative" ref={containerRef}>
          <Card className="glass-panel border-cortex-border overflow-hidden">
            <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
              <button onClick={handleZoomIn} className="p-2 bg-cortex-panel/80 rounded-lg hover:bg-cortex-border transition-colors" title="Zoom in">
                <ZoomIn size={16} className="text-gray-400" />
              </button>
              <button onClick={handleZoomOut} className="p-2 bg-cortex-panel/80 rounded-lg hover:bg-cortex-border transition-colors" title="Zoom out">
                <ZoomOut size={16} className="text-gray-400" />
              </button>
              <button onClick={handleReset} className="p-2 bg-cortex-panel/80 rounded-lg hover:bg-cortex-border transition-colors" title="Reset view">
                <RotateCcw size={16} className="text-gray-400" />
              </button>
            </div>
            <svg
              ref={svgRef}
              width={dimensions.width}
              height={dimensions.height}
              className="bg-cortex-bg cursor-grab active:cursor-grabbing"
            />
          </Card>
        </div>

        <div className="w-72">
          <Card className="glass-panel border-cortex-border sticky top-0">
            <CardHeader>
              <CardTitle className="text-white text-sm">Node Details</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNode ? (
                <div className="space-y-3">
                  <div>
                    <Badge variant="info">{selectedNode.type}</Badge>
                    <h3 className="text-white font-medium mt-2">{selectedNode.label}</h3>
                  </div>
                  <div>
                    <Badge variant={selectedNode.status === 'done' || selectedNode.status === 'passed' || selectedNode.status === 'resolved' ? 'success' : selectedNode.status === 'open' || selectedNode.status === 'failed' ? 'destructive' : 'warning'}>
                      {selectedNode.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500">
                    ID: {selectedNode.id}
                  </div>
                </div>
              ) : hoveredNode ? (
                <div className="space-y-2">
                  <Badge variant="secondary">{hoveredNode.type}</Badge>
                  <p className="text-white text-sm">{hoveredNode.label}</p>
                  <p className="text-xs text-gray-500">Click to select</p>
                </div>
              ) : (
                <div className="text-center text-gray-500 text-sm py-4">
                  Click a node to view details
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Graph
