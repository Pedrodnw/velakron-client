import { ExternalLink, Mail, RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Button } from '../../components/design-system'
import Seo from '../../components/Seo'
import { loadDevelopmentOutbox } from '../../store/slices/identity'

const Outbox = () => {
  const dispatch = useDispatch()
  const [messages, setMessages] = useState([])
  const [error, setError] = useState('')
  const load = async () => {
    setError('')
    const result = await dispatch(loadDevelopmentOutbox())
    if (result?.ok) setMessages(result.payload?.data?.messages || [])
    else setError(result?.error?.message || 'Could not load the outbox')
  }
  useEffect(() => { load() }, [])

  return <>
    <Seo title='Development Email Outbox' description='Local Velakron identity email preview.' path='/development/outbox' noIndex />
    <main className='developmentOutbox max'>
      <header><div><p className='technicalLabel'>Local development only</p><h1>Email outbox</h1><p>Identity emails are captured here. Nothing is sent to a real address.</p></div><Button variant='secondary' onClick={load}><RefreshCw aria-hidden='true' /> Refresh</Button></header>
      {error && <p className='outboxError'>{error}</p>}
      {!messages.length && !error && <div className='outboxEmpty'><Mail aria-hidden='true' /><h2>No messages captured</h2><p>Invite a teammate or request a password reset to create one.</p></div>}
      <div className='outboxList'>{messages.map(message => {
        const link = message.text.match(/https?:\/\/[^\s]+/)?.[0]
        return <article key={message.id} className='outboxMessage'><div><span>{message.template.replaceAll('_', ' ')}</span><time>{new Date(message.queued_at).toLocaleString()}</time></div><h2>{message.subject}</h2><p>To: {message.to}</p><pre>{message.text}</pre>{link && <Button href={link} target='_blank' rel='noreferrer'>Open Secure Link <ExternalLink aria-hidden='true' /></Button>}</article>
      })}</div>
    </main>
  </>
}

export default Outbox
