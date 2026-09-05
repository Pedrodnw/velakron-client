import {
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  Crown,
  ExternalLink,
  LoaderCircle,
  Rocket,
  UsersRound,
} from 'lucide-react'
import { Button } from '../design-system'
import StatusBadge from './StatusBadge'
import { classifyClientPlanChange, formatBillingMoney } from './billingFormatters'

const seatLabel = limit => limit === null ? 'Unlimited' : limit

const PlanCard = ({ plan, currentPlanCode, scheduledPlanCode, canManage, enrollmentAvailable, pendingAction, onSelect }) => {
  const change = classifyClientPlanChange(currentPlanCode, plan.code)
  const current = change === 'current'
  const scheduled = scheduledPlanCode === plan.code
  const actionLabel = !plan.self_service
    ? 'Talk to Velakron'
    : change === 'start' ? 'Choose plan'
      : change === 'upgrade' ? 'Upgrade now'
        : change === 'downgrade' ? 'Schedule downgrade'
          : 'Current plan'

  return <article className={`billingPlanCard${current ? ' is-current' : ''}${plan.code === 'professional' ? ' is-featured' : ''}`}>
    {plan.code === 'professional' && !current && <span className='billingPlanCard__recommended'><Crown aria-hidden='true' /> Built for scale</span>}
    <header>
      <div>
        <p className='technicalLabel'>{plan.code.replace('_', ' ')}</p>
        <h3>{plan.name}</h3>
      </div>
      {current && <StatusBadge tone='success'><Check aria-hidden='true' /> Current</StatusBadge>}
      {scheduled && <StatusBadge tone='warning'><CalendarClock aria-hidden='true' /> Scheduled</StatusBadge>}
    </header>
    <p className='billingPlanCard__price'>
      <strong>{formatBillingMoney(plan.annual_amount_cents, plan.currency)}</strong>
      {plan.annual_amount_cents !== null && <span>/ year</span>}
    </p>
    <ul>
      <li><UsersRound aria-hidden='true' /><span><strong>{seatLabel(plan.participating_oem_seat_limit)}</strong> participating OEM seat{plan.participating_oem_seat_limit === 1 ? '' : 's'}</span></li>
      <li><Building2 aria-hidden='true' /><span><strong>Unlimited</strong> supplier collaborators</span></li>
      <li><Check aria-hidden='true' /><span>{plan.view_only_oem_seat_limit === 0 ? 'No view-only OEM seats' : `${seatLabel(plan.view_only_oem_seat_limit)} view-only OEM seats`}</span></li>
      {plan.pilot_eligible && plan.pilot?.fee_cents !== null && <li><Rocket aria-hidden='true' /><span>90-day pilot from <strong>{formatBillingMoney(plan.pilot.fee_cents, plan.currency)}</strong></span></li>}
      {plan.code === 'enterprise' && <li><Crown aria-hidden='true' /><span><strong>100+ seats</strong> with tailored terms</span></li>}
    </ul>
    <Button
      variant={current ? 'secondary' : 'primary'}
      disabled={current || scheduled || !canManage || (plan.self_service && !enrollmentAvailable) || Boolean(pendingAction)}
      onClick={() => onSelect(plan, change)}
    >
      {pendingAction === plan.code ? <LoaderCircle className='spin' aria-hidden='true' /> : !plan.self_service ? <ExternalLink aria-hidden='true' /> : <ArrowUpRight aria-hidden='true' />}
      {scheduled ? 'Change scheduled' : actionLabel}
    </Button>
  </article>
}

const BillingPlanManager = ({ catalog, subscription, canManage, enrollmentAvailable, pendingAction, onSelectPlan }) => {
  const plans = catalog?.plans || []
  return <section className='billingPlans' aria-labelledby='billing-plans-heading'>
    <header className='billingSectionHeader'>
      <div>
        <p className='technicalLabel'>Annual plans</p>
        <h2 id='billing-plans-heading'>Choose the right operating scale</h2>
        <p>Supplier seats are always unlimited. Participating OEM seats include administrators and team members who can change work.</p>
      </div>
      <StatusBadge tone='info'>Annual prepaid</StatusBadge>
    </header>
    <div className='billingPlanGrid'>
      {plans.map(plan => <PlanCard
        key={plan.code}
        plan={plan}
        currentPlanCode={subscription?.plan?.plan_code}
        scheduledPlanCode={subscription?.scheduled_plan_code}
        canManage={canManage}
        enrollmentAvailable={enrollmentAvailable}
        pendingAction={pendingAction}
        onSelect={onSelectPlan}
      />)}
    </div>
  </section>
}

export default BillingPlanManager
