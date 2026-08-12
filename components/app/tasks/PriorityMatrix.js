import { Grid3X3, Inbox } from 'lucide-react'
import EmptyState from '../EmptyState'
import FounderTaskCard from './FounderTaskCard'
import { IMPORTANCE_ROWS, tasksForCell, URGENCY_COLUMNS } from './taskMatrix'

const PriorityMatrix = ({ tasks, onEdit, onMove, canUpdate, mutating }) => {
  if (!tasks.length) return <section className='appPanel'><EmptyState icon={Inbox} title='No active tasks match these filters' description='Create a task or adjust the filters to populate the priority matrix.' /></section>
  return <section className='priorityMatrix' aria-label='Founder priority matrix'>
    <header className='priorityMatrix__intro'>
      <span><Grid3X3 aria-hidden='true' /></span>
      <div><strong>Impact × urgency</strong><p>Rows show strategic importance. Columns are calculated from each task’s due date.</p></div>
    </header>
    <div className='priorityMatrix__grid'>
      <div className='priorityMatrix__corner' aria-hidden='true'>Importance ↓<br />Urgency →</div>
      {URGENCY_COLUMNS.map(column => <div className={`priorityMatrix__column priorityMatrix__column--${column.key}`} key={column.key}><strong>{column.label}</strong><span>{column.description}</span></div>)}
      {IMPORTANCE_ROWS.flatMap(row => [
        <div className={`priorityMatrix__row priorityMatrix__row--${row.key}`} key={`${row.key}-label`}><strong>{row.label}</strong><span>{row.description}</span></div>,
        ...URGENCY_COLUMNS.map(column => {
          const cellTasks = tasksForCell(tasks, row.key, column.key)
          return <div className={`priorityMatrix__cell priorityMatrix__cell--${row.key}-${column.key}`} key={`${row.key}-${column.key}`}>
            <span className='priorityMatrix__cellCount'>{cellTasks.length}</span>
            {cellTasks.map(task => <FounderTaskCard key={task.id} task={task} onEdit={onEdit} onMove={onMove} canUpdate={canUpdate} mutating={mutating} compact />)}
          </div>
        }),
      ])}
    </div>
  </section>
}

export default PriorityMatrix
