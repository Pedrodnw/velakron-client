import { AlertTriangle, BellRing, Box, CalendarClock, ExternalLink, Handshake, Inbox, ListChecks, Plus, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, DataTable, EmptyState, ErrorState, Pagination, PermissionDenied, RecordCard, StatusBadge } from '../../../components/app'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { Button } from '../../../components/design-system'
import { formatDate } from '../../../components/app/formatters'
import { getActiveOrganization, getFeatureEnabled, getHasPermission } from '../../../store/slices/appContext'
import { loadPartActionSummary, loadParts, partSelectors } from '../../../store/slices/entities/parts'

const queueDefinitions = organizationType => [
  { key: '', label: 'All workspaces', description: 'Every active technical workspace', icon: Box },
  { key: 'needs_action', label: 'Needs your action', description: 'Reviews or cases owned by your company', icon: BellRing },
  { key: 'waiting', label: 'Waiting on partner', description: `The ${organizationType === 'oem' ? 'Supplier' : 'OEM'} owns the next step`, icon: Handshake },
  { key: 'due_soon', label: 'Due soon', description: 'Your actions due in the next 24 hours', icon: CalendarClock },
  { key: 'overdue', label: 'Overdue', description: 'Your actions past their due date', icon: AlertTriangle },
  ...(organizationType === 'supplier' ? [
    { key: 'new_revisions', label: 'Revision reviews', description: 'Released packages awaiting review', icon: Inbox },
    { key: 'unacknowledged_requirements', label: 'Requirements', description: 'Requested acknowledgements remaining', icon: ListChecks },
  ] : []),
]

