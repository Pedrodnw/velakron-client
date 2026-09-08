import { Box, ExternalLink, Plus, RefreshCw, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, EmptyState, ErrorState, Pagination, PermissionDenied, RecordCard, StatusBadge } from '../../../components/app'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { Button } from '../../../components/design-system'
import { formatDate } from '../../../components/app/formatters'
import { getActiveOrganization, getFeatureEnabled, getHasPermission } from '../../../store/slices/appContext'
import { loadParts, partSelectors } from '../../../store/slices/entities/parts'

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
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const refresh = () => dispatch(loadParts({
    search: search || undefined,
    state: 'active',
    page,
    page_size: 25,
  }))
  useEffect(() => {
    if (!enabled || !allowed || !organization?.id) return undefined
    const timer = window.setTimeout(refresh, 180)
    return () => window.clearTimeout(timer)
  }, [allowed, enabled, organization?.id, page, search])
  useEffect(() => {
    if (organization?.type === 'supplier') router.replace('/app/production')
  }, [organization?.type, router])

  if (!enabled || !allowed || !['oem', 'supplier'].includes(organization?.type)) return <PermissionDenied />
  if (organization.type === 'supplier') return <section className='appPanel'><AppSkeleton lines={6} /></section>

  const columns = [
    { key: 'part', label: 'Part', render: item => <div className='tablePrimary'><strong>{item.part_number}</strong><span>{item.name}</span></div> },
    { key: 'revision', label: 'Current revision', render: item => item.current_released_revision?.revision || 'Draft only' },
    { key: 'updated', label: 'Updated', render: item => formatDate(item.updated_at) },
    { key: 'action', label: '', render: item => <Button href={`/app/parts/${item.id}`} variant='secondary' className='tableAction'>Open <ExternalLink aria-hidden='true' /></Button> },
  ]

  return <>
    <Seo title='Part workspaces' description='Revisioned technical collaboration between OEMs and suppliers.' path='/app/parts' noIndex />
    <AppPageHeader eyebrow='Part catalog' title='Part workspaces' description='Create and maintain the active part definitions used in production records.' actions={<>{canCreate && <Button href='/app/parts/new'><Plus aria-hidden='true' /> New part workspace</Button>}<Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button></>} />
    <div className='listToolbar partWorkspaceToolbar'><label className='appSearch'><span className='appSearch__label'>Search active parts</span><Search aria-hidden='true' /><input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} placeholder='Part number or name' /></label><div className='partWorkspaceToolbar__status'><StatusBadge tone='info'>{pagination?.total ?? parts.length} active part{(pagination?.total ?? parts.length) === 1 ? '' : 's'}</StatusBadge></div></div>
    {error && <ErrorState description={error.message} onRetry={refresh} />}
    {loading && !parts.length ? <section className='appPanel'><AppSkeleton lines={8} /></section> : parts.length ? <>
      <section className='appPanel appPanel--table partWorkspaceDesktop'><DataTable caption='Part workspaces' columns={columns} rows={parts} /></section>
      <section className='partWorkspaceMobile' aria-label='Part workspaces'>{parts.map(item => <RecordCard key={item.id} href={`/app/parts/${item.id}`} eyebrow={item.part_number} title={item.name} facts={[{ label: 'Current revision', value: item.current_released_revision?.revision || 'Draft only' }, { label: 'Updated', value: formatDate(item.updated_at) }]} actionLabel='Open part' />)}</section>
    </> : <section className='appPanel'><EmptyState icon={Box} title={search.trim() ? 'No matching parts' : 'No active parts yet'} description={search.trim() ? 'Try a different part number or name, or clear your search to see all active parts.' : 'Create the first part workspace to define a part and use it in production.'} action={search.trim() ? <Button variant='secondary' onClick={() => { setSearch(''); setPage(1) }}>Clear search</Button> : canCreate && <Button href='/app/parts/new'><Plus aria-hidden='true' /> New part workspace</Button>} /></section>}
    <Pagination meta={pagination} onPageChange={setPage} label='Active part pages' />
  </>
}

Parts.getLayout = PortalPageLayout
export default Parts
