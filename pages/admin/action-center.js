import { BellRing, Building2, Factory, RefreshCw, ShieldCheck } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ErrorState, MetricCard, PermissionDenied, StatusBadge } from '../../components/app'
import PlatformActionQueue from '../../components/app/PlatformActionQueue'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { Button } from '../../components/design-system'
import { getHasPermission } from '../../store/slices/appContext'
import { loadPlatformActionCenter, platformSelectors } from '../../store/slices/entities/platformAdministration'

const ActionCenter = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('platform.support'))
  const actionCenter = useSelector(platformSelectors.getActionCenter)
  const loading = useSelector(platformSelectors.getActionCenterLoading)
  const error = useSelector(platformSelectors.getActionCenterError)
  useEffect(() => { if (allowed) dispatch(loadPlatformActionCenter()) }, [allowed, dispatch])
  if (!allowed) return <PermissionDenied description='Only Velakron platform administrators can access company review work.' />
  const counts = actionCenter?.counts || {}
  return <>
    <Seo title='Action center' description='Velakron organization and operations action queue.' path='/admin/action-center' noIndex />
    <AppPageHeader
      eyebrow='Operational ownership'
      title='Action center'
      description='One live queue for approvals, supplier reviews, and platform issues. Company-owned next steps remain visible without creating false urgency for Velakron.'
      actions={<Button variant='secondary' onClick={() => dispatch(loadPlatformActionCenter())} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} aria-hidden='true' /> Refresh</Button>}
    />
    {error && <ErrorState title='The action center could not refresh' description={error.message} onRetry={() => dispatch(loadPlatformActionCenter())} />}
    {loading && !actionCenter ? <section className='appPanel'><AppSkeleton lines={9} /></section> : <>
      <section className='metricGrid metricGrid--priority' aria-label='Action center summary'>
        <MetricCard label='Needs Velakron' value={String(counts.needs_velakron || 0)} detail='Approvals and operational intervention' icon={BellRing} tone={counts.needs_velakron ? 'warning' : 'success'} />
        <MetricCard label='Organization approvals' value={String(counts.organization_reviews || 0)} detail='Activated OEM accounts ready for review' icon={Building2} tone={counts.organization_reviews ? 'accent' : 'success'} />
        <MetricCard label='Supplier reviews' value={String(counts.supplier_reviews || 0)} detail='Submitted onboarding profiles' icon={Factory} tone={counts.supplier_reviews ? 'cyan' : 'success'} />
        <MetricCard label='System attention' value={String(counts.system_attention || 0)} detail='Delivery or file-security operations' icon={ShieldCheck} tone={counts.system_attention ? 'danger' : 'success'} />
      </section>
      <PlatformActionQueue
        title='Needs Velakron now'
        description='These remain here until a Velakron administrator completes the review or resolves the operational issue.'
        items={actionCenter?.needs_velakron || []}
        emptyTitle='No Velakron actions are waiting'
        emptyDescription='New approvals and operational exceptions will appear automatically.'
      />
      <PlatformActionQueue
        title='Waiting on companies'
        description='Visible for follow-up, but the next move belongs to the OEM or supplier.'
        items={actionCenter?.waiting_external || []}
        emptyTitle='No companies are waiting'
        emptyDescription='Invited and in-progress organizations will appear here.'
        external
      />
      <p className='actionCenterFreshness'>Live status refreshes every {actionCenter?.freshness?.polling_seconds || 60} seconds. Opening customer details still requires an audited support reason. <StatusBadge tone='info'>{counts.waiting_external || 0} company-owned</StatusBadge></p>
    </>}
  </>
}

ActionCenter.getLayout = PortalPageLayout
export default ActionCenter
