import { Clock3, Inbox, MailCheck, MailPlus, RefreshCw, Send } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, EmptyState, ErrorState, StatusBadge, Tabs } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, formatDateTime } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const initialForm = { organization: '', contact: '', provider_connection: '', subject: '', text_body: '', action: 'send', scheduled_at: '' }

const CrmInbox = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, messages: [], unread: 0, error: '' })
  const [tab, setTab] = useState('inbox')
  const [connections, setConnections] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])
  const [allContacts, setAllContacts] = useState([])
  const [review, setReview] = useState([])
  const [form, setForm] = useState(initialForm)
  const [composeOpen, setComposeOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [reviewContact, setReviewContact] = useState('')

  const load = useCallback(async (selected = tab) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const status = selected === 'inbox' ? 'received' : selected === 'sent' ? 'sent' : 'draft,approval_required,scheduled,queued,failed'
    const result = await dispatch(crmRequest({ url: '/emails', params: { status, page_size: 100 }, requestKey: `crm-emails-${selected}` }))
    setState(result?.ok ? { loading: false, messages: result.payload.data.messages || [], unread: result.payload.data.unread_count || 0, error: '' } : { loading: false, messages: [], unread: 0, error: crmErrorMessage(result) })
    if (selected === 'review') {
      const reviewResult = await dispatch(crmRequest({ url: '/inbox-review', requestKey: 'crm-inbox-review' }))
      if (reviewResult?.ok) setReview(reviewResult.payload.data.reviews || [])
    }
  }, [dispatch, tab])
  useEffect(() => { load(tab) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      dispatch(crmRequest({ url: '/google/connections', requestKey: 'crm-inbox-connections' })),
      dispatch(crmRequest({ url: '/organizations', params: { page_size: 100, sort: 'name' }, requestKey: 'crm-inbox-organizations' })),
      dispatch(crmRequest({ url: '/contacts', params: { page_size: 100 }, requestKey: 'crm-inbox-contacts' })),
    ]).then(([connectionResult, organizationResult, contactResult]) => {
      if (connectionResult?.ok) setConnections(connectionResult.payload.data.connections || [])
      if (organizationResult?.ok) setOrganizations(organizationResult.payload.data.organizations || [])
      if (contactResult?.ok) setAllContacts(contactResult.payload.data.contacts || [])
    })
  }, [dispatch])
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.compose === '1') setComposeOpen(true)
    if (router.query.organization) setForm(value => ({ ...value, organization: String(router.query.organization) }))
    if (router.query.contact) setForm(value => ({ ...value, contact: String(router.query.contact) }))
  }, [router.isReady, router.query.compose, router.query.contact, router.query.organization])
  useEffect(() => {
    if (!form.organization) { setContacts([]); return }
    dispatch(crmRequest({ url: `/organizations/${form.organization}`, requestKey: `crm-email-org-${form.organization}` })).then(result => result?.ok && setContacts(result.payload.data.contacts || []))
  }, [dispatch, form.organization])
  useEffect(() => {
    if (!form.provider_connection && connections.length) {
      const preferred = connections.find(item => item.connection_scope === 'individual' && item.manageable_by_current_founder && !item.warning) || connections.find(item => item.manageable_by_current_founder && !item.warning)
      if (preferred) setForm(value => ({ ...value, provider_connection: preferred.id }))
    }
  }, [connections, form.provider_connection])
  const changeTab = key => { setTab(key); setDetail(null); load(key) }
  const send = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({ url: '/emails', method: 'post', requestKey: 'crm-email-create', data: {
      organization: form.organization, contact: form.contact || null, provider_connection: form.provider_connection,
      subject: form.subject, text_body: form.text_body, action: form.action,
      scheduled_at: form.action === 'schedule' ? new Date(form.scheduled_at).toISOString() : undefined,
    } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The email could not be created.') })
    setComposeOpen(false); setForm({ ...initialForm, provider_connection: form.provider_connection }); setFeedback({ type: 'success', message: form.action === 'send' ? 'Email queued for sending.' : form.action === 'schedule' ? 'Email scheduled.' : 'Email draft saved.' }); changeTab(form.action === 'send' ? 'sent' : 'drafts')
  }
  const syncInbox = async () => {
    const shared = connections.find(item => item.connection_scope === 'shared' && item.capabilities?.gmail_read && !item.warning)
    if (!shared) return setFeedback({ type: 'warning', message: 'Connect app@velakron.com with Gmail read permission in CRM settings first.' })
    setSaving(true)
    const result = await dispatch(crmRequest({ url: `/google/connections/${shared.id}/sync-inbox`, method: 'post', data: {}, requestKey: 'crm-inbox-sync' }))
    setSaving(false)
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'The shared inbox could not be synchronized.') })
    else { setFeedback({ type: 'success', message: `Inbox synchronized. ${result.payload.data.sync.created} new matched messages and ${result.payload.data.sync.review} requiring review.` }); load(tab) }
  }
  const openMessage = async message => {
    setDetail(message)
    if (message.direction === 'inbound' && message.unread) {
      await dispatch(crmRequest({ url: `/emails/${message.id}/read`, method: 'post', data: {}, requestKey: `crm-email-read-${message.id}` }))
      load(tab)
    }
  }
  const approve = async message => {
    const result = await dispatch(crmRequest({ url: `/emails/${message.id}/approve`, method: 'post', data: {}, requestKey: `crm-email-approve-${message.id}` }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'The draft could not be approved.') })
    else { setDetail(null); setFeedback({ type: 'success', message: 'Email approved and queued.' }); load(tab) }
  }
  const resolveReview = async action => {
    if (action === 'match' && !reviewContact) return setFeedback({ type: 'warning', message: 'Choose the CRM contact this message belongs to.' })
    setSaving(true)
    const result = await dispatch(crmRequest({ url: `/inbox-review/${detail.id || detail._id}/resolve`, method: 'post', requestKey: `crm-review-${detail.id || detail._id}`, data: action === 'ignore' ? { action: 'ignore' } : { action: 'match', contact_id: reviewContact } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The inbox message could not be resolved.') })
    setDetail(null); setReviewContact(''); setFeedback({ type: 'success', message: action === 'ignore' ? 'Message removed from the review queue.' : 'Message matched and added to the relationship timeline.' }); load('review')
  }
  return <>
    <Seo title='CRM inbox' description='Velakron CRM Gmail communication.' path='/app/crm/inbox' noIndex />
    <AppPageHeader eyebrow='Gmail communication' title='Inbox & email' description='Founder-sent email, the shared app@ mailbox, scheduled messages, and relationship-linked communication history.' actions={<><Button variant='secondary' onClick={syncInbox} disabled={saving}><RefreshCw aria-hidden='true' /> Sync shared inbox</Button><Button onClick={() => setComposeOpen(true)}><MailPlus aria-hidden='true' /> Compose</Button></>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <div className='crmRecordTabs'><Tabs items={[{ key: 'inbox', label: 'Inbox', count: state.unread }, { key: 'sent', label: 'Sent' }, { key: 'drafts', label: 'Drafts & scheduled' }, { key: 'review', label: 'Needs matching', count: review.length }]} activeKey={tab} onChange={changeTab} /></div>
    {state.error && <ErrorState title='Email could not be loaded' description={state.error} onRetry={() => load(tab)} />}
    <section className='appPanel crmInboxPanel'>{state.loading && !state.messages.length && tab !== 'review' ? <AppSkeleton lines={10} /> : tab === 'review' ? (review.length ? <div className='crmEmailList'>{review.map(item => <article key={item.id || item._id}><span className='crmEmailIcon'><Inbox aria-hidden='true' /></span><button type='button' onClick={() => setDetail({ ...item, review_item: true })}><header><strong>{item.from_name || item.from_email}</strong><time>{formatDateTime(item.received_at)}</time></header><h2>{item.subject}</h2><p>{item.text_preview}</p><small>{item.reason.replaceAll('_', ' ')}</small></button></article>)}</div> : <EmptyState compact title='No messages need matching' description='Unmatched or ambiguous shared-mailbox messages will appear here.' />) : state.messages.length ? <div className='crmEmailList'>{state.messages.map(message => <article className={message.unread ? 'is-unread' : ''} key={message.id}><span className='crmEmailIcon'>{message.direction === 'inbound' ? <Inbox aria-hidden='true' /> : message.status === 'sent' ? <MailCheck aria-hidden='true' /> : <Clock3 aria-hidden='true' />}</span><button type='button' onClick={() => openMessage(message)}><header><strong>{message.direction === 'inbound' ? message.from?.name || message.from?.email : message.to?.map(item => item.name || item.email).join(', ')}</strong><time>{formatDateTime(message.received_at || message.sent_at || message.scheduled_at || message.created_at)}</time></header><h2>{message.subject}</h2><p>{message.text_body}</p><small>{message.organization?.name} · {message.status}</small></button><StatusBadge tone={message.status === 'failed' ? 'danger' : message.unread ? 'warning' : message.status === 'sent' ? 'success' : 'neutral'}>{message.status.replaceAll('_', ' ')}</StatusBadge></article>)}</div> : <EmptyState compact title='No messages in this view' description='Compose an email or synchronize the shared inbox.' />}</section>
    <CrmModal open={composeOpen} title='Compose CRM email' description='Send from your connected Gmail account or the shared app@ mailbox.' onClose={() => !saving && setComposeOpen(false)} wide actions={<><Button variant='secondary' onClick={() => setComposeOpen(false)}>Cancel</Button><Button type='submit' form='crm-email-form' disabled={saving}><Send aria-hidden='true' /> {saving ? 'Saving…' : form.action === 'send' ? 'Send email' : form.action === 'schedule' ? 'Schedule' : 'Save draft'}</Button></>}>
      <form id='crm-email-form' onSubmit={send}><FieldGrid>
        <Field label='Organization'><select required value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value, contact: '' }))}><option value=''>Choose organization</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label='Contact'><select value={form.contact} onChange={event => setForm(value => ({ ...value, contact: event.target.value }))}><option value=''>Choose contact</option>{contacts.map(item => <option key={item.id} value={item.id}>{item.full_name} · {item.email}</option>)}</select></Field>
        <Field label='Send from' wide><select required value={form.provider_connection} onChange={event => setForm(value => ({ ...value, provider_connection: event.target.value }))}><option value=''>Connect Gmail first</option>{connections.filter(item => item.manageable_by_current_founder && !item.warning && item.capabilities?.gmail_send).map(item => <option key={item.id} value={item.id}>{item.account_email} · {item.connection_scope}</option>)}</select></Field>
        <Field label='Subject' wide><input required maxLength={998} value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} /></Field>
        <Field label='Message' wide><textarea required rows={12} maxLength={200000} value={form.text_body} onChange={event => setForm(value => ({ ...value, text_body: event.target.value }))} /></Field>
        <Field label='Action'><select value={form.action} onChange={event => setForm(value => ({ ...value, action: event.target.value }))}><option value='send'>Send now</option><option value='schedule'>Schedule</option><option value='approval_required'>Save for approval</option><option value='draft'>Save draft</option></select></Field>
        {form.action === 'schedule' && <Field label='Send at'><input type='datetime-local' required value={form.scheduled_at} onChange={event => setForm(value => ({ ...value, scheduled_at: event.target.value }))} /></Field>}
      </FieldGrid></form>
    </CrmModal>
    <CrmModal open={Boolean(detail)} title={detail?.subject || 'Email'} description={detail?.review_item ? 'This shared-mailbox message could not be matched automatically.' : `${detail?.status || ''} · ${detail?.organization?.name || ''}`} onClose={() => { setDetail(null); setReviewContact('') }} wide actions={detail?.review_item ? <><Button variant='secondary' onClick={() => resolveReview('ignore')} disabled={saving}>Ignore</Button><Button onClick={() => resolveReview('match')} disabled={saving || !reviewContact}>Match message</Button></> : detail && ['draft', 'approval_required'].includes(detail.status) && <Button onClick={() => approve(detail)}>Approve and send</Button>}>
      {detail && <div className='crmEmailDetail'><header><div><span>From</span><strong>{detail.from?.name || detail.from_name || detail.from?.email || detail.from_email}</strong></div><div><span>To</span><strong>{detail.to?.map(item => item.name || item.email).join(', ') || 'Shared CRM mailbox'}</strong></div><div><span>Date</span><strong>{formatDateTime(detail.received_at || detail.sent_at || detail.created_at)}</strong></div></header><pre>{detail.text_body || detail.text_preview}</pre>{detail.review_item && <Field label='Match to CRM contact'><select value={reviewContact} onChange={event => setReviewContact(event.target.value)}><option value=''>Choose contact</option>{[...(detail.candidate_contacts || []), ...allContacts.filter(item => !(detail.candidate_contacts || []).some(candidate => (candidate.id || candidate._id) === item.id))].map(item => <option key={item.id || item._id} value={item.id || item._id}>{item.full_name || `${item.first_name} ${item.last_name}`} · {item.organization?.name || item.email}</option>)}</select></Field>}</div>}
    </CrmModal>
  </>
}

CrmInbox.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmInbox
