import { Activity, AlertTriangle, BellRing, Building2, CircleCheck, Clock3, Factory, Handshake, ListChecks, PackageCheck, UsersRound } from 'lucide-react'
import { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  AttentionReason,
  EmptyState,
  ErrorState,
  MetricCard,
  RecordCard,
  ScheduleHealthBadge,
  StageBadge,
  StatusBadge,
} from '../../components/app'
import { Button } from '../../components/design-system'
import { formatDate, formatDateTime, formatLabel, formatStorageStatus, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { getActiveMembership, getActiveOrganization } from '../../store/slices/appContext'
import { loadProductionSummary, productionCollaborationSelectors } from '../../store/slices/entities/productionCollaboration'
import { loadPlatformActionCenter, loadPlatformSummary, platformSelectors, trackProductEvent } from '../../store/slices/entities/platformAdministration'
import { internalTaskSelectors, loadInternalTasks } from '../../store/slices/entities/internalTasks'
import FounderTaskCard from '../../components/app/tasks/FounderTaskCard'
import PlatformActionQueue from '../../components/app/PlatformActionQueue'

const metric = value => String(value ?? '—')
const recordCompany = (record, organizationType) => organizationType === 'supplier'
  ? record.oem_organization?.name || 'OEM customer'
  : record.supplier_organization?.name || 'Unassigned supplier'

const ProductionRecordCard = ({ record, organizationType }) => <RecordCard
  href={`/app/production/${record.id}`}
  eyebrow={record.public_reference}
  title={record.part_number || record.part_name || 'Production record'}
  description={recordCompany(record, organizationType)}
  badges={<><StageBadge value={record.current_stage} /><ScheduleHealthBadge value={record.schedule_health} /></>}
  facts={[
    { label: 'Required arrival', value: formatDate(record.required_delivery_date) },
    { label: 'Expected ship', value: formatDate(record.expected_ship_date) },
    { label: 'Last supplier update', value: formatDateTime(record.last_supplier_update_at) },
  ]}
/>

const StageDistribution = ({ distribution = {} }) => {
  const rows = Object.entries(distribution)
  const total = rows.reduce((sum, [, count]) => sum + count, 0)
  if (!rows.length) return <EmptyState compact title='No active production stages' description='Stage totals will appear when production records become active.' />
  return <div className='stageDistribution' role='list' aria-label='Active production by stage'>
    {rows.map(([stage, count]) => <div key={stage} role='listitem'>
      <span>{formatLabel(stage)}</span><strong>{count}</strong>
      <div aria-hidden='true'><span style={{ width: `${Math.max(4, (count / total) * 100)}%` }} /></div>
    </div>)}
  </div>
}

const PlatformDashboard = ({ organization }) => {
  const dispatch = useDispatch()
  const summary = useSelector(platformSelectors.getSummary)
  const actionCenter = useSelector(platformSelectors.getActionCenter)
  const loading = useSelector(platformSelectors.getSummaryLoading)
  const error = useSelector(platformSelectors.getSummaryError)
  useEffect(() => {
    if (!organization?.id) return
    dispatch(loadPlatformSummary())
    dispatch(loadPlatformActionCenter())
  }, [dispatch, organization?.id])
  if (loading && !summary) return <section className='appPanel'><AppSkeleton lines={9} /></section>
  if (error && !summary) return <ErrorState title='Platform overview is temporarily unavailable' description='Velakron will not show platform totals or health conclusions until current data loads.' onRetry={() => dispatch(loadPlatformSummary())} />
  if (!summary) return <section className='appPanel'><AppSkeleton lines={9} /></section>
  const storage = formatStorageStatus(summary.system?.production_storage)
  return <>
    {error && <ErrorState title='Platform overview could not refresh' description='Showing the last successful snapshot. Try again before making a support decision.' onRetry={() => dispatch(loadPlatformSummary())} />}
    <section className='metricGrid metricGrid--priority' aria-label='Platform priorities'>
      <MetricCard label='Needs Velakron' value={metric(actionCenter?.counts?.needs_velakron)} detail='Approvals and operational intervention' icon={BellRing} tone={actionCenter?.counts?.needs_velakron ? 'warning' : 'success'} href='/admin/action-center' />
      <MetricCard label='Waiting on companies' value={metric(actionCenter?.counts?.waiting_external)} detail='Visible follow-up owned by an OEM or supplier' icon={Clock3} href='/admin/action-center' />
      <MetricCard label='Active organizations' value={metric(summary.organizations?.by_status?.active)} detail={`${summary.organizations?.total || 0} total company records`} icon={Building2} href='/admin/organizations' />
      <MetricCard label='Active relationships' value={metric(summary.relationships?.active)} detail='OEM–supplier connections' icon={Handshake} href='/admin/relationships' />
    </section>
    {actionCenter && <PlatformActionQueue
      title='Needs Velakron now'
      description='The highest-priority approvals and operational exceptions across the platform.'
      items={actionCenter.needs_velakron || []}
      emptyTitle='The Velakron queue is clear'
      emptyDescription='New customer approvals and platform exceptions will appear here automatically.'
      compact
    />}
    <p className='dashboardMetricContext'><UsersRound aria-hidden='true' /> {metric(summary.memberships?.active)} active members <span aria-hidden='true'>·</span> <Activity aria-hidden='true' /> {metric(summary.product_usage?.accepted_events_last_7_days)} privacy-safe usage events in the last 7 days</p>
    <div className='appDashboardGrid'>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Administration</p><h2>Platform operations</h2></div></header>
        <div className='dashboardActionGrid'>
          <Button href='/admin/organizations'>Organizations</Button>
          <Button href='/admin/action-center' variant='secondary'>Action center</Button>
          <Button href='/admin/users' variant='secondary'>Users & memberships</Button>
          <Button href='/admin/suppliers' variant='secondary'>Supplier reviews</Button>
          <Button href='/admin/relationships' variant='secondary'>Relationships</Button>
          <Button href='/admin' variant='secondary'>Audit & security</Button>
        </div>
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>System health</p><h2>Operational readiness</h2></div></header>
        <dl className='appDetailList'>
          <div><dt>API</dt><dd><StatusBadge tone='success'>{formatLabel(summary.system?.api)}</StatusBadge></dd></div>
          <div><dt>Database</dt><dd><StatusBadge tone={summary.system?.database === 'connected' ? 'success' : 'danger'}>{formatLabel(summary.system?.database)}</StatusBadge></dd></div>
          <div><dt>Worker schedule</dt><dd>{formatLabel(summary.system?.recurring_jobs)}</dd></div>
          <div><dt>Production storage</dt><dd><StatusBadge tone={storage.tone}>{storage.label}</StatusBadge><small className='appDetailList__hint'>{storage.detail}</small></dd></div>
        </dl>
        <p className='dashboardFreshness'><Clock3 aria-hidden='true' /> Last refreshed {formatDateTime(summary?.freshness?.read_at)}</p>
      </section>
    </div>
  </>
}

const FounderDashboard = () => {
  const dispatch = useDispatch()
  const tasks = useSelector(internalTaskSelectors.getTasks)
  const loading = useSelector(internalTaskSelectors.getLoading)
  const error = useSelector(internalTaskSelectors.getError)
  useEffect(() => { dispatch(loadInternalTasks({ page_size: 100 })) }, [dispatch])
  if (loading && !tasks.length) return <section className='appPanel'><AppSkeleton lines={7} /></section>
  if (error && !tasks.length) return <ErrorState title='Founder priorities are temporarily unavailable' description={error.message} onRetry={() => dispatch(loadInternalTasks({ page_size: 100 }))} />
  const active = tasks.filter(task => ['open', 'in_progress', 'blocked'].includes(task.status))
  const dueNow = active.filter(task => task.urgency === 'high').sort((left, right) => new Date(left.due_at) - new Date(right.due_at))
  return <>
    <section className='metricGrid metricGrid--priority' aria-label='Founder task priorities'>
      <MetricCard label='Active tasks' value={active.length} detail='Shared across the founder workspace' icon={ListChecks} href='/app/tasks?view=list' />
      <MetricCard label='Do now' value={dueNow.length} detail='Overdue or due within two days' icon={Clock3} tone={dueNow.length ? 'warning' : 'default'} href='/app/tasks' />
      <MetricCard label='Blocked' value={active.filter(task => task.status === 'blocked').length} detail='Waiting on a decision or dependency' icon={AlertTriangle} tone='warning' href='/app/tasks?view=list' />
      <MetricCard label='Completed' value={tasks.filter(task => task.status === 'completed').length} detail='Finished work in the current view' icon={CircleCheck} tone='success' href='/app/tasks?view=closed' />
    </section>
    <section className='appPanel'>
      <header className='appPanel__header'><div><p className='technicalLabel'>Founder priorities</p><h2>What needs attention now</h2></div><Button href='/app/tasks'>Open priority matrix</Button></header>
      {dueNow.length ? <div className='founderTaskList founderTaskList--dashboard'>{dueNow.slice(0, 4).map(task => <FounderTaskCard key={task.id} task={task} />)}</div> : <EmptyState compact title='Nothing is due immediately' description='The founder matrix has no overdue tasks or deadlines in the next two days.' action={<Button href='/app/tasks' variant='secondary'>Review all priorities</Button>} />}
    </section>
  </>
}

const OperationalDashboard = ({ organization }) => {
  const dispatch = useDispatch()
  const summary = useSelector(productionCollaborationSelectors.getSummary)
  const loading = useSelector(productionCollaborationSelectors.getSummaryLoading)
  const error = useSelector(productionCollaborationSelectors.getSummaryError)
  const refresh = useCallback(() => dispatch(loadProductionSummary()), [dispatch])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    const refreshWhenVisible = () => { if (document.visibilityState !== 'hidden') refresh() }
    const interval = window.setInterval(refreshWhenVisible, 45_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [refresh])
  if (loading && !summary) return <section className='appPanel'><AppSkeleton lines={9} /></section>
  if (error && !summary) return <ErrorState title='Production overview is temporarily unavailable' description='Velakron will not show empty queues or schedule conclusions until current production data loads.' onRetry={refresh} />
  if (!summary) return <section className='appPanel'><AppSkeleton lines={9} /></section>
  const supplier = organization.type === 'supplier'
  const attention = summary.attention_queue || []
  const secondary = supplier ? summary.recently_completed || [] : summary.upcoming_required_dates || []
  return <>
    {error && <ErrorState title='Production overview could not refresh' description='Showing the last successful snapshot. Refresh before making a schedule decision.' onRetry={refresh} />}
    <section className='metricGrid metricGrid--priority' aria-label='Production priorities'>
      <MetricCard label='Action required' value={metric(summary.counts?.action_required)} detail={supplier ? 'Tasks or shared issues requiring your response' : 'Records with unresolved attention reasons'} icon={AlertTriangle} tone='warning' href={supplier ? '/app/production?view=action_required' : '/app/production?view=active&attention=unresolved'} />
      <MetricCard label='Awaiting acceptance' value={metric(summary.counts?.awaiting_acceptance)} detail='Assignments awaiting supplier confirmation' icon={Clock3} href={supplier ? '/app/production?view=action_required&stage=assigned' : '/app/production?view=active&stage=assigned'} />
      <MetricCard label='At risk' value={metric(summary.counts?.at_risk)} detail='Active records with schedule risk' icon={AlertTriangle} tone='warning' href='/app/production?view=active&health=at_risk' />
      <MetricCard label='Delayed' value={metric(summary.counts?.delayed)} detail='Active records past a required date' icon={PackageCheck} tone='danger' href='/app/production?view=active&health=delayed' />
    </section>
    <p className='dashboardMetricContext'><Factory aria-hidden='true' /> {metric(summary.counts?.active)} active production records <span aria-hidden='true'>·</span> <CircleCheck aria-hidden='true' /> {metric(summary.counts?.on_schedule)} on schedule</p>
    <div className='dashboardPriorityGrid'>
      <section className='appPanel dashboardPriorityGrid__primary'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Current priorities</p><h2>{supplier ? 'Your next actions' : 'Attention queue'}</h2></div><Button href='/app/production' variant='secondary'>Open production</Button></header>
        {attention.length ? <div className='recordCardGrid'>{attention.map(record => <div key={record.id}><ProductionRecordCard record={record} organizationType={organization.type} /><AttentionReason codes={record.active_attention_codes} /></div>)}</div> : <EmptyState compact title='No records need attention' description='Current production information is within the approved rules.' />}
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Portfolio</p><h2>Active stages</h2></div></header>
        <StageDistribution distribution={summary?.stage_distribution} />
      </section>
    </div>
    <div className='appDashboardGrid'>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>{supplier ? 'Closed work' : 'Next 30 days'}</p><h2>{supplier ? 'Recently completed' : 'Upcoming required dates'}</h2></div></header>
        {secondary.length ? <div className='compactRecordList'>{secondary.map(record => <ProductionRecordCard key={record.id} record={record} organizationType={organization.type} />)}</div> : <EmptyState compact title={supplier ? 'No recently completed records' : 'No upcoming required dates'} description='Records will appear here when they match this operating window.' />}
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Activity</p><h2>Recently updated</h2></div></header>
        {(summary?.recently_updated || []).length ? <div className='compactRecordList'>{summary.recently_updated.map(record => <ProductionRecordCard key={record.id} record={record} organizationType={organization.type} />)}</div> : <EmptyState compact title='No recent updates' description='Confirmed production changes will appear here.' />}
        <p className='dashboardFreshness'><Clock3 aria-hidden='true' /> Last refreshed {formatDateTime(summary?.freshness?.read_at)}. Updates refresh every 45 seconds while visible.</p>
      </section>
    </div>
  </>
}

const PortalOverview = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const membership = useSelector(getActiveMembership)
  useEffect(() => {
    if (!organization?.id) return
    const surface = organization.type === 'oem'
      ? 'oem_dashboard'
      : organization.type === 'supplier'
        ? 'supplier_dashboard'
        : membership?.role === 'founder' ? 'founder_workspace' : 'platform_admin'
    dispatch(trackProductEvent('dashboard.viewed', surface))
  }, [dispatch, membership?.role, organization?.id, organization?.type])
  return <>
    <Seo title='Workspace' description='Velakron operations workspace.' path='/app' noIndex />
    <AppPageHeader
      eyebrow={`${formatLabel(organization.type)} workspace`}
      title={organization.name}
      description={organization.type === 'velakron' ? (membership?.role === 'founder' ? 'Align company priorities, owners, and deadlines without opening customer or platform administration data.' : 'Operate the platform through narrow, audited controls. Customer production access remains reason-gated and read-only.') : organization.type === 'supplier' ? 'Your most urgent production tasks are shown first.' : 'Portfolio health, supplier progress, and attention reasons in one view.'}
      actions={<StatusBadge tone={statusTone(organization.status)}>{formatLabel(membership.role)} · {formatLabel(organization.status)}</StatusBadge>}
    />
    {organization.type === 'velakron' ? (membership?.role === 'founder' ? <FounderDashboard /> : <PlatformDashboard organization={organization} />) : <OperationalDashboard organization={organization} />}
  </>
}

PortalOverview.getLayout = PortalPageLayout
export default PortalOverview
