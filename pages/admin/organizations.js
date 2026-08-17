import { Building2, ExternalLink, LoaderCircle, Plus, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, DataTable, ErrorState, FilterBar, Pagination,
  PermissionDenied, ResponsiveDrawer, StatusBadge,
} from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import { Button } from '../../components/design-system'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { getHasPermission } from '../../store/slices/appContext'
import { loadOrganizations, organizationSelectors } from '../../store/slices/entities/organizations'
import { createPlatformOrganization, loadPlatformActionCenter, platformSelectors, trackProductEvent } from '../../store/slices/entities/platformAdministration'
import PlatformActionQueue from '../../components/app/PlatformActionQueue'

const emptyCreate = { name: '', slug: '', type: 'oem', status: 'pending', contact_name: '', contact_email: '' }

const Organizations = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const organizations = useSelector(organizationSelectors.getEntities)
  const loading = useSelector(organizationSelectors.getEntityLoading)
  const error = useSelector(organizationSelectors.getEntityError)
  const pagination = useSelector(organizationSelectors.getEntityPagination)
  const actionCenter = useSelector(platformSelectors.getActionCenter)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [filters, setFilters] = useState({ search: '', type: '', status: '', onboarding_state: '', page: 1 })
  const [createOpen, setCreateOpen] = useState(false)
  const [create, setCreate] = useState(emptyCreate)
  const [createReason, setCreateReason] = useState('')
  const [createReasonError, setCreateReasonError] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const createReasonRef = useRef(null)

  useEffect(() => { if (allowed) dispatch(loadPlatformActionCenter()) }, [allowed, dispatch])

  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining the support need.'); return null }
    setReasonError(''); return value
  }
  const load = (page = filters.page, reasonOverride = null) => {
    const value = reasonOverride || validReason()
    if (!value) return
    const next = { ...filters, page }
    setFilters(next)
    dispatch(loadOrganizations({ ...next, reason: value, page_size: 25 }))
    dispatch(trackProductEvent('admin.directory_viewed', 'platform_admin'))
  }
  const submitSearch = event => { event.preventDefault(); load(1) }
  const openCreate = () => {
    setFeedback(null)
    setCreateReasonError('')
    setCreateReason(current => current || (reason.trim().length >= 8 ? reason.trim() : ''))
    setCreateOpen(true)
  }
  const closeCreate = () => {
    if (pending) return
    setCreateOpen(false)
    setFeedback(null)
    setCreateReasonError('')
  }
  const submitCreate = async event => {
    event.preventDefault()
    const supportReason = createReason.trim()
    if (supportReason.length < 8) {
      setCreateReasonError('Enter at least 8 characters explaining why this organization is being created.')
      createReasonRef.current?.focus()
      return
    }
    setCreateReasonError('')
    setPending(true); setFeedback(null)
    const result = await dispatch(createPlatformOrganization({
      name: create.name, slug: create.slug, type: create.type, status: create.status,
      primary_contact: { name: create.contact_name, email: create.contact_email, phone: '' },
    }, supportReason))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'The organization could not be created.') })
    setReason(supportReason); setReasonError(''); setCreateReason(''); setCreate(emptyCreate); setCreateOpen(false); dispatch(loadPlatformActionCenter()); load(1, supportReason)
  }
  if (!allowed) return <PermissionDenied description='Only Velakron platform administrators can search across organizations.' />

  const columns = [
    { key: 'name', label: 'Organization', render: item => <div className='tablePrimary'><strong>{item.name}</strong><span>{item.slug}</span></div> },
    { key: 'type', label: 'Type', render: item => formatLabel(item.type) },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'onboarding_state', label: 'Onboarding', render: item => formatLabel(item.onboarding_state) },
    { key: 'updated_at', label: 'Updated', render: item => formatDate(item.updated_at) },
    { key: 'actions', label: '', render: item => <Button href={`/admin/organizations/${item.id}`} variant='secondary' className='tableAction'>Open <ExternalLink aria-hidden='true' /></Button> },
  ]

  return <>
    <Seo title='Organizations' description='Audited organization support directory.' path='/admin/organizations' noIndex />
    <AppPageHeader eyebrow='Platform directory' title='Organizations' description='Search, create, and inspect organizations through audited support controls.' actions={<Button onClick={openCreate}><Plus aria-hidden='true' /> New organization</Button>} />
    <PlatformActionQueue
      title='Organization approvals'
      description='Activated OEM accounts appear automatically. Full company details still require a recorded review reason.'
      items={(actionCenter?.needs_velakron || []).filter(item => item.kind === 'organization_review')}
      emptyTitle='No organizations are awaiting approval'
      emptyDescription='An OEM will appear here as soon as its invited administrator activates the account.'
      compact
    />
    <section className='appPanel supportReasonPanel'>
      <label htmlFor='support-reason'>Reason for accessing customer organizations</label>
      <input id='support-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Investigating onboarding ticket VK-104' required />
      <p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'This reason is sent securely with each request and never placed in the URL.'}</p>
    </section>
    <FilterBar onSubmit={submitSearch} actions={<Button type='submit' disabled={loading}><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name, slug, or reference' /></label>
      <label><span>Type</span><select value={filters.type} onChange={event => setFilters(value => ({ ...value, type: event.target.value }))}><option value=''>All types</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option><option value='velakron'>Velakron</option></select></label>
      <label><span>Status</span><select value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value=''>Current statuses</option><option value='pending'>Pending</option><option value='active'>Active</option><option value='suspended'>Suspended</option><option value='archived'>Archived</option></select></label>
      <label><span>Onboarding</span><select value={filters.onboarding_state} onChange={event => setFilters(value => ({ ...value, onboarding_state: event.target.value }))}><option value=''>All states</option><option value='not_started'>Not started</option><option value='in_progress'>In progress</option><option value='complete'>Complete</option></select></label>
    </FilterBar>
    {error && <ErrorState description={error.message} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{loading ? <AppSkeleton lines={8} /> : <DataTable caption='Organizations returned for this support request' columns={columns} rows={organizations} emptyTitle='No organizations found' emptyDescription='Enter a support reason and adjust the filters.' />}</section>
    <Pagination meta={pagination} onPageChange={load} label='Organization pages' />
    <ResponsiveDrawer open={createOpen} title='Create organization' onClose={closeCreate}>
      <form className='drawerForm organizationCreateForm' onSubmit={submitCreate} aria-busy={pending}>
        <div className='organizationCreateIntro'>
          <span><Building2 aria-hidden='true' /></span>
          <div>
            <strong>Company workspace</strong>
            <p>Create the company record first. You can invite its first administrator from the organization detail page.</p>
          </div>
        </div>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>

        <section className='drawerForm__section'>
          <header><span>01</span><div><h3>Organization identity</h3><p>Name and workspace address shown throughout Velakron.</p></div></header>
          <div className='drawerForm__grid'>
            <label className='drawerForm__field drawerForm__field--wide'><span>Organization name</span><input value={create.name} onChange={event => setCreate(value => ({ ...value, name: event.target.value }))} minLength={2} maxLength={180} placeholder='Example: Asterion Aerostructures' required /></label>
            <label className='drawerForm__field drawerForm__field--wide'><span>URL slug</span><input value={create.slug} onChange={event => setCreate(value => ({ ...value, slug: event.target.value.toLowerCase() }))} pattern='[a-z0-9]+(?:-[a-z0-9]+)*' placeholder='asterion-aerostructures' required /><small>Lowercase letters, numbers, and hyphens only.</small></label>
            <label className='drawerForm__field'><span>Organization type</span><select value={create.type} onChange={event => setCreate(value => ({ ...value, type: event.target.value }))}><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
            <label className='drawerForm__field'><span>Initial status</span><select value={create.status} onChange={event => setCreate(value => ({ ...value, status: event.target.value }))}><option value='pending'>Pending</option><option value='active'>Active</option></select></label>
          </div>
        </section>

        <section className='drawerForm__section'>
          <header><span>02</span><div><h3>Primary contact</h3><p>Optional contact details for onboarding and follow-up.</p></div></header>
          <div className='drawerForm__grid'>
            <label className='drawerForm__field drawerForm__field--wide'><span>Contact name</span><input value={create.contact_name} onChange={event => setCreate(value => ({ ...value, contact_name: event.target.value }))} maxLength={160} placeholder='Full name' /></label>
            <label className='drawerForm__field drawerForm__field--wide'><span>Contact email</span><input type='email' value={create.contact_email} onChange={event => setCreate(value => ({ ...value, contact_email: event.target.value }))} maxLength={320} placeholder='name@company.com' /></label>
          </div>
        </section>

        <section className='drawerForm__audit'>
          <header><ShieldCheck aria-hidden='true' /><div><h3>Administrative reason</h3><p>Recorded in the audit history with this action.</p></div></header>
          <label className='drawerForm__field' htmlFor='create-organization-reason'><span>Reason for creating this organization</span></label>
          <textarea
            id='create-organization-reason'
            ref={createReasonRef}
            value={createReason}
            onChange={event => { setCreateReason(event.target.value); if (createReasonError) setCreateReasonError('') }}
            onInvalid={event => { event.preventDefault(); setCreateReasonError('Enter at least 8 characters explaining why this organization is being created.') }}
            minLength={8}
            maxLength={500}
            rows={3}
            placeholder='Example: Approved onboarding request from the sales team'
            aria-invalid={Boolean(createReasonError)}
            aria-describedby={createReasonError ? 'create-organization-reason-error' : 'create-organization-reason-help'}
            required
          />
          <p id={createReasonError ? 'create-organization-reason-error' : 'create-organization-reason-help'} className={createReasonError ? 'formHint formHint--error' : 'formHint'} role={createReasonError ? 'alert' : undefined}>{createReasonError || 'Use at least 8 characters. This note is never placed in the URL.'}</p>
        </section>

        <footer className='drawerForm__actions'>
          <Button type='button' variant='secondary' onClick={closeCreate} disabled={pending}>Cancel</Button>
          <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Building2 aria-hidden='true' />} {pending ? 'Creating…' : 'Create organization'}</Button>
        </footer>
      </form>
    </ResponsiveDrawer>
  </>
}

Organizations.getLayout = PortalPageLayout
export default Organizations
