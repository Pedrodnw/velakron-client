import { AlertTriangle, CheckCircle2, ListChecks, Plus, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, FilterBar, MetricCard, StatusBadge } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmFilesPanel from '../../../components/app/crm/CrmFilesPanel'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatShortDate } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const initialForm = { organization: '', primary_contact: '', owner: '', next_action: '', follow_up_at: '', target_completion_at: '', notes: '' }

const CrmOnboarding = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], error: '' })
  const [filters, setFilters] = useState({ type: '', attention: '' })
  const [owners, setOwners] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [createOpen, setCreateOpen] = useState(false)
  const [detail, setDetail] = useState(null)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const load = useCallback(async (next = filters) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/onboardings', params: { ...next, page_size: 100 }, requestKey: 'crm-onboarding' }))
    setState(result?.ok ? { loading: false, rows: result.payload.data.onboardings || [], error: '' } : { loading: false, rows: [], error: crmErrorMessage(result) })
  }, [dispatch, filters])
  useEffect(() => { load(filters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-onboarding-owners' })),
      dispatch(crmRequest({ url: '/organizations', params: { status: 'prospect,onboarding', page_size: 100, sort: 'name' }, requestKey: 'crm-onboarding-organizations' })),
    ]).then(([ownerResult, organizationResult]) => {
      if (ownerResult?.ok) setOwners(ownerResult.payload.data.owners || [])
      if (organizationResult?.ok) setOrganizations(organizationResult.payload.data.organizations || [])
    })
  }, [dispatch])
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.new === '1') setCreateOpen(true)
    if (router.query.organization) setForm(value => ({ ...value, organization: String(router.query.organization) }))
  }, [router.isReady, router.query.new, router.query.organization])
  useEffect(() => {
    if (!form.organization) { setContacts([]); return }
    dispatch(crmRequest({ url: `/organizations/${form.organization}`, requestKey: `crm-onboarding-org-${form.organization}` })).then(result => result?.ok && setContacts(result.payload.data.contacts || []))
  }, [dispatch, form.organization])

  const create = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: '/onboardings', method: 'post', requestKey: 'crm-onboarding-create',
      data: {
        organization: form.organization, primary_contact: form.primary_contact || null, owner: form.owner,
        next_action: form.next_action, next_action_owner: form.owner,
        follow_up_at: form.follow_up_at ? new Date(form.follow_up_at).toISOString() : null,
        target_completion_at: form.target_completion_at ? new Date(form.target_completion_at).toISOString() : null,
        notes: form.notes,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Onboarding could not be started.') })
    setCreateOpen(false); setForm(initialForm); setFeedback({ type: 'success', message: 'Onboarding started with the generic checklist.' }); load()
  }
  const openDetail = async item => {
    const result = await dispatch(crmRequest({ url: `/onboardings/${item.id}`, requestKey: `crm-onboarding-${item.id}` }))
    if (result?.ok) setDetail(result.payload.data)
  }
  const toggleStep = async step => {
    setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: `/onboardings/${detail.onboarding.id}/steps/${step.id}`, method: 'patch', requestKey: `crm-onboarding-step-${step.id}`,
      data: { completed: !step.completed, version: detail.onboarding.version },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The checklist could not be updated.') })
    setDetail(value => ({ ...value, onboarding: result.payload.data.onboarding })); load()
  }
  const columns = [
    { key: 'organization', label: 'Organization', render: item => <button className='crmTableLink' type='button' onClick={() => openDetail(item)}><span className='tablePrimary'><strong>{item.organization?.name}</strong><span>{item.type.toUpperCase()}</span></span></button> },
    { key: 'stage', label: 'Stage', render: item => <StatusBadge tone={item.blocker ? 'danger' : item.percent_complete === 100 ? 'success' : 'info'}>{item.stage.replaceAll('_', ' ')}</StatusBadge> },
    { key: 'progress', label: 'Progress', render: item => <div className='crmTableProgress'><div><span style={{ width: `${item.percent_complete}%` }} /></div><strong>{item.percent_complete}%</strong></div> },
    { key: 'owner', label: 'Velakron owner', render: item => OwnerName({ membership: item.owner }) },
    { key: 'blocker', label: 'Blocker', render: item => item.blocker ? <div className='tablePrimary'><strong>{item.blocker_detail || 'Blocker recorded'}</strong><span>{OwnerName({ membership: item.blocker_owner })}</span></div> : 'None' },
    { key: 'next', label: 'Next action', render: item => <div className='tablePrimary'><strong>{item.next_action || 'Not set'}</strong><span>{formatShortDate(item.follow_up_at)}</span></div> },
  ]
  const blocked = state.rows.filter(item => item.blocker).length
  return <>
    <Seo title='CRM onboarding' description='Velakron OEM and supplier onboarding.' path='/app/crm/onboarding' noIndex />
    <AppPageHeader eyebrow='Relationship activation' title='Onboarding' description='Generic OEM and supplier checklists for the first release, with clear owners, blockers, and dated next actions.' actions={<Button onClick={() => setCreateOpen(true)}><Plus aria-hidden='true' /> Start onboarding</Button>} />
    <section className='metricGrid crmMetricGrid crmMetricGrid--four'>
      <MetricCard label='In onboarding' value={state.rows.length} detail='Current onboarding records' icon={ListChecks} />
      <MetricCard label='OEMs' value={state.rows.filter(item => item.type === 'oem').length} detail='OEM activation journeys' icon={ListChecks} />
      <MetricCard label='Suppliers' value={state.rows.filter(item => item.type === 'supplier').length} detail='Supplier activation journeys' icon={ListChecks} />
      <MetricCard label='Blocked' value={blocked} detail='Founder attention required' icon={AlertTriangle} tone={blocked ? 'danger' : 'default'} />
    </section>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <FilterBar onSubmit={event => { event.preventDefault(); load(filters) }} actions={<Button type='submit'><Search aria-hidden='true' /> Apply</Button>}>
      <label><span>Type</span><select value={filters.type} onChange={event => setFilters(value => ({ ...value, type: event.target.value }))}><option value=''>OEMs and suppliers</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
      <label><span>Attention</span><select value={filters.attention} onChange={event => setFilters(value => ({ ...value, attention: event.target.value }))}><option value=''>All onboarding</option><option value='blocked'>Blocked</option><option value='stalled'>Stalled</option><option value='overdue'>Follow-up overdue</option></select></label>
    </FilterBar>
    {state.error && <ErrorState title='Onboarding could not be loaded' description={state.error} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{state.loading && !state.rows.length ? <AppSkeleton lines={9} /> : <DataTable columns={columns} rows={state.rows} caption='CRM onboarding' emptyTitle='No onboarding records' emptyDescription='Start onboarding from an eligible CRM organization.' />}</section>
    <CrmModal open={createOpen} title='Start onboarding' description='The generic checklist can be reviewed and refined later.' onClose={() => !saving && setCreateOpen(false)} actions={<><Button variant='secondary' onClick={() => setCreateOpen(false)}>Cancel</Button><Button type='submit' form='crm-onboarding-form' disabled={saving}>{saving ? 'Starting…' : 'Start onboarding'}</Button></>}>
      <form id='crm-onboarding-form' onSubmit={create}><FieldGrid>
        <Field label='Organization' wide><select required value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value, primary_contact: '' }))}><option value=''>Choose organization</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name} · {item.type.toUpperCase()}</option>)}</select></Field>
        <Field label='Primary contact'><select value={form.primary_contact} onChange={event => setForm(value => ({ ...value, primary_contact: event.target.value }))}><option value=''>No primary contact</option>{contacts.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
        <Field label='Velakron owner'><select required value={form.owner} onChange={event => setForm(value => ({ ...value, owner: event.target.value }))}><option value=''>Choose founder</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field>
        <Field label='Next action'><input maxLength={500} value={form.next_action} onChange={event => setForm(value => ({ ...value, next_action: event.target.value }))} /></Field>
        <Field label='Follow-up date'><input type='datetime-local' value={form.follow_up_at} onChange={event => setForm(value => ({ ...value, follow_up_at: event.target.value }))} /></Field>
        <Field label='Target completion'><input type='date' value={form.target_completion_at} onChange={event => setForm(value => ({ ...value, target_completion_at: event.target.value }))} /></Field>
        <Field label='Notes' wide><textarea rows={4} value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} /></Field>
      </FieldGrid></form>
    </CrmModal>
    <CrmModal open={Boolean(detail)} title={detail ? `${detail.onboarding.organization?.name} onboarding` : ''} description={detail ? `${detail.onboarding.type.toUpperCase()} · ${detail.onboarding.stage.replaceAll('_', ' ')}` : ''} onClose={() => !saving && setDetail(null)} wide>
      {detail && <div className='crmOnboardingDetail'><div className='crmChecklist'><header><div className='crmTableProgress'><div><span style={{ width: `${detail.onboarding.percent_complete}%` }} /></div><strong>{detail.onboarding.percent_complete}% complete</strong></div>{detail.onboarding.blocker && <StatusBadge tone='danger'>Blocked</StatusBadge>}</header>
        {detail.onboarding.steps.map(step => <button type='button' className={step.completed ? 'is-complete' : ''} key={step.id} onClick={() => toggleStep(step)} disabled={saving}><span>{step.completed ? <CheckCircle2 aria-hidden='true' /> : <span className='crmEmptyCheck' />}</span><span><strong>{step.label}</strong><small>{step.description}{step.required ? ' · Required' : ' · Optional'}</small></span></button>)}
      </div><section><h3>Private onboarding files</h3><CrmFilesPanel subject='onboarding' subjectId={detail.onboarding.id} /></section></div>}
    </CrmModal>
  </>
}

CrmOnboarding.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmOnboarding
