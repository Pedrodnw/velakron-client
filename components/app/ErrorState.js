import { CircleAlert } from 'lucide-react'
import { Button } from '../design-system'

const ErrorState = ({ title = 'Something went wrong', description, onRetry, action }) => <div className='errorState' role='alert'>
  <CircleAlert aria-hidden='true' />
  <div>
    <strong>{title}</strong>
    {description && <p>{description}</p>}
  </div>
  {action || (onRetry && <Button variant='secondary' onClick={onRetry}>Try again</Button>)}
</div>

export default ErrorState
