import StatusBadge from './StatusBadge'
import { formatLabel, statusTone } from './formatters'

const StageBadge = ({ value }) => <StatusBadge tone={statusTone(value || 'not_started')}>
  {formatLabel(value || 'not_started')}
</StatusBadge>

export default StageBadge
