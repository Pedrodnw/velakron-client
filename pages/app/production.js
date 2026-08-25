import { ExternalLink, Plus, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, DataTable, ErrorState, FilterBar, Pagination,
  PermissionDenied, RecordCard, ScheduleHealthBadge, StageBadge, Tabs,
} from '../../components/app'
import { formatDate } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { Button } from '../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import {
  findFirstNonEmptySupplierProductionView,
  loadProductionRecords,
  productionRecordSelectors,
} from '../../store/slices/entities/productionRecords'
import { loadRelationships, relationshipSelectors } from '../../store/slices/entities/relationships'
import { trackProductEvent } from '../../store/slices/entities/platformAdministration'

const views = {
  oem: [{ key: 'active', label: 'Active' }, { key: 'draft', label: 'Drafts' }, { key: 'completed', label: 'Completed' }, { key: 'cancelled', label: 'Cancelled' }],
  supplier: [{ key: 'action_required', label: 'Action required' }, { key: 'active', label: 'Active parts' }, { key: 'completed', label: 'Recently completed' }],
}
const stages = ['assigned', 'accepted', 'material_ordered', 'material_received', 'programming', 'in_production', 'inspection', 'ready_to_ship', 'shipped', 'delivered', 'quality_review', 'approved']
const healthValues = ['on_schedule', 'at_risk', 'delayed', 'needs_attention', 'unassessed']
const initialFilters = type => ({ view: type === 'supplier' ? 'action_required' : 'active', search: '', stage: '', health: '', attention: '', supplier_organization_id: '', required_from: '', required_to: '', first_article: '', page: 1 })
const cleanQuery = filters => Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== '' && value !== undefined && value !== 1))

