import { ArrowUpRight, MessageSquareText } from 'lucide-react'
import LinkWrap from '../LinkWrap'
import styles from './ProductionPendingActions.module.scss'

const ProductionPendingActions = ({ record }) => {
  const actions = record.pending_actions || []
  if (!actions.length || record.confidentiality_locked) return null
  return <ul className={styles.actions} aria-label='Your next actions'>
    {actions.map(action => <li key={action.id}>
      <MessageSquareText aria-hidden='true' />
      <LinkWrap href={action.href}>
        <span><strong>{action.label}{action.title ? ': ' : ''}</strong>{action.title}</span>
        <ArrowUpRight aria-hidden='true' />
      </LinkWrap>
    </li>)}
  </ul>
}

export default ProductionPendingActions
