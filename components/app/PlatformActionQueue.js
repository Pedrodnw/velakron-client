import { AlertTriangle, Building2, Clock3, Factory, ShieldAlert } from 'lucide-react'
import { Button } from '../design-system'
import { formatDateTime, formatLabel } from './formatters'

const iconForKind = kind => {
  if (kind === 'supplier_profile_review' || kind.startsWith('supplier_')) return Factory
  if (kind === 'organization_review' || kind === 'organization_activation') return Building2
  if (kind === 'file_security') return ShieldAlert
  return AlertTriangle
}

const waitLabel = item => {
  if (!item.waiting_since) return 'System attention'
  if (item.age_hours < 1) return 'Added moments ago'
  if (item.age_hours < 24) return `Waiting ${item.age_hours} hour${item.age_hours === 1 ? '' : 's'}`
  const days = Math.floor(item.age_hours / 24)
  return `Waiting ${days} day${days === 1 ? '' : 's'}`
}

const PlatformActionQueue = ({
  title,
  description,
  items = [],
  emptyTitle,
  emptyDescription,
  external = false,
  compact = false,
}) => {
  const total = items.reduce((sum, item) => sum + (item.action_count || 1), 0)
  return <section className={`appPanel platformActionQueue${compact ? ' platformActionQueue--compact' : ''}`}>
  <header className='appPanel__header'>
    <div>
      <p className='technicalLabel'>{external ? 'Company-owned next steps' : 'Velakron-owned next steps'}</p>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
    <span className={`platformActionQueue__total${total ? ' has-items' : ''}`}>{total}</span>
  </header>
  {items.length ? <div className='platformActionQueue__list'>
    {items.map(item => {
      const Icon = iconForKind(item.kind)
      return <article key={item.id} className={`platformActionItem platformActionItem--${item.priority || 'normal'}`}>
        <span className='platformActionItem__icon'><Icon aria-hidden='true' /></span>
        <div className='platformActionItem__body'>
          <div className='platformActionItem__heading'>
            <div><span>{formatLabel(item.kind)}</span><h3>{item.title}</h3></div>
            <strong>{external ? 'Waiting on company' : item.priority === 'high' ? 'Overdue' : 'Needs review'}</strong>
          </div>
          <p>{item.description}</p>
          <div className='platformActionItem__meta'>
            <span><Clock3 aria-hidden='true' /> {waitLabel(item)}</span>
            {item.waiting_since && <span>Since {formatDateTime(item.waiting_since)}</span>}
          </div>
        </div>
        <Button href={item.href} variant={external ? 'secondary' : 'primary'}>{external ? 'View status' : item.kind.includes('supplier') ? 'Review supplier' : item.kind.includes('organization') ? 'Review organization' : 'Open operations'}</Button>
      </article>
    })}
  </div> : <div className='platformActionQueue__empty'>
    <span><Clock3 aria-hidden='true' /></span>
    <div><h3>{emptyTitle}</h3><p>{emptyDescription}</p></div>
  </div>}
</section>
}

export default PlatformActionQueue
