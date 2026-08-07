import { Link2Off, LoaderCircle, PlayCircle, Search, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, ConfirmationDialog, DataTable, ErrorState,
  FilterBar, Pagination, PermissionDenied, StatusBadge,
} from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { Button } from '../../components/design-system'
import { getHasPermission } from '../../store/slices/appContext'
import { loadPlatformRelationships, platformSelectors, updatePlatformRelationship } from '../../store/slices/entities/platformAdministration'

const Relationships = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const relationships = useSelector(platformSelectors.getRelationships)
  const mutating = useSelector(platformSelectors.getMutating)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', page: 1 })
  const [intent, setIntent] = useState(null)
  const [actionReason, setActionReason] = useState('')
  const [feedback, setFeedback] = useState(null)
  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining this support session.'); return null }
    setReasonError(''); return value
  }
  const load = (page = filters.page) => {
    const value = validReason()
    if (!value) return
    const next = { ...filters, page }; setFilters(next)
    dispatch(loadPlatformRelationships({ ...next, page_size: 25 }, value))
  }
  const submit = event => { event.preventDefault(); load(1) }
  const apply = async () => {
    const supportReason = validReason()
    if (!supportReason || !intent || actionReason.trim().length < 4) return
    const result = await dispatch(updatePlatformRelationship(intent.relationship.id, {
      status: intent.status, reason: actionReason.trim(), version: intent.relationship.version,
    }, supportReason))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The relationship could not be changed.') })
    else { setFeedback({ type: 'success', message: `Relationship changed to ${formatLabel(intent.status)}.` }); setIntent(null); setActionReason(''); load() }
  }
  if (!allowed) return <PermissionDenied description='Only Velakron platform administrators can inspect all relationships.' />
  const columns = [
    { key: 'oem', label: 'OEM', render: item => <div className='tablePrimary'><strong>{item.oem_organization?.name}</strong><span>{item.oem_supplier_code || 'No supplier code'}</span></div> },
    { key: 'supplier', label: 'Supplier', render: item => item.supplier_organization?.name },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'updated', label: 'Updated', render: item => formatDate(item.updated_at) },
    { key: 'actions', label: '', render: item => <div className='tableActionGroup'>{item.status === 'active' ? <Button variant='secondary' onClick={() => setIntent({ relationship: item, status: 'suspended' })}><ShieldAlert aria-hidden='true' /> Suspend</Button> : item.status === 'suspended' ? <Button variant='secondary' onClick={() => setIntent({ relationship: item, status: 'active' })}><PlayCircle aria-hidden='true' /> Reactivate</Button> : null}{!['ended', 'declined'].includes(item.status) && <Button variant='secondary' onClick={() => setIntent({ relationship: item, status: 'ended' })}><Link2Off aria-hidden='true' /> End</Button>}</div> },
  ]
  return <>
    <Seo title='Relationships' description='Audited OEM-supplier relationship administration.' path='/admin/relationships' noIndex />
    <AppPageHeader eyebrow='Platform directory' title='Relationships' description='Inspect and correct relationship state through named, reasoned actions.' actions={<StatusBadge tone='warning'>Audited access</StatusBadge>} />
    <section className='appPanel supportReasonPanel'><label htmlFor='relationship-support-reason'>Reason for this support session</label><input id='relationship-support-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Resolving relationship ticket VK-522' required /><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'Every directory view and status change is recorded.'}</p></section>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FilterBar onSubmit={submit} actions={<Button type='submit' disabled={relationships.loading}><Search aria-hidden='true' /> Search</Button>}><label><span>Search companies</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='OEM or supplier name' /></label><label><span>Status</span><select value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value=''>All current</option><option value='pending_supplier'>Pending supplier</option><option value='active'>Active</option><option value='suspended'>Suspended</option><option value='ended'>Ended</option><option value='declined'>Declined</option></select></label></FilterBar>
    {relationships.error && <ErrorState description={relationships.error.message} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{relationships.loading ? <AppSkeleton lines={8} /> : <DataTable caption='OEM-supplier relationships' columns={columns} rows={relationships.items} emptyTitle='No relationships found' emptyDescription='Enter a valid support reason and adjust the filters.' />}</section>
    <Pagination meta={relationships.pagination} onPageChange={load} label='Relationship pages' />
    <ConfirmationDialog open={Boolean(intent)} title={`${formatLabel(intent?.status)} this relationship?`} description='The relationship history and production history will be preserved. Access changes take effect immediately.' confirmLabel={mutating ? 'Saving…' : formatLabel(intent?.status)} danger={['suspended', 'ended'].includes(intent?.status)} confirmDisabled={mutating || actionReason.trim().length < 4} onClose={() => { setIntent(null); setActionReason('') }} onConfirm={apply}><label className='textAreaField' htmlFor='relationship-status-reason'><span>Reason</span><textarea id='relationship-status-reason' value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={4} maxLength={500} required /></label></ConfirmationDialog>
  </>
}

Relationships.getLayout = PortalPageLayout
export default Relationships
