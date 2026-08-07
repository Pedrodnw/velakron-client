import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import { resultError } from '../components/auth/utils'
import { Button } from '../components/design-system'
import LinkWrap from '../components/LinkWrap'
import Seo from '../components/Seo'
import { previewPasswordReset, resetPassword } from '../store/slices/identity'

const ResetPassword = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [state, setState] = useState('checking')
  const [form, setForm] = useState({ password: '', confirm_password: '' })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    if (!token) { setState('invalid'); return }
    dispatch(previewPasswordReset(token)).then(result => setState(result?.ok ? 'ready' : 'invalid'))
  }, [dispatch, router.isReady, token])

  const submit = async event => {
    event.preventDefault()
    setError('')
    if (form.password !== form.confirm_password) { setError('The passwords do not match.'); return }
    setState('submitting')
    const result = await dispatch(resetPassword(token, form))
    if (result?.ok) setState('complete')
    else { setState('ready'); setError(resultError(result, 'We could not reset your password.')) }
  }

  return <>
    <Seo title='Choose a New Password' description='Complete a secure Velakron password reset.' path='/reset-password' noIndex />
    <AuthPageShell eyebrow='Account recovery' title='Choose A New Password.' description='This one-time link expires after one hour and signs out your other sessions.' panelTitle='Secure password reset'>
      {state === 'checking' && <div className='authLoading'><LoaderCircle className='spin' aria-hidden='true' /> Checking your secure link…</div>}
      {state === 'invalid' && <div className='authResult'><FormMessage type='error'>This link is invalid, expired, or has already been used.</FormMessage><Button href='/forgot-password' showArrow>Request Another Link</Button></div>}
      {state === 'complete' && <div className='authResult'><FormMessage type='success'>Your password has been changed. All previous sessions have been signed out.</FormMessage><Button href='/login' showArrow>Log In</Button></div>}
      {['ready', 'submitting'].includes(state) && <form className='authForm' onSubmit={submit}>
        <FormMessage>{error}</FormMessage>
        <FormField id='reset-password' label='New password' name='password' type='password' value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} autoComplete='new-password' minLength={12} maxLength={128} hint='Use 12–128 characters and avoid common passwords.' required />
        <FormField id='reset-confirm-password' label='Confirm new password' name='confirm_password' type='password' value={form.confirm_password} onChange={event => setForm(current => ({ ...current, confirm_password: event.target.value }))} autoComplete='new-password' required />
        <Button className='authForm__submit' type='submit' disabled={state === 'submitting'}>{state === 'submitting' ? <><LoaderCircle className='spin' aria-hidden='true' /> Updating…</> : <>Update Password <ArrowRight aria-hidden='true' /></>}</Button>
        <p className='authForm__alternate'><LinkWrap href='/login'>Back to login</LinkWrap></p>
      </form>}
    </AuthPageShell>
  </>
}

export default ResetPassword
