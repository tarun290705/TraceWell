import TraceTreeNode from './TraceTreeNode.jsx'

export default function TraceTree({ roots, selectedSpanId, onSelect, orphanCount }) {
  if (!roots || roots.length === 0) {
    return <p className="empty-state-hint">No spans available for this trace.</p>
  }

  return (
    <div className="trace-tree">
      {orphanCount > 0 && (
        <p className="tree-notice">
          {orphanCount} span{orphanCount === 1 ? '' : 's'} referenced a parent that was not found and{' '}
          {orphanCount === 1 ? 'is' : 'are'} shown at the top level.
        </p>
      )}
      <ul className="trace-tree-root">
        {roots.map((root) => (
          <TraceTreeNode
            key={root.span_id}
            node={root}
            depth={0}
            selectedSpanId={selectedSpanId}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  )
}