export function buildTraceTree(spans) {
  if (!Array.isArray(spans) || spans.length === 0) {
    return { roots: [], orphanCount: 0 }
  }

  const nodesById = new Map()
  spans.forEach((span) => {
    if (!span || !span.span_id) return
    nodesById.set(span.span_id, { ...span, children: [] })
  })

  const roots = []
  let orphanCount = 0

  nodesById.forEach((node) => {
    const parentId = node.parent_span_id
    if (!parentId) {
      roots.push(node)
      return
    }

    const parent = nodesById.get(parentId)
    if (parent) {
      parent.children.push(node)
    } else {
      orphanCount += 1
      roots.push(node)
    }
  })

  const sortByStart = (a, b) => (a.start_time ?? 0) - (b.start_time ?? 0)
  const sortRecursive = (node) => {
    node.children.sort(sortByStart)
    node.children.forEach(sortRecursive)
  }

  roots.sort(sortByStart)
  roots.forEach(sortRecursive)

  return { roots, orphanCount }
}

export function flattenTree(roots) {
  const flat = []

  const walk = (node, depth) => {
    flat.push({ span: node, depth })
    node.children.forEach((child) => walk(child, depth + 1))
  }

  roots.forEach((node) => walk(node, 0))
  return flat
}