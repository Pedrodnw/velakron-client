import { AlertTriangle, CheckCheck, CircleAlert } from 'lucide-react'
import { Button } from '../design-system'
import StatusBadge from './StatusBadge'
import { formatDateTime, formatLabel } from './formatters'

const tone = severity => severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info'

const ProductionAttentionPanel = ({ conditions = [], canAcknowledge, canResolve, pending, onAcknowledge, onResolve }) => {
  if (!conditions.length) return <div className='productionAttention productionAttention--clear'>
    <CheckCheck aria-hidden='true' />
    <div><strong>No active attention flags</strong><p>The current schedule and production information do not require follow-up.</p></div>
  </div>
  return <section className='productionAttention' aria-label='Active attention reasons'>
    <header><CircleAlert aria-hidden='true' /><div><strong>{conditions.length} active attention {conditions.length === 1 ? 'reason' : 'reasons'}</strong><p>Each reason shows the factual trigger behind the schedule status.</p></div></header>
    <div className='productionAttention__list'>
      {conditions.map(item => <article key={item.id} className={`productionAttentionReason productionAttentionReason--${item.severity}`}>
        <AlertTriangle aria-hidden='true' />
        <div>
          <div><strong>{formatLabel(item.code)}</strong><StatusBadge tone={tone(item.severity)}>{formatLabel(item.severity)}</StatusBadge></div>
          <p>{item.explanation}</p>
          <small>Detected {formatDateTime(item.detected_at)}{item.acknowledged_at ? ` · Acknowledged ${formatDateTime(item.acknowledged_at)}` : ''}</small>
        </div>
        <div className='productionAttentionReason__actions'>
          {canAcknowledge && !item.acknowledged_at && <Button variant='secondary' disabled={pending} onClick={() => onAcknowledge(item)}>Acknowledge</Button>}
          {canResolve && <Button variant='secondary' disabled={pending} onClick={() => onResolve(item)}>Resolve</Button>}
        </div>
      </article>)}
    </div>
  </section>
}

export default ProductionAttentionPanel
