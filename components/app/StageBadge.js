import StatusBadge from './StatusBadge'
import { formatLabel } from './formatters'

const stageLabel = value => ({
  delivered: 'Received / inspection',
  quality_review: 'Quality review',
  approved: 'OEM approved',
}[value] || formatLabel(value || 'not_started'))

const StageBadge = ({ value }) => <StatusBadge tone='neutral'>
  {stageLabel(value)}
</StatusBadge>

export default StageBadge
