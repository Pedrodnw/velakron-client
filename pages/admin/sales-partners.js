import { ExternalLink, HandCoins, LoaderCircle, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  PermissionDenied,
  ResponsiveDrawer,
  StatusBadge,
} from '../../components/app'
import { useAppDialog } from '../../components/app/AppDialogProvider'
import { formatDate, formatLabel } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { getHasPermission } from '../../store/slices/appContext'
import {
  enrollSalesPartner,
  loadSalesPartnersAdmin,
  resendSalesPartnerInvitation,
  salesPartnerSelectors,
} from '../../store/slices/entities/salesPartners'

const emptyEnrollment = {
  name: '', slug: '', contact_first_name: '', contact_last_name: '', contact_email: '',
  message: 'Welcome to the Velakron Sales Partner program.',
}
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100)
const deliveryPresentation = delivery => {
  if (delivery?.state === 'completed' || delivery?.provider_state === 'submitted') return { label: 'Submitted to Gmail', tone: 'success' }
  if (delivery?.state === 'claimed') return { label: 'Sending', tone: 'info' }
  if (delivery?.state === 'retryable') return { label: 'Retrying', tone: 'warning' }
  if (delivery?.state === 'dead' || delivery?.provider_state === 'failed') return { label: 'Failed', tone: 'danger' }
  if (delivery?.state === 'captured') return { label: 'Captured locally', tone: 'neutral' }
  if (delivery?.state === 'pending' || delivery?.state === 'queued') return { label: 'Queued', tone: 'info' }
  return { label: 'Not tracked', tone: 'neutral' }
}