const Parts = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('part.read'))
  const enabled = useSelector(getFeatureEnabled('part_workspaces'))
  const canCreate = useSelector(getHasPermission('part.create'))
  const parts = useSelector(partSelectors.getParts)
  const loading = useSelector(partSelectors.getLoading)
  const error = useSelector(partSelectors.getError)
  const pagination = useSelector(partSelectors.getPagination)
  const actionSummary = useSelector(partSelectors.getActionSummary)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const view = String(router.query.view || '')
  const refresh = () => dispatch(loadParts({ search: search || undefined, view: view || undefined, page, page_size: 25 }))
  useEffect(() => {
    if (!enabled || !allowed || !organization?.id) return undefined
    const timer = window.setTimeout(refresh, 180)
    return () => window.clearTimeout(timer)
  }, [allowed, enabled, organization?.id, page, search, view])
  useEffect(() => {
    if (enabled && allowed && organization?.id) dispatch(loadPartActionSummary())
  }, [allowed, dispatch, enabled, organization?.id])

  if (!enabled || !allowed || !['oem', 'supplier'].includes(organization?.type)) return <PermissionDenied />

  const columns = [
    { key: 'part', label: 'Part workspace', render: item => <div className='tablePrimary'><strong>{item.part_number}</strong><span>{item.name}</span></div> },
    { key: 'relationship', label: organization.type === 'supplier' ? 'OEM customer' : 'Workspace', render: item => organization.type === 'supplier' ? (item.workspace_share?.oem_organization?.name || 'OEM customer') : 'OEM controlled definition' },
    { key: 'revision', label: 'Shared revision', render: item => item.current_released_revision?.revision || item.workspace_share?.current_shared_revision?.revision || 'Draft only' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={item.lifecycle_state === 'active' ? 'success' : 'neutral'}>{item.lifecycle_state}</StatusBadge> },
    { key: 'cases', label: 'Open cases', render: item => item.counts?.open_collaboration || 0 },
    { key: 'updated', label: 'Updated', render: item => formatDate(item.updated_at) },
    { key: 'action', label: '', render: item => <Button href={`/app/parts/${item.id}`} variant='secondary' className='tableAction'>Open <ExternalLink aria-hidden='true' /></Button> },
  ]
  const queues = queueDefinitions(organization.type)
  const selectedQueue = queues.find(item => item.key === view) || queues[0]
  const queueCount = key => {
    if (!key) return view ? null : (pagination?.total ?? parts.length)
    const field = key === 'waiting' ? 'waiting_on_other' : key
    return actionSummary?.[field] ?? 0
  }

  return <>
    <Seo title='Part workspaces' description='Revisioned technical collaboration between OEMs and suppliers.' path='/app/parts' noIndex />
    <AppPageHeader eyebrow='Technical collaboration' title='Part workspaces' description={organization.type === 'oem' ? 'Define immutable part revisions, share them with connected suppliers, and keep every technical question tied to its source.' : 'Review the exact revisions your OEM customers shared and collaborate in the context of models, drawings, files, and requirements.'} actions={<>{canCreate && organization.type === 'oem' && <Button href='/app/parts/new'><Plus aria-hidden='true' /> New part workspace</Button>}<Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button></>} />
    <nav className='partQueueGrid' aria-label='Part Workspace action queues'>{queues.map(item => { const Icon = item.icon; const count = queueCount(item.key); const selected = item.key === view; return <LinkWrap key={item.key || 'all'} href={item.key ? `/app/parts?view=${item.key}` : '/app/parts'} className={`partQueueCard${selected ? ' is-active' : ''}`} aria-current={selected ? 'page' : undefined}><span className='partQueueCard__icon'><Icon aria-hidden='true' /></span><span><strong>{item.label}</strong><small>{item.description}</small></span><b>{count === null ? 'All' : count}</b></LinkWrap> })}</nav>
    <div className='partQueueContext'><div><span className='technicalLabel'>Current queue</span><strong>{selectedQueue.label}</strong><p>{selectedQueue.description}. Each workspace below belongs in this queue.</p></div>{view && <Button variant='secondary' href='/app/parts'>View all workspaces</Button>}</div>
    <div className='listToolbar partWorkspaceToolbar'><label className='appSearch'><span className='appSearch__label'>Search parts</span><Search aria-hidden='true' /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder='Part number or name' /></label><div className='partWorkspaceToolbar__status'>{view && <Button variant='secondary' href='/app/parts'>Clear {view.replaceAll('_', ' ')} view</Button>}<StatusBadge tone='info'>{pagination?.total ?? parts.length} workspace{(pagination?.total ?? parts.length) === 1 ? '' : 's'}</StatusBadge></div></div>
    {error && <ErrorState description={error.message} onRetry={refresh} />}
    {loading && !parts.length ? <section className='appPanel'><AppSkeleton lines={8} /></section> : parts.length ? <>
      <section className='appPanel appPanel--table partWorkspaceDesktop'><DataTable caption='Part workspaces' columns={columns} rows={parts} /></section>
      <section className='partWorkspaceMobile' aria-label='Part workspaces'>{parts.map(item => <RecordCard key={item.id} href={`/app/parts/${item.id}`} eyebrow={item.part_number} title={item.name} badges={<><StatusBadge tone={item.lifecycle_state === 'active' ? 'success' : 'neutral'}>{item.lifecycle_state}</StatusBadge>{item.counts?.open_collaboration > 0 && <StatusBadge tone='warning'>{item.counts.open_collaboration} open</StatusBadge>}</>} facts={[...(organization.type === 'supplier' ? [{ label: 'OEM customer', value: item.workspace_share?.oem_organization?.name || 'OEM customer' }] : []), { label: 'Revision', value: item.current_released_revision?.revision || item.workspace_share?.current_shared_revision?.revision || 'Draft' }, { label: 'Production records', value: item.counts?.production_records || 0 }]} actionLabel='Open workspace' />)}</section>
    </> : <section className='appPanel'><EmptyState icon={view ? selectedQueue.icon : Box} title={view ? `Nothing in ${selectedQueue.label.toLowerCase()}` : 'No part workspaces yet'} description={view ? 'This queue is clear. Open all workspaces or choose another action queue.' : organization.type === 'oem' ? 'Create the first workspace to release and share a technical part definition.' : 'A workspace appears when an OEM shares a released revision with your company.'} action={view ? <Button href='/app/parts' variant='secondary'>View all workspaces</Button> : canCreate && <Button href='/app/parts/new'><Plus aria-hidden='true' /> New part workspace</Button>} /></section>}
    <Pagination meta={pagination} onPageChange={setPage} label='Part workspace pages' />
  </>
}

Parts.getLayout = PortalPageLayout
export default Parts
