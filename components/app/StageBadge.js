import StatusBadge from './StatusBadge'
import { formatLabel } from './formatters'

const stageLabel = value => ({
  delivered: 'Received / inspection',
  quality_review: 'Quality review',
  approved: 'OEM approved',
}[value] || formatLabel(value || 'not_started'))

const stageTone = value => ({
  assigned: 'neutral',
  accepted: 'info',
  material_ordered: 'accent',
  material_received: 'accent',
  programming: 'info',
  setup: 'info',
  in_production: 'cyan',
  ready_to_ship: 'accent',
  shipped: 'cyan',
  delivered: 'warning',
  quality_review: 'warning',
  approved: 'success',
  completed: 'success',
  cancelled: 'danger',
}[value] || 'neutral')

const StageBadge = ({ value, label }) => <StatusBadge tone={stageTone(value)}>
  {label || stageLabel(value)}
</StatusBadge>

export default StageBadge
