import {
  BadgeDollarSign,
  Check,
  Copy,
  Download,
  FileSignature,
  HandCoins,
  Landmark,
  Link2,
  LoaderCircle,
  Plus,
  RotateCcw,
  UserMinus,
  UserPlus,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  MetricCard,
  PermissionDenied,
  StatusBadge,
} from '../../components/app'
import { useAppDialog } from '../../components/app/AppDialogProvider'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { apiCallBegan } from '../../store/api'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import {
  addSalesPartnerMember,
  createSalesPartnerReferralLink,
  loadSalesPartnerPortal,
  salesPartnerSelectors,
  signSalesPartnerAgreement,
  updateSalesPartnerMember,
  updateSalesPartnerPayout,
  updateSalesPartnerReferralLink,
} from '../../store/slices/entities/salesPartners'

const emptyMember = { first_name: '', last_name: '', email: '', external_reference: '', create_link: true, link_label: 'Primary link' }
const emptyPayout = { account_holder_name: '', bank_name: '', account_last4: '', payout_contact_email: '' }
const emptySignature = { signer_name: '', signer_title: '', authority_confirmed: false, signature_intent_confirmed: false }
const money = cents => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(cents || 0) / 100)
const idOf = value => String(value?.id || value?._id || value || '')

const SalesPartnerPortal = () => {
  const dispatch = useDispatch()
  const ask = useAppDialog()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('sales_partner.profile.read'))
  const canManageProfile = useSelector(getHasPermission('sales_partner.profile.manage'))
  const canSign = useSelector(getHasPermission('sales_partner.agreement.sign'))
  const canManageMembers = useSelector(getHasPermission('sales_partner.member.manage'))
  const canReadLinks = useSelector(getHasPermission('sales_partner.referral.read'))
  const canManageLinks = useSelector(getHasPermission('sales_partner.referral.manage'))
  const portal = useSelector(salesPartnerSelectors.getCurrent)
  const loading = useSelector(salesPartnerSelectors.getCurrentLoading)
  const error = useSelector(salesPartnerSelectors.getCurrentError)
  const [agreement, setAgreement] = useState(null)
  const [signature, setSignature] = useState(emptySignature)
  const [payout, setPayout] = useState(emptyPayout)
  const [member, setMember] = useState(emptyMember)
  const [linkDraft, setLinkDraft] = useState({ member_id: '', label: 'Campaign link' })
  const [pending, setPending] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [copied, setCopied] = useState('')
  const refresh = useCallback(() => dispatch(loadSalesPartnerPortal()), [dispatch])

  useEffect(() => {
    if (!allowed || organization?.type !== 'sales_partner') return
    refresh()
    dispatch(apiCallBegan({ url: '/sales-partners/agreement/current', requestKey: 'sales-partner-agreement' }))
      .then(result => { if (result?.ok) setAgreement(result.payload?.data?.agreement || null) })
  }, [allowed, dispatch, organization?.id, organization?.type, refresh])
  useEffect(() => {
    const current = portal?.profile?.payout
    if (!current) return
    setPayout({
      account_holder_name: current.account_holder_name || '',
      bank_name: current.bank_name || '',
      account_last4: current.account_last4 || '',
      payout_contact_email: current.payout_contact_email || '',
    })
  }, [portal?.profile?.payout])

  const run = async (key, action, success) => {
    setPending(key); setFeedback(null)
    const result = await dispatch(action)
    setPending('')
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'The Sales Partner update could not be completed.') }); return false }
    setFeedback({ type: 'success', message: success })
    await refresh()
    return true
  }
  const submitAgreement = async event => {
    event.preventDefault()
    const completed = await run('agreement', signSalesPartnerAgreement({ ...signature, agreement_version: agreement?.version }), 'Agreement signed. Referral management is now active.')
    if (completed) setSignature(emptySignature)
  }
  const submitPayout = event => {
    event.preventDefault()
    run('payout', updateSalesPartnerPayout(payout), 'Masked ACH payout details submitted for Velakron review.')
  }
  const submitMember = async event => {
    event.preventDefault()
    const completed = await run('member', addSalesPartnerMember(member), 'Team member added to the roster.')
    if (completed) setMember(emptyMember)
  }
  const submitLink = async event => {
    event.preventDefault()
    const completed = await run('link', createSalesPartnerReferralLink(linkDraft), 'Referral link assigned.')
    if (completed) setLinkDraft({ member_id: '', label: 'Campaign link' })
  }
  const setMemberStatus = async (item, status) => {
    const action = status === 'inactive' ? 'remove' : 'restore'
    if (!await ask({
      title: `${action === 'remove' ? 'Remove' : 'Restore'} ${item.full_name}?`,
      description: status === 'inactive' ? 'Their active referral links will be disabled immediately. Historical attribution and finder’s-fee records are preserved.' : 'The team member returns to the active roster. Existing disabled links remain disabled until you enable them.',
      confirmLabel: action === 'remove' ? 'Remove member' : 'Restore member',
      danger: action === 'remove',
    })) return
    await run(`member-${item.id}`, updateSalesPartnerMember(item.id, {
      status,
      reason: status === 'inactive' ? 'Removed by Sales Partner administrator' : '',
    }), `Team member ${status === 'inactive' ? 'removed' : 'restored'}.`)
  }
  const setLinkStatus = async (link, status) => {
    await run(`link-${link.id}`, updateSalesPartnerReferralLink(link.id, {
      status,
      reason: status === 'disabled' ? 'Disabled by Sales Partner administrator' : '',
    }), `Referral link ${status === 'disabled' ? 'disabled' : 'enabled'}.`)
  }
  const copyLink = async link => {
    try {
      await navigator.clipboard.writeText(link.share_url)
      setCopied(link.id)
      window.setTimeout(() => setCopied(''), 1800)
    } catch {
      setFeedback({ type: 'error', message: 'The browser could not copy the link. Select the URL and copy it manually.' })
    }
  }

  const activeMembers = useMemo(() => (portal?.members || []).filter(item => item.status === 'active'), [portal?.members])
  const activeLinks = useMemo(() => (portal?.referral_links || []).filter(item => item.status === 'active'), [portal?.referral_links])
  const activeLinkByMember = useMemo(() => activeLinks.reduce((links, item) => {
    const memberId = idOf(item.member)
    if (memberId && !links.has(memberId)) links.set(memberId, item)
    return links
  }, new Map()), [activeLinks])
  const linkVisits = (portal?.referral_links || []).reduce((sum, item) => sum + Number(item.visit_count || 0), 0)
  const linkSubmissions = (portal?.referral_links || []).reduce((sum, item) => sum + Number(item.submission_count || 0), 0)
  const pendingCommission = Number(portal?.totals?.accrued || 0) + Number(portal?.totals?.approved || 0)

  if (!allowed || organization?.type !== 'sales_partner') return <PermissionDenied description='Open a Sales Partner workspace to use the partner portal.' />
  if (loading && !portal) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  if (error && !portal) return <ErrorState title='The Sales Partner portal is unavailable' description={error.message} onRetry={refresh} />

  const profile = portal?.profile
  const agreementComplete = Boolean(portal?.agreement_current)
  const payoutStatus = profile?.payout?.status || 'unconfigured'
  const memberColumns = [
    { key: 'name', label: 'Team member', render: item => <div className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email}</span></div> },
    { key: 'external_reference', label: 'Internal reference', render: item => item.external_reference || '—' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'joined_at', label: 'Added', render: item => formatDate(item.joined_at) },
    ...(canReadLinks ? [{
      key: 'flyer',
      label: 'Referral flyer',
      render: item => {
        const activeLink = activeLinkByMember.get(idOf(item))
        if (item.status !== 'active') return <span className='partnerFlyerUnavailable'>Restore member first</span>
        if (!activeLink) return <span className='partnerFlyerUnavailable'>Assign a link first</span>
        return <Button
          variant='secondary'
          className='tableAction'
          href={`${process.env.NEXT_PUBLIC_API_URL || ''}/sales-partners/current/members/${encodeURIComponent(idOf(item))}/referral-flyer`}
          title={`Uses ${activeLink.label || 'the newest active referral link'}`}
        ><Download aria-hidden='true' />Download flyer</Button>
      },
    }] : []),
    ...(canManageMembers ? [{ key: 'actions', label: '', render: item => <Button variant='secondary' className='tableAction' disabled={pending === `member-${item.id}`} onClick={() => setMemberStatus(item, item.status === 'active' ? 'inactive' : 'active')}>{pending === `member-${item.id}` ? <LoaderCircle className='spin' aria-hidden='true' /> : item.status === 'active' ? <UserMinus aria-hidden='true' /> : <RotateCcw aria-hidden='true' />}{item.status === 'active' ? 'Remove' : 'Restore'}</Button> }] : []),
  ]
  const linkColumns = [
    { key: 'member', label: 'Assigned to', render: item => <div className='tablePrimary'><strong>{item.member?.full_name || [item.member?.first_name, item.member?.last_name].filter(Boolean).join(' ')}</strong><span>{item.label || 'Referral link'}</span></div> },
    { key: 'link', label: 'Share link', render: item => <div className='partnerLinkCell'><code>{item.share_url}</code>{canManageLinks && <Button variant='secondary' className='tableAction' onClick={() => copyLink(item)}>{copied === item.id ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}{copied === item.id ? 'Copied' : 'Copy'}</Button>}</div> },
    { key: 'performance', label: 'Activity', render: item => <span>{item.visit_count || 0} visits · {item.submission_count || 0} forms</span> },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    ...(canManageLinks ? [{ key: 'actions', label: '', render: item => <Button variant='secondary' className='tableAction' disabled={pending === `link-${item.id}`} onClick={() => setLinkStatus(item, item.status === 'active' ? 'disabled' : 'active')}>{item.status === 'active' ? 'Disable' : 'Enable'}</Button> }] : []),
  ]
  const referralColumns = [
    { key: 'company_name', label: 'Prospect company' },
    { key: 'member', label: 'Team member', render: item => item.member?.full_name || [item.member?.first_name, item.member?.last_name].filter(Boolean).join(' ') || 'Former member' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={item.status === 'converted' ? 'success' : item.status === 'disqualified' ? 'danger' : 'info'}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'created_at', label: 'Referred', render: item => formatDate(item.created_at) },
  ]
  const statementColumns = [
    { key: 'period_key', label: 'Month' },
    { key: 'sales_count', label: 'Qualified milestones' },
    { key: 'collected_revenue_cents', label: 'Customer payments', render: item => money(item.collected_revenue_cents) },
    { key: 'commission_amount_cents', label: 'Finder’s fees', render: item => <strong>{money(item.commission_amount_cents)}</strong> },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={item.status === 'paid' ? 'success' : item.status === 'finalized' ? 'info' : 'neutral'}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'paid_at', label: 'Paid', render: item => item.paid_at ? formatDate(item.paid_at) : '—' },
  ]

  return <>
    <Seo title='Sales Partner Portal' description='Manage Sales Partner referrals, team members, finder’s fees, and payouts.' path='/app/sales-partner' noIndex />
    <AppPageHeader eyebrow='Sales Partner workspace' title='Partner portal' description='Manage the people and links that generate referrals, then follow attributed sales, monthly statements, and bundled ACH payments.' actions={<StatusBadge tone={profile?.status === 'active' ? 'success' : 'warning'}>{formatLabel(profile?.status)}</StatusBadge>} />
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {error && <ErrorState title='The latest partner data could not be loaded' description={error.message} onRetry={refresh} />}

    <section className='metricGrid metricGrid--priority' aria-label='Sales Partner totals'>
      <MetricCard label='Active team' value={activeMembers.length} detail='Sales representatives on the roster' icon={UserPlus} tone='info' />
      <MetricCard label='Active links' value={activeLinks.length} detail={`${linkVisits} visits · ${linkSubmissions} submitted forms`} icon={Link2} tone='accent' />
      <MetricCard label='Pending finder’s fees' value={money(pendingCommission)} detail='Accrued or approved for a future statement' icon={BadgeDollarSign} tone={pendingCommission ? 'warning' : 'success'} />
      <MetricCard label='Paid to date' value={money(portal?.totals?.paid)} detail='Bundled payments recorded by Velakron' icon={HandCoins} tone='success' />
    </section>

    <div className='partnerSetupGrid'>
      <section className={`appPanel partnerSetupCard${agreementComplete ? ' is-complete' : ''}`}>
        <header className='appPanel__header'><div><p className='technicalLabel'>Step 1</p><h2><FileSignature aria-hidden='true' /> Partner agreement</h2></div><StatusBadge tone={agreementComplete ? 'success' : 'warning'}>{agreementComplete ? 'Signed' : 'Signature required'}</StatusBadge></header>
        {agreementComplete ? <div className='partnerCompletion'><Check aria-hidden='true' /><div><strong>Agreement {portal.agreement?.agreement_version} accepted</strong><p>Signed by {portal.agreement?.signer_name}, {portal.agreement?.signer_title}, on {formatDate(portal.agreement?.accepted_at)}.</p></div></div> : <>
          <p>Review the finder’s-fee and referral terms, then sign as an authorized representative of {organization.name}.</p>
          <div className='partnerAgreementTerms'>{agreement?.sections?.map(section => <details key={section.title}><summary>{section.title}</summary><p>{section.body}</p></details>)}</div>
          {canSign ? <form className='partnerCompactForm' onSubmit={submitAgreement}>
            <label><span>Legal name</span><input value={signature.signer_name} onChange={event => setSignature(value => ({ ...value, signer_name: event.target.value }))} required /></label>
            <label><span>Title</span><input value={signature.signer_title} onChange={event => setSignature(value => ({ ...value, signer_title: event.target.value }))} required /></label>
            <label className='partnerCheck'><input type='checkbox' checked={signature.authority_confirmed} onChange={event => setSignature(value => ({ ...value, authority_confirmed: event.target.checked }))} required /><span>I have authority to bind this Sales Partner.</span></label>
            <label className='partnerCheck'><input type='checkbox' checked={signature.signature_intent_confirmed} onChange={event => setSignature(value => ({ ...value, signature_intent_confirmed: event.target.checked }))} required /><span>Typing my name and submitting is my electronic signature.</span></label>
            <Button type='submit' disabled={pending === 'agreement' || !agreement}>{pending === 'agreement' ? <LoaderCircle className='spin' aria-hidden='true' /> : <FileSignature aria-hidden='true' />}{pending === 'agreement' ? 'Signing…' : 'Sign agreement'}</Button>
          </form> : <p className='securityNotice'>A Sales Partner administrator must sign the agreement.</p>}
        </>}
      </section>

      <section className={`appPanel partnerSetupCard${payoutStatus === 'verified' ? ' is-complete' : ''}`}>
        <header className='appPanel__header'><div><p className='technicalLabel'>Step 2</p><h2><Landmark aria-hidden='true' /> ACH payout profile</h2></div><StatusBadge tone={payoutStatus === 'verified' ? 'success' : payoutStatus === 'pending_review' ? 'warning' : 'neutral'}>{formatLabel(payoutStatus)}</StatusBadge></header>
        <p>Velakron pays one monthly finder’s-fee total to the Sales Partner entity. Only masked account details are stored here; never enter a routing number or full account number.</p>
        {canManageProfile && <form className='partnerCompactForm' onSubmit={submitPayout}>
          <label><span>Account holder</span><input value={payout.account_holder_name} onChange={event => setPayout(value => ({ ...value, account_holder_name: event.target.value }))} required /></label>
          <label><span>Bank name</span><input value={payout.bank_name} onChange={event => setPayout(value => ({ ...value, bank_name: event.target.value }))} required /></label>
          <label><span>Final four account digits</span><input inputMode='numeric' pattern='[0-9]{4}' maxLength={4} value={payout.account_last4} onChange={event => setPayout(value => ({ ...value, account_last4: event.target.value.replace(/\D/g, '').slice(0, 4) }))} required /></label>
          <label><span>Payout contact email</span><input type='email' value={payout.payout_contact_email} onChange={event => setPayout(value => ({ ...value, payout_contact_email: event.target.value }))} required /></label>
          <Button type='submit' disabled={pending === 'payout'}>{pending === 'payout' ? <LoaderCircle className='spin' aria-hidden='true' /> : <Landmark aria-hidden='true' />}{pending === 'payout' ? 'Submitting…' : payoutStatus === 'unconfigured' ? 'Submit for verification' : 'Update payout profile'}</Button>
        </form>}
      </section>
    </div>

    <section className='appPanel'>
      <header className='appPanel__header'><div><p className='technicalLabel'>Referral roster</p><h2>Sales team members</h2><p>Roster records identify the individual who receives credit. Each active member can download a flyer with a QR code for their newest active referral link.</p></div></header>
      {canManageMembers && <form className='partnerInlineForm' onSubmit={submitMember}>
        <label><span>First name</span><input value={member.first_name} onChange={event => setMember(value => ({ ...value, first_name: event.target.value }))} required /></label>
        <label><span>Last name</span><input value={member.last_name} onChange={event => setMember(value => ({ ...value, last_name: event.target.value }))} /></label>
        <label><span>Email</span><input type='email' value={member.email} onChange={event => setMember(value => ({ ...value, email: event.target.value }))} required /></label>
        <label><span>Internal reference</span><input value={member.external_reference} onChange={event => setMember(value => ({ ...value, external_reference: event.target.value }))} placeholder='Optional employee ID' /></label>
        <label className='partnerCheck'><input type='checkbox' checked={member.create_link} onChange={event => setMember(value => ({ ...value, create_link: event.target.checked }))} /><span>Create a primary referral link</span></label>
        <Button type='submit' disabled={pending === 'member' || !agreementComplete}>{pending === 'member' ? <LoaderCircle className='spin' aria-hidden='true' /> : <UserPlus aria-hidden='true' />}{pending === 'member' ? 'Adding…' : 'Add team member'}</Button>
      </form>}
      <DataTable columns={memberColumns} rows={portal?.members || []} emptyTitle='No sales team members yet' emptyDescription='Add a representative after the partner agreement is signed.' />
    </section>

    <section className='appPanel'>
      <header className='appPanel__header'><div><p className='technicalLabel'>Attribution links</p><h2>Referral links</h2><p>Each link carries an opaque reference to one roster member. Submitted demo forms enter the Velakron CRM with that attribution.</p></div></header>
      {canManageLinks && <form className='partnerInlineForm partnerInlineForm--link' onSubmit={submitLink}>
        <label><span>Team member</span><select value={linkDraft.member_id} onChange={event => setLinkDraft(value => ({ ...value, member_id: event.target.value }))} required><option value=''>Choose a team member</option>{activeMembers.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></label>
        <label><span>Link label</span><input value={linkDraft.label} onChange={event => setLinkDraft(value => ({ ...value, label: event.target.value }))} required /></label>
        <Button type='submit' disabled={pending === 'link' || !agreementComplete}>{pending === 'link' ? <LoaderCircle className='spin' aria-hidden='true' /> : <Plus aria-hidden='true' />}{pending === 'link' ? 'Creating…' : 'Assign link'}</Button>
      </form>}
      <DataTable columns={linkColumns} rows={portal?.referral_links || []} emptyTitle='No referral links yet' emptyDescription='Assign a link to an active team member.' />
    </section>

    <div className='partnerReportingGrid'>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>CRM attribution</p><h2>Referred companies</h2></div></header>
        <DataTable columns={referralColumns} rows={portal?.referrals || []} emptyTitle='No referred companies yet' emptyDescription='A company appears after it submits a demo request through an active link.' />
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Monthly reporting</p><h2>Finder’s-fee statements</h2></div></header>
        <DataTable columns={statementColumns} rows={portal?.statements || []} emptyTitle='No monthly statements yet' emptyDescription='Velakron publishes a statement after eligible subscription payments are collected.' />
      </section>
    </div>
    <p className='dashboardFreshness'>Finder’s fees are awarded once per referred account: $500 after a paid Early Access enrollment and a further $1,000 after its first paid annual subscription begins.</p>
  </>
}

SalesPartnerPortal.getLayout = PortalPageLayout
export default SalesPartnerPortal
