import { Activity, Check, Copy, Database, Search, ShieldCheck } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader, AppSkeleton, AuditEventRow, DataTable, ErrorState, FilterBar,
  MetricCard, Pagination, PermissionDenied, StatusBadge,
} from '../../components/app'
import { formatLabel, formatStorageStatus } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import { Button } from '../../components/design-system'
import { getHasPermission } from '../../store/slices/appContext'
import { loadOrganizations, organizationSelectors } from '../../store/slices/entities/organizations'
import { loadPlatformAudit, loadPlatformOperations, loadPlatformSummary, loadProductMetrics, platformSelectors, retryPlatformOutbox, trackProductEvent } from '../../store/slices/entities/platformAdministration'

const dateDaysAgo = days => new Date(Date.now() - (days * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10)

const CorrelationValue = ({ value }) => {
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef(null)
  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      window.clearTimeout(copiedTimer.current)
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  return <div className='correlationValue'><code>{value}</code><button type='button' onClick={copy} aria-label='Copy full request correlation ID'>{copied ? <Check aria-hidden='true' /> : <Copy aria-hidden='true' />}{copied ? 'Copied' : 'Copy'}</button></div>
}

const Admin = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('audit.read'))
  const summary = useSelector(platformSelectors.getSummary)
  const summaryLoading = useSelector(platformSelectors.getSummaryLoading)
  const audit = useSelector(platformSelectors.getAudit)
  const metrics = useSelector(platformSelectors.getProductMetrics)
  const operations = useSelector(platformSelectors.getOperations)
  const operationsLoading = useSelector(platformSelectors.getOperationsLoading)
  const operationsError = useSelector(platformSelectors.getOperationsError)
  const mutating = useSelector(platformSelectors.getMutating)
  const organizations = useSelector(organizationSelectors.getEntities)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [filters, setFilters] = useState({ from: dateDaysAgo(30), to: new Date().toISOString().slice(0, 10), organization_id: '', event_type: '', correlation_id: '', page: 1 })
  useEffect(() => { if (allowed) dispatch(loadPlatformSummary()) }, [allowed, dispatch])
  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining this audit review.'); return null }
    setReasonError(''); return value
  }
  const load = (page = filters.page) => {
    const value = validReason()
    if (!value) return
    const next = { ...filters, page }; setFilters(next)
    dispatch(loadPlatformAudit({ ...next, page_size: 50 }, value))
    dispatch(loadProductMetrics({ from: next.from, to: next.to, organization_id: next.organization_id || undefined }, value))
    dispatch(loadPlatformOperations(value))
    if (!organizations.length) dispatch(loadOrganizations({ reason: value, page_size: 100 }))
    dispatch(trackProductEvent('admin.audit_viewed', 'platform_admin'))
  }
  const submit = event => { event.preventDefault(); load(1) }
  const retryOutbox = async item => {
    const value = validReason()
    if (!value) return
    const result = await dispatch(retryPlatformOutbox(
      item._id || item.id,
      `Manual retry requested during support review: ${value}`,
      value,
    ))
    if (result?.ok) dispatch(loadPlatformOperations(value))
  }
  if (!allowed) return <PermissionDenied description='Only authorized Velakron administrators can review security and support activity.' />
  const columns = [
    { key: 'event', label: 'Event', render: item => <AuditEventRow event={item} /> },
    { key: 'organization', label: 'Organization', render: item => item.target_organization?.name || item.actor_organization?.name || 'Platform' },
    { key: 'subject', label: 'Subject', render: item => `${item.subject_type || '—'}${item.subject_id ? ` · ${String(item.subject_id).slice(-8)}` : ''}` },
    { key: 'correlation', label: 'Request correlation ID', render: item => item.correlation_id ? <CorrelationValue value={String(item.correlation_id)} /> : '—' },
  ]
  const queuedOutbox = (operations?.outbox?.counts || [])
    .filter(item => item.state === 'pending')
    .reduce((total, item) => total + item.count, 0)
  const failedOutbox = (operations?.outbox?.counts || [])
    .filter(item => ['retryable', 'dead'].includes(item.state))
    .reduce((total, item) => total + item.count, 0)
  const securityAttention = operations?.attachments?.attention_required?.length || 0
  const pendingScans = operations?.attachments?.scans?.pending || 0
  const storage = formatStorageStatus(operations?.providers?.storage)
  const scannerDisabled = operations?.providers?.malware_scanner === 'not_enabled_prototype'
  return <>
    <Seo title='Audit and security' description='Velakron platform audit and security activity.' path='/admin' noIndex />
    <AppPageHeader eyebrow='Platform controls' title='Audit & security' description='Review bounded, redacted activity. IP addresses, device details, private production content, and before/after payloads are excluded from this screen.' actions={<StatusBadge tone='warning'>Restricted</StatusBadge>} />
    <section className='metricGrid'>
      <MetricCard label='Events, last 24 hours' value={String(summary?.security_activity?.last_24_hours ?? '—')} detail='Append-only security and support activity' icon={ShieldCheck} />
      <MetricCard label='Usage events, 7 days' value={String(summary?.product_usage?.accepted_events_last_7_days ?? '—')} detail='First-party, content-free product instrumentation' icon={Activity} />
      <MetricCard label='Database' value={formatLabel(summary?.system?.database)} detail='Current API database connection' icon={Database} />
    </section>
    {summaryLoading && !summary && <section className='appPanel'><AppSkeleton lines={3} /></section>}
    <section className='appPanel supportReasonPanel'><label htmlFor='audit-support-reason'>Reason for this audit review</label><input id='audit-support-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Reviewing access anomaly ticket VK-611' required /><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'Every audit search is itself recorded.'}</p></section>
    <FilterBar onSubmit={submit} actions={<Button type='submit' disabled={audit.loading}><Search aria-hidden='true' /> Review activity</Button>}>
      <label><span>From</span><input type='date' value={filters.from} onChange={event => setFilters(value => ({ ...value, from: event.target.value }))} required /></label>
      <label><span>To</span><input type='date' value={filters.to} onChange={event => setFilters(value => ({ ...value, to: event.target.value }))} required /></label>
      <label><span>Organization</span><select value={filters.organization_id} onChange={event => setFilters(value => ({ ...value, organization_id: event.target.value }))}><option value=''>All organizations</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label><span>Exact event type</span><input value={filters.event_type} onChange={event => setFilters(value => ({ ...value, event_type: event.target.value }))} placeholder='Example: organization.status_changed' /></label>
      <label><span>Request correlation ID</span><input value={filters.correlation_id} onChange={event => setFilters(value => ({ ...value, correlation_id: event.target.value }))} /></label>
    </FilterBar>
    {audit.error && <ErrorState description={audit.error.message} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{audit.loading ? <AppSkeleton lines={9} /> : <DataTable caption='Redacted platform audit activity' columns={columns} rows={audit.items} emptyTitle='No audit events loaded' emptyDescription='Enter a reason and review a date range of up to 90 days.' />}</section>
    <Pagination meta={audit.pagination} onPageChange={load} label='Audit pages' />
    <section className='metricGrid metricGrid--priority' aria-label='Background operations summary'>
      <MetricCard label='Queued background work' value={operations ? String(queuedOutbox) : '—'} detail='Normal work waiting for a worker' icon={Activity} />
      <MetricCard label='Retryable or stopped work' value={operations ? String(failedOutbox) : '—'} detail='Operations that need review or a safe retry' icon={Activity} tone={failedOutbox ? 'warning' : 'default'} />
      <MetricCard label='Files requiring attention' value={operations ? String(securityAttention) : '—'} detail='Scanning, quarantined, or failed files' icon={ShieldCheck} tone={securityAttention ? 'warning' : 'default'} />
      <MetricCard label='Storage' value={operations ? storage.label : '—'} detail={operations ? storage.detail : 'Load operations to verify the provider'} icon={Database} tone={operations ? storage.tone : 'default'} />
    </section>
    {operationsLoading && !operations && <section className='appPanel'><AppSkeleton lines={4} /></section>}
    {operationsError && <ErrorState description={operationsError.message} onRetry={() => { const value = validReason(); if (value) dispatch(loadPlatformOperations(value)) }} />}
    {operations && <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Background operations</p><h2>Retries and file security</h2></div></header>
      <div className={`operationsNotice ${scannerDisabled ? 'operationsNotice--warning' : 'operationsNotice--success'}`}><ShieldCheck aria-hidden='true' /><div><strong>{scannerDisabled ? 'Malware scanning is not enabled in this prototype' : 'File security provider is active'}</strong><p>{scannerDisabled ? `${pendingScans} file${pendingScans === 1 ? '' : 's'} currently show an unscanned status, but only scanning, quarantined, or failed files appear in the attention count above.` : 'The attention count includes only files that are scanning, quarantined, or failed.'}</p></div></div>
      <p className='operationsQueueSummary'><strong>{queuedOutbox} queued</strong> normal background operation{queuedOutbox === 1 ? '' : 's'} waiting for a worker. Queued work is not included in the retryable/stopped total.</p>
      <div className='usageMetricGrid'>{(operations.jobs || []).map(job => <article key={job.key}><strong>{formatLabel(job.state)}</strong><span>{formatLabel(job.key)}</span><small>{job.completed_at ? `Last completed ${new Date(job.completed_at).toLocaleString()}` : 'No completed run recorded'}</small></article>)}</div>
      {(operations.outbox?.failed || []).length ? <div className='adminOperationList'><h3>Retryable or stopped work</h3>{operations.outbox.failed.map(item => <article key={item._id || item.id}><div><strong>{formatLabel(item.event_type)}</strong><span>{formatLabel(item.state)} · attempt {item.attempt} of {item.max_attempts}</span><small>{item.last_error_code ? formatLabel(item.last_error_code) : 'Provider operation did not complete'}</small></div><Button variant='secondary' disabled={mutating} onClick={() => retryOutbox(item)}>Retry safely</Button></article>)}</div> : <p>No retryable or stopped background work.</p>}
      {(operations.attachments?.attention_required || []).length ? <div className='adminOperationList'><h3>Files requiring attention</h3>{operations.attachments.attention_required.map(item => <article key={item._id || item.id}><div><strong>{formatLabel(item.category)} · {String(item._id || item.id).slice(-8)}</strong><span>{formatLabel(item.state)} · scan {formatLabel(item.scan_status)}</span><small>Organization {String(item.owner_organization).slice(-8)} · file contents and names hidden</small></div></article>)}</div> : <p>No files currently require security attention.</p>}
    </section>}
    <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Product validation</p><h2>Privacy-safe feature use</h2></div></header>{metrics.length ? <div className='usageMetricGrid'>{metrics.map(item => <article key={`${item.event_name}-${item.surface}`}><strong>{item.count}</strong><span>{formatLabel(item.event_name.replaceAll('.', '_'))}</span><small>{formatLabel(item.surface)} · {item.organization_count} organization{item.organization_count === 1 ? '' : 's'}</small></article>)}</div> : <p>No product usage events were recorded in this range. Part names, PO numbers, notes, and filenames are never collected by this instrumentation.</p>}</section>
  </>
}

Admin.getLayout = PortalPageLayout
export default Admin
