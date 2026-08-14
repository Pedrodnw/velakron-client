import { Activity, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, EmptyState, ErrorState, FilterBar, Pagination, StatusBadge } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, formatDateTime } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const types = ['phone_call', 'meeting', 'demo', 'note', 'email_sent', 'email_received', 'task_created', 'task_completed', 'status_change', 'opportunity_stage_change', 'onboarding_change', 'relationship_change']
const initialForm = { organization: '', type: 'note', direction: 'none', subject: '', summary: '', outcome: '', next_action: '', follow_up_at: '' }

const CrmActivity = () => {
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], meta: null, error: '' })
  const [filters, setFilters] = useState({ search: '', type: '', direction: '', page: 1 })
  const [organizations, setOrganizations] = useState([])
  const [form, setForm] = useState(initialForm)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const load = useCallback(async (next = filters) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/interactions', params: { ...next, page_size: 50 }, requestKey: 'crm-activity' }))
    setState(result?.ok ? { loading: false, rows: result.payload.data.interactions || [], meta: result.payload.meta, error: '' } : { loading: false, rows: [], meta: null, error: crmErrorMessage(result) })
  }, [dispatch, filters])
  useEffect(() => { load(filters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { dispatch(crmRequest({ url: '/organizations', params: { page_size: 100, sort: 'name' }, requestKey: 'crm-activity-organizations' })).then(result => result?.ok && setOrganizations(result.payload.data.organizations || [])) }, [dispatch])
  const create = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({ url: '/interactions', method: 'post', requestKey: 'crm-activity-create', data: {
      organization: form.organization, type: form.type, direction: form.direction, subject: form.subject,
      summary: form.summary, outcome: form.outcome, occurred_at: new Date().toISOString(), next_action: form.next_action,
      follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
    } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Activity could not be recorded.') })
    setOpen(false); setForm(initialForm); setFeedback({ type: 'success', message: 'Activity recorded in the relationship history.' }); load()
  }
  return <>
    <Seo title='CRM activity' description='Velakron CRM relationship history.' path='/app/crm/activity' noIndex />
    <AppPageHeader eyebrow='Relationship history' title='Activity' description='Calls, meetings, demos, emails, notes, tasks, stage changes, and onboarding milestones in one timeline.' actions={<Button onClick={() => setOpen(true)}><Plus aria-hidden='true' /> Log activity</Button>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <FilterBar onSubmit={event => { event.preventDefault(); const next = { ...filters, page: 1 }; setFilters(next); load(next) }} actions={<Button type='submit'><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search history</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Subject, summary, or outcome' /></label>
      <label><span>Type</span><select value={filters.type} onChange={event => setFilters(value => ({ ...value, type: event.target.value }))}><option value=''>All activity</option>{types.map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></label>
      <label><span>Direction</span><select value={filters.direction} onChange={event => setFilters(value => ({ ...value, direction: event.target.value }))}><option value=''>Any direction</option><option value='inbound'>Inbound</option><option value='outbound'>Outbound</option><option value='none'>Internal</option></select></label>
    </FilterBar>
    {state.error && <ErrorState title='Activity could not be loaded' description={state.error} onRetry={() => load()} />}
    <section className='appPanel'>{state.loading && !state.rows.length ? <AppSkeleton lines={10} /> : state.rows.length ? <div className='crmTimeline crmTimeline--full'>{state.rows.map(item => <article key={item.id || item._id}><span className='crmTimeline__dot'><Activity aria-hidden='true' /></span><div><header><span><StatusBadge tone={item.direction === 'inbound' ? 'success' : item.direction === 'outbound' ? 'info' : 'neutral'}>{item.type.replaceAll('_', ' ')}</StatusBadge><strong>{item.subject || 'Activity recorded'}</strong></span><time>{formatDateTime(item.occurred_at)}</time></header><LinkWrap href={`/app/crm/organizations/${item.organization?.id}`}>{item.organization?.name}</LinkWrap><p>{item.summary}</p>{item.outcome && <small>Outcome: {item.outcome}</small>}</div></article>)}</div> : <EmptyState compact title='No activity matches' description='Adjust the filters or log a relationship activity.' />}</section>
    <Pagination meta={state.meta} onPageChange={page => { const next = { ...filters, page }; setFilters(next); load(next) }} label='Activity pages' />
    <CrmModal open={open} title='Log relationship activity' description='Record a call, demo, meeting, or internal note and optionally set the next action.' onClose={() => !saving && setOpen(false)} actions={<><Button variant='secondary' onClick={() => setOpen(false)}>Cancel</Button><Button type='submit' form='crm-activity-form' disabled={saving}>{saving ? 'Saving…' : 'Record activity'}</Button></>}>
      <form id='crm-activity-form' onSubmit={create}><FieldGrid>
        <Field label='Organization' wide><select required value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value }))}><option value=''>Choose organization</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label='Activity type'><select value={form.type} onChange={event => setForm(value => ({ ...value, type: event.target.value }))}>{['note','phone_call','demo','meeting'].map(type => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></Field>
        <Field label='Direction'><select value={form.direction} onChange={event => setForm(value => ({ ...value, direction: event.target.value }))}><option value='none'>Internal</option><option value='outbound'>Outbound</option><option value='inbound'>Inbound</option></select></Field>
        <Field label='Subject' wide><input required maxLength={500} value={form.subject} onChange={event => setForm(value => ({ ...value, subject: event.target.value }))} /></Field>
        <Field label='Summary' wide><textarea required rows={4} maxLength={2000} value={form.summary} onChange={event => setForm(value => ({ ...value, summary: event.target.value }))} /></Field>
        <Field label='Outcome' wide><textarea rows={3} maxLength={5000} value={form.outcome} onChange={event => setForm(value => ({ ...value, outcome: event.target.value }))} /></Field>
        <Field label='Next action'><input maxLength={500} value={form.next_action} onChange={event => setForm(value => ({ ...value, next_action: event.target.value }))} /></Field>
        <Field label='Follow-up date'><input type='datetime-local' value={form.follow_up_at} onChange={event => setForm(value => ({ ...value, follow_up_at: event.target.value }))} /></Field>
      </FieldGrid></form>
    </CrmModal>
  </>
}

CrmActivity.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmActivity
