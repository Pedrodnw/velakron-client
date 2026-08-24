import { Building2, Clock3, Factory, Search, Trash2, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import {
  AppPageHeader,
  AppSkeleton,
  ConfirmationDialog,
  DataTable,
  ErrorState,
  FilterBar,
  MetricCard,
  Pagination,
  PermissionDenied,
  StatusBadge,
} from '../../../components/app'
import CrmShell from '../../../components/app/crm/CrmShell'
import { formatDateTime, formatLabel } from '../../../components/app/formatters'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import { Button } from '../../../components/design-system'
import FormMessage from '../../../components/auth/FormMessage'
import Seo from '../../../components/Seo'
import { getHasPermission } from '../../../store/slices/appContext'
import { deleteTradeShowLead, loadTradeShowLeads, tradeShowLeadSelectors } from '../../../store/slices/entities/tradeShowLeads'

const TradeShowLeads = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('trade_show_lead.read'))
  const leads = useSelector(tradeShowLeadSelectors.getItems)
  const counts = useSelector(tradeShowLeadSelectors.getCounts)
  const capabilities = useSelector(tradeShowLeadSelectors.getCapabilities)
  const pagination = useSelector(tradeShowLeadSelectors.getPagination)
  const loading = useSelector(tradeShowLeadSelectors.getLoading)
  const error = useSelector(tradeShowLeadSelectors.getError)
  const [filters, setFilters] = useState({ search: '', experience: '', page: 1 })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState(null)

  const load = (page = filters.page) => {
    const next = { ...filters, page }
    setFilters(next)
    dispatch(loadTradeShowLeads({ ...next, page_size: 50 }))
  }

  useEffect(() => {
    if (allowed) dispatch(loadTradeShowLeads({ page: 1, page_size: 50 }))
  }, [allowed, dispatch])

  if (!allowed) return <PermissionDenied description='Sales Demo acquisition is available only to Velakron founders.' />

  const confirmDelete = async () => {
    setDeleting(true)
    setFeedback(null)
    const result = await dispatch(deleteTradeShowLead(deleteTarget.id))
    setDeleting(false)
    if (!result?.ok) {
      setFeedback({ type: 'error', message: result?.error?.message || 'The lead could not be deleted.' })
      return
    }
    setDeleteTarget(null)
    setFeedback({ type: 'success', message: 'Lead deleted and its temporary demo access was closed. Its CRM relationship history was retained.' })
    load(leads.length === 1 && filters.page > 1 ? filters.page - 1 : filters.page)
  }

  const columns = [
    { key: 'name', label: 'Guest', render: item => <div className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email}</span></div> },
    { key: 'company', label: 'Company', render: item => item.company_name },
    { key: 'experience', label: 'Experience', render: item => <StatusBadge tone={item.experience === 'oem' ? 'info' : 'success'}>{formatLabel(item.experience)}</StatusBadge> },
    { key: 'submitted', label: 'Submitted', render: item => formatDateTime(item.created_at) },
    { key: 'crm', label: 'CRM record', render: item => item.crm_conversion_status === 'converted' && item.crm_organization
      ? <div className='tablePrimary'><LinkWrap href={`/app/crm/organizations/${item.crm_organization}`}>Open organization</LinkWrap><span>{item.crm_opportunity ? 'OEM opportunity created' : 'Supplier prospect created'}</span></div>
      : <StatusBadge tone='warning'>{item.crm_conversion_status === 'needs_review' ? 'Needs review' : 'Conversion pending'}</StatusBadge> },
    { key: 'demo', label: 'Demo access', render: item => <div className='tablePrimary'><StatusBadge tone={item.demo_active ? 'success' : 'neutral'}>{item.demo_active ? 'Active' : 'Expired'}</StatusBadge><span>{item.demo_active ? `Until ${formatDateTime(item.demo_expires_at)}` : 'Lead retained; demo closed'}</span></div> },
    ...(capabilities?.can_delete ? [{ key: 'actions', label: '', render: item => <Button variant='secondary' className='tableAction tableAction--danger' onClick={() => { setDeleteTarget(item); setFeedback(null) }}><Trash2 aria-hidden='true' /> Delete</Button> }] : []),
  ]

  return <>
    <Seo title='CRM Sales Demo leads' description='Velakron Sales Demo lead acquisition and CRM conversion.' path='/app/crm/leads' noIndex />
    <AppPageHeader
      eyebrow='Sales Demo acquisition'
      title='Sales Demo leads'
      description='Every public Sales Demo submission is converted automatically into the appropriate CRM organization, contact, and—when the guest selects OEM—sales opportunity.'
      actions={<Button href='/app/sales-demo?tab=campaigns'>Manage links & QR</Button>}
    />
    <section className='metricGrid metricGrid--priority' aria-label='IMTS lead totals'>
      <MetricCard label='Total guests' value={counts?.total ?? '—'} detail='Captured through Sales Demo links' icon={UsersRound} />
      <MetricCard label='OEM views' value={counts?.oem ?? '—'} detail='Guests added to the OEM pipeline' icon={Building2} />
      <MetricCard label='Supplier views' value={counts?.supplier ?? '—'} detail='Guests added as supplier prospects' icon={Factory} />
      <MetricCard label='Active demos' value={counts?.active_demos ?? '—'} detail='Temporary workspaces still available' icon={Clock3} />
    </section>
    <FilterBar onSubmit={event => { event.preventDefault(); load(1) }} actions={<Button type='submit' disabled={loading}><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search leads</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name, company, or email' maxLength={160} /></label>
      <label><span>Experience</span><select value={filters.experience} onChange={event => setFilters(value => ({ ...value, experience: event.target.value }))}><option value=''>Both experiences</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
    </FilterBar>
    {error && <ErrorState title='Sales Demo leads could not be loaded' description={error.message} onRetry={() => load()} />}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <section className='appPanel appPanel--table'>
      {loading && !leads.length
        ? <AppSkeleton lines={8} />
        : <DataTable columns={columns} rows={leads} caption='Sales Demo guest leads' emptyTitle='No Sales Demo leads yet' emptyDescription='New link and QR submissions will appear here and enter the CRM automatically.' />}
    </section>
    <Pagination meta={pagination} onPageChange={load} label='Sales Demo lead pages' />
    <ConfirmationDialog
      open={Boolean(deleteTarget)}
      title={`Delete ${deleteTarget?.full_name || 'this lead'}?`}
      description={`This permanently removes the captured lead for ${deleteTarget?.company_name || 'this company'} and immediately closes its temporary demo access. The converted CRM relationship history is retained. This cannot be undone.`}
      confirmLabel={deleting ? 'Deleting…' : 'Delete lead'}
      confirmDisabled={deleting}
      onClose={() => !deleting && setDeleteTarget(null)}
      onConfirm={confirmDelete}
      danger
    />
  </>
}

TradeShowLeads.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default TradeShowLeads
