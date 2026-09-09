import { Building2, Factory, History, MonitorPlay, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../../design-system'
import EmptyState from '../EmptyState'
import StatusBadge from '../StatusBadge'
import { formatDateTime, formatLabel } from '../formatters'

const idOf = value => String(value?.id || value?._id || value || '')
const typeOf = session => session.session_type === 'prospect' ? 'prospect' : (session.session_purpose === 'presenter_led' ? 'presenter_led' : 'practice')
const statusTone = status => ({ active: 'success', ended: 'neutral', expired: 'warning', failed: 'danger', provisioning: 'info', resetting: 'warning' }[status] || 'neutral')
const typeLabel = type => ({ prospect: 'Prospect', practice: 'Practice', presenter_led: 'Presenter-led' }[type] || formatLabel(type))
const outcomeLabel = session => session.status === 'ended'
  ? (session.journey_completed_at ? 'Completed' : 'Ended early')
  : formatLabel(session.status)

const SalesDemoSessionExplorer = ({ sessions, templates, campaigns, history = false, loading = false, pagination = null, onQuery, onOpen, onStart, onShare }) => {
  const [filters, setFilters] = useState({ search: '', type: history ? 'prospect' : 'prospect', status: '', experience: '', template: '', campaign: '', presenter: '', date_from: '', date_to: '' })
  const [page, setPage] = useState(1)
  const pageSize = 12
  useEffect(() => setPage(1), [filters])
  const serverDriven = history && typeof onQuery === 'function'
  useEffect(() => {
    if (!serverDriven) return undefined
    const timer = window.setTimeout(() => {
      const params = { view: 'history', page, page_size: pageSize }
      if (filters.search.trim()) params.search = filters.search.trim()
      if (filters.status) params.status = filters.status
      if (filters.experience) params.experience = filters.experience
      if (filters.template) params.template_id = filters.template
      if (filters.campaign) params.campaign_id = filters.campaign
      if (filters.presenter) params.presenter_id = filters.presenter
      if (filters.date_from) params.date_from = filters.date_from
      if (filters.date_to) params.date_to = filters.date_to
      if (filters.type === 'prospect') params.session_type = 'prospect'
      if (filters.type === 'practice') { params.session_type = 'founder_preview'; params.session_purpose = 'practice' }
      if (filters.type === 'presenter_led') { params.session_type = 'founder_preview'; params.session_purpose = 'presenter_led' }
      onQuery(params)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [filters, onQuery, page, serverDriven])

  const filtered = useMemo(() => serverDriven ? sessions : sessions.filter(session => {
    const type = typeOf(session)
    const presenterName = [session.created_by?.first_name, session.created_by?.last_name].filter(Boolean).join(' ')
    const haystack = [session.label, session.lead?.full_name, session.lead?.company_name, session.lead?.email, session.template?.name, session.campaign?.name, presenterName, session.last_event?.summary].join(' ').toLowerCase()
    if (filters.search && !haystack.includes(filters.search.trim().toLowerCase())) return false
    if (filters.type && type !== filters.type) return false
    if (filters.status && session.status !== filters.status) return false
    if (filters.experience && session.experience !== filters.experience) return false
    if (filters.template && idOf(session.template) !== filters.template) return false
    if (filters.campaign && idOf(session.campaign) !== filters.campaign) return false
    if (filters.presenter && idOf(session.created_by) !== filters.presenter) return false
    const started = new Date(session.started_at || session.created_at || 0)
    if (filters.date_from && started < new Date(`${filters.date_from}T00:00:00`)) return false
    if (filters.date_to && started > new Date(`${filters.date_to}T23:59:59`)) return false
    return true
  }), [filters, serverDriven, sessions])
  const pageCount = serverDriven ? Math.max(1, pagination?.total_pages || 1) : Math.max(1, Math.ceil(filtered.length / pageSize))
  const visible = serverDriven ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)
  const total = serverDriven ? (pagination?.total || filtered.length) : filtered.length
  const presenters = useMemo(() => [...new Map(sessions.filter(item => item.created_by).map(item => [idOf(item.created_by), item.created_by])).values()], [sessions])

  const update = (field, value) => setFilters(current => ({ ...current, [field]: value }))
  return <section className='appPanel salesDemoSessionExplorer'>
    <header className='salesDemoSectionHeader'><div><p className='technicalLabel'>{history ? 'Review and follow up' : 'Monitor the conversation'}</p><h2>{history ? 'Demo history' : 'Live demos'}</h2><p>{history ? 'Prospect visits are shown first. Include practice sessions only when you need them.' : 'Prospect demos and rehearsals are clearly separated so a real visitor never gets lost in test activity.'}</p></div>{!history && <Button onClick={onStart}><MonitorPlay aria-hidden='true' /> Start a demo</Button>}</header>
    <div className='salesDemoSessionFilters'>
      <label className='salesDemoSessionFilters__search'><Search aria-hidden='true' /><span className='srOnly'>Search demos</span><input value={filters.search} onChange={event => update('search', event.target.value)} placeholder='Search person, company, template, or activity' /></label>
      <label><span>Type</span><select value={filters.type} onChange={event => update('type', event.target.value)}><option value=''>All demo types</option><option value='prospect'>Prospect</option><option value='presenter_led'>Presenter-led</option><option value='practice'>Practice</option></select></label>
      {history && <label><span>Status</span><select value={filters.status} onChange={event => update('status', event.target.value)}><option value=''>All outcomes</option><option value='ended'>Ended</option><option value='expired'>Expired</option><option value='failed'>Failed</option></select></label>}
      <label><span>Guest role</span><select value={filters.experience} onChange={event => update('experience', event.target.value)}><option value=''>OEM + Supplier</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
      <label><span>Template</span><select value={filters.template} onChange={event => update('template', event.target.value)}><option value=''>Every template</option>{templates.map(item => <option value={idOf(item)} key={idOf(item)}>{item.name}</option>)}</select></label>
      <label><span>Shared link</span><select value={filters.campaign} onChange={event => update('campaign', event.target.value)}><option value=''>Every link</option>{campaigns.map(item => <option value={idOf(item)} key={idOf(item)}>{item.name}</option>)}</select></label>
      {history && <label><span>Presenter</span><select value={filters.presenter} onChange={event => update('presenter', event.target.value)}><option value=''>Every presenter</option>{presenters.map(item => <option value={idOf(item)} key={idOf(item)}>{[item.first_name, item.last_name].filter(Boolean).join(' ') || item.email}</option>)}</select></label>}
      {history && <><label><span>From</span><input type='date' value={filters.date_from} onChange={event => update('date_from', event.target.value)} /></label><label><span>To</span><input type='date' value={filters.date_to} onChange={event => update('date_to', event.target.value)} /></label></>}
    </div>
    {loading && !sessions.length ? <div className='salesDemoSessionExplorer__loading'>Loading demos…</div> : visible.length ? <><div className='salesDemoSessionExplorer__refresh' aria-live='polite'>{loading ? 'Refreshing results…' : ''}</div><div className='salesDemoSessionTable' role='table' aria-label={history ? 'Demo history' : 'Live demos'}>
      <div className='salesDemoSessionTable__head' role='row'><span>Demo</span><span>Template and role</span><span>{history ? 'Outcome' : 'Current step'}</span><span>Last activity</span><span /></div>
      {visible.map(session => {
        const type = typeOf(session)
        const started = new Date(session.started_at || session.created_at || 0)
        const finished = session.ended_at ? new Date(session.ended_at) : null
        const duration = finished && started.getTime() ? Math.max(1, Math.round((finished - started) / 60000)) : null
        return <button type='button' role='row' onClick={() => onOpen(session)} key={idOf(session)}>
          <span><strong>{session.label || session.lead?.company_name || 'Sales Demo'}</strong><small>{session.lead?.full_name || typeLabel(type)}</small><StatusBadge tone={type === 'prospect' ? 'success' : type === 'presenter_led' ? 'info' : 'neutral'}>{typeLabel(type)}</StatusBadge></span>
          <span><strong>{session.template?.name || 'Demo template'}</strong><small>{session.experience === 'oem' ? <Building2 aria-hidden='true' /> : <Factory aria-hidden='true' />}{formatLabel(session.experience)} · v{session.template_version?.version_number || '—'}</small></span>
          <span><StatusBadge tone={statusTone(session.status)}>{history ? outcomeLabel(session) : formatLabel(session.status)}</StatusBadge><small>{history ? `${duration ? `${duration} min · ` : ''}${formatLabel(session.current_journey_step || 'overview')}${session.presenter_outcome ? ` · ${formatLabel(session.presenter_outcome)}` : ''}` : formatLabel(session.current_journey_step || 'overview')}</small></span>
          <span><strong>{session.last_event?.summary || 'Demo created'}</strong><small>{formatDateTime(session.last_activity_at || session.started_at)}</small></span>
          <span aria-hidden='true'>›</span>
        </button>
      })}
    </div></> : <EmptyState icon={history ? History : MonitorPlay} title={history ? 'No demos match these filters' : 'No live demos in this view'} description={history ? 'Try including practice demos or widening the date range.' : 'Start a practice or presenter-led demo, or share a link for a prospect.'} action={!history ? <><Button onClick={onStart}>Start a demo</Button><Button variant='secondary' onClick={onShare}>Create a shared link</Button></> : undefined} />}
    {total > pageSize && <footer className='salesDemoSessionPagination'><span>Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}</span><div><Button variant='secondary' disabled={page === 1 || loading} onClick={() => setPage(value => value - 1)}>Previous</Button><strong>{page} / {pageCount}</strong><Button variant='secondary' disabled={page === pageCount || loading} onClick={() => setPage(value => value + 1)}>Next</Button></div></footer>}
  </section>
}

export default SalesDemoSessionExplorer
