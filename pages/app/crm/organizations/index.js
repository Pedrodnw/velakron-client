import { BookmarkPlus, Building2, Download, Plus, Search, Upload, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../../components/LinkWrap'
import {
  AppPageHeader, AppSkeleton, DataTable, ErrorState, FilterBar, MetricCard, Pagination, StatusBadge,
} from '../../../../components/app'
import FormMessage from '../../../../components/auth/FormMessage'
import CrmModal from '../../../../components/app/crm/CrmModal'
import CrmShell from '../../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatShortDate } from '../../../../components/app/crm/CrmFields'
import { Button } from '../../../../components/design-system'
import { WidePortalPageLayout } from '../../../../components/app/PortalPageLayout'
import Seo from '../../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../../store/crmApi'

const initialForm = { name: '', type: 'oem', status: 'prospect', industry: '', website: '', account_owner: '', lead_source: '', next_action: '', next_action_at: '', notes: '' }
const toneForStatus = status => ({ active: 'success', onboarding: 'info', prospect: 'neutral', inactive: 'danger' }[status] || 'neutral')

const CrmOrganizations = () => {
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], counts: {}, meta: null, error: '' })
  const [owners, setOwners] = useState([])
  const [filters, setFilters] = useState({ search: '', type: '', status: '', page: 1 })
  const [createOpen, setCreateOpen] = useState(false)
  const [form, setForm] = useState(initialForm)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [savedViews, setSavedViews] = useState([])
  const [saveViewOpen, setSaveViewOpen] = useState(false)
  const [saveViewName, setSaveViewName] = useState('')

  const load = useCallback(async (next = filters) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/organizations', params: { ...next, page_size: 25 }, requestKey: 'crm-organizations' }))
    setState(result?.ok ? {
      loading: false,
      rows: result.payload.data.organizations || [],
      counts: result.payload.data.counts || {},
      meta: result.payload.meta || null,
      error: '',
    } : { loading: false, rows: [], counts: {}, meta: null, error: crmErrorMessage(result) })
  }, [dispatch, filters])

  useEffect(() => { load(filters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-owners' })),
      dispatch(crmRequest({ url: '/saved-views', params: { entity: 'organizations' }, requestKey: 'crm-organization-views' })),
    ]).then(([ownerResult, viewResult]) => {
      if (ownerResult?.ok) setOwners(ownerResult.payload.data.owners || [])
      if (viewResult?.ok) setSavedViews(viewResult.payload.data.views || [])
    })
  }, [dispatch])

  const submitFilters = event => {
    event.preventDefault()
    const next = { ...filters, page: 1 }
    setFilters(next)
    load(next)
  }
  const changePage = page => {
    const next = { ...filters, page }
    setFilters(next)
    load(next)
  }
  const save = async event => {
    event.preventDefault()
    setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: '/organizations', method: 'post', requestKey: 'crm-organization-create',
      data: {
        name: form.name, type: form.type, status: form.status, industry: form.industry,
        website: form.website, account_owner: form.account_owner || null, lead_source: form.lead_source,
        next_action: form.next_action ? {
          summary: form.next_action,
          due_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
          assigned_to: form.account_owner || null,
        } : undefined,
        notes: form.notes,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The organization could not be created.') })
    setCreateOpen(false); setForm(initialForm); setFeedback({ type: 'success', message: `${result.payload.data.organization.name} added to the CRM.` }); load({ ...filters, page: 1 })
  }
  const saveView = async event => {
    event.preventDefault(); setSaving(true)
    const result = await dispatch(crmRequest({
      url: '/saved-views', method: 'post', requestKey: 'crm-organization-view-create',
      data: { name: saveViewName, entity: 'organizations', filters: { search: filters.search, type: filters.type, status: filters.status } },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The view could not be saved.') })
    setSavedViews(value => [...value, result.payload.data.view]); setSaveViewOpen(false); setSaveViewName('')
    setFeedback({ type: 'success', message: 'Organization view saved.' })
  }
  const applyView = view => {
    const next = { search: '', type: '', status: '', ...(view.filters || {}), page: 1 }
    setFilters(next); load(next)
  }

  const totals = useMemo(() => ({
    total: Object.values(state.counts).reduce((sum, count) => sum + Number(count || 0), 0),
    prospects: state.counts.prospect || 0,
    onboarding: state.counts.onboarding || 0,
    active: state.counts.active || 0,
  }), [state.counts])
  const columns = [
    { key: 'name', label: 'Organization', render: item => <LinkWrap href={`/app/crm/organizations/${item.id || item._id}`} className='tablePrimary'><strong>{item.name}</strong><span>{item.industry || 'Industry not set'}</span></LinkWrap> },
    { key: 'type', label: 'Type', render: item => <StatusBadge tone={item.type === 'oem' ? 'info' : 'success'}>{item.type.toUpperCase()}</StatusBadge> },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={toneForStatus(item.status)}>{item.status}</StatusBadge> },
    { key: 'contact', label: 'Primary contact', render: item => item.primary_contact ? <div className='tablePrimary'><strong>{`${item.primary_contact.first_name} ${item.primary_contact.last_name}`}</strong><span>{item.primary_contact.email}</span></div> : 'Not set' },
    { key: 'owner', label: 'Velakron owner', render: item => OwnerName({ membership: item.account_owner }) },
    { key: 'last', label: 'Last interaction', render: item => formatShortDate(item.last_interaction_at) },
    { key: 'next', label: 'Next action', render: item => <div className='tablePrimary'><strong>{item.next_action?.summary || 'Not set'}</strong><span>{formatShortDate(item.next_action?.due_at)}</span></div> },
  ]

  return <>
    <Seo title='CRM organizations' description='Velakron CRM organizations.' path='/app/crm/organizations' noIndex />
    <AppPageHeader eyebrow='CRM directory' title='Organizations' description='OEM prospects and customers, suppliers, their relationship owners, and the next commitment.' actions={<><Button variant='secondary' onClick={() => setSaveViewOpen(true)}><BookmarkPlus aria-hidden='true' /> Save view</Button><Button variant='secondary' href={`${process.env.NEXT_PUBLIC_API_URL}/crm/exports/organizations.csv`}><Download aria-hidden='true' /> Export</Button><Button variant='secondary' href='/app/crm/settings?section=data'><Upload aria-hidden='true' /> Import</Button><Button onClick={() => { setCreateOpen(true); setFeedback(null) }}><Plus aria-hidden='true' /> New organization</Button></>} />
    <section className='metricGrid crmMetricGrid crmMetricGrid--four'>
      <MetricCard label='All organizations' value={totals.total} detail='Current CRM records' icon={Building2} />
      <MetricCard label='Prospects' value={totals.prospects} detail='Relationships to develop' icon={Search} />
      <MetricCard label='Onboarding' value={totals.onboarding} detail='Working toward activation' icon={UsersRound} />
      <MetricCard label='Active' value={totals.active} detail='Current Velakron relationships' icon={Building2} tone='success' />
    </section>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {savedViews.length > 0 && <div className='crmSavedViews'><span>Saved views</span>{savedViews.map(view => <button type='button' key={view.id} onClick={() => applyView(view)}>{view.name}{view.shared ? ' · Shared' : ''}</button>)}</div>}
    <FilterBar onSubmit={submitFilters} actions={<Button type='submit'><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Company, industry, domain, or tag' /></label>
      <label><span>Type</span><select value={filters.type} onChange={event => setFilters(value => ({ ...value, type: event.target.value }))}><option value=''>OEMs and suppliers</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
      <label><span>Status</span><select value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value=''>Any status</option><option value='prospect'>Prospect</option><option value='onboarding'>Onboarding</option><option value='active'>Active</option><option value='inactive'>Inactive</option></select></label>
    </FilterBar>
    {state.error && <ErrorState title='Organizations could not be loaded' description={state.error} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{state.loading && !state.rows.length ? <AppSkeleton lines={9} /> : <DataTable columns={columns} rows={state.rows} caption='CRM organizations' emptyTitle='No organizations match' emptyDescription='Adjust the filters or add a new organization.' />}</section>
    <Pagination meta={state.meta} onPageChange={changePage} label='Organization pages' />
    <CrmModal open={createOpen} title='Add an organization' description='Create a CRM record without creating a platform account.' onClose={() => !saving && setCreateOpen(false)} wide actions={<><Button variant='secondary' onClick={() => setCreateOpen(false)} disabled={saving}>Cancel</Button><Button type='submit' form='crm-org-form' disabled={saving}>{saving ? 'Saving…' : 'Add organization'}</Button></>}>
      <form id='crm-org-form' onSubmit={save}><FieldGrid>
        <Field label='Company name'><input required minLength={2} maxLength={180} value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} /></Field>
        <Field label='Type'><select value={form.type} onChange={event => setForm(value => ({ ...value, type: event.target.value }))}><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></Field>
        <Field label='Status'><select value={form.status} onChange={event => setForm(value => ({ ...value, status: event.target.value }))}><option value='prospect'>Prospect</option><option value='onboarding'>Onboarding</option><option value='active'>Active</option><option value='inactive'>Inactive</option></select></Field>
        <Field label='Industry'><input maxLength={120} value={form.industry} onChange={event => setForm(value => ({ ...value, industry: event.target.value }))} /></Field>
        <Field label='Website'><input type='url' maxLength={500} value={form.website} onChange={event => setForm(value => ({ ...value, website: event.target.value }))} /></Field>
        <Field label='Velakron owner'><select value={form.account_owner} onChange={event => setForm(value => ({ ...value, account_owner: event.target.value }))}><option value=''>Unassigned</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field>
        <Field label='Lead source'><input maxLength={120} value={form.lead_source} onChange={event => setForm(value => ({ ...value, lead_source: event.target.value }))} placeholder='Referral, IMTS, outbound…' /></Field>
        <Field label='Next action'><input maxLength={500} value={form.next_action} onChange={event => setForm(value => ({ ...value, next_action: event.target.value }))} /></Field>
        <Field label='Follow-up date'><input type='datetime-local' value={form.next_action_at} onChange={event => setForm(value => ({ ...value, next_action_at: event.target.value }))} /></Field>
        <Field label='Notes' wide><textarea rows={5} maxLength={10000} value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} /></Field>
      </FieldGrid></form>
    </CrmModal>
    <CrmModal open={saveViewOpen} title='Save this organization view' description='Keep the current search and filters for quick access.' onClose={() => !saving && setSaveViewOpen(false)} actions={<><Button variant='secondary' onClick={() => setSaveViewOpen(false)}>Cancel</Button><Button type='submit' form='crm-save-org-view' disabled={saving}>Save view</Button></>}><form id='crm-save-org-view' onSubmit={saveView}><Field label='View name'><input required minLength={2} maxLength={120} value={saveViewName} onChange={event => setSaveViewName(event.target.value)} placeholder='My active OEM prospects' /></Field></form></CrmModal>
  </>
}

CrmOrganizations.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmOrganizations
