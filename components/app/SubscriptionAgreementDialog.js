import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText } from 'lucide-react'
import ConfirmationDialog from './ConfirmationDialog'
import { formatBillingMoney } from './billingFormatters'

export default function SubscriptionAgreementDialog({ order, agreement, pending, organizationName, error, onClose, onAccept }) {
  const [accepted, setAccepted] = useState(false)
  useEffect(() => { setAccepted(false) }, [order, agreement?.version, agreement?.terms_hash, organizationName])
  const pilot = order?.kind === 'pilot'
  return <ConfirmationDialog
    open={Boolean(order)} title='Review your subscription agreement' icon={FileText}
    description={`Confirm the order for ${organizationName} before continuing to secure payment checkout.`}
    confirmLabel={pending ? 'Preparing checkout…' : 'Agree and continue to checkout'}
    confirmDisabled={!accepted || !agreement?.terms_hash || !order?.order_hash || pending}
    onClose={() => { if (!pending) onClose() }}
    onConfirm={() => onAccept({ accepted: true, authorized: true, version: agreement.version, terms_hash: agreement.terms_hash, order_hash: order.order_hash })}
  >
    {order && <div className='subscriptionAgreementReview'>
      {error && <p className='formHint formHint--error' role='alert'>{error}</p>}
      <dl className='subscriptionAgreementReview__order'>
        <div><dt>Plan</dt><dd>{order.plan.plan_name || order.plan.name}</dd></div>
        <div><dt>{pilot ? 'One-time pilot payment' : 'Annual payment'}</dt><dd>{formatBillingMoney(order.amount_cents, order.currency)}</dd></div>
        <div><dt>Term</dt><dd>{pilot ? `${order.duration_days} days · no automatic renewal` : '12 months · renews annually unless canceled'}</dd></div>
        {pilot && <div><dt>Annual conversion credit</dt><dd>{formatBillingMoney(order.conversion_credit_cents, order.currency)}</dd></div>}
      </dl>
      <p>Review any taxes or additional charges in payment checkout before paying. {pilot ? 'The pilot fee is non-refundable except as required by law or agreed in writing. Annual conversion requires a separate checkout.' : 'Cancel before renewal in Billing to stop the next annual charge. Cancellation takes effect at the end of the paid term.'}</p>
      {agreement ? <>
        <p><Link href='/subscription-agreement' target='_blank' rel='noopener noreferrer'>Open / print the full agreement</Link><br /><small>Version {agreement.version} · Effective {agreement.effective_on}</small></p>
        <details className='subscriptionAgreementReview__terms'><summary>Read the full agreement here</summary>
          {agreement.sections.map(section => <section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
        </details>
        <label className='subscriptionAgreementReview__accept'>
          <input type='checkbox' checked={accepted} disabled={pending} onChange={event => setAccepted(event.target.checked)} />
          <span>{agreement.acceptance_statement}</span>
        </label>
      </> : <p role='alert'>The agreement could not be loaded. Refresh Billing before starting checkout.</p>}
    </div>}
  </ConfirmationDialog>
}
