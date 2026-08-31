export function computeFlowLayout(roots) {
  const COL_WIDTH = 220
  const ROW_HEIGHT = 64

  const nodesById = new Map()
  const edges = []
  let leafCounter = 0

  const walk = (node, depth, parentId) => {
    let y

    if (!node.children || node.children.length === 0) {
      y = leafCounter * ROW_HEIGHT
      leafCounter += 1
    } else {
      node.children.forEach((child) => walk(child, depth + 1, node.span_id))
      const childYs = node.children.map((c) => nodesById.get(c.span_id).y)
      y = childYs.reduce((sum, v) => sum + v, 0) / childYs.length
    }

    nodesById.set(node.span_id, {
      id: node.span_id,
      span: node,
      depth,
      x: depth * COL_WIDTH,
      y,
    })

    if (parentId) {
      edges.push({ from: parentId, to: node.span_id })
    }
  }

  roots.forEach((root) => walk(root, 0, null))

  const nodes = Array.from(nodesById.values())
  const maxDepth = nodes.reduce((m, n) => Math.max(m, n.depth), 0)
  const maxY = nodes.reduce((m, n) => Math.max(m, n.y), 0)

  return {
    nodes,
    edges,
    colWidth: COL_WIDTH,
    rowHeight: ROW_HEIGHT,
    width: (maxDepth + 1) * COL_WIDTH,
    height: maxY + ROW_HEIGHT,
  }
}