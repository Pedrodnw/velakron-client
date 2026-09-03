import {
  AlertTriangle,
  CalendarDays,
  CircleDollarSign,
  ClipboardCheck,
  Eye,
  Inbox,
  ListTodo,
  MousePointerClick,
  Target,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, EmptyState, ErrorState, MetricCard, StatusBadge } from '../../../components/app'
import CrmPanelHeader from '../../../components/app/crm/CrmPanelHeader'
import CrmShell from '../../../components/app/crm/CrmShell'
import { OwnerName, formatDateTime, formatMoney, formatShortDate } from '../../../components/app/crm/CrmFields'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const CrmDashboard = () => {
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const load = useCallback(async () => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/dashboard', requestKey: 'crm-dashboard' }))
    setState(result?.ok
      ? { loading: false, data: result.payload.data, error: '' }
      : { loading: false, data: null, error: crmErrorMessage(result) })
  }, [dispatch])
  useEffect(() => { load() }, [load])

  if (state.loading && !state.data) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (state.error) return <ErrorState title='CRM dashboard could not be loaded' description={state.error} onRetry={load} />
  const data = state.data
  const onboardingAttention = data.onboarding?.attention || []
  const taskRows = data.follow_ups?.tasks || []
  const assessment = data.visibility_assessment || { funnel: {}, high_priority: [] }
  const funnel = [
    ['Visitors', assessment.funnel.visitors || 0],
    ['Started', assessment.funnel.started || 0],
    ['Completed', assessment.funnel.completed || 0],
    ['Contact captured', assessment.funnel.contacts || 0],
    ['Demo clicked', assessment.funnel.demo_clicked || 0],
    ['Demo booked', assessment.funnel.demo_booked || 0],
  ]
  return <>
    <Seo title='Founder CRM' description='Velakron founder customer relationship workspace.' path='/app/crm' noIndex />
    <AppPageHeader eyebrow='Founder CRM' title='Relationship command center' description='The current state of every prospect, customer, supplier relationship, follow-up, and founder-owned commitment.' />
    <section className='metricGrid metricGrid--priority crmMetricGrid' aria-label='CRM totals'>
      <MetricCard label='Active pipeline' value={data.opportunities?.active_count || 0} detail={`${formatMoney(data.opportunities?.unweighted_value)} expected first-year value`} icon={Target} href='/app/crm/opportunities' />
      <MetricCard label='Weighted forecast' value={formatMoney(data.opportunities?.weighted_value)} detail='Probability-adjusted opportunity value' icon={CircleDollarSign} />
      <MetricCard label='Overdue tasks' value={data.follow_ups?.overdue_task_count || 0} detail='Founder follow-ups past due' icon={ListTodo} tone={data.follow_ups?.overdue_task_count ? 'danger' : 'default'} href='/app/tasks' />
      <MetricCard label='Upcoming meetings' value={data.meetings?.upcoming?.length || 0} detail='Scheduled in the next seven days' icon={CalendarDays} href='/app/crm/calendar' />
      <MetricCard label='Unread messages' value={data.communications?.unread || 0} detail={`${data.communications?.needs_matching || 0} need contact matching`} icon={Inbox} tone={data.communications?.unread ? 'warning' : 'default'} href='/app/crm/inbox' />
      <MetricCard label='Onboarding attention' value={onboardingAttention.length} detail='Blocked, stalled, or follow-up due' icon={AlertTriangle} tone={onboardingAttention.length ? 'warning' : 'default'} href='/app/crm/onboarding' />
    </section>
    <section className='appPanel crmAssessmentOverview'>
      <CrmPanelHeader eyebrow='Website qualification · Last 90 days' title='Production Visibility Assessment' detail='Prospect progress from assessment visit through a directly booked demo.' actions={<LinkWrap href='/visibility-assessment' target='_blank'>Open assessment →</LinkWrap>} />
      <div className='crmAssessmentFunnel' aria-label='Visibility assessment funnel'>
        {funnel.map(([label, value], index) => <div key={label}>
          <span className='crmAssessmentFunnel__icon'>{index === 0 ? <Eye /> : index < 3 ? <ClipboardCheck /> : index === 4 ? <MousePointerClick /> : <CalendarDays />}</span>
          <strong>{value}</strong>
          <small>{label}</small>
          {index < funnel.length - 1 && <i aria-hidden='true'>→</i>}
        </div>)}
      </div>
      {(assessment.high_priority || []).length > 0 && <div className='crmAssessmentPriority'>
        <strong>Recent high-priority assessments</strong>
        <div>{assessment.high_priority.map(item => <LinkWrap href={`/app/crm/organizations/${item.crm_organization?.id}`} key={item.id}>
          <span><strong>{item.company}</strong><small>{item.contact_name} · {formatShortDate(item.captured_at)}</small></span>
          <span><b>{item.visibility_score}</b> visibility <b>{item.lead_score}</b> lead</span>
        </LinkWrap>)}</div>
      </div>}
    </section>
    <div className='crmDashboardGrid'>
      <section className='appPanel'>
        <CrmPanelHeader eyebrow='Focus now' title='Priority opportunities' detail='Highest priority first, then nearest next action.' actions={<LinkWrap href='/app/crm/opportunities'>Open pipeline →</LinkWrap>} />
        {(data.opportunities?.priority || []).length ? <div className='crmStackList'>{data.opportunities.priority.map(item => <LinkWrap className='crmStackRow' href={`/app/crm/organizations/${item.organization?.id || item.organization?._id}`} key={item.id || item._id}>
          <span className={`crmPriority crmPriority--${item.priority_score}`}>{item.priority_score}</span>
          <span className='crmStackRow__main'><strong>{item.name}</strong><small>{item.organization?.name} · {formatMoney(item.estimated_first_year_value)}</small></span>
          <span className='crmStackRow__meta'><StatusBadge tone={item.priority_score >= 4 ? 'warning' : 'info'}>{String(item.stage).replaceAll('_', ' ')}</StatusBadge><small>{OwnerName({ membership: item.owner })}</small></span>
        </LinkWrap>)}</div> : <EmptyState compact title='No active opportunities' description='Create the first OEM opportunity to begin the pipeline.' />}
      </section>
      <section className='appPanel'>
        <CrmPanelHeader eyebrow='Next seven days' title='Meetings' actions={<LinkWrap href='/app/crm/calendar'>Full calendar →</LinkWrap>} />
        {(data.meetings?.upcoming || []).length ? <div className='crmAgenda'>{data.meetings.upcoming.map(meeting => <article key={meeting.id || meeting._id}><time>{formatDateTime(meeting.starts_at)}</time><strong>{meeting.title}</strong><span>{meeting.organization?.name}</span></article>)}</div> : <EmptyState compact title='No upcoming meetings' description='Schedule a meeting from a contact or organization.' />}
      </section>
      <section className='appPanel'>
        <CrmPanelHeader eyebrow='Commitments' title='Follow-ups and tasks' actions={<LinkWrap href='/app/tasks'>Open task matrix →</LinkWrap>} />
        {taskRows.length ? <div className='crmStackList'>{taskRows.slice(0, 8).map(task => <LinkWrap className='crmStackRow' href={`/app/tasks?task=${task.id || task._id}`} key={task.id || task._id}>
          <span className={`crmTaskDot crmTaskDot--${task.importance}`} />
          <span className='crmStackRow__main'><strong>{task.title}</strong><small>{task.project_name || 'CRM follow-up'}</small></span>
          <span className='crmStackRow__meta'><StatusBadge tone={task.overdue ? 'danger' : 'neutral'}>{task.overdue ? 'Overdue' : formatShortDate(task.due_at)}</StatusBadge></span>
        </LinkWrap>)}</div> : <EmptyState compact title='No CRM tasks due' description='CRM follow-up tasks will appear here.' />}
      </section>
      <section className='appPanel'>
        <CrmPanelHeader eyebrow='Data quality' title='Records needing attention' detail='Missing owner, primary contact, or a dated next action.' actions={<LinkWrap href='/app/crm/organizations'>Review all →</LinkWrap>} />
        {(data.data_quality?.organizations || []).length ? <div className='crmCompactList'>{data.data_quality.organizations.slice(0, 8).map(item => <LinkWrap href={`/app/crm/organizations/${item.id || item._id}`} key={item.id || item._id}><strong>{item.name}</strong><span>{item.type.toUpperCase()} · {item.status}</span></LinkWrap>)}</div> : <EmptyState compact title='Records are complete' description='Every active record has the core ownership and follow-up fields.' />}
      </section>
    </div>
  </>
}

CrmDashboard.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmDashboard
