import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import { resultError, safeReturnPath } from '../components/auth/utils'
import { Button } from '../components/design-system'
import LinkWrap from '../components/LinkWrap'
import Seo from '../components/Seo'
import {
  getAuthInitialized,
  getAuthUser,
  loginAccount,
} from '../store/slices/auth'

const Login = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const initialized = useSelector(getAuthInitialized)
  const user = useSelector(getAuthUser)
  const [form, setForm] = useState({ email: '', password: '', remember_me: false })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialized && user) router.replace(safeReturnPath(router.query.next))
  }, [initialized, router, user])

  const update = event => setForm(current => ({
    ...current,
    [event.target.name]: event.target.type === 'checkbox' ? event.target.checked : event.target.value,
  }))

  const submit = async event => {
    event.preventDefault()
    setPending(true)
    setError('')

    const result = await dispatch(loginAccount(form))
    setPending(false)

    if (!result?.ok) {
      setError(resultError(result, 'We could not sign you in. Please try again.'))
      return
    }

    await router.replace(safeReturnPath(router.query.next))
  }

  return <>
    <Seo
      title='Log In'
      description='Securely access your Velakron account.'
      path='/login'
      noIndex
    />
    <AuthPageShell
      eyebrow='Account access'
      title='Welcome Back.'
      description='Access the account that keeps your future Velakron projects, requests, and collaboration connected.'
      panelTitle='Log in to Velakron'
    >
      <form className='authForm' onSubmit={submit}>
        <FormMessage>{error}</FormMessage>
        <FormField
          id='login-email'
          label='Email address'
          name='email'
          type='email'
          value={form.email}
          onChange={update}
          autoComplete='email'
          placeholder='you@company.com'
          required
        />
        <div className='authForm__options'>
          <label className='checkField'>
            <input name='remember_me' type='checkbox' checked={form.remember_me} onChange={update} />
            <span>Remember me for up to 30 days</span>
          </label>
          <LinkWrap href='/forgot-password'>Forgot password?</LinkWrap>
        </div>
        <FormField
          id='login-password'
          label='Password'
          name='password'
          type='password'
          value={form.password}
          onChange={update}
          autoComplete='current-password'
          placeholder='Enter your password'
          required
        />
        <Button className='authForm__submit' type='submit' disabled={pending}>
          {pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Signing in…</> : <>Log In <ArrowRight aria-hidden='true' /></>}
        </Button>
        <p className='authForm__alternate'>
          Have an invitation? Open the secure link in your invitation email.
          {process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_VELAKRON_ENABLE_DEV_REGISTRATION === 'true' && <> <LinkWrap href='/register'>Create a development account</LinkWrap></>}
        </p>
      </form>
    </AuthPageShell>
  </>
}

export default Login
