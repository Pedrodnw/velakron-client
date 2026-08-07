import StatusBadge from './StatusBadge'

const health = {
  on_track: { label: 'On track', tone: 'success' },
  on_schedule: { label: 'On schedule', tone: 'success' },
  attention: { label: 'Needs attention', tone: 'warning' },
  needs_attention: { label: 'Needs attention', tone: 'warning' },
  at_risk: { label: 'At risk', tone: 'danger' },
  delayed: { label: 'Delayed', tone: 'danger' },
  unassessed: { label: 'Not evaluated', tone: 'neutral' },
  unknown: { label: 'Not evaluated', tone: 'neutral' },
}

const ScheduleHealthBadge = ({ value = 'unknown' }) => {
  const presentation = health[value] || health.unknown
  return <StatusBadge tone={presentation.tone}>{presentation.label}</StatusBadge>
}

export default ScheduleHealthBadge
