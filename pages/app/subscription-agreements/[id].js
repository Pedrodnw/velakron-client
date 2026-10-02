import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ErrorState, PermissionDenied } from '../../../components/app'
import { Button } from '../../../components/design-system'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import { formatBillingMoney } from '../../../components/app/billingFormatters'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { apiCallBegan } from '../../../store/api'
import Seo from '../../../components/Seo'

function AcceptedSubscriptionAgreement() {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('billing.read'))
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const id = typeof router.query.id === 'string' ? router.query.id : ''
  useEffect(() => {
    let active = true
    setRecord(null); setError('')
    if (id && allowed && organization?.id) dispatch(apiCallBegan({ url: `/billing/agreements/${id}`, organizationScoped: true })).then(result => {
      if (!active) return
      if (result?.ok) setRecord(result.payload.data.acceptance)
      else setError('This accepted agreement is unavailable in the current organization.')
    })
    return () => { active = false }
  }, [id, allowed, organization?.id, dispatch])
  if (!allowed) return <PermissionDenied />
  if (error) return <ErrorState description={error} />
  if (!record) return <AppSkeleton lines={8} />
  const order = record.commercial_snapshot
  return <>
    <Seo title='Accepted Subscription Agreement' path={`/app/subscription-agreements/${id}`} noIndex />
    <AppPageHeader title='Accepted subscription agreement' description='The exact agreement and order recorded before payment checkout.' actions={<><Button href='/app/billing' variant='secondary'>Back to Billing</Button><Button onClick={() => window.print()}>Print / save as PDF</Button></>} />
    <article className='appPanel acceptedSubscriptionAgreement'>
      <h2>{record.terms_snapshot.title}</h2>
      <p>Version {record.version} · Effective {record.terms_snapshot.effective_on}</p>
      <dl className='appDetailList'>
        <div><dt>Organization</dt><dd>{record.organization_name}</dd></div>
        <div><dt>Accepted by</dt><dd>{record.accepted_by_name} · {record.accepted_by_email}</dd></div>
        <div><dt>Accepted at</dt><dd>{new Date(record.accepted_at).toISOString()}</dd></div>
        <div><dt>Plan</dt><dd>{order.plan.plan_name} · {order.kind === 'pilot' ? `${order.duration_days}-day pilot` : 'Annual subscription'}</dd></div>
        <div><dt>Order amount before checkout taxes</dt><dd>{formatBillingMoney(order.amount_due_cents, order.plan.currency)}</dd></div>
        <div><dt>Renewal</dt><dd>{order.automatically_renews ? 'Renews annually unless canceled' : 'No automatic renewal'}</dd></div>
        {order.kind === 'pilot' && <div><dt>Annual conversion credit</dt><dd>{formatBillingMoney(order.conversion_credit_cents, order.plan.currency)}</dd></div>}
        <div><dt>Record reference</dt><dd>{record.id}</dd></div>
      </dl>
      <p>Acceptance was recorded before checkout and does not establish that payment was completed.</p>
      {record.terms_snapshot.sections.map(section => <section key={section.title}><h3>{section.title}</h3>{section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}</section>)}
      <h3>Acceptance statement</h3><p>{record.acceptance_statement}</p>
      <p className='acceptedSubscriptionAgreement__hash'>Content verification hash: {record.terms_hash}</p>
    </article>
  </>
}

AcceptedSubscriptionAgreement.getLayout = PortalPageLayout
export default AcceptedSubscriptionAgreement
