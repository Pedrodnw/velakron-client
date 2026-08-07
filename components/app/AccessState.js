import { LockKeyhole, SearchX } from 'lucide-react'
import EmptyState from './EmptyState'

export const PermissionDenied = ({ description = 'Your current company role does not include access to this area.' }) => (
  <section className='appPanel'>
    <EmptyState icon={LockKeyhole} title='You do not have access' description={description} />
  </section>
)

export const ResourceNotFound = ({ description = 'The item is unavailable or does not belong to your current company workspace.' }) => (
  <section className='appPanel'>
    <EmptyState icon={SearchX} title='Resource not found' description={description} />
  </section>
)
