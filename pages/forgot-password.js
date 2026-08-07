import { ArrowRight, CheckCircle2, LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import AuthPageShell from '../components/auth/AuthPageShell'
import FormField from '../components/auth/FormField'
import FormMessage from '../components/auth/FormMessage'
import { resultError } from '../components/auth/utils'
import { Button } from '../components/design-system'
import LinkWrap from '../components/LinkWrap'
import Seo from '../components/Seo'
import { requestPasswordReset } from '../store/slices/identity'

const ForgotPassword = () => {
  const dispatch = useDispatch()
  const [email, setEmail] = useState('')
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState(null)

  const submit = async event => {
    event.preventDefault()
    setPending(true)
    setMessage(null)
    const result = await dispatch(requestPasswordReset(email))
    setPending(false)
    setMessage(result?.ok
      ? { type: 'success', text: 'Check your inbox. If this address is eligible, a reset link is on its way.' }
      : { type: 'error', text: resultError(result, 'We could not process the request.') })
  }

  return <>
    <Seo title='Reset Password' description='Request a secure Velakron password reset.' path='/forgot-password' noIndex />
    <AuthPageShell eyebrow='Account recovery' title='Recover Access.' description='Request a one-time link without revealing whether an address has a Velakron account.' panelTitle='Reset your password'>
      <form className='authForm' onSubmit={submit}>
        <FormMessage type={message?.type}>{message?.text}</FormMessage>
        <FormField id='forgot-email' label='Email address' name='email' type='email' value={email} onChange={event => setEmail(event.target.value)} autoComplete='email' required />
        <Button className='authForm__submit' type='submit' disabled={pending}>
          {pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Sending…</> : <>Send Reset Link <ArrowRight aria-hidden='true' /></>}
        </Button>
        {message?.type === 'success' && <div className='authNotice'><CheckCircle2 aria-hidden='true' /> You can close this page after checking your email.</div>}
        <p className='authForm__alternate'><LinkWrap href='/login'>Back to login</LinkWrap></p>
      </form>
    </AuthPageShell>
  </>
}

export default ForgotPassword
