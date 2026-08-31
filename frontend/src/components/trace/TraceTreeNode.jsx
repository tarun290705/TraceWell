import { memo, useState } from 'react'
import TraceStatus from '../traces/TraceStatus.jsx'
import { formatDuration } from '../../utils/formatting.js'

function TraceTreeNode({ node, depth, selectedSpanId, onSelect }) {
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children && node.children.length > 0
  const isSelected = node.span_id === selectedSpanId

  return (
    <li className="trace-tree-node">
      <div
        className={`trace-tree-row${isSelected ? ' selected' : ''}`}
        style={{ paddingLeft: `${depth * 18 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="tree-toggle"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? 'Collapse span' : 'Expand span'}
            aria-expanded={expanded}
          >
            {expanded ? '▾' : '▸'}
          </button>
        ) : (
          <span className="tree-toggle tree-toggle-placeholder" aria-hidden="true" />
        )}

        <button type="button" className="tree-node-button" onClick={() => onSelect(node.span_id)}>
          <span className="tree-node-name">{node.name || 'unnamed span'}</span>
          <span className="tree-node-duration">{formatDuration(node.duration_ms)}</span>
          <TraceStatus status={node.status} />
        </button>
      </div>

      {hasChildren && expanded && (
        <ul className="trace-tree-children">
          {node.children.map((child) => (
            <TraceTreeNode
              key={child.span_id}
              node={child}
              depth={depth + 1}
              selectedSpanId={selectedSpanId}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

export default memo(TraceTreeNode)