const SalesPartnersAdmin = () => {
  const dispatch = useDispatch()
  const ask = useAppDialog()
  const allowed = useSelector(getHasPermission('sales_partner.commission.manage'))
  const partners = useSelector(salesPartnerSelectors.getPartners)
  const loading = useSelector(salesPartnerSelectors.getAdminLoading)
  const error = useSelector(salesPartnerSelectors.getAdminError)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [enrollment, setEnrollment] = useState(emptyEnrollment)
  const [pending, setPending] = useState(false)
  const [resendingId, setResendingId] = useState('')
  const [feedback, setFeedback] = useState(null)
  const reasonRef = useRef(null)

  useEffect(() => {
    try {
      const saved = window.sessionStorage.getItem('velakron:sales-partner-support-reason') || ''
      if (saved.length >= 8) setReason(saved)
    } catch { /* Support reason remains local to the page when storage is unavailable. */ }
  }, [])
  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining the administrative need.'); reasonRef.current?.focus(); return null }
    setReasonError('')
    try { window.sessionStorage.setItem('velakron:sales-partner-support-reason', value) } catch {}
    return value
  }
  const load = () => {
    const value = validReason()
    if (value) dispatch(loadSalesPartnersAdmin(value))
  }
  const submitSearch = event => { event.preventDefault(); load() }
  const submitEnrollment = async event => {
    event.preventDefault()
    const value = validReason()
    if (!value) return
    setPending(true); setFeedback(null)
    const result = await dispatch(enrollSalesPartner(enrollment, value))
    setPending(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'The Sales Partner could not be enrolled.') }); return }
    setFeedback({ type: 'success', message: `Invitation prepared for ${enrollment.contact_email}.` })
    setEnrollment(emptyEnrollment)
    setDrawerOpen(false)
    dispatch(loadSalesPartnersAdmin(value))
  }
  const resendInvitation = async item => {
    const invitation = item.invitation
    const organizationId = item.organization?.id || item.organization?._id
    if (!organizationId || !invitation?.id || !['pending', 'expired'].includes(invitation.status)) return
    if (!await ask({
      title: `Resend invitation to ${invitation.email}?`,
      description: 'This sends a new secure invitation link and starts a fresh expiration window. Any previous unused invitation link will stop working.',
      confirmLabel: 'Resend invitation',
    })) return
    const value = validReason()
    if (!value) return
    setResendingId(invitation.id); setFeedback(null)
    const result = await dispatch(resendSalesPartnerInvitation(organizationId, invitation.id, value))
    setResendingId('')
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'The invitation could not be resent.') }); return }
    setFeedback({ type: 'success', message: `Invitation resent to ${invitation.email}.` })
    dispatch(loadSalesPartnersAdmin(value))
  }
  if (!allowed) return <PermissionDenied description='Sales Partner administration is restricted to Velakron platform administrators.' />
  const columns = [
    { key: 'organization', label: 'Sales Partner', render: item => <div className='tablePrimary'><strong>{item.organization?.name}</strong><span>{item.organization?.primary_contact?.email}</span></div> },
    { key: 'status', label: 'Program status', render: item => <StatusBadge tone={item.profile?.status === 'active' ? 'success' : item.profile?.status === 'pending_agreement' ? 'warning' : 'danger'}>{formatLabel(item.profile?.status)}</StatusBadge> },
    { key: 'invitation', label: 'Invitation', render: item => item.invitation ? <StatusBadge tone={item.invitation.status === 'accepted' ? 'success' : item.invitation.status === 'pending' ? 'warning' : item.invitation.status === 'expired' ? 'danger' : 'neutral'}>{formatLabel(item.invitation.status)}</StatusBadge> : <StatusBadge tone='neutral'>Not found</StatusBadge> },
    { key: 'expiration', label: 'Invitation expires', render: item => item.invitation?.expires_at ? formatDate(item.invitation.expires_at) : '—' },
    { key: 'delivery', label: 'Email delivery', render: item => {
      const delivery = deliveryPresentation(item.invitation?.email_delivery)
      return <div className='partnerInvitationDelivery'><StatusBadge tone={delivery.tone}>{delivery.label}</StatusBadge><small>{item.invitation?.email_delivery?.queued_at ? `Queued ${formatDate(item.invitation.email_delivery.queued_at)}` : 'No delivery record'}</small></div>
    } },
    { key: 'payout', label: 'ACH', render: item => <StatusBadge tone={item.profile?.payout?.status === 'verified' ? 'success' : item.profile?.payout?.status === 'pending_review' ? 'warning' : 'neutral'}>{formatLabel(item.profile?.payout?.status)}</StatusBadge> },
    { key: 'members', label: 'Active reps', render: item => item.active_member_count },
    { key: 'fees', label: 'Finder’s fees', render: item => `${money(item.profile?.early_access_finder_fee_cents)} Early Access · ${money(item.profile?.annual_subscription_finder_fee_cents)} annual` },
    { key: 'pending', label: 'Pending fees', render: item => money(item.pending_commission_cents) },
    { key: 'created', label: 'Enrolled', render: item => formatDate(item.profile?.created_at) },
    { key: 'actions', label: '', render: item => <div className='tableActions'>
      {['pending', 'expired'].includes(item.invitation?.status) && <Button variant='secondary' className='tableAction' disabled={resendingId === item.invitation.id} onClick={() => resendInvitation(item)}>{resendingId === item.invitation.id ? <LoaderCircle className='spin' aria-hidden='true' /> : <RefreshCw aria-hidden='true' />}{resendingId === item.invitation.id ? 'Resending…' : 'Resend invitation'}</Button>}
      <Button href={`/admin/sales-partners/${item.organization?.id || item.organization?._id}`} variant='secondary' className='tableAction'>Open <ExternalLink aria-hidden='true' /></Button>
    </div> },
  ]
  return <>
    <Seo title='Sales Partners' description='Enroll and administer Velakron Sales Partners.' path='/admin/sales-partners' noIndex />
    <AppPageHeader eyebrow='Commercial operations' title='Sales Partners' description='Enroll partner entities, monitor agreement and ACH readiness, review attributed finder’s fees, and publish monthly bundled payments.' actions={<Button onClick={() => { setFeedback(null); setDrawerOpen(true) }}><Plus aria-hidden='true' /> Enroll Sales Partner</Button>} />
    <section className='appPanel supportReasonPanel'>
      <form onSubmit={submitSearch} className='partnerSupportSearch'>
        <label htmlFor='sales-partner-support-reason'>Administrative reason</label>
        <input id='sales-partner-support-reason' ref={reasonRef} value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Monthly partner finder’s-fee review' required />
        <Button type='submit' disabled={loading}><Search aria-hidden='true' /> Load partners</Button>
      </form>
      <p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'This reason is audit-logged with Sales Partner administration requests.'}</p>
    </section>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {error && <ErrorState description={error.message} onRetry={load} />}
    <section className='appPanel appPanel--table'>{loading ? <AppSkeleton lines={8} /> : <DataTable columns={columns} rows={partners} getRowKey={item => item.organization?.id || item.organization?._id} emptyTitle='No Sales Partners loaded' emptyDescription='Enter an administrative reason to load the directory, or enroll the first partner.' />}</section>

    <ResponsiveDrawer open={drawerOpen} title='Enroll Sales Partner' onClose={() => { if (!pending) setDrawerOpen(false) }}>
      <form className='drawerForm' onSubmit={submitEnrollment} aria-busy={pending}>
        <div className='organizationCreateIntro'><span><HandCoins aria-hidden='true' /></span><div><strong>Partner entity and administrator</strong><p>Creates the Sales Partner workspace with a $500 Early Access finder’s fee, a further $1,000 annual-conversion fee, and an invitation for its first portal administrator.</p></div></div>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <section className='drawerForm__section'>
          <header><span>01</span><div><h3>Legal entity</h3><p>The company or team Velakron contracts with and pays.</p></div></header>
          <div className='drawerForm__grid'>
            <label className='drawerForm__field drawerForm__field--wide'><span>Sales Partner name</span><input value={enrollment.name} onChange={event => setEnrollment(value => ({ ...value, name: event.target.value }))} minLength={2} maxLength={180} required /></label>
            <label className='drawerForm__field drawerForm__field--wide'><span>Workspace slug</span><input value={enrollment.slug} onChange={event => setEnrollment(value => ({ ...value, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))} pattern='[a-z0-9]+(?:-[a-z0-9]+)*' required /></label>
          </div>
        </section>
        <section className='drawerForm__section'>
          <header><span>02</span><div><h3>Portal administrator</h3><p>The authorized representative who receives the invitation and signs online.</p></div></header>
          <div className='drawerForm__grid'>
            <label className='drawerForm__field'><span>First name</span><input value={enrollment.contact_first_name} onChange={event => setEnrollment(value => ({ ...value, contact_first_name: event.target.value }))} required /></label>
            <label className='drawerForm__field'><span>Last name</span><input value={enrollment.contact_last_name} onChange={event => setEnrollment(value => ({ ...value, contact_last_name: event.target.value }))} /></label>
            <label className='drawerForm__field drawerForm__field--wide'><span>Email</span><input type='email' value={enrollment.contact_email} onChange={event => setEnrollment(value => ({ ...value, contact_email: event.target.value }))} required /></label>
            <label className='drawerForm__field drawerForm__field--wide'><span>Invitation message</span><textarea value={enrollment.message} onChange={event => setEnrollment(value => ({ ...value, message: event.target.value }))} maxLength={1000} rows={3} /></label>
          </div>
        </section>
        <section className='drawerForm__audit'><header><ShieldCheck aria-hidden='true' /><div><h3>Audit reason</h3><p>{reason.trim() || 'Enter the reason on the directory page before enrolling.'}</p></div></header></section>
        <footer className='drawerForm__actions'><Button type='button' variant='secondary' onClick={() => setDrawerOpen(false)} disabled={pending}>Cancel</Button><Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <HandCoins aria-hidden='true' />}{pending ? 'Enrolling…' : 'Enroll and invite'}</Button></footer>
      </form>
    </ResponsiveDrawer>
  </>
}

SalesPartnersAdmin.getLayout = PortalPageLayout
export default SalesPartnersAdmin