const Production = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('production_record.read'))
  const canCreate = useSelector(getHasPermission('production_record.create'))
  const records = useSelector(productionRecordSelectors.getRecords)
  const loading = useSelector(productionRecordSelectors.getLoading)
  const error = useSelector(productionRecordSelectors.getError)
  const pagination = useSelector(productionRecordSelectors.getPagination)
  const relationships = useSelector(relationshipSelectors.getEntities)
  const [filters, setFilters] = useState(() => initialFilters(organization?.type))
  const [filtersReady, setFiltersReady] = useState(false)
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [checkingAlternativeView, setCheckingAlternativeView] = useState(false)
  const refreshSequence = useRef(0)
  const type = organization?.type

  useEffect(() => {
    if (!router.isReady || !organization?.id) return
    const defaults = initialFilters(type)
    const page = Number(router.query.page)
    const next = {
      ...defaults,
      view: (views[type] || []).some(item => item.key === router.query.view) ? router.query.view : defaults.view,
      search: String(router.query.search || '').slice(0, 160),
      stage: stages.includes(router.query.stage) ? router.query.stage : '',
      health: healthValues.includes(router.query.health) ? router.query.health : '',
      attention: router.query.attention === 'unresolved' ? 'unresolved' : '',
      supplier_organization_id: type === 'oem' ? String(router.query.supplier_organization_id || '') : '',
      required_from: String(router.query.required_from || ''),
      required_to: String(router.query.required_to || ''),
      first_article: ['true', 'false'].includes(router.query.first_article) ? router.query.first_article : '',
      page: Number.isInteger(page) && page > 0 ? page : 1,
    }
    setFilters(next); setDebouncedSearch(next.search); setFiltersReady(true)
    if (type === 'oem') dispatch(loadRelationships(organization.id))
    dispatch(trackProductEvent('production.list_viewed', 'production_list'))
  }, [dispatch, organization?.id, router.isReady, type])

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(filters.search), 300)
    return () => window.clearTimeout(timeout)
  }, [filters.search])

  const filterCount = ['search', 'stage', 'health', 'attention', 'supplier_organization_id', 'required_from', 'required_to', 'first_article']
    .filter(key => Boolean(filters[key])).length
  const canChooseAlternativeView = type === 'supplier' && filters.page === 1 && filterCount === 0

  const updateFilters = changes => {
    setCheckingAlternativeView(false)
    const next = { ...filters, ...changes }
    setFilters(next)
    router.replace({ pathname: '/app/production', query: cleanQuery(next) }, undefined, { shallow: true })
  }

  const requestFilters = useMemo(() => ({
    ...filters,
    search: debouncedSearch || undefined,
    page_size: 25,
    sort: 'required_delivery_date',
    direction: 'asc',
  }), [debouncedSearch, filters])
  const refresh = useCallback(async () => {
    if (!allowed || !organization?.id || !filtersReady) return null
    const sequence = ++refreshSequence.current
    if (canChooseAlternativeView) setCheckingAlternativeView(true)
    const result = await dispatch(loadProductionRecords(requestFilters))
    if (sequence !== refreshSequence.current) return result
    if (!result?.ok) {
      setCheckingAlternativeView(false)
      return result
    }
    const loadedRecords = result.payload?.data?.records || []
    if (canChooseAlternativeView && loadedRecords.length === 0) {
      const fallbackView = await dispatch(findFirstNonEmptySupplierProductionView(filters.view))
      if (sequence !== refreshSequence.current) return result
      if (fallbackView) {
        const next = { ...filters, view: fallbackView, page: 1 }
        setFilters(next)
        router.replace({ pathname: '/app/production', query: cleanQuery(next) }, undefined, { shallow: true })
        return result
      }
    }
    setCheckingAlternativeView(false)
    return result
  }, [allowed, canChooseAlternativeView, dispatch, filters, filtersReady, organization?.id, requestFilters, router])
  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    if (!filtersReady) return undefined
    const refreshWhenVisible = () => { if (document.visibilityState !== 'hidden') refresh() }
    const interval = window.setInterval(refreshWhenVisible, 45_000)
    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refreshWhenVisible); document.removeEventListener('visibilitychange', refreshWhenVisible) }
  }, [filtersReady, refresh])

  if (!allowed) return <PermissionDenied />
  const showListSkeleton = !filtersReady || loading || (canChooseAlternativeView && (checkingAlternativeView || !pagination))
  const recordHref = item => ({ pathname: '/app/production/[id]', query: { id: item.id, return_to: router.asPath } })
  const company = item => type === 'supplier' ? item.oem_organization?.name : item.supplier_organization?.name || 'Unassigned'
  const recordTitle = item => item.part_number || item.part_name || 'Production record'
  const columns = [
    { key: 'part', label: 'Part', render: item => <div className='tablePrimary'><strong>{recordTitle(item)}</strong><span>{item.part_name || item.public_reference}</span></div> },
    { key: 'company', label: type === 'supplier' ? 'OEM customer' : 'Supplier', render: company },
    { key: 'po', label: 'PO', render: item => <div className='tablePrimary'><strong>{item.po_number || '—'}</strong><span>{item.po_line_number ? `Line ${item.po_line_number}` : item.public_reference}</span></div> },
    { key: 'status', label: 'Stage', render: item => <StageBadge value={item.current_stage || item.acceptance_status} /> },
    { key: 'health', label: 'Schedule', render: item => <ScheduleHealthBadge value={item.schedule_health} /> },
    { key: 'required', label: 'Required arrival', render: item => formatDate(item.required_delivery_date) },
    { key: 'actions', label: '', render: item => <Button href={recordHref(item)} variant='secondary' className='tableAction'>Open <ExternalLink aria-hidden='true' /></Button> },
  ]
  return <>
    <Seo title='Production' description='Track awarded manufacturing commitments and supplier progress.' path='/app/production' noIndex />
    <AppPageHeader eyebrow='Execution' title='Production' description={type === 'supplier' ? 'Your action queue, active parts, and completed work. Filters stay in the address so you can return to the same view.' : 'Filter awarded work by supplier, stage, schedule health, date, and first-article requirement.'} actions={<>{canCreate && type === 'oem' && <Button href='/app/production/new'><Plus aria-hidden='true' /> New production record</Button>}<Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button></>} />
    <Tabs items={views[type] || []} activeKey={filters.view} onChange={view => updateFilters({ view, page: 1 })} label='Production views' />
    <button className='productionFilterToggle' type='button' aria-expanded={filtersOpen} aria-controls='production-filter-panel' onClick={() => setFiltersOpen(open => !open)}><SlidersHorizontal aria-hidden='true' /> {filtersOpen ? 'Hide filters' : 'Filter records'}{filterCount > 0 && <span>{filterCount} active</span>}</button>
    <div id='production-filter-panel' className={`productionFilterPanel${filtersOpen ? ' is-open' : ''}`}>
    <FilterBar label='Production filters' actions={<Button variant='secondary' onClick={() => { updateFilters(initialFilters(type)); setFiltersOpen(false) }}>Clear filters</Button>}>
      <label><span>Search</span><div className='inputWithIcon'><Search aria-hidden='true' /><input value={filters.search} onChange={event => updateFilters({ search: event.target.value, page: 1 })} placeholder='Part, PO, or VK reference' /></div></label>
      {type === 'oem' && <label><span>Supplier</span><select value={filters.supplier_organization_id} onChange={event => updateFilters({ supplier_organization_id: event.target.value, page: 1 })}><option value=''>All suppliers</option>{relationships.filter(item => item.status === 'active').map(item => <option key={item.id} value={item.supplier_organization?.id}>{item.supplier_organization?.name}</option>)}</select></label>}
      <label><span>Stage</span><select value={filters.stage} onChange={event => updateFilters({ stage: event.target.value, page: 1 })}><option value=''>All stages</option>{stages.map(stage => <option key={stage} value={stage}>{stage.replaceAll('_', ' ')}</option>)}</select></label>
      <label><span>Schedule</span><select value={filters.health} onChange={event => updateFilters({ health: event.target.value, page: 1 })}><option value=''>All health states</option>{healthValues.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
      <label><span>Attention</span><select value={filters.attention} onChange={event => updateFilters({ attention: event.target.value, page: 1 })}><option value=''>Any attention state</option><option value='unresolved'>Unresolved only</option></select></label>
      <label><span>Required from</span><input type='date' value={filters.required_from} onChange={event => updateFilters({ required_from: event.target.value, page: 1 })} /></label>
      <label><span>Required to</span><input type='date' value={filters.required_to} onChange={event => updateFilters({ required_to: event.target.value, page: 1 })} /></label>
      <label><span>First article</span><select value={filters.first_article} onChange={event => updateFilters({ first_article: event.target.value, page: 1 })}><option value=''>Any</option><option value='true'>Required</option><option value='false'>Not required</option></select></label>
    </FilterBar>
    </div>
    {error && <ErrorState description={error.message} onRetry={refresh} />}
    <section className='appPanel appPanel--table productionDesktopTable'>{showListSkeleton && !records.length ? <AppSkeleton lines={8} /> : <DataTable caption='Production records' columns={columns} rows={records} emptyTitle='No production records in this view' emptyDescription={type === 'oem' ? 'Create an awarded-work record or adjust the filters.' : 'Assigned work will appear here when an OEM sends it to your company.'} />}</section>
    <section className='productionMobileCards' aria-label='Production records'>{records.map(item => <RecordCard key={item.id} href={recordHref(item)} eyebrow={item.public_reference} title={recordTitle(item)} description={company(item)} badges={<><StageBadge value={item.current_stage || item.acceptance_status} /><ScheduleHealthBadge value={item.schedule_health} /></>} facts={[{ label: 'PO', value: item.po_number }, { label: 'Required arrival', value: formatDate(item.required_delivery_date) }, { label: 'Expected ship', value: formatDate(item.expected_ship_date) }]} actionLabel='Open' />)}</section>
    <Pagination meta={pagination} onPageChange={page => updateFilters({ page })} label='Production pages' />
  </>
}

Production.getLayout = PortalPageLayout
export default Production
