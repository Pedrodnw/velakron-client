const viewers = new Map()
let sequence = 0

const activeViewerId = () => {
  let active = null
  for (const viewer of viewers.values()) {
    if (!active || viewer.priority > active.priority || (viewer.priority === active.priority && viewer.sequence > active.sequence)) active = viewer
  }
  return active?.id || ''
}

const notify = () => {
  const activeId = activeViewerId()
  for (const viewer of viewers.values()) viewer.onChange(viewer.id === activeId)
}

export const registerModelViewer = ({ id, compact, onChange }) => {
  viewers.set(id, { id, priority: compact ? 1 : 2, sequence: ++sequence, onChange })
  notify()
  return () => {
    viewers.delete(id)
    notify()
  }
}

export const requestModelViewer = id => {
  const viewer = viewers.get(id)
  if (!viewer) return
  viewer.sequence = ++sequence
  notify()
}
