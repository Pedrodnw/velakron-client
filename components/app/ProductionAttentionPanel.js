import { AlertTriangle, CheckCheck, CircleAlert, Info } from 'lucide-react'
import { Button } from '../design-system'
import { attentionCategoryFor } from './attentionCategories'
import StatusBadge from './StatusBadge'
import { formatDateTime, formatLabel } from './formatters'

const tone = severity => severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info'

const ProductionAttentionPanel = ({ conditions = [], canAcknowledge, canResolve, pending, onAcknowledge, onResolve }) => {
  if (!conditions.length) return <div className='productionAttention productionAttention--clear'>
    <CheckCheck aria-hidden='true' />
    <div><strong>No active attention flags</strong><p>The current schedule and production information do not require follow-up.</p></div>
  </div>
  return <section className='productionAttention' aria-label='Active attention reasons'>
    <header><CircleAlert aria-hidden='true' /><div><strong>{conditions.length} active attention {conditions.length === 1 ? 'flag' : 'flags'}</strong><p>Each flag shows what requires action or awareness and how it affects schedule risk.</p></div></header>
    <div className='productionAttention__list'>
      {conditions.map(item => {
        const category = attentionCategoryFor(item.category)
        const Icon = category?.value === 'information_flag' ? Info : AlertTriangle
        const canResolveItem = typeof canResolve === 'function' ? canResolve(item) : canResolve
        return <article key={item.id} className={`productionAttentionReason productionAttentionReason--${item.severity}`}>
          <Icon aria-hidden='true' />
          <div>
            <div><strong>{category?.label || formatLabel(item.code)}</strong><StatusBadge tone={category?.tone || tone(item.severity)}>{category?.riskLabel || formatLabel(item.severity)}</StatusBadge></div>
            <p>{item.explanation}</p>
            <small>Detected {formatDateTime(item.detected_at)}{item.acknowledged_at ? ` · Acknowledged ${formatDateTime(item.acknowledged_at)}` : ''}</small>
          </div>
          <div className='productionAttentionReason__actions'>
            {canAcknowledge && !item.acknowledged_at && <Button variant='secondary' disabled={pending} onClick={() => onAcknowledge(item)}>Acknowledge</Button>}
            {canResolveItem && <Button variant='secondary' disabled={pending} onClick={() => onResolve(item)}>Resolve</Button>}
          </div>
        </article>
      })}
    </div>
  </section>
}

export default ProductionAttentionPanel
