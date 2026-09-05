import { Building2, CreditCard, LoaderCircle, Search, Send, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { formatBillingDate, formatBillingMoney } from '../../components/app/billingFormatters'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { apiCallBegan } from '../../store/api'
import { getHasPermission } from '../../store/slices/appContext'

const unwrap = result => result?.payload?.data || null
const defaultExpiry = () => {
  const value = new Date()
  value.setDate(value.getDate() + 30)
  return value.toISOString().slice(0, 10)
}

const BillingAdmin = () => {
  const dispatch = useDispatch()
  const canSupport = useSelector(getHasPermission('billing.support'))
  const canOffer = useSelector(getHasPermission('billing.offer.manage'))
  const loadSequence = useRef(0)
  const [catalog, setCatalog] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [offer, setOffer] = useState({ plan_code: 'team', annual_amount: '', seats: '100', expires_at: defaultExpiry() })

  const load = useCallback(async searchValue => {
    if (!canSupport) return
    const sequence = ++loadSequence.current
    setLoading(true)
    setError('')
    const [catalogResult, organizationResult] = await Promise.all([
      dispatch(apiCallBegan({ url: '/billing/catalog', requestKey: 'billing-admin-catalog' })),
      dispatch(apiCallBegan({ url: '/billing/organizations', params: { search: searchValue || undefined }, requestKey: 'billing-admin-organizations', organizationScoped: true })),
    ])
    if (sequence !== loadSequence.current) return
    if (!catalogResult?.ok || !organizationResult?.ok) {
      setError(resultError(catalogResult?.ok ? organizationResult : catalogResult, 'Billing accounts could not be loaded.'))
    } else {
      setCatalog(unwrap(catalogResult)?.catalog)
      const nextOrganizations = unwrap(organizationResult)?.organizations || []
      setOrganizations(nextOrganizations)
      setSelected(current => current
        ? nextOrganizations.find(item => item.organization.id === current.organization.id) || current
        : current)
    }
    setLoading(false)
  }, [canSupport, dispatch])

  useEffect(() => { load('') }, [load])

  const eligiblePlans = (catalog?.plans || []).filter(plan => plan.pilot_eligible)
  const selectedPlan = eligiblePlans.find(plan => plan.code === offer.plan_code)
  const annualCents = offer.plan_code === 'enterprise'
    ? Math.round(Number(offer.annual_amount || 0) * 100)
    : selectedPlan?.annual_amount_cents
  const pilotFee = Number.isInteger(annualCents) && annualCents > 0 ? annualCents * 3 / 16 : null
  const offerValid = Boolean(
    selected?.organization?.id
    && offer.expires_at
    && (offer.plan_code !== 'enterprise' || (annualCents > 0 && Number(offer.seats) >= 100)),
  )

  const openAccount = item => {
    setSelected(item)
    setFeedback(null)
    setOffer({ plan_code: 'team', annual_amount: '', seats: '100', expires_at: defaultExpiry() })
  }

  const submitOffer = async event => {
    event.preventDefault()
    if (!offerValid || pending) return
    setPending(true)
    setFeedback(null)
    const result = await dispatch(apiCallBegan({
      url: '/billing/pilot-offers',
      method: 'post',
      data: {
        organization_id: selected.organization.id,
        plan_code: offer.plan_code,
        expires_at: `${offer.expires_at}T23:59:59.999Z`,
        ...(offer.plan_code === 'enterprise' ? {
          annual_amount_cents: annualCents,
          participating_oem_seat_limit: Number(offer.seats),
        } : {}),
      },
      organizationScoped: true,
    }))
    setPending(false)
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The pilot offer could not be created.') })
      return
    }
    const created = unwrap(result)
    setFeedback({ type: 'success', message: `Pilot offer ${created?.offer?.offer_code} created${created?.notification_queued ? ' and emailed to the primary contact' : ''}.` })
    await load(search)
  }

  const columns = useMemo(() => [
    { key: 'organization', label: 'OEM account', render: item => <div className='tablePrimary'><strong>{item.organization.name}</strong><span>{item.organization.primary_contact?.email || item.organization.slug}</span></div> },
    { key: 'plan', label: 'Plan', render: item => item.subscription?.plan?.plan_name || 'Not enrolled' },
    { key: 'subscription', label: 'Subscription', render: item => <StatusBadge tone={item.subscription ? statusTone(item.subscription.status) : 'neutral'}>{item.subscription ? formatLabel(item.subscription.status) : 'No subscription'}</StatusBadge> },
    { key: 'pilot', label: 'Pilot', render: item => item.pilot_offer ? <div className='tablePrimary'><strong>{item.pilot_offer.offer_code}</strong><span>{formatLabel(item.pilot_offer.status)} · expires {formatDate(item.pilot_offer.expires_at)}</span></div> : '—' },
    { key: 'access', label: 'Billing access', render: item => <StatusBadge tone={item.account?.access_mode === 'read_only' ? 'danger' : 'success'}>{item.account ? formatLabel(item.account.access_mode) : 'Unconfigured'}</StatusBadge> },
    { key: 'actions', label: '', render: item => <Button variant='secondary' className='tableAction' onClick={() => openAccount(item)}>Open</Button> },
  ], [])

  if (!canSupport) return <PermissionDenied description='Billing support is restricted to authorized Velakron employees.' />

  return <>
    <Seo title='Billing operations' description='Review OEM subscriptions and prepare private pilot offers.' path='/app/billing-admin' noIndex />
    <AppPageHeader eyebrow='Commercial operations' title='Billing' description='Review OEM subscription health and prepare controlled pilot offers. Payment details stay with the billing provider.' actions={<StatusBadge tone='info'><CreditCard aria-hidden='true' /> Provider-safe view</StatusBadge>} />
    <form className='billingAdminSearch appPanel' onSubmit={event => { event.preventDefault(); load(search) }}>
      <label htmlFor='billing-account-search'><span>Search OEM accounts</span><div><Search aria-hidden='true' /><input id='billing-account-search' value={search} onChange={event => setSearch(event.target.value)} placeholder='Company, slug, or primary contact email' /></div></label>
      <Button type='submit' disabled={loading}><Search aria-hidden='true' /> Search</Button>
    </form>
    {error && <ErrorState description={error} onRetry={() => load(search)} />}
    <section className='appPanel appPanel--table'>
      {loading ? <AppSkeleton lines={8} /> : <DataTable caption='OEM billing accounts' columns={columns} rows={organizations} getRowKey={item => item.organization.id} emptyTitle='No OEM accounts found' emptyDescription='Try a different company or contact search.' />}
    </section>

    <ResponsiveDrawer open={Boolean(selected)} title='OEM billing account' onClose={() => { if (!pending) setSelected(null) }} wide>
      {selected && <div className='billingAdminDrawer'>
        <section className='billingAdminIdentity'>
          <span><Building2 aria-hidden='true' /></span>
          <div><p className='technicalLabel'>OEM organization</p><h3>{selected.organization.name}</h3><p>{selected.organization.primary_contact?.email || 'No primary contact email'}</p></div>
          <StatusBadge tone={statusTone(selected.organization.status)}>{formatLabel(selected.organization.status)}</StatusBadge>
        </section>
        <div className='billingAdminSummary'>
          <div><span>Current plan</span><strong>{selected.subscription?.plan?.plan_name || 'Not enrolled'}</strong></div>
          <div><span>Annual value</span><strong>{selected.subscription ? formatBillingMoney(selected.subscription.plan.annual_amount_cents, selected.subscription.plan.currency) : '—'}</strong></div>
          <div><span>Renewal</span><strong>{selected.subscription ? formatBillingDate(selected.subscription.current_period_end) : '—'}</strong></div>
          <div><span>Workspace access</span><strong>{formatLabel(selected.account?.access_mode || 'Not configured')}</strong></div>
        </div>
        {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
        {selected.pilot_offer && <section className='billingExistingOffer'><Sparkles aria-hidden='true' /><div><strong>Active pilot offer {selected.pilot_offer.offer_code}</strong><p>{selected.pilot_offer.plan.plan_name} · {formatBillingMoney(selected.pilot_offer.fee_cents, selected.pilot_offer.currency)} · expires {formatBillingDate(selected.pilot_offer.expires_at)}</p></div></section>}
        {canOffer && !selected.pilot_offer && <form className='drawerForm billingOfferForm' onSubmit={submitOffer}>
          <header><p className='technicalLabel'>Private commercial offer</p><h3>Create a 90-day pilot</h3><p>The customer pays 3/16 of the annual price. The entire pilot fee becomes a credit when they convert.</p></header>
          <label className='drawerForm__field'><span>Target plan</span><select value={offer.plan_code} onChange={event => setOffer(value => ({ ...value, plan_code: event.target.value }))}>{eligiblePlans.map(plan => <option key={plan.code} value={plan.code}>{plan.name}</option>)}</select></label>
          {offer.plan_code === 'enterprise' && <div className='drawerForm__grid'>
            <label className='drawerForm__field'><span>Custom annual price (USD)</span><input type='number' min='1' step='0.16' value={offer.annual_amount} onChange={event => setOffer(value => ({ ...value, annual_amount: event.target.value }))} required /></label>
            <label className='drawerForm__field'><span>Participating OEM seats</span><input type='number' min='100' step='1' value={offer.seats} onChange={event => setOffer(value => ({ ...value, seats: event.target.value }))} required /></label>
          </div>}
          <label className='drawerForm__field'><span>Offer expires</span><input type='date' min={new Date().toISOString().slice(0, 10)} value={offer.expires_at} onChange={event => setOffer(value => ({ ...value, expires_at: event.target.value }))} required /></label>
          <section className='billingOfferPreview'><span>Pilot fee</span><strong>{formatBillingMoney(pilotFee, 'usd')}</strong><small>100% conversion credit · 90-day term</small></section>
          <Button type='submit' disabled={!offerValid || pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} {pending ? 'Creating offer…' : 'Create & notify customer'}</Button>
        </form>}
        {!canOffer && <p className='billingReadOnlyNotice'>You can review billing health. Only founders can create commercial pilot offers.</p>}
      </div>}
    </ResponsiveDrawer>
  </>
}

BillingAdmin.getLayout = PortalPageLayout
export default BillingAdmin
