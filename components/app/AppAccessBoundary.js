import { Building2, Clock3, LockKeyhole, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import { getAppContextError, getAppContextStatus } from '../../store/slices/appContext'
import AppSkeleton from './AppSkeleton'
import EmptyState from './EmptyState'
import ErrorState from './ErrorState'

const stateContent = {
  account_suspended: {
    icon: LockKeyhole,
    title: 'Your account is suspended',
    description: 'Company workspaces are unavailable for this account. Contact Velakron support if you believe this is a mistake.',
  },
  invitation_pending: {
    icon: Clock3,
    title: 'Your invitation is pending',
    description: 'A company administrator needs to activate your membership before company information becomes available.',
  },
  membership_suspended: {
    icon: LockKeyhole,
    title: 'Your company access is suspended',
    description: 'Your account is still available, but this company workspace is locked. Contact your company administrator or Velakron support.',
  },
  organization_suspended: {
    icon: ShieldAlert,
    title: 'This company workspace is suspended',
    description: 'Company data is temporarily unavailable. Contact Velakron support for help restoring access.',
  },
  no_membership: {
    icon: Building2,
    title: 'Your account is ready',
    description: 'You have not been added to a company workspace yet. Ask your company administrator or Velakron team to send an invitation.',
  },
}

const AppAccessBoundary = ({ children }) => {
  const router = useRouter()
  const status = useSelector(getAppContextStatus)
  const error = useSelector(getAppContextError)

  if (router.pathname === '/account') return children
  if (status === 'ready') return children

  if (status === 'loading') {
    return <section className='appPanel appAccessState'><AppSkeleton lines={5} /></section>
  }

  if (status === 'error') {
    return <section className='appPanel appAccessState'>
      <ErrorState
        title='We could not open this workspace'
        description={error?.message || 'Please refresh the page. If the problem continues, contact Velakron support.'}
      />
    </section>
  }

  const content = stateContent[status] || stateContent.no_membership
  return <section className='appPanel appAccessState'>
    <EmptyState icon={content.icon} title={content.title} description={content.description} />
  </section>
}

export default AppAccessBoundary
