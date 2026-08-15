import {
  AtSign,
  CalendarDays,
  Clock3,
  Laptop,
  KeyRound,
  LoaderCircle,
  LogOut,
  Save,
  ShieldCheck,
  Smartphone,
  UserRound,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import { resultError } from '../components/auth/utils'
import { Button } from '../components/design-system'
import Seo from '../components/Seo'
import PortalPageLayout from '../components/app/PortalPageLayout'
import {
  getAuthUser,
  logoutAccount,
  updateEmail,
  updatePassword,
  updateProfile,
} from '../store/slices/auth'
import { getActiveMembership, getAvailableMemberships } from '../store/slices/appContext'
import {
  loadSecurityEvents,
  loadSessions,
  revokeOtherSessions,
  revokeSession,
} from '../store/slices/identity'
import { formatDate, formatLabel, formatRole } from '../components/app/formatters'
import UserAvatar from '../components/UserAvatar'

const roleLabels = {
  velakron_admin: 'Velakron administrator',
  founder: 'Founder',
  oem_admin: 'OEM administrator',
  oem_user: 'OEM member',
  supplier_admin: 'Supplier administrator',
  supplier_user: 'Supplier member',
}

const AccountCard = ({ icon: Icon, eyebrow, title, children }) => <section className='accountCard'>
  <div className='accountCard__heading'>
    <span><Icon aria-hidden='true' /></span>
    <div>
      <p className='technicalLabel'>{eyebrow}</p>
      <h2>{title}</h2>
    </div>
  </div>
  {children}
</section>

const SubmitLabel = ({ pending, loading, children }) => pending
  ? <><LoaderCircle className='spin' aria-hidden='true' /> {loading}</>
  : <><Save aria-hidden='true' /> {children}</>

const AccountContent = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const user = useSelector(getAuthUser)
  const membership = useSelector(getActiveMembership)
  const memberships = useSelector(getAvailableMemberships)
  const [profile, setProfile] = useState({ first_name: '', last_name: '' })
  const [email, setEmail] = useState({ email: '', password: '' })
  const [password, setPassword] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  })
  const [feedback, setFeedback] = useState({})
  const [pending, setPending] = useState('')
  const [sessions, setSessions] = useState([])
  const [securityEvents, setSecurityEvents] = useState([])

  const loadSecurity = async () => {
    const [sessionResult, eventResult] = await Promise.all([
      dispatch(loadSessions()),
      dispatch(loadSecurityEvents()),
    ])
    if (sessionResult?.ok) setSessions(sessionResult.payload?.data?.sessions || [])
    if (eventResult?.ok) setSecurityEvents(eventResult.payload?.data?.security_events || [])
  }

  useEffect(() => {
    if (!user) return
    setProfile({ first_name: user.first_name || '', last_name: user.last_name || '' })
    setEmail(current => ({ ...current, email: user.email || '' }))
  }, [user])

  useEffect(() => { loadSecurity() }, [dispatch])

  const change = setter => event => setter(current => ({
    ...current,
    [event.target.name]: event.target.value,
  }))

  const runUpdate = async (key, action, success) => {
    setPending(key)
    setFeedback(current => ({ ...current, [key]: null }))
    const result = await dispatch(action)
    setPending('')
    setFeedback(current => ({
      ...current,
      [key]: result?.ok
        ? { type: 'success', message: success }
        : { type: 'error', message: resultError(result, 'We could not save this change.') },
    }))
    return result
  }

  const submitProfile = event => {
    event.preventDefault()
    runUpdate('profile', updateProfile(profile), 'Your profile has been updated.')
  }

  const submitEmail = async event => {
    event.preventDefault()
    const result = await runUpdate('email', updateEmail(email), 'Check the new address to confirm this change. Your current login remains active until then.')
    if (result?.ok) setEmail(current => ({ ...current, password: '' }))
  }

  const submitPassword = async event => {
    event.preventDefault()
    if (password.new_password !== password.confirm_password) {
      setFeedback(current => ({
        ...current,
        password: { type: 'error', message: 'The new passwords do not match.' },
      }))
      return
    }
    const result = await runUpdate(
      'password',
      updatePassword({
        current_password: password.current_password,
        new_password: password.new_password,
      }),
      'Your password has been changed.',
    )
    if (result?.ok) setPassword({ current_password: '', new_password: '', confirm_password: '' })
  }

  const logout = async () => {
    setPending('logout')
    const result = await dispatch(logoutAccount())
    setPending('')
    if (result?.ok) await router.replace('/')
  }

  const endSession = async key => {
    setPending(`session-${key}`)
    const result = await dispatch(revokeSession(key))
    setPending('')
    if (result?.ok) await loadSecurity()
  }

  const endOtherSessions = async () => {
    setPending('all-sessions')
    const result = await dispatch(revokeOtherSessions())
    setPending('')
    setFeedback(current => ({
      ...current,
      sessions: result?.ok
        ? { type: 'success', message: 'Every other session has been signed out.' }
        : { type: 'error', message: resultError(result, 'We could not end the other sessions.') },
    }))
    if (result?.ok) await loadSecurity()
  }

  const joined = user?.createdAt
    ? new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(new Date(user.createdAt))
    : 'Recently'

  return <div className='accountPage'>
    <section className='accountHero gridBackground'>
      <div className='max'>
        <div>
          <p className='technicalLabel'>Account control center</p>
          <h1>{user.full_name || user.first_name}</h1>
          <p>Manage your identity and secure access to the Velakron ecosystem.</p>
        </div>
        <div className='accountIdentity'>
          <UserAvatar user={user} className='accountIdentity__initials' size={46} />
          <div>
            <strong>{user.full_name}</strong>
            <span>{user.email}</span>
          </div>
          <span className='accountIdentity__role'>{roleLabels[membership?.assigned_role || membership?.role] || 'Account holder'}</span>
        </div>
      </div>
    </section>

    <section className='accountPage__content max'>
      <aside className='accountOverview'>
        <div className='accountOverview__item'>
          <ShieldCheck aria-hidden='true' />
          <div><span>Account status</span><strong>Active & secure</strong></div>
        </div>
        <div className='accountOverview__item'>
          <CalendarDays aria-hidden='true' />
          <div><span>Member since</span><strong>{joined}</strong></div>
        </div>
        <Button variant='secondary' onClick={logout} disabled={pending === 'logout'}>
          {pending === 'logout' ? <LoaderCircle className='spin' aria-hidden='true' /> : <LogOut aria-hidden='true' />}
          Log Out
        </Button>
      </aside>

      <div className='accountPage__forms'>
        <AccountCard icon={UserRound} eyebrow='Identity' title='Personal details'>
          <form className='accountForm' onSubmit={submitProfile}>
            <FormMessage type={feedback.profile?.type}>{feedback.profile?.message}</FormMessage>
            <div className='authForm__row'>
              <FormField id='account-first-name' label='First name' name='first_name' value={profile.first_name} onChange={change(setProfile)} autoComplete='given-name' required />
              <FormField id='account-last-name' label='Last name' name='last_name' value={profile.last_name} onChange={change(setProfile)} autoComplete='family-name' />
            </div>
            <Button type='submit' disabled={Boolean(pending)}>
              <SubmitLabel pending={pending === 'profile'} loading='Saving…'>Save Details</SubmitLabel>
            </Button>
          </form>
        </AccountCard>

        <AccountCard icon={AtSign} eyebrow='Sign-in identity' title='Email address'>
          <p className='accountCard__intro'>Changing your email also changes the address you use to log in.</p>
          <form className='accountForm' onSubmit={submitEmail}>
            <FormMessage type={feedback.email?.type}>{feedback.email?.message}</FormMessage>
            {user.pending_email && <div className='pendingIdentity'><Clock3 aria-hidden='true' /><span>Waiting for confirmation from <strong>{user.pending_email}</strong></span></div>}
            <FormField id='account-email' label='Email address' name='email' type='email' value={email.email} onChange={change(setEmail)} autoComplete='email' required />
            <FormField id='account-email-password' label='Current password' name='password' type='password' value={email.password} onChange={change(setEmail)} autoComplete='current-password' hint='Required to confirm this sensitive change.' required />
            <Button type='submit' disabled={Boolean(pending)}>
              <SubmitLabel pending={pending === 'email'} loading='Updating…'>Update Email</SubmitLabel>
            </Button>
          </form>
        </AccountCard>

        <AccountCard icon={KeyRound} eyebrow='Security' title='Change password'>
          <p className='accountCard__intro'>Choose a unique password you do not use for another account.</p>
          <form className='accountForm' onSubmit={submitPassword}>
            <FormMessage type={feedback.password?.type}>{feedback.password?.message}</FormMessage>
            <FormField id='account-current-password' label='Current password' name='current_password' type='password' value={password.current_password} onChange={change(setPassword)} autoComplete='current-password' required />
            <FormField id='account-new-password' label='New password' name='new_password' type='password' value={password.new_password} onChange={change(setPassword)} autoComplete='new-password' hint='Use at least 12 characters.' minLength={12} maxLength={128} required />
            <FormField id='account-confirm-password' label='Confirm new password' name='confirm_password' type='password' value={password.confirm_password} onChange={change(setPassword)} autoComplete='new-password' required />
            <Button type='submit' disabled={Boolean(pending)}>
              <SubmitLabel pending={pending === 'password'} loading='Updating…'>Change Password</SubmitLabel>
            </Button>
          </form>
        </AccountCard>

        <AccountCard icon={Laptop} eyebrow='Security' title='Active sessions'>
          <p className='accountCard__intro'>Review where your account is signed in. Device names are approximate and raw session identifiers are never shown.</p>
          <FormMessage type={feedback.sessions?.type}>{feedback.sessions?.message}</FormMessage>
          <div className='sessionList'>{sessions.map(session => <div className='sessionRow' key={session.key}>
            <span className='sessionRow__icon'>{session.device_label.includes('mobile') ? <Smartphone aria-hidden='true' /> : <Laptop aria-hidden='true' />}</span>
            <div><strong>{session.device_label}</strong><span>{session.current ? 'This device' : `Last active ${formatDate(session.last_active_at)}`}{session.remember_me ? ' · Remembered' : ''}</span></div>
            {session.current ? <span className='currentSession'>Current</span> : <Button variant='secondary' onClick={() => endSession(session.key)} disabled={pending === `session-${session.key}`}>{pending === `session-${session.key}` ? <LoaderCircle className='spin' aria-hidden='true' /> : 'Sign Out'}</Button>}
          </div>)}</div>
          <Button variant='secondary' onClick={endOtherSessions} disabled={pending === 'all-sessions'}>{pending === 'all-sessions' ? <LoaderCircle className='spin' aria-hidden='true' /> : <LogOut aria-hidden='true' />} Sign Out Other Devices</Button>
        </AccountCard>

        <AccountCard icon={ShieldCheck} eyebrow='Company access' title='Organization memberships'>
          <p className='accountCard__intro'>Your account can belong to more than one company. Each membership has its own role and access status.</p>
          <div className='membershipList'>{memberships.map(item => <div key={item.id} className='membershipRow'><div><strong>{item.organization.name}</strong><span>{formatRole(item.role)}</span></div><span className={`membershipState membershipState--${item.status}`}>{formatLabel(item.status)}</span></div>)}</div>
        </AccountCard>

        <AccountCard icon={ShieldCheck} eyebrow='Audit history' title='Recent security activity'>
          <div className='securityEventList'>{securityEvents.length ? securityEvents.map(event => <div key={event.id || event._id} className='securityEvent'><span><ShieldCheck aria-hidden='true' /></span><div><strong>{formatLabel(event.event_type.replaceAll('.', ' '))}</strong><time>{formatDate(event.occurred_at || event.created_at)}</time></div></div>) : <p className='accountCard__intro'>Security events will appear here as you update your account.</p>}</div>
        </AccountCard>
      </div>
    </section>
  </div>
}

const Account = () => <>
  <Seo
    title='Account'
    description='Manage your Velakron account and security.'
    path='/account'
    noIndex
  />
  <AccountContent />
</>

Account.getLayout = PortalPageLayout

export default Account
