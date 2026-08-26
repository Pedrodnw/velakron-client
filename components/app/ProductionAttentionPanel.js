import { AlertTriangle, CheckCheck, CircleAlert, Info } from 'lucide-react'
import { Button } from '../design-system'
import { attentionCategoryFor } from './attentionCategories'
import StatusBadge from './StatusBadge'
import { formatDateTime, formatLabel } from './formatters'

const tone = severity => severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : 'info'
const actionTone = key => key.includes('reject') || key.includes('escalate') ? 'danger' : 'secondary'

const WorkflowHistory = ({ history = [] }) => {
  if (!history.length) return null
  return <details className='attentionWorkflowHistory'>
    <summary>Workflow history · {history.length}</summary>
    <ol>
      {[...history].reverse().map((event, index) => <li key={event.id || `${event.action}-${event.occurred_at}-${index}`}>
        <strong>{formatLabel(event.action)}</strong>
        <span>{event.actor?.display_name || event.actor?.organization_name || 'Company user'} · {formatDateTime(event.occurred_at)}</span>
        {event.note && <p>{event.note}</p>}
      </li>)}
    </ol>
  </details>
}

const ProductionAttentionPanel = ({ conditions = [], canAcknowledge, canResolve, pending, onAcknowledge, onResolve, onWorkflowAction }) => {
  if (!conditions.length) return <div className='productionAttention productionAttention--clear'>
    <CheckCheck aria-hidden='true' />
    <div><strong>No active attention flags</strong><p>The current schedule and production information do not require follow-up.</p></div>
  </div>
  return <section className='productionAttention' aria-label='Active attention reasons'>
    <header><CircleAlert aria-hidden='true' /><div><strong>{conditions.length} active attention {conditions.length === 1 ? 'flag' : 'flags'}</strong><p>Each flag follows the response and approval workflow assigned to its category.</p></div></header>
    <div className='productionAttention__list'>
      {conditions.map(item => {
        const category = attentionCategoryFor(item.category)
        const Icon = category?.value === 'information_flag' ? Info : AlertTriangle
        const managed = item.workflow?.managed === true
        const canResolveItem = typeof canResolve === 'function' ? canResolve(item) : canResolve
        const actions = managed
          ? (item.workflow.available_actions || []).filter(action => action.key === 'acknowledge' ? canAcknowledge : canResolveItem)
          : []
        const workflowResponsibility = actions.length
          ? 'Your company is responsible for the next response.'
          : item.workflow?.actor_role === 'creator' && !(item.workflow?.history || []).length
            ? 'Your company created this flag. The other company has the next step.'
            : item.workflow?.actor_role === 'observer'
              ? 'Visible for awareness.'
              : 'Waiting for the other company to complete the next step.'
        return <article key={item.id} className={`productionAttentionReason productionAttentionReason--${item.severity} ${item.workflow?.production_blocked ? 'productionAttentionReason--blocked' : ''}`}>
          <Icon aria-hidden='true' />
          <div className='productionAttentionReason__content'>
            <div className='productionAttentionReason__title'><strong>{category?.label || formatLabel(item.code)}</strong><StatusBadge tone={category?.tone || tone(item.severity)}>{category?.riskLabel || formatLabel(item.severity)}</StatusBadge></div>
            <p>{item.explanation}</p>
            {managed && <div className='attentionWorkflowState'>
              <span>Current step</span>
              <strong>{item.workflow.state_label}</strong>
              <small>{workflowResponsibility}</small>
            </div>}
            <small>Created {formatDateTime(item.detected_at)}{item.acknowledged_at ? ` · Acknowledged ${formatDateTime(item.acknowledged_at)}` : ''}</small>
            {managed && <WorkflowHistory history={item.workflow.history} />}
          </div>
          <div className='productionAttentionReason__actions'>
            {managed
              ? actions.map(action => <Button key={action.key} className={actionTone(action.key) === 'danger' ? 'vk-button--danger' : ''} variant='secondary' disabled={pending} onClick={() => onWorkflowAction(item, action)}>{action.label}</Button>)
              : <>
                {canAcknowledge && !item.acknowledged_at && <Button variant='secondary' disabled={pending} onClick={() => onAcknowledge(item)}>Acknowledge</Button>}
                {canResolveItem && <Button variant='secondary' disabled={pending} onClick={() => onResolve(item)}>Resolve</Button>}
              </>}
          </div>
        </article>
      })}
    </div>
  </section>
}

export default ProductionAttentionPanel
