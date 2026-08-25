import { ArrowRight, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import PlatformTermsAcceptance from '../components/auth/PlatformTermsAcceptance'
import { resultError } from '../components/auth/utils'
import { Button } from '../components/design-system'
import LinkWrap from '../components/LinkWrap'
import Seo from '../components/Seo'
import {
  getAuthInitialized,
  getAuthUser,
  registerAccount,
} from '../store/slices/auth'
import { loadPlatformTerms } from '../store/slices/identity'

const Register = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const initialized = useSelector(getAuthInitialized)
  const user = useSelector(getAuthUser)
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    platform_terms_accepted: false,
    platform_terms_version: '',
  })
  const [platformTerms, setPlatformTerms] = useState(null)
  const [platformTermsError, setPlatformTermsError] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialized && user) router.replace('/app')
  }, [initialized, router, user])

  useEffect(() => {
    dispatch(loadPlatformTerms()).then(result => {
      const terms = result?.payload?.data?.platform_terms || null
      setPlatformTerms(terms)
      if (terms) setForm(current => ({ ...current, platform_terms_version: terms.version }))
      else setPlatformTermsError('The current confidentiality terms could not be loaded. Refresh this page before creating an account.')
    })
  }, [dispatch])

  const update = event => setForm(current => ({
    ...current,
    [event.target.name]: event.target.value,
  }))

  const submit = async event => {
    event.preventDefault()
    setError('')

    if (form.password !== form.confirm_password) {
      setError('The passwords you entered do not match.')
      return
    }

    setPending(true)
    const result = await dispatch(registerAccount({
      first_name: form.first_name,
      last_name: form.last_name,
      email: form.email,
      password: form.password,
      platform_terms_accepted: form.platform_terms_accepted,
      platform_terms_version: form.platform_terms_version,
    }))
    setPending(false)

    if (!result?.ok) {
      setError(resultError(result, 'We could not create your account. Please try again.'))
      return
    }

    await router.replace('/app')
  }

  return <>
    <Seo
      title='Create Account'
      description='Create your secure Velakron account.'
      path='/register'
      noIndex
    />
    <AuthPageShell
      eyebrow='Development access'
      title='Local Testing Only.'
      description='Production Velakron accounts are created through secure company invitations. This page exists only for local development.'
      panelTitle='Create a development account'
    >
      <form className='authForm' onSubmit={submit}>
        <FormMessage>{error}</FormMessage>
        <FormMessage>{platformTermsError}</FormMessage>
        <div className='authForm__row'>
          <FormField
            id='register-first-name'
            label='First name'
            name='first_name'
            value={form.first_name}
            onChange={update}
            autoComplete='given-name'
            required
          />
          <FormField
            id='register-last-name'
            label='Last name'
            name='last_name'
            value={form.last_name}
            onChange={update}
            autoComplete='family-name'
          />
        </div>
        <FormField
          id='register-email'
          label='Business email'
          name='email'
          type='email'
          value={form.email}
          onChange={update}
          autoComplete='email'
          placeholder='you@company.com'
          required
        />
        <FormField
          id='register-password'
          label='Password'
          name='password'
          type='password'
          value={form.password}
          onChange={update}
          autoComplete='new-password'
          hint='Use at least 12 characters.'
          minLength={12}
          maxLength={128}
          required
        />
        <FormField
          id='register-confirm-password'
          label='Confirm password'
          name='confirm_password'
          type='password'
          value={form.confirm_password}
          onChange={update}
          autoComplete='new-password'
          required
        />
        <PlatformTermsAcceptance
          terms={platformTerms}
          checked={form.platform_terms_accepted}
          onChange={checked => setForm(current => ({ ...current, platform_terms_accepted: checked }))}
        />
        <Button className='authForm__submit' type='submit' disabled={pending || !platformTerms}>
          {pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Creating account…</> : <>Create Account <ArrowRight aria-hidden='true' /></>}
        </Button>
        <p className='authForm__alternate'>
          Already have an account? <LinkWrap href='/login'>Log in</LinkWrap>
        </p>
      </form>
    </AuthPageShell>
  </>
}

export default Register
