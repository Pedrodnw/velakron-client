import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { getAuthInitialized, getAuthSessionEndReason, getAuthUser } from '../../store/slices/auth'
import { loginPathForReturn } from './utils'

const AuthGuard = ({ children }) => {
  const router = useRouter()
  const initialized = useSelector(getAuthInitialized)
  const sessionEndReason = useSelector(getAuthSessionEndReason)
  const user = useSelector(getAuthUser)

  useEffect(() => {
    if (initialized && !user) {
      router.replace(loginPathForReturn(router.asPath || '/account', {
        sessionExpired: sessionEndReason === 'expired',
      }))
    }
  }, [initialized, router, sessionEndReason, user])

  if (!initialized || !user) {
    return <section className='authLoading authLoading--workspace' aria-live='polite'>
      <LoaderCircle aria-hidden='true' />
      <p>Checking your secure session…</p>
    </section>
  }

  return children
}

export default AuthGuard
