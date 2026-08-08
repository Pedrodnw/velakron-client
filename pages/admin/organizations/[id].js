import { Archive, ArrowLeft, Building2, CheckCircle2, LoaderCircle, MailPlus, PauseCircle, PlayCircle, Search, UserRound } from 'lucide-react'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, AuditEventRow, ConfirmationDialog, DataTable,
  EmptyState, ErrorState, PermissionDenied, StatusBadge,
} from '../../../components/app'
import { formatDate, formatDateTime, formatLabel, formatRole, statusTone } from '../../../components/app/formatters'
import { Button } from '../../../components/design-system'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { getHasPermission } from '../../../store/slices/appContext'
import UserTableIdentity from '../../../components/app/UserTableIdentity'
import {
  invitePlatformOrganizationAdmin,
  loadPlatformOrganization,
  platformSelectors,
  revokePlatformInvitation,
  trackProductEvent,
  updatePlatformOrganizationStatus,
} from '../../../store/slices/entities/platformAdministration'

const OrganizationDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const detail = useSelector(platformSelectors.getOrganizationDetail(router.query.id))
  const loading = useSelector(platformSelectors.getDetailLoading)
  const error = useSelector(platformSelectors.getDetailError)
  const mutating = useSelector(platformSelectors.getMutating)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [invite, setInvite] = useState({ first_name: '', last_name: '', email: '' })
  const [statusIntent, setStatusIntent] = useState(null)
  const [actionReason, setActionReason] = useState('')

  const supportReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters describing the support need.'); return null }
    setReasonError(''); return value
  }
  const load = async event => {
    event?.preventDefault()
    const value = supportReason()
    if (!value || !router.query.id) return
    const result = await dispatch(loadPlatformOrganization(router.query.id, value))
    if (result?.ok) dispatch(trackProductEvent('admin.organization_viewed', 'platform_admin'))
  }
  const submitInvite = async event => {
    event.preventDefault()
    const value = supportReason()
    if (!value || !detail?.organization) return
    setFeedback(null)
    const role = detail.organization.type === 'supplier' ? 'supplier_admin' : detail.organization.type === 'oem' ? 'oem_admin' : 'velakron_admin'
    const result = await dispatch(invitePlatformOrganizationAdmin(detail.organization.id, { ...invite, role }, value))
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'The invitation could not be issued.') })
    setInvite({ first_name: '', last_name: '', email: '' }); setFeedback({ type: 'success', message: 'Administrator invitation issued.' }); load()
  }
  const revokeInvitation = async invitation => {
    const value = supportReason()
    if (!value) return
    const result = await dispatch(revokePlatformInvitation(detail.organization.id, invitation.id, 'Revoked during platform support review', value))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The invitation could not be revoked.') })
    else load()
  }
  const confirmStatus = async () => {
    const value = supportReason()
    if (!value || !statusIntent) return
    if (actionReason.trim().length < 4) {
      setFeedback({ type: 'error', message: 'Enter at least four characters explaining this status change.' })
      return
    }
    const result = await dispatch(updatePlatformOrganizationStatus(detail.organization.id, {
      status: statusIntent,
      reason: actionReason.trim(),
      version: detail.organization.version,
    }, value))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The status could not be changed.') })
    else { setFeedback({ type: 'success', message: `Organization changed to ${formatLabel(statusIntent)}.` }); setStatusIntent(null); setActionReason(''); load() }
  }

  if (!allowed) return <PermissionDenied description='Only Velakron platform administrators can use organization support tools.' />
  const organization = detail?.organization
  const membershipColumns = [
    { key: 'user', label: 'Member', render: item => <UserTableIdentity user={item.user} /> },
    { key: 'role', label: 'Role', render: item => formatRole(item.role) },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'last_active', label: 'Last active', render: item => formatDateTime(item.last_active_at) },
  ]
  const relationshipColumns = [
    { key: 'oem', label: 'OEM', render: item => item.oem_organization?.name },
    { key: 'supplier', label: 'Supplier', render: item => item.supplier_organization?.name },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'updated', label: 'Updated', render: item => formatDate(item.updated_at) },
  ]

  return <>
    <Seo title={organization ? `${organization.name} administration` : 'Organization administration'} description='Audited organization support details.' path={`/admin/organizations/${router.query.id || ''}`} noIndex />
    <Button href='/admin/organizations' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Organizations</Button>
    <AppPageHeader eyebrow='Audited support' title={organization?.name || 'Organization detail'} description='Read-only support overview with narrow, reasoned controls. Impersonation is not available.' actions={organization && <StatusBadge tone={statusTone(organization.status)}>{formatLabel(organization.status)}</StatusBadge>} />
    <section className='appPanel supportReasonPanel'>
      <form className='supportReasonForm' onSubmit={load}><label htmlFor='organization-detail-reason'>Reason for this support session</label><div><input id='organization-detail-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Resolving organization access ticket VK-301' required /><Button type='submit' disabled={loading}><Search aria-hidden='true' /> Load organization</Button></div><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'Every view and action is recorded with this reason.'}</p></form>
    </section>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {error && <ErrorState description={error.message} onRetry={load} />}
    {loading && !organization ? <section className='appPanel'><AppSkeleton lines={10} /></section> : organization ? <>
      <div className='appDashboardGrid'>
        <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Configuration</p><h2>Company details</h2></div></header><dl className='appDetailList'><div><dt>Type</dt><dd>{formatLabel(organization.type)}</dd></div><div><dt>Status</dt><dd>{formatLabel(organization.status)}</dd></div><div><dt>Onboarding</dt><dd>{formatLabel(organization.onboarding_state)}</dd></div><div><dt>Primary contact</dt><dd>{organization.primary_contact?.name || 'Not configured'}<br />{organization.primary_contact?.email || ''}</dd></div><div><dt>Timezone</dt><dd>{organization.timezone}</dd></div><div><dt>Created</dt><dd>{formatDate(organization.created_at)}</dd></div></dl></section>
        <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Consequences</p><h2>Access controls</h2></div></header><p>Suspension blocks active members from using this workspace while preserving production and audit history.</p><dl className='appDetailList'><div><dt>Active members affected</dt><dd>{detail.membership_counts?.active || 0}</dd></div><div><dt>Active production retained</dt><dd>{detail.production_counts?.active || 0}</dd></div><div><dt>Support mode</dt><dd>Read-only · no impersonation</dd></div></dl><div className='reviewActions'>{organization.status !== 'active' && <Button onClick={() => setStatusIntent('active')}><PlayCircle aria-hidden='true' /> Activate</Button>}{organization.status === 'active' && organization.type !== 'velakron' && <Button className='vk-button--danger' onClick={() => setStatusIntent('suspended')}><PauseCircle aria-hidden='true' /> Suspend</Button>}{organization.status !== 'archived' && organization.type !== 'velakron' && <Button variant='secondary' onClick={() => setStatusIntent('archived')}><Archive aria-hidden='true' /> Archive</Button>}</div></section>
      </div>
      <section className='appPanel appPanel--table'><header className='appPanel__header'><div><p className='technicalLabel'>Access</p><h2>Memberships</h2></div><StatusBadge tone='info'>{detail.memberships?.length || 0} shown</StatusBadge></header><DataTable caption='Current organization memberships' columns={membershipColumns} rows={detail.memberships || []} /></section>
      <div className='appDashboardGrid'>
        <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>First administrator</p><h2>Issue invitation</h2></div></header><form className='drawerForm' onSubmit={submitInvite}><label><span>First name</span><input value={invite.first_name} onChange={event => setInvite(value => ({ ...value, first_name: event.target.value }))} maxLength={80} /></label><label><span>Last name</span><input value={invite.last_name} onChange={event => setInvite(value => ({ ...value, last_name: event.target.value }))} maxLength={80} /></label><label><span>Email</span><input type='email' value={invite.email} onChange={event => setInvite(value => ({ ...value, email: event.target.value }))} required /></label><Button type='submit' disabled={mutating}>{mutating ? <LoaderCircle className='spin' aria-hidden='true' /> : <MailPlus aria-hidden='true' />} Issue administrator invitation</Button></form></section>
        <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Pending access</p><h2>Invitations</h2></div></header>{detail.pending_invitations?.length ? <div className='invitationList'>{detail.pending_invitations.map(item => <article key={item.id}><div><strong>{item.email}</strong><span>{formatRole(item.role)} · expires {formatDate(item.expires_at)}</span></div><Button variant='secondary' onClick={() => revokeInvitation(item)}>Revoke</Button></article>)}</div> : <EmptyState compact title='No pending invitations' description='Issue the first administrator invitation when the company is ready.' />}</section>
      </div>
      <section className='appPanel appPanel--table'><header className='appPanel__header'><div><p className='technicalLabel'>Connections</p><h2>Relationships</h2></div></header><DataTable caption='Current OEM-supplier relationships' columns={relationshipColumns} rows={detail.relationships || []} emptyTitle='No current relationships' emptyDescription='Relationships appear after an OEM connects with a supplier.' /></section>
      <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Security history</p><h2>Recent audited activity</h2></div></header>{detail.recent_audit_events?.length ? <div className='auditEventList'>{detail.recent_audit_events.map(event => <AuditEventRow key={event.id} event={event} />)}</div> : <EmptyState compact title='No audit activity' description='Security-relevant actions will appear here.' />}</section>
    </> : <section className='appPanel'><EmptyState icon={Building2} title='Load organization details' description='Enter a valid support reason to view this organization.' /></section>}
    <ConfirmationDialog open={Boolean(statusIntent)} title={`${formatLabel(statusIntent)} ${organization?.name || 'organization'}?`} description={`${statusIntent === 'suspended' ? `This will block ${detail?.membership_counts?.active || 0} active members from accessing the workspace. ` : ''}Production and audit history will be preserved. Enter the reason below before confirming.`} confirmLabel={mutating ? 'Saving…' : formatLabel(statusIntent)} danger={['suspended', 'archived'].includes(statusIntent)} confirmDisabled={mutating || actionReason.trim().length < 4} onClose={() => { setStatusIntent(null); setActionReason('') }} onConfirm={confirmStatus}>
      <label className='textAreaField' htmlFor='organization-status-reason'><span>Reason</span><textarea id='organization-status-reason' value={actionReason} onChange={event => setActionReason(event.target.value)} minLength={4} maxLength={500} required /></label>
    </ConfirmationDialog>
  </>
}

OrganizationDetail.getLayout = PortalPageLayout
export default OrganizationDetail
