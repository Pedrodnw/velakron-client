import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarClock,
  Check,
  CircleDot,
  FolderKanban,
  MessageSquare,
  Paperclip,
  Pencil,
} from 'lucide-react'
import UserAvatar from '../../UserAvatar'
import { formatDate, formatLabel, statusTone } from '../formatters'
import StatusBadge from '../StatusBadge'

const Assignees = ({ assignees = [] }) => {
  if (!assignees.length) return <span className='founderTaskCard__unassigned'>Unassigned</span>
  return <div className='founderTaskCard__assignees' aria-label={`Assigned to ${assignees.map(item => item.user?.full_name).join(', ')}`}>
    {assignees.slice(0, 3).map(assignee => <UserAvatar key={assignee.id} user={assignee.user} size={26} />)}
    <span>{assignees[0].user?.full_name}{assignees.length > 1 ? ` +${assignees.length - 1}` : ''}</span>
  </div>
}

const MoveControls = ({ task, onMove, disabled }) => <div className='founderTaskCard__move' aria-label={`Move ${task.title} in the priority matrix`}>
  <button type='button' onClick={() => onMove(task, 'importance', 'high')} disabled={disabled || task.importance === 'high'} aria-label='Increase importance'><ArrowUp aria-hidden='true' /></button>
  <button type='button' onClick={() => onMove(task, 'urgency', 'high')} disabled={disabled || task.urgency === 'high'} aria-label='Move to an earlier due window'><ArrowLeft aria-hidden='true' /></button>
  <button type='button' onClick={() => onMove(task, 'urgency', 'low')} disabled={disabled || task.urgency === 'low'} aria-label='Move to a later due window'><ArrowRight aria-hidden='true' /></button>
  <button type='button' onClick={() => onMove(task, 'importance', 'low')} disabled={disabled || task.importance === 'low'} aria-label='Decrease importance'><ArrowDown aria-hidden='true' /></button>
</div>

const FounderTaskCard = ({ task, onOpen, onEdit, onMove, onComplete, canUpdate = false, mutating = false, compact = false }) => <article className={`founderTaskCard${task.overdue ? ' founderTaskCard--overdue' : ''}${compact ? ' founderTaskCard--compact' : ''}`}>
  <header>
    <div>
      {task.project_name && <span><FolderKanban aria-hidden='true' /> {task.project_name}</span>}
      <h3>{onOpen ? <button type='button' onClick={() => onOpen(task)}>{task.title}</button> : task.title}</h3>
    </div>
    <div className='founderTaskCard__actions'>
      {onComplete && canUpdate && <button className='founderTaskCard__complete' type='button' onClick={() => onComplete(task)} disabled={mutating} aria-label={`Complete ${task.title}`} title='Mark complete'><Check aria-hidden='true' /></button>}
      {canUpdate && <button className='founderTaskCard__edit' type='button' onClick={() => onEdit(task)} aria-label={`Edit ${task.title}`}><Pencil aria-hidden='true' /></button>}
    </div>
  </header>
  {task.description && !compact && <p>{task.description}</p>}
  <div className='founderTaskCard__meta'>
    <StatusBadge tone={statusTone(task.status)}><CircleDot aria-hidden='true' /> {formatLabel(task.status)}</StatusBadge>
    <span className={task.overdue ? 'is-overdue' : ''}><CalendarClock aria-hidden='true' /> {task.overdue ? 'Overdue · ' : ''}{formatDate(task.due_at)}</span>
    {(task.message_count > 0 || task.attachment_count > 0) && <span className='founderTaskCard__collaboration'>{task.message_count > 0 && <><MessageSquare aria-hidden='true' /> {task.message_count}</>}{task.attachment_count > 0 && <><Paperclip aria-hidden='true' /> {task.attachment_count}</>}</span>}
  </div>
  <footer>
    <Assignees assignees={task.assignees} />
    {onMove && canUpdate && <MoveControls task={task} onMove={onMove} disabled={mutating} />}
  </footer>
</article>

export default FounderTaskCard
