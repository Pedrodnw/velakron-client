import { CircleDotDashed, LockKeyhole } from 'lucide-react'
import Seo from '../Seo'
import AppPageHeader from './AppPageHeader'
import EmptyState from './EmptyState'
import StatusBadge from './StatusBadge'

const PortalPlaceholderPage = ({ title, eyebrow, description, path, nextPhase }) => <>
  <Seo title={title} description={description} path={path} noIndex />
  <AppPageHeader
    eyebrow={eyebrow}
    title={title}
    description={description}
    actions={<StatusBadge tone='info'><CircleDotDashed aria-hidden='true' /> Foundation ready</StatusBadge>}
  />
  <section className='appPanel'>
    <EmptyState
      icon={LockKeyhole}
      title='The secure foundation is ready'
      description={`Organization-scoped records and workflows arrive in ${nextPhase}. This route is intentionally data-free until its server permission checks and audit contract are implemented.`}
    />
  </section>
</>

export default PortalPlaceholderPage
