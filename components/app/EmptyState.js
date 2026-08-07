import { FolderOpen } from 'lucide-react'

const EmptyState = ({
  icon: Icon = FolderOpen,
  title,
  description,
  action,
  compact = false,
}) => <div className={`emptyState${compact ? ' emptyState--compact' : ''}`}>
  <span className='emptyState__icon'><Icon aria-hidden='true' /></span>
  <h2>{title}</h2>
  <p>{description}</p>
  {action && <div className='emptyState__action'>{action}</div>}
</div>

export default EmptyState
