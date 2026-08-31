import { memo } from 'react'
import { formatDuration } from '../../utils/formatting.js'

const NODE_WIDTH = 180
const NODE_HEIGHT = 44
const PADDING = 24

function statusClass(status) {
  const normalized = (status || '').toLowerCase()
  if (normalized === 'ok') return 'flow-status-ok'
  if (normalized === 'error') return 'flow-status-error'
  if (normalized === 'in_progress' || normalized === 'in-progress') return 'flow-status-progress'
  return 'flow-status-unknown'
}

function TraceFlowChart({ layout, selectedSpanId, onSelect }) {
  const { nodes, edges, width, height } = layout

  if (!nodes || nodes.length === 0) {
    return <p className="empty-state-hint">No spans available to diagram for this trace.</p>
  }

  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const svgWidth = width + PADDING * 2
  const svgHeight = height + PADDING * 2

  const centerOf = (n) => ({
    left: { x: n.x + PADDING, y: n.y + PADDING + NODE_HEIGHT / 2 },
    right: { x: n.x + PADDING + NODE_WIDTH, y: n.y + PADDING + NODE_HEIGHT / 2 },
  })

  return (
    <div className="flowchart-wrapper">
      <svg
        className="flowchart-svg"
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label="Execution flow diagram"
      >
        <defs>
          <marker
            id="flow-arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" className="flow-arrowhead" />
          </marker>
        </defs>

        {edges.map((edge) => {
          const from = nodesById.get(edge.from)
          const to = nodesById.get(edge.to)
          if (!from || !to) return null

          const start = centerOf(from).right
          const end = centerOf(to).left
          const midX = (start.x + end.x) / 2

          const path = `M ${start.x} ${start.y} C ${midX} ${start.y}, ${midX} ${end.y}, ${end.x} ${end.y}`

          return (
            <path
              key={`${edge.from}-${edge.to}`}
              d={path}
              className="flow-edge"
              markerEnd="url(#flow-arrow)"
            />
          )
        })}

        {nodes.map((node) => {
          const isSelected = node.id === selectedSpanId
          const rectX = node.x + PADDING
          const rectY = node.y + PADDING
          const label = node.span.name || 'unnamed span'
          const duration = formatDuration(node.span.duration_ms)

          return (
            <g
              key={node.id}
              className={`flow-node ${statusClass(node.span.status)}${isSelected ? ' selected' : ''}`}
              transform={`translate(${rectX}, ${rectY})`}
              tabIndex={0}
              role="button"
              aria-label={`${label}, ${duration}, status ${node.span.status || 'unknown'}`}
              onClick={() => onSelect(node.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSelect(node.id)
                }
              }}
            >
              <rect
                className="flow-node-rect"
                width={NODE_WIDTH}
                height={NODE_HEIGHT}
                rx="5"
              />
              <text className="flow-node-label" x="10" y="18">
                {label.length > 22 ? `${label.slice(0, 21)}…` : label}
              </text>
              <text className="flow-node-duration" x="10" y="34">
                {duration}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export default memo(TraceFlowChart)