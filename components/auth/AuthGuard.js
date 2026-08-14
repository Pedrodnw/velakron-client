import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { getAuthInitialized, getAuthUser } from '../../store/slices/auth'

const AuthGuard = ({ children }) => {
  const router = useRouter()
  const initialized = useSelector(getAuthInitialized)
  const user = useSelector(getAuthUser)

  useEffect(() => {
    if (initialized && !user) {
      const next = encodeURIComponent(router.asPath || '/account')
      router.replace(`/login?next=${next}`)
    }
  }, [initialized, router, user])

  if (!initialized || !user) {
    return <section className='authLoading authLoading--workspace' aria-live='polite'>
      <LoaderCircle aria-hidden='true' />
      <p>Checking your secure session…</p>
    </section>
  }

  return children
}

export default AuthGuard
