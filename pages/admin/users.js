import { LoaderCircle, Search, ShieldAlert, UserCheck } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, ConfirmationDialog, DataTable, ErrorState,
  FilterBar, Pagination, PermissionDenied, StatusBadge,
} from '../../components/app'
import { formatDateTime, formatLabel, formatRole, statusTone } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { Button } from '../../components/design-system'
import { getAuthUser } from '../../store/slices/auth'
import { getHasPermission } from '../../store/slices/appContext'
import { loadPlatformUsers, platformSelectors, updatePlatformUserStatus } from '../../store/slices/entities/platformAdministration'

const Users = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const currentUser = useSelector(getAuthUser)
  const users = useSelector(platformSelectors.getUsers)
  const mutating = useSelector(platformSelectors.getMutating)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [filters, setFilters] = useState({ search: '', status: '', role: '', page: 1 })
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
    dispatch(loadPlatformUsers({ ...next, page_size: 25 }, value))
  }
  const submit = event => { event.preventDefault(); load(1) }
  const applyStatus = async () => {
    const supportReason = validReason()
    if (!supportReason || !intent || actionReason.trim().length < 4) return
    const result = await dispatch(updatePlatformUserStatus(intent.user.id, { status: intent.status, reason: actionReason.trim() }, supportReason))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The account status could not be changed.') })
    else { setFeedback({ type: 'success', message: `Account changed to ${formatLabel(intent.status)}.` }); setIntent(null); setActionReason(''); load() }
  }
  if (!allowed) return <PermissionDenied description='Only Velakron platform administrators can view this area.' />

  const columns = [
    { key: 'user', label: 'User', render: item => <div className='tablePrimary'><strong>{[item.user?.first_name, item.user?.last_name].filter(Boolean).join(' ') || 'User'}</strong><span>{item.user?.email}</span></div> },
    { key: 'organization', label: 'Organization', render: item => <div className='tablePrimary'><strong>{item.organization?.name}</strong><span>{formatLabel(item.organization?.type)}</span></div> },
    { key: 'role', label: 'Role', render: item => formatRole(item.role) },
    { key: 'status', label: 'Membership', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'account', label: 'Account', render: item => <StatusBadge tone={statusTone(item.user?.account_status)}>{formatLabel(item.user?.account_status)}</StatusBadge> },
    { key: 'last_active', label: 'Last active', render: item => formatDateTime(item.last_active_at || item.user?.last_successful_login_at) },
    { key: 'actions', label: '', render: item => item.user?.id !== currentUser?.id && <Button variant='secondary' className='tableAction' onClick={() => setIntent({ user: item.user, status: item.user?.account_status === 'active' ? 'suspended' : 'active' })}>{item.user?.account_status === 'active' ? <><ShieldAlert aria-hidden='true' /> Suspend</> : <><UserCheck aria-hidden='true' /> Activate</>}</Button> },
  ]

  return <>
    <Seo title='Users and memberships' description='Audited cross-company membership directory.' path='/admin/users' noIndex />
    <AppPageHeader eyebrow='Platform access' title='Users & memberships' description='Search safe account and membership metadata. Account actions invalidate existing sessions.' actions={<StatusBadge tone='warning'>Audited access</StatusBadge>} />
    <section className='appPanel supportReasonPanel'><label htmlFor='user-support-reason'>Reason for this support session</label><input id='user-support-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Investigating account access ticket VK-418' required /><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'The support reason is recorded and never placed in the URL.'}</p></section>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FilterBar onSubmit={submit} actions={<Button type='submit' disabled={users.loading}><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search people</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name or email' /></label>
      <label><span>Membership status</span><select value={filters.status} onChange={event => setFilters(value => ({ ...value, status: event.target.value }))}><option value=''>All current</option><option value='active'>Active</option><option value='invited'>Invited</option><option value='suspended'>Suspended</option><option value='revoked'>Revoked</option></select></label>
      <label><span>Role</span><select value={filters.role} onChange={event => setFilters(value => ({ ...value, role: event.target.value }))}><option value=''>All roles</option><option value='oem_admin'>OEM administrator</option><option value='oem_user'>OEM member</option><option value='supplier_admin'>Supplier administrator</option><option value='supplier_user'>Supplier member</option><option value='velakron_admin'>Velakron administrator</option></select></label>
    </FilterBar>
    {users.error && <ErrorState description={users.error.message} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{users.loading ? <AppSkeleton lines={8} /> : <DataTable columns={columns} rows={users.items} caption='Platform users and memberships' emptyTitle='No memberships found' emptyDescription='Enter a valid support reason and adjust the filters.' />}</section>
    <Pagination meta={users.pagination} onPageChange={load} label='User pages' />
    <ConfirmationDialog open={Boolean(intent)} title={`${formatLabel(intent?.status)} ${intent?.user?.first_name || 'account'}?`} description='This changes account access across every organization and invalidates current sessions. Membership history is preserved.' confirmLabel={mutating ? 'Saving…' : formatLabel(intent?.status)} danger={intent?.status === 'suspended'} confirmDisabled={mutating || actionReason.trim().length < 4} onClose={() => { setIntent(null); setActionReason('') }} onConfirm={applyStatus}>
      <label className='textAreaField' htmlFor='account-status-reason'><span>Reason</span><textarea id='account-status-reason' value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={4} maxLength={500} required /></label>
    </ConfirmationDialog>
  </>
}

Users.getLayout = PortalPageLayout
export default Users
