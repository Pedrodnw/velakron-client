import { Building2, Clock3, Factory, Search, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  FilterBar,
  MetricCard,
  Pagination,
  PermissionDenied,
  StatusBadge,
} from '../../components/app'
import { formatDateTime, formatLabel } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import { Button } from '../../components/design-system'
import Seo from '../../components/Seo'
import { getHasPermission } from '../../store/slices/appContext'
import { loadTradeShowLeads, tradeShowLeadSelectors } from '../../store/slices/entities/tradeShowLeads'

const TradeShowLeads = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('trade_show_lead.read'))
  const leads = useSelector(tradeShowLeadSelectors.getItems)
  const counts = useSelector(tradeShowLeadSelectors.getCounts)
  const pagination = useSelector(tradeShowLeadSelectors.getPagination)
  const loading = useSelector(tradeShowLeadSelectors.getLoading)
  const error = useSelector(tradeShowLeadSelectors.getError)
  const [filters, setFilters] = useState({ search: '', experience: '', page: 1 })

  const load = (page = filters.page) => {
    const next = { ...filters, page }
    setFilters(next)
    dispatch(loadTradeShowLeads({ ...next, page_size: 50 }))
  }

  useEffect(() => {
    if (allowed) dispatch(loadTradeShowLeads({ page: 1, page_size: 50 }))
  }, [allowed, dispatch])

  if (!allowed) return <PermissionDenied description='Only Velakron founders and platform administrators can view IMTS leads.' />

  const columns = [
    { key: 'name', label: 'Guest', render: item => <div className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email}</span></div> },
    { key: 'company', label: 'Company', render: item => item.company_name },
    { key: 'experience', label: 'Experience', render: item => <StatusBadge tone={item.experience === 'oem' ? 'info' : 'success'}>{formatLabel(item.experience)}</StatusBadge> },
    { key: 'submitted', label: 'Submitted', render: item => formatDateTime(item.created_at) },
    { key: 'demo', label: 'Demo access', render: item => <div className='tablePrimary'><StatusBadge tone={item.demo_active ? 'success' : 'neutral'}>{item.demo_active ? 'Active' : 'Expired'}</StatusBadge><span>{item.demo_active ? `Until ${formatDateTime(item.demo_expires_at)}` : 'Lead retained; demo closed'}</span></div> },
  ]

  return <>
    <Seo title='IMTS leads' description='Velakron IMTS guest lead directory.' path='/app/leads' noIndex />
    <AppPageHeader
      eyebrow='IMTS pipeline'
      title='Guest leads'
      description='Every submission is retained here while its OEM or Supplier product experience runs in a separate temporary workspace.'
      actions={<Button href='/imts-demo/qr' target='_blank' rel='noreferrer'>Open printable QR</Button>}
    />
    <section className='metricGrid metricGrid--priority' aria-label='IMTS lead totals'>
      <MetricCard label='Total guests' value={counts?.total ?? '—'} detail='Captured through the QR experience' icon={UsersRound} />
      <MetricCard label='OEM views' value={counts?.oem ?? '—'} detail='Guests who selected the OEM side' icon={Building2} />
      <MetricCard label='Supplier views' value={counts?.supplier ?? '—'} detail='Guests who selected the Supplier side' icon={Factory} />
      <MetricCard label='Active demos' value={counts?.active_demos ?? '—'} detail='Temporary workspaces still available' icon={Clock3} />
    </section>
    <FilterBar onSubmit={event => { event.preventDefault(); load(1) }} actions={<Button type='submit' disabled={loading}><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search leads</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name, company, or email' maxLength={160} /></label>
      <label><span>Experience</span><select value={filters.experience} onChange={event => setFilters(value => ({ ...value, experience: event.target.value }))}><option value=''>Both experiences</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
    </FilterBar>
    {error && <ErrorState title='IMTS leads could not be loaded' description={error.message} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>
      {loading && !leads.length
        ? <AppSkeleton lines={8} />
        : <DataTable columns={columns} rows={leads} caption='IMTS guest leads' emptyTitle='No guest leads yet' emptyDescription='New QR submissions will appear here as soon as a guest enters the experience.' />}
    </section>
    <Pagination meta={pagination} onPageChange={load} label='IMTS lead pages' />
  </>
}

TradeShowLeads.getLayout = PortalPageLayout
export default TradeShowLeads
