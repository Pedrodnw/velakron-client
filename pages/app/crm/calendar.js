import { CalendarDays, Plus, RefreshCw, Video } from 'lucide-react'
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

const defaultStart = () => { const date = new Date(Date.now() + 86400000); date.setMinutes(0, 0, 0); return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }
const initialForm = { organization: '', contacts: [], title: '', purpose: '', organizer: '', starts_at: defaultStart(), duration: 60, timezone: 'America/New_York', location: '', agenda: '', reminder_minutes: '60,1440', calendar_scope: 'shared' }

const CrmCalendar = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], error: '' })
  const [owners, setOwners] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [view, setView] = useState('upcoming')
  const [outcomeMeeting, setOutcomeMeeting] = useState(null)
  const [outcome, setOutcome] = useState({ outcome: '', notes: '' })
  const load = useCallback(async () => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/meetings', params: { view, page_size: 100 }, requestKey: `crm-calendar-${view}` }))
    setState(result?.ok ? { loading: false, rows: result.payload.data.meetings || [], error: '' } : { loading: false, rows: [], error: crmErrorMessage(result) })
  }, [dispatch, view])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    Promise.all([
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-calendar-owners' })),
      dispatch(crmRequest({ url: '/organizations', params: { page_size: 100, sort: 'name' }, requestKey: 'crm-calendar-organizations' })),
    ]).then(([ownerResult, organizationResult]) => {
      if (ownerResult?.ok) {
        setOwners(ownerResult.payload.data.owners || [])
        setForm(value => ({ ...value, organizer: value.organizer || ownerResult.payload.data.owners?.[0]?.id || '' }))
      }
      if (organizationResult?.ok) setOrganizations(organizationResult.payload.data.organizations || [])
    })
  }, [dispatch])
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.new === '1') setOpen(true)
    if (router.query.organization) setForm(value => ({ ...value, organization: String(router.query.organization) }))
    if (router.query.contact) setForm(value => ({ ...value, contacts: [String(router.query.contact)] }))
  }, [router.isReady, router.query.contact, router.query.new, router.query.organization])
  useEffect(() => {
    if (!form.organization) { setContacts([]); return }
    dispatch(crmRequest({ url: `/organizations/${form.organization}`, requestKey: `crm-calendar-org-${form.organization}` })).then(result => result?.ok && setContacts(result.payload.data.contacts || []))
  }, [dispatch, form.organization])
  const create = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const startsAt = new Date(form.starts_at)
    const result = await dispatch(crmRequest({ url: '/meetings', method: 'post', requestKey: 'crm-meeting-create', data: {
      organization: form.organization, contacts: form.contacts, title: form.title, purpose: form.purpose,
      organizer: form.organizer, internal_attendee_ids: [form.organizer], starts_at: startsAt.toISOString(),
      ends_at: new Date(startsAt.getTime() + (Number(form.duration) * 60000)).toISOString(), timezone: form.timezone,
      location: form.location, agenda: form.agenda,
      reminder_minutes: form.reminder_minutes.split(',').map(Number).filter(Number.isInteger), calendar_scope: form.calendar_scope,
    } }))
    if (!result?.ok) { setSaving(false); return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The meeting could not be scheduled.') }) }
    const meeting = result.payload.data.meeting
    let syncResult = null
    if (meeting.calendar_scope !== 'none') syncResult = await dispatch(crmRequest({ url: `/meetings/${meeting.id}/sync`, method: 'post', data: {}, requestKey: `crm-meeting-sync-${meeting.id}` }))
    setSaving(false); setOpen(false); setForm({ ...initialForm, organizer: form.organizer }); load()
    setFeedback(syncResult && !syncResult.ok
      ? { type: 'warning', message: 'Meeting saved in Velakron, but Google Calendar needs to be connected or refreshed before invitations can be sent.' }
      : { type: 'success', message: meeting.calendar_scope === 'none' ? 'Meeting saved without calendar invitations.' : 'Meeting scheduled and synchronized with Google Calendar.' })
  }
  const sync = async meeting => {
    setFeedback(null)
    const result = await dispatch(crmRequest({ url: `/meetings/${meeting.id}/sync`, method: 'post', data: {}, requestKey: `crm-meeting-sync-${meeting.id}` }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'Google Calendar could not be synchronized.') })
    else { setFeedback({ type: 'success', message: 'Meeting synchronized with Google Calendar.' }); load() }
  }
  const recordOutcome = async event => {
    event.preventDefault(); setSaving(true)
    const result = await dispatch(crmRequest({ url: `/meetings/${outcomeMeeting.id}`, method: 'patch', requestKey: `crm-meeting-outcome-${outcomeMeeting.id}`, data: { status: 'completed', outcome: outcome.outcome, notes: outcome.notes, version: outcomeMeeting.version } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The meeting outcome could not be recorded.') })
    setOutcomeMeeting(null); setOutcome({ outcome: '', notes: '' }); setFeedback({ type: 'success', message: 'Meeting outcome recorded in the relationship history.' }); load()
  }
  return <>
    <Seo title='CRM calendar' description='Velakron CRM meetings and calendar synchronization.' path='/app/crm/calendar' noIndex />
    <AppPageHeader eyebrow='Shared and individual calendars' title='Meetings' description='Schedule with CRM contacts, send Google invitations, and retain the outcome and follow-up in the relationship history.' actions={<Button onClick={() => setOpen(true)}><Plus aria-hidden='true' /> Schedule meeting</Button>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <div className='crmRecordTabs'><Tabs items={[{ key: 'upcoming', label: 'Upcoming' }, { key: 'needs_outcome', label: 'Needs outcome' }]} activeKey={view} onChange={setView} /></div>
    {state.error && <ErrorState title='Meetings could not be loaded' description={state.error} onRetry={load} />}
    <section className='appPanel'>{state.loading && !state.rows.length ? <AppSkeleton lines={10} /> : state.rows.length ? <div className='crmMeetingList'>{state.rows.map(meeting => <article key={meeting.id}>
      <div className='crmMeetingDate'><CalendarDays aria-hidden='true' /><strong>{new Date(meeting.starts_at).getDate()}</strong><span>{new Date(meeting.starts_at).toLocaleString('en-US', { month: 'short' })}</span></div>
      <div className='crmMeetingMain'><header><h2>{meeting.title}</h2><StatusBadge tone={meeting.sync_state === 'synced' ? 'success' : meeting.sync_state === 'error' ? 'danger' : 'neutral'}>{meeting.sync_state.replaceAll('_', ' ')}</StatusBadge></header><LinkWrap href={`/app/crm/organizations/${meeting.organization?.id}`}>{meeting.organization?.name}</LinkWrap><p>{meeting.purpose}</p><span>{formatDateTime(meeting.starts_at)}–{new Date(meeting.ends_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} · {meeting.calendar_scope} calendar</span></div>
      <div className='crmMeetingActions'>{meeting.meeting_url && <Button variant='secondary' href={meeting.meeting_url} target='_blank'><Video aria-hidden='true' /> Open</Button>}{view === 'needs_outcome' ? <Button onClick={() => { setOutcomeMeeting(meeting); setOutcome({ outcome: meeting.outcome || '', notes: meeting.notes || '' }) }}>Record outcome</Button> : <Button variant='secondary' onClick={() => sync(meeting)}><RefreshCw aria-hidden='true' /> Sync</Button>}</div>
    </article>)}</div> : <EmptyState compact title='No upcoming meetings' description='Schedule the first CRM meeting with an organization contact.' />}</section>
    <CrmModal open={open} title='Schedule CRM meeting' description='Choose the shared CRM calendar, your individual calendar, or save without Google sync.' onClose={() => !saving && setOpen(false)} wide actions={<><Button variant='secondary' onClick={() => setOpen(false)}>Cancel</Button><Button type='submit' form='crm-meeting-form' disabled={saving}>{saving ? 'Scheduling…' : 'Schedule meeting'}</Button></>}>
      <form id='crm-meeting-form' onSubmit={create}><FieldGrid>
        <Field label='Organization'><select required value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value, contacts: [] }))}><option value=''>Choose organization</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label='Contact'><select value={form.contacts[0] || ''} onChange={event => setForm(value => ({ ...value, contacts: event.target.value ? [event.target.value] : [] }))}><option value=''>No external contact</option>{contacts.map(item => <option key={item.id} value={item.id}>{item.full_name} · {item.email}</option>)}</select></Field>
        <Field label='Title' wide><input required minLength={2} maxLength={240} value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} /></Field>
        <Field label='Organizer'><select required value={form.organizer} onChange={event => setForm(value => ({ ...value, organizer: event.target.value }))}>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field>
        <Field label='Calendar'><select value={form.calendar_scope} onChange={event => setForm(value => ({ ...value, calendar_scope: event.target.value }))}><option value='shared'>Shared CRM calendar</option><option value='individual'>Organizer’s calendar</option><option value='none'>Velakron only, no invitation</option></select></Field>
        <Field label='Start'><input type='datetime-local' required value={form.starts_at} onChange={event => setForm(value => ({ ...value, starts_at: event.target.value }))} /></Field>
        <Field label='Duration'><select value={form.duration} onChange={event => setForm(value => ({ ...value, duration: Number(event.target.value) }))}>{[15,30,45,60,90,120].map(minutes => <option key={minutes} value={minutes}>{minutes} minutes</option>)}</select></Field>
        <Field label='Purpose' wide><textarea rows={3} maxLength={2000} value={form.purpose} onChange={event => setForm(value => ({ ...value, purpose: event.target.value }))} /></Field>
        <Field label='Agenda' wide><textarea rows={4} maxLength={10000} value={form.agenda} onChange={event => setForm(value => ({ ...value, agenda: event.target.value }))} /></Field>
        <Field label='Location'><input maxLength={500} value={form.location} onChange={event => setForm(value => ({ ...value, location: event.target.value }))} /></Field>
        <Field label='Reminders (minutes)' hint='Comma-separated, such as 60,1440'><input value={form.reminder_minutes} onChange={event => setForm(value => ({ ...value, reminder_minutes: event.target.value }))} /></Field>
      </FieldGrid></form>
    </CrmModal>
    <CrmModal open={Boolean(outcomeMeeting)} title='Record meeting outcome' description={outcomeMeeting?.title || ''} onClose={() => !saving && setOutcomeMeeting(null)} actions={<><Button variant='secondary' onClick={() => setOutcomeMeeting(null)}>Cancel</Button><Button type='submit' form='crm-meeting-outcome' disabled={saving}>Complete meeting</Button></>}><form id='crm-meeting-outcome' onSubmit={recordOutcome}><FieldGrid><Field label='Outcome' wide><textarea required rows={5} maxLength={10000} value={outcome.outcome} onChange={event => setOutcome(value => ({ ...value, outcome: event.target.value }))} placeholder='What was decided or learned?' /></Field><Field label='Internal notes' wide><textarea rows={5} maxLength={20000} value={outcome.notes} onChange={event => setOutcome(value => ({ ...value, notes: event.target.value }))} /></Field></FieldGrid></form></CrmModal>
  </>
}

CrmCalendar.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmCalendar
