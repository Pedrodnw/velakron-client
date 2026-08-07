import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormMessage from '../components/auth/FormMessage'
import { Button } from '../components/design-system'
import Seo from '../components/Seo'
import { consumeMagicLink } from '../store/slices/identity'

const MagicLogin = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!router.isReady) return
    const token = typeof router.query.token === 'string' ? router.query.token : ''
    if (!token) { setFailed(true); return }
    dispatch(consumeMagicLink(token)).then(result => {
      if (result?.ok) router.replace('/app')
      else setFailed(true)
    })
  }, [dispatch, router.isReady, router.query.token])

  return <>
    <Seo title='Secure Sign In' description='Complete a one-time Velakron sign in.' path='/magic-login' noIndex />
    <AuthPageShell eyebrow='One-time sign in' title='Secure Sign In.' description='Magic-link access is available only when Velakron explicitly enables it.' panelTitle='Checking your link'>
      {failed
        ? <div className='authResult'><FormMessage type='error'>Magic-link sign in is disabled, invalid, expired, or already used.</FormMessage><Button href='/login'>Use Password Login</Button></div>
        : <div className='authLoading'><LoaderCircle className='spin' aria-hidden='true' /> Signing you in…</div>}
    </AuthPageShell>
  </>
}

export default MagicLogin
