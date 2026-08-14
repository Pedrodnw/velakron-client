import { BarChart3, CircleDollarSign, TrendingUp, UsersRound } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { AppPageHeader, AppSkeleton, EmptyState, ErrorState, MetricCard } from '../../../components/app'
import CrmPanelHeader from '../../../components/app/crm/CrmPanelHeader'
import CrmShell from '../../../components/app/crm/CrmShell'
import { OwnerName, formatMoney } from '../../../components/app/crm/CrmFields'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const ChartRows = ({ rows, label, value = item => item.count, detail }) => {
  const maximum = Math.max(1, ...rows.map(value))
  if (!rows.length) return <EmptyState compact title='No report data yet' description='This report fills in as founders use the CRM.' />
  return <div className='crmReportRows'>{rows.map((item, index) => <article key={`${label(item)}-${index}`}><header><strong>{label(item)}</strong><span>{detail ? detail(item) : value(item)}</span></header><div><span style={{ width: `${Math.max(2, (value(item) / maximum) * 100)}%` }} /></div></article>)}</div>
}

const CrmReports = () => {
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, pipeline: null, overview: null, owners: [], error: '' })
  const load = useCallback(async () => {
    const [pipeline, overview, owners] = await Promise.all([
      dispatch(crmRequest({ url: '/reports/pipeline', requestKey: 'crm-report-pipeline' })),
      dispatch(crmRequest({ url: '/reports/overview', requestKey: 'crm-report-overview' })),
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-report-owners' })),
    ])
    if (!pipeline?.ok || !overview?.ok) return setState({ loading: false, pipeline: null, overview: null, owners: [], error: crmErrorMessage(!pipeline?.ok ? pipeline : overview) })
    setState({ loading: false, pipeline: pipeline.payload.data, overview: overview.payload.data, owners: owners?.ok ? owners.payload.data.owners : [], error: '' })
  }, [dispatch])
  useEffect(() => { load() }, [load])
  const ownerMap = useMemo(() => new Map(state.owners.map(owner => [owner.id, owner])), [state.owners])
  if (state.loading) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (state.error) return <ErrorState title='CRM reports could not be loaded' description={state.error} onRetry={load} />
  const activeStages = (state.pipeline.by_stage || []).filter(item => !['won', 'lost'].includes(item._id))
  const pipelineValue = activeStages.reduce((sum, item) => sum + item.value, 0)
  const wins = state.pipeline.by_stage.find(item => item._id === 'won')
  const losses = state.pipeline.by_stage.find(item => item._id === 'lost')
  const conversion = wins?.count || losses?.count ? Math.round(((wins?.count || 0) / ((wins?.count || 0) + (losses?.count || 0))) * 100) : 0
  return <>
    <Seo title='CRM reports' description='Velakron CRM pipeline, relationship, onboarding, and founder workload reports.' path='/app/crm/reports' noIndex />
    <AppPageHeader eyebrow='CRM intelligence' title='Reports' description='Pipeline, sources, relationship activity, onboarding progress, and founder workload. Values represent expected first-year revenue.' />
    <section className='metricGrid crmMetricGrid crmMetricGrid--four'>
      <MetricCard label='Active pipeline' value={formatMoney(pipelineValue)} detail={`${activeStages.reduce((sum, item) => sum + item.count, 0)} open opportunities`} icon={CircleDollarSign} />
      <MetricCard label='Closed-win rate' value={`${conversion}%`} detail='Won out of all closed opportunities' icon={TrendingUp} />
      <MetricCard label='Activity in 90 days' value={(state.overview.activity_types || []).reduce((sum, item) => sum + item.count, 0)} detail='Recorded relationship interactions' icon={BarChart3} />
      <MetricCard label='Open CRM tasks' value={(state.overview.workload || []).reduce((sum, item) => sum + item.count, 0)} detail='Across all founders' icon={UsersRound} />
    </section>
    <div className='crmDashboardGrid'>
      <section className='appPanel'><CrmPanelHeader title='Pipeline by stage' detail='Count and expected first-year value.' /><ChartRows rows={state.pipeline.by_stage || []} label={item => String(item._id).replaceAll('_', ' ')} value={item => item.value || item.count} detail={item => `${item.count} · ${formatMoney(item.value)}`} /></section>
      <section className='appPanel'><CrmPanelHeader title='Opportunity sources' detail='Volume and wins by lead source.' /><ChartRows rows={state.pipeline.sources || []} label={item => item._id || 'Unspecified'} detail={item => `${item.count} opportunities · ${item.won} won`} /></section>
      <section className='appPanel'><CrmPanelHeader title='Relationship activity' detail='Interactions recorded during the last 90 days.' /><ChartRows rows={state.overview.activity_types || []} label={item => String(item._id).replaceAll('_', ' ')} /></section>
      <section className='appPanel'><CrmPanelHeader title='Organization acquisition sources' detail='Tracked organizations and active relationships.' /><ChartRows rows={state.overview.organization_sources || []} label={item => item._id} detail={item => `${item.count} records · ${item.active} active`} /></section>
      <section className='appPanel'><CrmPanelHeader title='Onboarding progress' detail='OEM and supplier progress by current stage.' /><ChartRows rows={state.overview.onboarding || []} label={item => `${item._id.type.toUpperCase()} · ${item._id.stage.replaceAll('_', ' ')}`} value={item => item.average_percent || item.count} detail={item => `${item.count} · ${Math.round(item.average_percent)}% avg · ${item.blocked} blocked`} /></section>
      <section className='appPanel'><CrmPanelHeader title='Founder workload' detail='Open CRM tasks, including overdue and blocked work.' /><ChartRows rows={state.overview.workload || []} label={item => OwnerName({ membership: ownerMap.get(String(item._id)) })} detail={item => `${item.count} open · ${item.overdue} overdue · ${item.blocked} blocked`} /></section>
    </div>
  </>
}

CrmReports.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmReports
