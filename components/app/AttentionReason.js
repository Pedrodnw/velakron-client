import { AlertTriangle } from 'lucide-react'
import { formatLabel } from './formatters'

const AttentionReason = ({ codes = [] }) => {
  if (!codes.length) return null
  return <div className='attentionSummary'>
    <AlertTriangle aria-hidden='true' />
    <span>{codes.map(formatLabel).join(', ')}</span>
  </div>
}

export default AttentionReason
