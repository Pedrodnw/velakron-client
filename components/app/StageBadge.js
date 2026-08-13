import StatusBadge from './StatusBadge'
import { formatLabel } from './formatters'

const StageBadge = ({ value }) => <StatusBadge tone='neutral'>
  {formatLabel(value || 'not_started')}
</StatusBadge>

export default StageBadge
