import {
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  FileText,
  LoaderCircle,
  ReceiptText,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  UsersRound,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  BillingPlanManager,
  ConfirmationDialog,
  ErrorState,
  PermissionDenied,
  StatusBadge,
} from '../../components/app'
import { formatBillingDate, formatBillingMoney } from '../../components/app/billingFormatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { apiCallBegan } from '../../store/api'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'

const idempotencyKey = prefix => `${prefix}:${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`

const unwrap = result => result?.payload?.data || null

const SeatMeter = ({ label, value }) => {
  const unlimited = value?.limit === null
  const percentage = unlimited || !value?.limit ? 0 : Math.min(100, (value.used / value.limit) * 100)
  return <div className='billingSeatMeter'>
    <div><span>{label}</span><strong>{value?.used || 0} / {unlimited ? 'Unlimited' : value?.limit || 0}</strong></div>
    <div className='billingSeatMeter__track' aria-hidden='true'><span style={{ width: unlimited ? '18%' : `${percentage}%` }} /></div>
  </div>
}

const Billing = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const canRead = useSelector(getHasPermission('billing.read'))
  const canManage = useSelector(getHasPermission('billing.manage'))
  const loadSequence = useRef(0)
  const [catalog, setCatalog] = useState(null)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [pendingAction, setPendingAction] = useState('')
  const [confirmation, setConfirmation] = useState(null)

  const load = useCallback(async () => {
    if (!canRead || !organization?.id) return
    const sequence = ++loadSequence.current
    setLoading(true)
    setLoadError('')
    const [catalogResult, summaryResult] = await Promise.all([
      dispatch(apiCallBegan({ url: '/billing/catalog', requestKey: 'billing-catalog' })),
      dispatch(apiCallBegan({ url: '/billing/summary', requestKey: 'billing-summary', organizationScoped: true })),
    ])
    if (sequence !== loadSequence.current) return
    if (!catalogResult?.ok || !summaryResult?.ok) {
      setLoadError(resultError(catalogResult?.ok ? summaryResult : catalogResult, 'Billing details could not be loaded.'))
    } else {
      setCatalog(unwrap(catalogResult)?.catalog)
      setSummary(unwrap(summaryResult))
    }
    setLoading(false)
  }, [canRead, dispatch, organization?.id])

  useEffect(() => { load() }, [load])

  const currentPlan = summary?.subscription?.plan
  const statusTone = ['active', 'trialing'].includes(summary?.subscription?.status) ? 'success'
    : ['past_due', 'unpaid'].includes(summary?.subscription?.status) ? 'danger' : 'neutral'
  const paymentLabel = summary?.payment_method
    ? `${String(summary.payment_method.brand || summary.payment_method.type).toUpperCase()} •••• ${summary.payment_method.last4}`
    : 'No payment method on file'
  const hasCancellation = Boolean(summary?.subscription?.cancel_at_period_end)

  const redirectToProvider = (url, previewMessage) => {
    if (!url) return
    if (url.startsWith('/')) {
      setFeedback({ type: 'success', message: previewMessage })
      return
    }
    window.location.assign(url)
  }

  const mutate = async ({ action, url, data, successMessage, redirectField }) => {
    setPendingAction(action)
    setFeedback(null)
    const result = await dispatch(apiCallBegan({
      url,
      method: 'post',
      data,
      headers: { 'Idempotency-Key': idempotencyKey(action) },
      organizationScoped: true,
    }))
    setPendingAction('')
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The billing change could not be completed.') })
      return false
    }
    const payload = unwrap(result)
    if (redirectField && payload?.[redirectField]) redirectToProvider(payload[redirectField], `${successMessage} Local billing preview is active; no payment was collected.`)
    else {
      setFeedback({ type: 'success', message: successMessage })
      await load()
    }
    return true
  }

  const selectPlan = (plan, change) => {
    if (!plan.self_service) {
      window.location.assign('/request-demo?intent=enterprise')
      return
    }
    const config = change === 'start'
      ? { action: plan.code, url: '/billing/checkout', data: { plan_code: plan.code }, redirectField: 'checkout_url', successMessage: `${plan.name} checkout is ready.` }
      : { action: plan.code, url: '/billing/change-plan', data: { plan_code: plan.code }, successMessage: change === 'upgrade' ? `Upgrade to ${plan.name} requested.` : `Downgrade to ${plan.name} scheduled for renewal.` }
    if (change === 'downgrade') {
      setConfirmation({
        title: `Schedule ${plan.name} for renewal?`,
        description: `Your current plan remains active until ${formatBillingDate(summary.subscription.current_period_end)}. The lower seat limit will apply at renewal.`,
        confirmLabel: 'Schedule downgrade',
        run: () => mutate(config),
      })
    } else mutate(config)
  }

  const pilotOffer = summary?.pilot_offer
  const invoices = summary?.invoices || []
  const heroMeta = useMemo(() => currentPlan ? [
    { label: 'Annual plan', value: formatBillingMoney(currentPlan.annual_amount_cents, currentPlan.currency) },
    { label: hasCancellation ? 'Access through' : 'Renews', value: formatBillingDate(summary.subscription.current_period_end) },
    { label: 'Payment', value: paymentLabel },
  ] : [
    { label: 'Plan', value: 'Not selected' },
    { label: 'Billing', value: summary?.provider?.enrollment_available ? 'Ready to enroll' : 'Coming soon' },
    { label: 'Access', value: 'Unchanged until billing launches' },
  ], [currentPlan, hasCancellation, paymentLabel, summary])

  if (!canRead) return <PermissionDenied />
  if (loading && !summary) return <section className='appPanel'><AppSkeleton lines={7} /></section>
  if (loadError && !summary) return <ErrorState title='Billing is unavailable' description={loadError} onRetry={load} />

  return <>
    <Seo title='Billing' description='Manage the organization plan, subscription, payment method, and invoices.' path='/app/billing' noIndex />
    <AppPageHeader eyebrow='Account & subscription' title='Billing' description={`Manage the Velakron plan for ${organization?.name}. Supplier collaboration remains unlimited on every plan.`} actions={<Button variant='secondary' onClick={load} disabled={loading}><RotateCcw className={loading ? 'spin' : ''} aria-hidden='true' /> Refresh</Button>} />

    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {loadError && <FormMessage>{loadError}</FormMessage>}

    <section className='billingHero'>
      <div className='billingHero__lead'>
        <span className='billingHero__icon'><CreditCard aria-hidden='true' /></span>
        <div>
          <p className='technicalLabel'>Current subscription</p>
          <div className='billingHero__title'>
            <h2>{currentPlan?.plan_name || 'Choose your Velakron plan'}</h2>
            {summary?.subscription && <StatusBadge tone={statusTone}>{summary.subscription.status.replace('_', ' ')}</StatusBadge>}
            {hasCancellation && <StatusBadge tone='warning'>Ends at renewal</StatusBadge>}
          </div>
          <p>{currentPlan ? 'Your plan controls participating OEM seats. Connected supplier seats remain unlimited.' : 'Select an annual plan when you are ready. Billing enforcement is currently off, so access will not change during setup.'}</p>
        </div>
      </div>
      <dl className='billingHero__meta'>
        {heroMeta.map(item => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}
      </dl>
      <div className='billingHero__actions'>
        {summary?.account && canManage && <Button variant='secondary' disabled={Boolean(pendingAction)} onClick={() => mutate({ action: 'portal', url: '/billing/portal', redirectField: 'portal_url', successMessage: 'Billing portal is ready.' })}>{pendingAction === 'portal' ? <LoaderCircle className='spin' aria-hidden='true' /> : <ExternalLink aria-hidden='true' />} Manage payment & invoices</Button>}
        {summary?.subscription && canManage && (hasCancellation
          ? <Button variant='secondary' disabled={Boolean(pendingAction)} onClick={() => mutate({ action: 'resume', url: '/billing/resume', successMessage: 'Your subscription will now renew normally.' })}><RotateCcw aria-hidden='true' /> Keep subscription</Button>
          : <Button variant='secondary' className='billingCancelButton' disabled={Boolean(pendingAction)} onClick={() => setConfirmation({ title: 'Cancel at the end of the term?', description: `Your plan and workspace remain available through ${formatBillingDate(summary.subscription.current_period_end)}. You can reverse this before renewal.`, confirmLabel: 'Schedule cancellation', danger: true, run: () => mutate({ action: 'cancel', url: '/billing/cancel', successMessage: 'Cancellation scheduled for the end of the current term.' }) })}>Cancel at renewal</Button>)}
      </div>
    </section>

    {pilotOffer && <section className='billingPilotCard'>
      <span><Sparkles aria-hidden='true' /></span>
      <div>
        <p className='technicalLabel'>Private pilot offer · {pilotOffer.offer_code}</p>
        <h2>{pilotOffer.plan.plan_name} · 90-day guided pilot</h2>
        <p>Start for {formatBillingMoney(pilotOffer.fee_cents, pilotOffer.currency)}. The full pilot fee is credited if you convert to the annual plan.</p>
        <small>Offer available through {formatBillingDate(pilotOffer.expires_at)}.</small>
      </div>
      {pilotOffer.status === 'sent' && canManage && <Button disabled={Boolean(pendingAction)} onClick={() => mutate({ action: 'pilot', url: `/billing/pilot-offers/${pilotOffer.id}/checkout`, redirectField: 'checkout_url', successMessage: 'Pilot checkout is ready.' })}>{pendingAction === 'pilot' ? <LoaderCircle className='spin' aria-hidden='true' /> : <Sparkles aria-hidden='true' />} Start pilot</Button>}
    </section>}

    {summary?.subscription && <section className='billingUsageGrid'>
      <article className='appPanel'>
        <header className='billingSectionHeader'><div><p className='technicalLabel'>Seat usage</p><h2>Your OEM team</h2></div><UsersRound aria-hidden='true' /></header>
        <SeatMeter label='Participating seats' value={summary.seat_usage?.participating} />
        <SeatMeter label='View-only seats' value={summary.seat_usage?.view_only} />
        <p className='billingUsageHint'><ShieldCheck aria-hidden='true' /> Supplier collaborators never count toward these limits.</p>
      </article>
      <article className='appPanel'>
        <header className='billingSectionHeader'><div><p className='technicalLabel'>Upcoming change</p><h2>{summary.subscription.scheduled_plan_code ? 'Plan change scheduled' : hasCancellation ? 'Cancellation scheduled' : 'No changes scheduled'}</h2></div><CalendarClock aria-hidden='true' /></header>
        <p>{summary.subscription.scheduled_plan_code ? `${summary.subscription.scheduled_plan_code.replace('_', ' ')} begins ${formatBillingDate(summary.subscription.scheduled_change_at)}.` : hasCancellation ? `Service remains active through ${formatBillingDate(summary.subscription.current_period_end)}.` : 'Your current annual plan will renew automatically.'}</p>
      </article>
    </section>}

    <BillingPlanManager catalog={catalog} subscription={summary?.subscription} canManage={canManage} enrollmentAvailable={summary?.provider?.enrollment_available} pendingAction={pendingAction} onSelectPlan={selectPlan} />

    <section className='billingInvoices appPanel'>
      <header className='billingSectionHeader'>
        <div><p className='technicalLabel'>Billing history</p><h2>Invoices and receipts</h2><p>Provider-hosted links keep sensitive payment details outside Velakron.</p></div>
        <ReceiptText aria-hidden='true' />
      </header>
      {invoices.length ? <div className='billingInvoiceList'>
        {invoices.map(invoice => <article key={invoice.id}>
          <span className='billingInvoiceList__icon'><FileText aria-hidden='true' /></span>
          <div><strong>{invoice.number || 'Invoice'}</strong><small>{formatBillingDate(invoice.issued_at)} · {invoice.status.replace('_', ' ')}</small></div>
          <strong>{formatBillingMoney(invoice.total_cents, invoice.currency)}</strong>
          {(invoice.hosted_invoice_url || invoice.invoice_pdf_url) && <a href={invoice.hosted_invoice_url || invoice.invoice_pdf_url} target='_blank' rel='noopener noreferrer'>View <ExternalLink aria-hidden='true' /></a>}
        </article>)}
      </div> : <div className='billingEmptyHistory'><CheckCircle2 aria-hidden='true' /><div><strong>No invoices yet</strong><p>Completed invoices and receipts will appear here.</p></div></div>}
    </section>

    {!canManage && <p className='billingReadOnlyNotice'><ShieldCheck aria-hidden='true' /> You can review billing information. An OEM administrator manages plans and payment details.</p>}

    <ConfirmationDialog
      open={Boolean(confirmation)}
      title={confirmation?.title}
      description={confirmation?.description}
      confirmLabel={pendingAction ? 'Saving…' : confirmation?.confirmLabel}
      danger={confirmation?.danger}
      confirmDisabled={Boolean(pendingAction)}
      onClose={() => setConfirmation(null)}
      onConfirm={async () => { if (await confirmation.run()) setConfirmation(null) }}
    />
  </>
}

Billing.getLayout = PortalPageLayout
export default Billing
