import { ArrowLeft, BadgeCheck, FileText, Landmark, LoaderCircle, RefreshCw, Send, ShieldAlert } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  PermissionDenied,
  StatusBadge,
} from '../../../components/app'
import { useAppDialog } from '../../../components/app/AppDialogProvider'
import { formatDate, formatLabel } from '../../../components/app/formatters'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { getHasPermission } from '../../../store/slices/appContext'
import {
  finalizeSalesPartnerStatement,
  generateSalesPartnerStatement,
  loadSalesPartnerAdminDetail,
  markSalesPartnerStatementPaid,
  salesPartnerSelectors,
  updateSalesPartnerAdmin,
} from '../../../store/slices/entities/salesPartners'

const previousMonth = () => {
  const date = new Date()
  date.setUTCDate(1)
  date.setUTCMonth(date.getUTCMonth() - 1)
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100)

const SalesPartnerAdminDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const ask = useAppDialog()
  const allowed = useSelector(getHasPermission('sales_partner.commission.manage'))
  const detail = useSelector(salesPartnerSelectors.getDetail)
  const loading = useSelector(salesPartnerSelectors.getDetailLoading)
  const error = useSelector(salesPartnerSelectors.getDetailError)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [program, setProgram] = useState({ status: '', reason: '' })
  const [periodKey, setPeriodKey] = useState(previousMonth)
  const [payment, setPayment] = useState({})
  const [pending, setPending] = useState('')
  const [feedback, setFeedback] = useState(null)
  const partnerId = typeof router.query.id === 'string' ? router.query.id : ''
  const validReason = value => {
    const normalized = String(value || reason).trim()
    if (normalized.length < 8) { setReasonError('Enter at least 8 characters explaining the administrative need.'); return null }
    setReasonError('')
    try { window.sessionStorage.setItem('velakron:sales-partner-support-reason', normalized) } catch {}
    return normalized
  }
  const load = useCallback((override = '') => {
    const supportReason = validReason(override)
    if (partnerId && supportReason) dispatch(loadSalesPartnerAdminDetail(partnerId, supportReason))
  }, [dispatch, partnerId, reason])
  useEffect(() => {
    if (!router.isReady || !partnerId || !allowed) return
    let saved = ''
    try { saved = window.sessionStorage.getItem('velakron:sales-partner-support-reason') || '' } catch {}
    if (saved.length >= 8) { setReason(saved); load(saved) }
  }, [allowed, partnerId, router.isReady])
  useEffect(() => {
    if (!detail?.profile) return
    setProgram({
      status: detail.profile.status,
      reason: '',
    })
  }, [detail?.profile])
  const run = async (key, action, success) => {
    const supportReason = validReason()
    if (!supportReason) return false
    setPending(key); setFeedback(null)
    const result = await dispatch(action(supportReason))
    setPending('')
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'The Sales Partner operation could not be completed.') }); return false }
    setFeedback({ type: 'success', message: success })
    await dispatch(loadSalesPartnerAdminDetail(partnerId, supportReason))
    return true
  }
  const submitProgram = event => {
    event.preventDefault()
    run('program', supportReason => updateSalesPartnerAdmin(partnerId, {
      status: program.status,
      reason: program.reason,
    }, supportReason), 'Sales Partner program settings updated.')
  }
  const reviewPayout = async payoutStatus => {
    const title = payoutStatus === 'verified' ? 'Verify this ACH payout profile?' : 'Reject this ACH payout profile?'
    if (!await ask({ title, description: payoutStatus === 'verified' ? 'Confirm the masked details match the secure payout-provider record before approving payments.' : 'The partner will need to correct and resubmit its payout profile.', confirmLabel: payoutStatus === 'verified' ? 'Verify ACH' : 'Reject profile', danger: payoutStatus === 'rejected' })) return
    run('payout', supportReason => updateSalesPartnerAdmin(partnerId, {
      payout_status: payoutStatus,
      payout_provider: 'manual',
      reason: payoutStatus === 'rejected' ? 'Masked payout information did not match the secure verification record' : '',
    }, supportReason), `ACH payout profile ${payoutStatus}.`)
  }
  const generate = () => run('generate', supportReason => generateSalesPartnerStatement(partnerId, periodKey, supportReason), `Draft statement generated for ${periodKey}.`)
  const finalize = async statement => {
    if (!await ask({ title: `Finalize ${statement.period_key} statement?`, description: `${money(statement.commission_amount_cents)} will be approved for one bundled Sales Partner payout. The member breakdown will be locked.`, confirmLabel: 'Finalize statement' })) return
    run(`finalize-${statement.id || statement._id}`, supportReason => finalizeSalesPartnerStatement(partnerId, statement.id || statement._id, supportReason), `${statement.period_key} statement finalized.`)
  }
  const markPaid = statement => {
    const id = statement.id || statement._id
    const values = payment[id] || {}
    run(`paid-${id}`, supportReason => markSalesPartnerStatementPaid(partnerId, id, values, supportReason), `${statement.period_key} ACH payment recorded.`)
  }

  if (!allowed) return <PermissionDenied description='Sales Partner administration is restricted to Velakron platform administrators.' />
  if (loading && !detail) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  const organization = detail?.organization
  const profile = detail?.profile
  const statementColumns = [
    { key: 'period_key', label: 'Month' },
    { key: 'member_breakdown', label: 'Member breakdown', render: item => <div className='partnerStatementBreakdown'>{(item.member_breakdown || []).map(member => <span key={String(member.member)}><strong>{member.member_name}</strong>{member.sales_count} finder’s fee{member.sales_count === 1 ? '' : 's'} · {money(member.commission_amount_cents)}</span>)}</div> },
    { key: 'collected_revenue_cents', label: 'Customer payments', render: item => money(item.collected_revenue_cents) },
    { key: 'commission_amount_cents', label: 'Finder’s fees', render: item => <strong>{money(item.commission_amount_cents)}</strong> },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={item.status === 'paid' ? 'success' : item.status === 'finalized' ? 'info' : 'neutral'}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'actions', label: '', render: item => {
      const id = item.id || item._id
      if (item.status === 'draft') return <Button variant='secondary' className='tableAction' disabled={pending === `finalize-${id}`} onClick={() => finalize(item)}><FileText aria-hidden='true' /> Finalize</Button>
      if (item.status === 'finalized') return <div className='partnerPaymentRecord'><input aria-label='Payout reference' placeholder='Payout reference' value={payment[id]?.payout_reference || ''} onChange={event => setPayment(value => ({ ...value, [id]: { ...value[id], payout_reference: event.target.value } }))} /><input aria-label='ACH trace number' placeholder='ACH trace number' value={payment[id]?.ach_trace_number || ''} onChange={event => setPayment(value => ({ ...value, [id]: { ...value[id], ach_trace_number: event.target.value } }))} /><Button className='tableAction' disabled={pending === `paid-${id}`} onClick={() => markPaid(item)}><Send aria-hidden='true' /> Record paid</Button></div>
      return <span>{item.payout_reference || formatDate(item.paid_at)}</span>
    } },
  ]
  const commissionColumns = [
    { key: 'member', label: 'Team member', render: item => item.member?.full_name || [item.member?.first_name, item.member?.last_name].filter(Boolean).join(' ') || 'Former member' },
    { key: 'earning_month', label: 'Month' },
    { key: 'earning_type', label: 'Milestone', render: item => formatLabel(item.earning_type) },
    { key: 'source_amount_cents', label: 'Customer payment', render: item => money(item.source_amount_cents) },
    { key: 'commission_amount_cents', label: 'Finder’s fee', render: item => <strong>{money(item.commission_amount_cents)}</strong> },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={item.status === 'paid' ? 'success' : item.status === 'reversed' ? 'danger' : item.status === 'approved' ? 'info' : 'warning'}>{formatLabel(item.status)}</StatusBadge> },
  ]
  return <>
    <Seo title={organization?.name || 'Sales Partner'} description='Sales Partner administration.' path={partnerId ? `/admin/sales-partners/${partnerId}` : '/admin/sales-partners'} noIndex />
    <AppPageHeader eyebrow='Sales Partner administration' title={organization?.name || 'Sales Partner'} description='Review agreement and payout readiness, finder’s-fee accrual, monthly reporting, and bundled ACH payment records.' actions={<Button href='/admin/sales-partners' variant='secondary'><ArrowLeft aria-hidden='true' /> All Sales Partners</Button>} />
    <section className='appPanel supportReasonPanel'>
      <form className='partnerSupportSearch' onSubmit={event => { event.preventDefault(); load() }}><label htmlFor='partner-detail-reason'>Administrative reason</label><input id='partner-detail-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} required /><Button type='submit' disabled={loading}><RefreshCw aria-hidden='true' /> Refresh</Button></form>
      <p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'Required and audit-logged for all partner administration requests.'}</p>
    </section>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {error && <ErrorState description={error.message} onRetry={() => load()} />}
    {!detail && !loading ? <section className='appPanel'><p>Enter an administrative reason to load this Sales Partner.</p></section> : detail && <>
      <div className='partnerAdminGrid'>
        <section className='appPanel'>
          <header className='appPanel__header'><div><p className='technicalLabel'>Program controls</p><h2>Contract and finder’s fees</h2></div><StatusBadge tone={profile?.status === 'active' ? 'success' : 'warning'}>{formatLabel(profile?.status)}</StatusBadge></header>
          <dl className='appDetailList'>
            <div><dt>Agreement</dt><dd>{profile?.agreement_accepted_at ? `Accepted ${formatDate(profile.agreement_accepted_at)}` : 'Awaiting signature'}</dd></div>
            <div><dt>Contract version</dt><dd>{profile?.agreement_version}</dd></div>
            <div><dt>Early Access fee</dt><dd>{money(profile?.early_access_finder_fee_cents)}</dd></div>
            <div><dt>Annual conversion fee</dt><dd>{money(profile?.annual_subscription_finder_fee_cents)}</dd></div>
            <div><dt>Active sales reps</dt><dd>{(detail.members || []).filter(item => item.status === 'active').length}</dd></div>
            <div><dt>Referral links</dt><dd>{(detail.referral_links || []).filter(item => item.status === 'active').length} active</dd></div>
          </dl>
          <form className='partnerCompactForm' onSubmit={submitProgram}>
            <label><span>Program status</span><select value={program.status} onChange={event => setProgram(value => ({ ...value, status: event.target.value }))}><option value='pending_agreement'>Pending agreement</option><option value='active'>Active</option><option value='suspended'>Suspended</option><option value='terminated'>Terminated</option></select></label>
            {['suspended', 'terminated'].includes(program.status) && <label><span>Reason</span><input value={program.reason} onChange={event => setProgram(value => ({ ...value, reason: event.target.value }))} minLength={4} required /></label>}
            <Button type='submit' disabled={pending === 'program'}>{pending === 'program' ? <LoaderCircle className='spin' aria-hidden='true' /> : <BadgeCheck aria-hidden='true' />} Save settings</Button>
          </form>
        </section>
        <section className='appPanel'>
          <header className='appPanel__header'><div><p className='technicalLabel'>Payout review</p><h2><Landmark aria-hidden='true' /> ACH readiness</h2></div><StatusBadge tone={profile?.payout?.status === 'verified' ? 'success' : profile?.payout?.status === 'pending_review' ? 'warning' : 'neutral'}>{formatLabel(profile?.payout?.status)}</StatusBadge></header>
          <dl className='appDetailList'>
            <div><dt>Account holder</dt><dd>{profile?.payout?.account_holder_name || 'Not submitted'}</dd></div>
            <div><dt>Bank</dt><dd>{profile?.payout?.bank_name || 'Not submitted'}</dd></div>
            <div><dt>Account</dt><dd>{profile?.payout?.account_last4 ? `•••• ${profile.payout.account_last4}` : 'Not submitted'}</dd></div>
            <div><dt>Payout contact</dt><dd>{profile?.payout?.payout_contact_email || 'Not submitted'}</dd></div>
          </dl>
          {profile?.payout?.status !== 'unconfigured' && <div className='partnerReviewActions'><Button onClick={() => reviewPayout('verified')} disabled={pending === 'payout'}><BadgeCheck aria-hidden='true' /> Verify ACH</Button><Button variant='secondary' onClick={() => reviewPayout('rejected')} disabled={pending === 'payout'}><ShieldAlert aria-hidden='true' /> Reject</Button></div>}
          <p className='securityNotice'>Verify against the secure payout-provider record. Never copy routing or full account numbers into Velakron.</p>
        </section>
      </div>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Monthly close</p><h2>Statements and bundled ACH payments</h2><p>Generate a draft after the month closes, review the team breakdown, finalize it, then record the single partner-entity ACH payment.</p></div></header>
        <div className='partnerStatementGenerator'><label><span>Statement month</span><input type='month' value={periodKey} onChange={event => setPeriodKey(event.target.value)} /></label><Button onClick={generate} disabled={pending === 'generate'}>{pending === 'generate' ? <LoaderCircle className='spin' aria-hidden='true' /> : <FileText aria-hidden='true' />} Generate draft</Button></div>
        <DataTable columns={statementColumns} rows={detail.statements || []} emptyTitle='No statements yet' emptyDescription='Generate a monthly draft after eligible finder’s-fee milestones accrue.' />
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Finder’s-fee ledger</p><h2>Qualified referral milestones</h2></div></header>
        <DataTable columns={commissionColumns} rows={detail.commissions || []} emptyTitle='No finder’s fees accrued yet' emptyDescription='A fee appears after an attributed customer pays for Early Access or later begins its paid annual subscription.' />
      </section>
    </>}
  </>
}

SalesPartnerAdminDetail.getLayout = PortalPageLayout
export default SalesPartnerAdminDetail
