import { LoaderCircle, MailPlus, MoreHorizontal, RefreshCw, Shield, UserX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  PermissionDenied,
  ResponsiveDrawer,
  StatusBadge,
  Tabs,
} from '../../components/app'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { formatDate, formatRole, formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { getAuthUser } from '../../store/slices/auth'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import {
  invitationSelectors,
  inviteMember,
  loadInvitations,
  resendInvitation,
  revokeInvitation,
} from '../../store/slices/entities/invitations'
import { loadMemberships, membershipSelectors, updateMembership } from '../../store/slices/entities/memberships'

const memberName = membership => {
  const user = membership.user || {}
  return [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email || 'Member'
}

const rolesForOrganization = type => ({
  velakron: ['velakron_admin'],
  oem: ['oem_admin', 'oem_user'],
  supplier: ['supplier_admin', 'supplier_user'],
}[type] || [])

const emptyInvite = { first_name: '', last_name: '', email: '', role: '', message: '' }

const Team = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const user = useSelector(getAuthUser)
  const canRead = useSelector(getHasPermission('membership.read'))
  const canInvite = useSelector(getHasPermission('membership.invite'))
  const canManage = useSelector(getHasPermission('membership.manage'))
  const memberships = useSelector(membershipSelectors.getEntities)
  const invitations = useSelector(invitationSelectors.getEntities)
  const membershipsLoading = useSelector(membershipSelectors.getEntityLoading)
  const invitationsLoading = useSelector(invitationSelectors.getEntityLoading)
  const membershipsError = useSelector(membershipSelectors.getEntityError)
  const invitationsError = useSelector(invitationSelectors.getEntityError)
  const [tab, setTab] = useState('members')
  const [drawer, setDrawer] = useState(null)
  const [invite, setInvite] = useState(emptyInvite)
  const [management, setManagement] = useState({ role: '', status: '', reason: '' })
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const roleOptions = useMemo(() => rolesForOrganization(organization?.type), [organization?.type])
  const load = () => {
    if (!organization?.id || !canRead) return
    dispatch(loadMemberships(organization.id))
    dispatch(loadInvitations(organization.id))
  }

  useEffect(() => { load() }, [canRead, dispatch, organization?.id])

  if (!canRead) return <PermissionDenied />
  if (membershipsLoading && !memberships.length) return <section className='appPanel'><AppSkeleton lines={6} /></section>

  const closeDrawer = () => { setDrawer(null); setFeedback(null); setPending(false) }
  const openInvite = () => {
    setInvite({ ...emptyInvite, role: roleOptions.at(-1) || '' })
    setFeedback(null)
    setDrawer('invite')
  }
  const openManage = membership => {
    setManagement({ role: membership.role, status: membership.status, reason: '' })
    setFeedback(null)
    setDrawer({ type: 'manage', membership })
  }

  const submitInvite = async event => {
    event.preventDefault()
    setPending(true)
    setFeedback(null)
    const result = await dispatch(inviteMember(organization.id, invite))
    setPending(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'We could not send the invitation.') }); return }
    setFeedback({ type: 'success', message: `Invitation prepared for ${invite.email}.` })
    setInvite({ ...emptyInvite, role: roleOptions.at(-1) || '' })
    dispatch(loadInvitations(organization.id))
    dispatch(loadMemberships(organization.id))
  }

  const submitManagement = async event => {
    event.preventDefault()
    const target = drawer.membership
    setPending(true)
    setFeedback(null)
    const result = await dispatch(updateMembership(target.id, {
      role: management.role,
      status: management.status,
      reason: management.reason,
      version: target.version,
    }))
    setPending(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'We could not update this access.') }); return }
    closeDrawer()
    dispatch(loadMemberships(organization.id))
  }

  const invitationAction = async (invitation, action) => {
    setPending(true)
    setFeedback(null)
    const result = action === 'resend'
      ? await dispatch(resendInvitation(organization.id, invitation.id))
      : await dispatch(revokeInvitation(organization.id, invitation.id, 'Organization administrator revoked invitation'))
    setPending(false)
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The invitation could not be updated.') })
    dispatch(loadInvitations(organization.id))
  }

  const memberColumns = [
    { key: 'member', label: 'Member', render: item => <div className='tablePrimary'><strong>{memberName(item)}</strong><span>{item.user?.email}</span></div> },
    { key: 'role', label: 'Role', render: item => formatRole(item.role) },
    { key: 'status', label: 'Access', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'joined_at', label: 'Joined', render: item => formatDate(item.joined_at) },
    ...(canManage ? [{ key: 'actions', label: 'Actions', render: item => <Button variant='secondary' className='tableAction' onClick={() => openManage(item)} disabled={String(item.user?.id || item.user?._id) === String(user?.id || user?._id)}><MoreHorizontal aria-hidden='true' /> Manage</Button> }] : []),
  ]
  const invitationColumns = [
    { key: 'email', label: 'Invited person', render: item => <div className='tablePrimary'><strong>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.email}</strong><span>{item.email}</span></div> },
    { key: 'role', label: 'Role', render: item => formatRole(item.role) },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'expires_at', label: 'Expires', render: item => formatDate(item.expires_at) },
    ...(canInvite ? [{ key: 'actions', label: 'Actions', render: item => item.status === 'pending' ? <div className='tableActions'><Button variant='secondary' className='tableAction' onClick={() => invitationAction(item, 'resend')} disabled={pending}><RefreshCw aria-hidden='true' /> Resend</Button><Button variant='secondary' className='tableAction tableAction--danger' onClick={() => invitationAction(item, 'revoke')} disabled={pending}><UserX aria-hidden='true' /> Revoke</Button></div> : '—' }] : []),
  ]

  return <>
    <Seo title='Team' description='Organization invitations, roles, and access.' path='/app/team' noIndex />
    <AppPageHeader eyebrow='Access control' title='Team' description={`Invite people and manage their access to ${organization.name}. Account security and company access remain separate.`} actions={canInvite && <Button onClick={openInvite}><MailPlus aria-hidden='true' /> Invite Member</Button>} />
    <div className='teamToolbar'><Tabs items={[{ key: 'members', label: 'Members', count: memberships.length }, { key: 'invitations', label: 'Invitations', count: invitations.length }]} activeKey={tab} onChange={setTab} /><StatusBadge tone='info'><Shield aria-hidden='true' /> Organization-scoped</StatusBadge></div>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {(membershipsError || invitationsError) && <ErrorState description={(membershipsError || invitationsError).message} onRetry={load} />}
    <section className='appPanel appPanel--table'>
      {tab === 'members' ? <DataTable caption={`Memberships for ${organization.name}`} columns={memberColumns} rows={memberships} emptyTitle='No memberships found' emptyDescription='Invite the first teammate to start collaborating.' /> : invitationsLoading && !invitations.length ? <AppSkeleton lines={5} /> : <DataTable caption={`Invitations for ${organization.name}`} columns={invitationColumns} rows={invitations} emptyTitle='No invitations yet' emptyDescription='Pending and completed invitations will appear here.' />}
    </section>

    <ResponsiveDrawer open={drawer === 'invite'} title='Invite a team member' onClose={closeDrawer}>
      <form className='drawerForm' onSubmit={submitInvite}>
        <p>The invited person can access only <strong>{organization.name}</strong> with the role selected below.</p>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <div className='authForm__row'><FormField id='invite-member-first' label='First name' name='first_name' value={invite.first_name} onChange={event => setInvite(current => ({ ...current, first_name: event.target.value }))} /><FormField id='invite-member-last' label='Last name' name='last_name' value={invite.last_name} onChange={event => setInvite(current => ({ ...current, last_name: event.target.value }))} /></div>
        <FormField id='invite-member-email' label='Business email' name='email' type='email' value={invite.email} onChange={event => setInvite(current => ({ ...current, email: event.target.value }))} required />
        <label className='selectField' htmlFor='invite-member-role'><span>Role</span><select id='invite-member-role' value={invite.role} onChange={event => setInvite(current => ({ ...current, role: event.target.value }))}>{roleOptions.map(role => <option key={role} value={role}>{formatRole(role)}</option>)}</select><small>Administrators can invite and manage other members.</small></label>
        <label className='textAreaField' htmlFor='invite-member-message'><span>Optional message</span><textarea id='invite-member-message' value={invite.message} onChange={event => setInvite(current => ({ ...current, message: event.target.value }))} maxLength={1000} /></label>
        <Button type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Sending…</> : <><MailPlus aria-hidden='true' /> Send Invitation</>}</Button>
      </form>
    </ResponsiveDrawer>

    <ResponsiveDrawer open={drawer?.type === 'manage'} title='Manage organization access' onClose={closeDrawer}>
      {drawer?.membership && <form className='drawerForm' onSubmit={submitManagement}>
        <div className='managementSubject'><strong>{memberName(drawer.membership)}</strong><span>{drawer.membership.user?.email}</span></div>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <label className='selectField' htmlFor='manage-member-role'><span>Role</span><select id='manage-member-role' value={management.role} onChange={event => setManagement(current => ({ ...current, role: event.target.value }))}>{roleOptions.map(role => <option key={role} value={role}>{formatRole(role)}</option>)}</select></label>
        <label className='selectField' htmlFor='manage-member-status'><span>Access status</span><select id='manage-member-status' value={management.status} onChange={event => setManagement(current => ({ ...current, status: event.target.value }))}><option value='active'>Active</option><option value='suspended'>Suspended</option><option value='revoked'>Revoked</option></select></label>
        {['suspended', 'revoked'].includes(management.status) && <label className='textAreaField' htmlFor='manage-member-reason'><span>Reason</span><textarea id='manage-member-reason' value={management.reason} onChange={event => setManagement(current => ({ ...current, reason: event.target.value }))} minLength={4} maxLength={500} required /></label>}
        <p className='securityNotice'>Changing a role or access status signs this person out of existing sessions immediately. The final active administrator cannot be removed.</p>
        <Button type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Saving…</> : 'Save Access'}</Button>
      </form>}
    </ResponsiveDrawer>
  </>
}

Team.getLayout = PortalPageLayout
export default Team
