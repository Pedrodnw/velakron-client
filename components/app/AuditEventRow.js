import { ShieldCheck } from 'lucide-react'
import { formatDateTime, formatLabel } from './formatters'
import StatusBadge from './StatusBadge'

const categoryFor = eventType => {
  const value = String(eventType || '')
  if (value.includes('viewed') || value.includes('.read') || value.includes('_read')) return { label: 'Routine read', tone: 'neutral' }
  if (/(suspend|revoke|security|login|password|email|status)/.test(value)) return { label: 'Access or security', tone: 'warning' }
  if (/(support|retry|review)/.test(value)) return { label: 'Support action', tone: 'info' }
  return { label: 'Record change', tone: 'info' }
}

const AuditEventRow = ({ event }) => {
  const category = categoryFor(event.event_type)
  return <article className={`auditEventRow auditEventRow--${category.tone}`}>
    <ShieldCheck aria-hidden='true' />
    <div>
      <div className='auditEventRow__title'><strong>{formatLabel(String(event.event_type || 'activity').replaceAll('.', '_'))}</strong><StatusBadge tone={category.tone}>{category.label}</StatusBadge></div>
    <span>{event.actor_user ? [event.actor_user.first_name, event.actor_user.last_name].filter(Boolean).join(' ') || event.actor_user.email : 'System'} · {formatDateTime(event.occurred_at)}</span>
    {event.reason && <p>{event.reason}</p>}
    </div>
  </article>
}

export default AuditEventRow
