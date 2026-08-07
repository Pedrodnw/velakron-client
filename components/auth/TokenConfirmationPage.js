import { CheckCircle2, LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import AuthPageShell from './AuthPageShell'
import FormMessage from './FormMessage'
import { resultError } from './utils'
import { Button } from '../design-system'

const TokenConfirmationPage = ({
  eyebrow,
  title,
  description,
  panelTitle,
  preview,
  confirm,
  readyMessage,
  successMessage,
  successHref = '/login',
  successLabel = 'Go to Login',
}) => {
  const dispatch = useDispatch()
  const router = useRouter()
  const token = typeof router.query.token === 'string' ? router.query.token : ''
  const [state, setState] = useState('checking')
  const [details, setDetails] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!router.isReady) return
    if (!token) { setState('invalid'); return }
    dispatch(preview(token)).then(result => {
      if (!result?.ok) { setState('invalid'); return }
      setDetails(result.payload?.data || null)
      setState('ready')
    })
  }, [dispatch, preview, router.isReady, token])

  const complete = async () => {
    setState('submitting')
    setError('')
    const result = await dispatch(confirm(token))
    if (result?.ok) setState('complete')
    else { setError(resultError(result, 'We could not complete this request.')); setState('ready') }
  }

  return <AuthPageShell eyebrow={eyebrow} title={title} description={description} panelTitle={panelTitle}>
    {state === 'checking' && <div className='authLoading'><LoaderCircle className='spin' aria-hidden='true' /> Checking your secure link…</div>}
    {state === 'invalid' && <div className='authResult'><FormMessage type='error'>This link is invalid, expired, or has already been used.</FormMessage><Button href='/login'>Go to Login</Button></div>}
    {state === 'complete' && <div className='authResult'><CheckCircle2 aria-hidden='true' /><FormMessage type='success'>{successMessage}</FormMessage><Button href={successHref} showArrow>{successLabel}</Button></div>}
    {['ready', 'submitting'].includes(state) && <div className='authResult'>
      <FormMessage>{error}</FormMessage>
      <p>{typeof readyMessage === 'function' ? readyMessage(details) : readyMessage}</p>
      <Button onClick={complete} disabled={state === 'submitting'}>{state === 'submitting' ? <><LoaderCircle className='spin' aria-hidden='true' /> Confirming…</> : 'Confirm'}</Button>
    </div>}
  </AuthPageShell>
}

export default TokenConfirmationPage
