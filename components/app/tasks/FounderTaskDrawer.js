import { Archive, LoaderCircle, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import FormField from '../../auth/FormField'
import FormMessage from '../../auth/FormMessage'
import { Button } from '../../design-system'
import ResponsiveDrawer from '../ResponsiveDrawer'
import { dateInputValue } from './taskMatrix'

const defaultDueDate = () => {
  const date = new Date()
  date.setDate(date.getDate() + 7)
  return dateInputValue(date)
}

const emptyForm = () => ({
  title: '', description: '', project_name: '', status: 'open', importance: 'medium',
  due_date: defaultDueDate(), assignee_ids: [],
})

const taskForm = task => task ? {
  title: task.title || '',
  description: task.description || '',
  project_name: task.project_name || '',
  status: task.status || 'open',
  importance: task.importance || 'medium',
  due_date: dateInputValue(task.due_at),
  assignee_ids: (task.assignees || []).map(item => item.id),
} : emptyForm()

const FounderTaskDrawer = ({ open, task, assignees, pending, feedback, onClose, onSubmit, onArchive, canArchive }) => {
  const [form, setForm] = useState(emptyForm)
  useEffect(() => { if (open) setForm(taskForm(task)) }, [open, task])
  const change = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const toggleAssignee = id => setForm(current => ({
    ...current,
    assignee_ids: current.assignee_ids.includes(id)
      ? current.assignee_ids.filter(item => item !== id)
      : [...current.assignee_ids, id],
  }))

  return <ResponsiveDrawer open={open} title={task ? 'Edit task' : 'Create task'} onClose={onClose} wide>
    <form className='drawerForm founderTaskForm' onSubmit={event => { event.preventDefault(); onSubmit(form) }}>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      <FormField id='founder-task-title' label='Task title' name='title' value={form.title} onChange={change} minLength={2} maxLength={180} required autoFocus />
      <label className='textAreaField' htmlFor='founder-task-description'><span>Description</span><textarea id='founder-task-description' name='description' value={form.description} onChange={change} maxLength={5000} /><small>Add the outcome, context, or next decision needed.</small></label>
      <FormField id='founder-task-project' label='Project or workstream' name='project_name' value={form.project_name} onChange={change} maxLength={120} placeholder='For example: Company launch' />
      <div className='founderTaskForm__row'>
        <label className='selectField' htmlFor='founder-task-status'><span>Status</span><select id='founder-task-status' name='status' value={form.status} onChange={change}><option value='open'>Open</option><option value='in_progress'>In progress</option><option value='blocked'>Blocked</option><option value='completed'>Completed</option><option value='cancelled'>Cancelled</option></select></label>
        <label className='selectField' htmlFor='founder-task-importance'><span>Importance</span><select id='founder-task-importance' name='importance' value={form.importance} onChange={change}><option value='high'>High impact</option><option value='medium'>Important</option><option value='low'>Supporting</option></select></label>
      </div>
      <FormField id='founder-task-due-date' label='Due date' name='due_date' type='date' value={form.due_date} onChange={change} required hint='Urgency in the matrix is calculated from this date.' />
      <fieldset className='founderTaskForm__assignees'>
        <legend>Assignees</legend>
        <p>Tasks are shared across the founder workspace. Assignment shows who owns the next action.</p>
        <div>{assignees.map(assignee => <label key={assignee.id}>
          <input type='checkbox' checked={form.assignee_ids.includes(assignee.id)} onChange={() => toggleAssignee(assignee.id)} />
          <span><strong>{assignee.user?.full_name}</strong><small>{assignee.role === 'founder' ? 'Founder' : 'Velakron administrator'}</small></span>
        </label>)}</div>
      </fieldset>
      <div className='founderTaskForm__actions'>
        {task && canArchive && <Button variant='secondary' className='founderTaskForm__archive' onClick={() => onArchive(task)} disabled={pending}><Archive aria-hidden='true' /> Archive</Button>}
        <Button type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Saving…</> : <><Save aria-hidden='true' /> Save task</>}</Button>
      </div>
    </form>
  </ResponsiveDrawer>
}

export default FounderTaskDrawer
