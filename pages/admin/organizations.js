import { Building2, ExternalLink, LoaderCircle, Plus, Search } from 'lucide-react'
import { useState } from 'react'
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
import { createPlatformOrganization, trackProductEvent } from '../../store/slices/entities/platformAdministration'

const emptyCreate = { name: '', slug: '', type: 'oem', status: 'pending', contact_name: '', contact_email: '' }

const Organizations = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const organizations = useSelector(organizationSelectors.getEntities)
  const loading = useSelector(organizationSelectors.getEntityLoading)
  const error = useSelector(organizationSelectors.getEntityError)
  const pagination = useSelector(organizationSelectors.getEntityPagination)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [filters, setFilters] = useState({ search: '', type: '', status: '', onboarding_state: '', page: 1 })
  const [createOpen, setCreateOpen] = useState(false)
  const [create, setCreate] = useState(emptyCreate)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining the support need.'); return null }
    setReasonError(''); return value
  }
  const load = (page = filters.page) => {
    const value = validReason()
    if (!value) return
    const next = { ...filters, page }
    setFilters(next)
    dispatch(loadOrganizations({ ...next, reason: value, page_size: 25 }))
    dispatch(trackProductEvent('admin.directory_viewed', 'platform_admin'))
  }
  const submitSearch = event => { event.preventDefault(); load(1) }
  const submitCreate = async event => {
    event.preventDefault()
    const supportReason = validReason()
    if (!supportReason) return
    setPending(true); setFeedback(null)
    const result = await dispatch(createPlatformOrganization({
      name: create.name, slug: create.slug, type: create.type, status: create.status,
      primary_contact: { name: create.contact_name, email: create.contact_email, phone: '' },
    }, supportReason))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'The organization could not be created.') })
    setCreate(emptyCreate); setCreateOpen(false); load(1)
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
    <AppPageHeader eyebrow='Platform directory' title='Organizations' description='Search, create, and inspect organizations through audited support controls.' actions={<Button onClick={() => setCreateOpen(true)}><Plus aria-hidden='true' /> New organization</Button>} />
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
    <ResponsiveDrawer open={createOpen} title='Create organization' onClose={() => setCreateOpen(false)}>
      <form className='drawerForm' onSubmit={submitCreate}>
        <p>Create only the company record here. Invite its first administrator from the organization detail page.</p>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <label><span>Organization name</span><input value={create.name} onChange={event => setCreate(value => ({ ...value, name: event.target.value }))} minLength={2} maxLength={180} required /></label>
        <label><span>URL slug</span><input value={create.slug} onChange={event => setCreate(value => ({ ...value, slug: event.target.value.toLowerCase() }))} pattern='[a-z0-9]+(?:-[a-z0-9]+)*' required /></label>
        <label><span>Type</span><select value={create.type} onChange={event => setCreate(value => ({ ...value, type: event.target.value }))}><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
        <label><span>Initial status</span><select value={create.status} onChange={event => setCreate(value => ({ ...value, status: event.target.value }))}><option value='pending'>Pending</option><option value='active'>Active</option></select></label>
        <label><span>Primary contact name</span><input value={create.contact_name} onChange={event => setCreate(value => ({ ...value, contact_name: event.target.value }))} maxLength={160} /></label>
        <label><span>Primary contact email</span><input type='email' value={create.contact_email} onChange={event => setCreate(value => ({ ...value, contact_email: event.target.value }))} maxLength={320} /></label>
        <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Building2 aria-hidden='true' />} Create organization</Button>
      </form>
    </ResponsiveDrawer>
  </>
}

Organizations.getLayout = PortalPageLayout
export default Organizations
