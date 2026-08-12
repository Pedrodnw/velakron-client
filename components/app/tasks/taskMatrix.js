const DAY = 24 * 60 * 60 * 1000

export const IMPORTANCE_ROWS = Object.freeze([
  { key: 'high', label: 'High impact', description: 'Company outcomes depend on this work.' },
  { key: 'medium', label: 'Important', description: 'Meaningful work that advances current plans.' },
  { key: 'low', label: 'Supporting', description: 'Useful work with lower strategic impact.' },
])

export const URGENCY_COLUMNS = Object.freeze([
  { key: 'high', label: 'Do now', description: 'Overdue or due within 2 days.' },
  { key: 'medium', label: 'Plan next', description: 'Due within 14 days.' },
  { key: 'low', label: 'Later', description: 'Due after 14 days.' },
])

export const urgencyForDate = (value, now = Date.now()) => {
  const due = new Date(value).getTime()
  if (Number.isNaN(due)) return 'low'
  const distance = due - now
  if (distance <= 2 * DAY) return 'high'
  if (distance <= 14 * DAY) return 'medium'
  return 'low'
}

export const tasksForCell = (tasks, importance, urgency, now = Date.now()) => (
  tasks.filter(task => (
    task.importance === importance
    && (task.urgency || urgencyForDate(task.due_at, now)) === urgency
  ))
)

export const dueDateForUrgency = (urgency, now = new Date()) => {
  const offsets = { high: 1, medium: 7, low: 30 }
  const value = new Date(now)
  value.setDate(value.getDate() + offsets[urgency])
  value.setHours(17, 0, 0, 0)
  return value.toISOString()
}

export const dateInputValue = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const dateInputToIso = value => {
  if (!value) return null
  const date = new Date(`${value}T17:00:00`)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}
