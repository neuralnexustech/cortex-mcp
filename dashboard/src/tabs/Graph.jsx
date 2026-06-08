import { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Network, ZoomIn, ZoomOut, Maximize, RotateCcw } from 'lucide-react'
import { useGraphData } from '../hooks/useProjectData'

const NODE_COLORS = {
  feature: '#06b6d4',
  file: '#3b82f6',
  test: '#22c55e',
  issue: '#f97316',
  decision: '#a855f7',
}

export default function Graph() {
  const svgRef = useRef(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const { data, isLoading } = useGraphData()
  const simRef = useRef(null)

  useEffect(() => {
    if (!data || !svgRef.current) return

    const importD3 = async () => {
      const d3 = await import('d3')
      const svg = d3.select(svgRef.current)
      const width = svgRef.current.clientWidth || 800
      const height = svgRef.current.clientHeight || 500

      svg.selectAll('*').remove()

      const g = svg.append('g')

      const zoom = d3.zoom()
        .scaleExtent([0.3, 3])
        .on('zoom', (event) => g.attr('transform', event.transform))
      svg.call(zoom)

      const nodes = data.nodes?.map((n) => ({ ...n })) || []
      const edges = data.edges?.map((e) => ({ ...e })) || []

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(edges).id((d) => d.id).distance(120))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius(30))

      simRef.current = simulation

      // Glow filter
      const defs = svg.append('defs')
      const filter = defs.append('filter').attr('id', 'glow')
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
      const feMerge = filter.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      const link = g.append('g')
        .selectAll('line')
        .data(edges)
        .join('line')
        .attr('stroke', '#374151')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.5)

      const node = g.append('g')
        .selectAll('g')
        .data(nodes)
        .join('g')
        .attr('cursor', 'pointer')
        .style('filter', 'url(#glow)')
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

      node.each(function(d) {
        const el = d3.select(this)
        const color = NODE_COLORS[d.type] || '#6b7280'

        if (d.type === 'file') {
          el.append('rect')
            .attr('width', 18)
            .attr('height', 18)
            .attr('x', -9)
            .attr('y', -9)
            .attr('fill', color)
            .attr('rx', 4)
            .attr('opacity', 0.9)
        } else if (d.type === 'test') {
          el.append('polygon')
            .attr('points', '0,-11 11,0 0,11 -11,0')
            .attr('fill', color)
            .attr('opacity', 0.9)
        } else if (d.type === 'issue') {
          el.append('polygon')
            .attr('points', '0,-11 9,-5.5 9,5.5 0,11 -9,5.5 -9,-5.5')
            .attr('fill', color)
            .attr('opacity', 0.9)
        } else if (d.type === 'decision') {
          el.append('polygon')
            .attr('points', '0,-11 9,5.5 -9,5.5')
            .attr('fill', color)
            .attr('opacity', 0.9)
        } else {
          el.append('circle')
            .attr('r', 9)
            .attr('fill', color)
            .attr('opacity', 0.9)
        }
      })

      node.append('text')
        .text((d) => d.label?.split('/').pop()?.substring(0, 20) || d.id)
        .attr('x', 14)
        .attr('y', 4)
        .attr('font-size', '10px')
        .attr('fill', '#d1d5db')
        .attr('font-family', 'JetBrains Mono, monospace')

      node.on('click', (event, d) => {
        setSelectedNode(d)
        node.selectAll('circle, rect, polygon').attr('stroke', null).attr('stroke-width', null)
        d3.select(event.currentTarget).selectAll('circle, rect, polygon')
          .attr('stroke', '#fff')
          .attr('stroke-width', 2)
      })

      simulation.on('tick', () => {
        link
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y)
        node.attr('transform', (d) => `translate(${d.x},${d.y})`)
      })
    }

    importD3()
  }, [data])

  const handleZoomIn = () => {
    const svg = d3.select(svgRef.current)
    svg.call(d3.zoom().scaleExtent([0.3, 3]).on('zoom', (e) => {
      svg.select('g').attr('transform', e.transform)
    }).scaleBy, 1.3)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-cortex-cyan border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const nodes = data?.nodes || []
  const edges = data?.edges || []
  const typeCounts = nodes.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {})

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-cortex-text flex items-center gap-2">
          <Network className="w-5 h-5 text-cortex-cyan" />
          Knowledge Graph
        </h2>
        <div className="flex items-center gap-2">
          {Object.entries(typeCounts).map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-[10px]">
              <span className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: NODE_COLORS[type] }} />
              {type}: {count}
            </Badge>
          ))}
        </div>
      </div>

      <Card className="bg-cortex-card border-cortex-border">
        <CardContent className="p-0 relative">
          <svg
            ref={svgRef}
            className="w-full"
            style={{ height: 'calc(100vh - 280px)', minHeight: 400 }}
          />
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-cortex-bg/90 backdrop-blur-sm border border-cortex-border rounded-lg p-3">
            <p className="text-[10px] text-cortex-muted font-medium mb-2 uppercase tracking-wider">Legend</p>
            <div className="space-y-1.5">
              {Object.entries(NODE_COLORS).map(([type, color]) => (
                <div key={type} className="flex items-center gap-2 text-[10px] text-cortex-text">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                  <span className="capitalize">{type}</span>
                  <span className="text-cortex-muted">({typeCounts[type] || 0})</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selected Node Detail */}
      {selectedNode && (
        <Card className="bg-cortex-card border-cortex-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: NODE_COLORS[selectedNode.type] }}
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-cortex-text">{selectedNode.label}</span>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px] capitalize">{selectedNode.type}</Badge>
                  <Badge className={`text-[10px] ${
                    selectedNode.status === 'done' ? 'bg-green-500/20 text-green-400' :
                    selectedNode.status === 'open' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedNode.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
