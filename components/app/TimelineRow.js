import { Clock3 } from 'lucide-react'

const TimelineRow = ({ title, description, time, icon: Icon = Clock3 }) => <article className='timelineRow'>
  <span className='timelineRow__icon'><Icon aria-hidden='true' /></span>
  <div>
    <strong>{title}</strong>
    {description && <p>{description}</p>}
  </div>
  {time && <time>{time}</time>}
</article>

export default TimelineRow
