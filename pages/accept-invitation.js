import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import PlatformTermsAcceptance from '../components/auth/PlatformTermsAcceptance'
import { resultError } from '../components/auth/utils'
import { Button } from '../components/design-system'
import Seo from '../components/Seo'
import { acceptInvitation, previewInvitation } from '../store/slices/identity'

const AcceptInvitation = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [state, setState] = useState('checking')
  const [invitation, setInvitation] = useState(null)
  const [existing, setExisting] = useState(false)
  const [platformTerms, setPlatformTerms] = useState(null)
  const [platformTermsRequired, setPlatformTermsRequired] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ first_name: '', last_name: '', password: '', confirm_password: '', platform_terms_accepted: false, platform_terms_version: '' })

  useEffect(() => {
    if (!router.isReady) return
    if (!token) { setState('invalid'); return }
    dispatch(previewInvitation(token)).then(result => {
      if (!result?.ok) { setState('invalid'); return }
      const data = result.payload?.data
      setInvitation(data.invitation)
      setExisting(data.existing_account)
      setPlatformTerms(data.platform_terms)
      setPlatformTermsRequired(Boolean(data.platform_terms_required))
      setForm(current => ({
        ...current,
        first_name: data.invitation.first_name || '',
        last_name: data.invitation.last_name || '',
        platform_terms_version: data.platform_terms?.version || '',
      }))
      setState('ready')
    })
  }, [dispatch, router.isReady, token])

  const update = event => setForm(current => ({ ...current, [event.target.name]: event.target.value }))
  const submit = async event => {
    event.preventDefault()
    setError('')
    if (!existing && form.password !== form.confirm_password) { setError('The passwords do not match.'); return }
    setState('submitting')
    const result = await dispatch(acceptInvitation(token, form))
    if (!result?.ok) { setError(resultError(result, 'We could not accept this invitation.')); setState('ready'); return }
    if (result.payload?.data?.verification_required) setState('verification')
    else await router.replace('/app')
  }

  return <>
    <Seo title='Accept Invitation' description='Accept a secure Velakron company invitation.' path='/accept-invitation' noIndex />
    <AuthPageShell eyebrow='Company invitation' title='Join With Confidence.' description='Your invitation controls the company and role you can access. You cannot choose or change either here.' panelTitle='Accept invitation'>
      {state === 'checking' && <div className='authLoading'><LoaderCircle className='spin' aria-hidden='true' /> Checking your invitation…</div>}
      {state === 'invalid' && <div className='authResult'><FormMessage type='error'>This invitation is invalid, expired, revoked, or already used.</FormMessage><Button href='/login'>Go to Login</Button></div>}
      {state === 'verification' && <div className='authResult'><FormMessage type='success'>Invitation accepted. Check your email and verify the address before signing in.</FormMessage><Button href='/login' showArrow>Go to Login</Button></div>}
      {['ready', 'submitting'].includes(state) && invitation && <form className='authForm' onSubmit={submit}>
        <div className='invitationSummary'><span>Organization</span><strong>{invitation.organization.name}</strong><span>Access</span><strong>{invitation.role_label}</strong><span>Invited email</span><strong>{invitation.email}</strong></div>
        <FormMessage>{error}</FormMessage>
        {!existing && <div className='authForm__row'>
          <FormField id='invite-first-name' label='First name' name='first_name' value={form.first_name} onChange={update} autoComplete='given-name' required />
          <FormField id='invite-last-name' label='Last name' name='last_name' value={form.last_name} onChange={update} autoComplete='family-name' />
        </div>}
        <FormField id='invite-password' label={existing ? 'Current password' : 'Create password'} name='password' type='password' value={form.password} onChange={update} autoComplete={existing ? 'current-password' : 'new-password'} minLength={existing ? undefined : 12} maxLength={128} hint={existing ? 'Confirm that this invitation belongs to your account.' : 'Use 12–128 characters.'} required />
        {!existing && <FormField id='invite-confirm-password' label='Confirm password' name='confirm_password' type='password' value={form.confirm_password} onChange={update} autoComplete='new-password' required />}
        {platformTermsRequired && <PlatformTermsAcceptance
          terms={platformTerms}
          checked={form.platform_terms_accepted}
          onChange={checked => setForm(current => ({ ...current, platform_terms_accepted: checked }))}
        />}
        <Button className='authForm__submit' type='submit' disabled={state === 'submitting'}>{state === 'submitting' ? <><LoaderCircle className='spin' aria-hidden='true' /> Accepting…</> : <>Accept Invitation <ArrowRight aria-hidden='true' /></>}</Button>
      </form>}
    </AuthPageShell>
  </>
}

export default AcceptInvitation
