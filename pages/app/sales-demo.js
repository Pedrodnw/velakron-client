import QRCode from 'qrcode'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Building2,
  CheckCircle2,
  Clock3,
  Copy,
  CopyPlus,
  ExternalLink,
  Factory,
  History,
  LoaderCircle,
  MonitorPlay,
  PencilLine,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  StopCircle,
  Trash2,
  UsersRound,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  EmptyState,
  ErrorState,
  MetricCard,
  PermissionDenied,
  StatusBadge,
} from '../../components/app'
import { formatDateTime, formatLabel } from '../../components/app/formatters'
import FormMessage from '../../components/auth/FormMessage'
import { Button } from '../../components/design-system'
import Seo from '../../components/Seo'
import { WidePortalPageLayout } from '../../components/app/PortalPageLayout'
import { getHasPermission } from '../../store/slices/appContext'
import {
  loadSalesDemoCampaigns,
  loadSalesDemoSessions,
  loadSalesDemoSummary,
  loadSalesDemoTemplates,
  salesDemoRequest,
  salesDemoSelectors,
} from '../../store/slices/entities/salesDemos'

const tabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'sessions', label: 'Live sessions' },
  { key: 'templates', label: 'Baseline editor' },
  { key: 'campaigns', label: 'Links & QR' },
  { key: 'history', label: 'History' },
]

const toneForPresence = presence => ({ online: 'success', recently_active: 'info', idle: 'warning', offline: 'neutral' }[presence] || 'neutral')
const toneForStatus = status => ({ active: 'success', ended: 'neutral', expired: 'neutral', failed: 'danger', resetting: 'warning', provisioning: 'info' }[status] || 'neutral')
const idOf = value => String(value?.id || value?._id || value || '')
const clone = value => JSON.parse(JSON.stringify(value))
const safeMessage = result => result?.error?.message || 'The Sales Demo request could not be completed.'
const attentionCategoryDefaults = {
  non_conformance: { severity: 'high', health: 'at_risk' },
  production_block: { severity: 'high', health: 'at_risk' },
  issue: { severity: 'medium', health: 'needs_attention' },
  information_flag: { severity: 'low', health: 'on_schedule' },
}
const commandConsequences = {
  'relationship.request': 'The Supplier guest will receive a new synthetic OEM relationship request.',
  'relationship.accept': 'The OEM guest will see the pending supplier relationship become active.',
  'relationship.decline': 'The OEM guest will see the pending supplier relationship declined.',
  'production.assign': 'A new synthetic assignment will appear in the Supplier action queue.',
  'production.accept_assignment': 'The OEM guest will see the supplier accept this assignment and commit an initial ship date.',
  'production.assign_machine': 'The OEM guest will see a synthetic supplier machine assigned to this part.',
  'production.note': 'A shared synthetic production update will appear in the selected record timeline.',
  'production.expected_ship': 'The OEM guest will see a revised supplier ship commitment and recalculated schedule health.',
  'production.advance_stage': 'The OEM guest will see the supplier move this part to the selected valid production stage.',
  'production.attention': 'The guest will receive a shared categorized attention flag with the approved risk level.',
  'production.attention_acknowledge': 'The guest will see that the counterpart acknowledged an active attention flag.',
  'production.attention_resolve': 'The guest will see a counterpart-owned attention flag resolved with a reason.',
  'production.receive': 'The Supplier guest will see shipment receipt confirmed and quality review opened.',
  'production.quality_issue': 'The Supplier guest will receive a high-priority receiving quality issue and requested response.',
  'production.quality_approve': 'The Supplier guest will see the received parts approved and the record completed.',
  'inspection.record_result': 'The guest will see the counterpart complete the next required inspection sample with a passing synthetic value.',
  'inspection.submit_package': 'The OEM guest will receive an immutable synthetic inspection package for review.',
  'inspection.review_package': 'The guest will see the OEM accept the submitted package or return it for a documented correction.',
  'inspection.confirm_failure': 'Both sides will see a confirmed synthetic failure and one linked non-conformance workflow.',
}

const templateChangeSummary = (draft, published) => {
  if (!draft || !published) return []
  const changes = []
  if (draft.name !== published.name) changes.push(`Baseline renamed to “${draft.name}”`)
  const draftExperiences = draft.supported_experiences || ['oem', 'supplier']
  const publishedExperiences = published.supported_experiences || ['oem', 'supplier']
  if (JSON.stringify([...draftExperiences].sort()) !== JSON.stringify([...publishedExperiences].sort())) {
    changes.push(`Experiences changed to ${draftExperiences.map(formatLabel).join(' and ')}`)
  }
  for (const side of ['oem', 'supplier']) {
    const before = published.companies?.[side] || {}
    const after = draft.companies?.[side] || {}
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push(`${side.toUpperCase()} company or contact updated`)
  }
  if (JSON.stringify(draft.relationship) !== JSON.stringify(published.relationship)) changes.push('Starting relationship scenario updated')
  if (JSON.stringify(draft.supplier_profile) !== JSON.stringify(published.supplier_profile)) changes.push('Supplier capabilities or profile updated')
  if (JSON.stringify(draft.facility) !== JSON.stringify(published.facility)) changes.push('Primary facility updated')
  if (JSON.stringify(draft.machines) !== JSON.stringify(published.machines)) changes.push(`Machine list updated (${draft.machines?.length || 0} total)`)
  if (JSON.stringify(draft.certifications) !== JSON.stringify(published.certifications)) changes.push(`Certification list updated (${draft.certifications?.length || 0} total)`)
  const beforeRecords = new Map((published.production_records || []).map(record => [record.key, record]))
  const afterRecords = new Map((draft.production_records || []).map(record => [record.key, record]))
  const added = [...afterRecords.keys()].filter(key => !beforeRecords.has(key)).length
  const removed = [...beforeRecords.keys()].filter(key => !afterRecords.has(key)).length
  const changed = [...afterRecords.entries()].filter(([key, record]) => beforeRecords.has(key) && JSON.stringify(record) !== JSON.stringify(beforeRecords.get(key))).length
  if (added || removed || changed) changes.push(`Production stories: ${added} added, ${changed} changed, ${removed} removed`)
  if (JSON.stringify(draft.journey_steps) !== JSON.stringify(published.journey_steps)) changes.push('Presenter journey guidance updated')
  return changes
}

const SessionCard = ({ session, onOpen }) => <button className='salesDemoSessionCard' type='button' onClick={() => onOpen(session)}>
  <span className={`salesDemoPresence salesDemoPresence--${session.presence}`} aria-hidden='true' />
  <span className='salesDemoSessionCard__identity'>
    <strong>{session.label || 'Sales Demo'}</strong>
    <small>{session.lead?.full_name || (session.session_type === 'founder_preview' ? 'Founder preview' : 'Prospect')} · {formatLabel(session.experience)}</small>
    <small>{session.campaign?.name || (session.session_type === 'founder_preview' ? 'Private founder preview' : 'Direct Sales Demo')} · baseline v{session.template_version?.version_number || '—'}</small>
  </span>
  <span className='salesDemoSessionCard__journey'><small>Current step</small><strong>{formatLabel(session.current_journey_step || 'overview')}</strong></span>
  <span className='salesDemoSessionCard__time'><small>{session.last_event?.summary || 'Last activity'}</small><strong>{formatDateTime(session.last_activity_at || session.started_at)}</strong></span>
  <StatusBadge tone={toneForPresence(session.presence)}>{formatLabel(session.presence)}</StatusBadge>
</button>

const CommandPanel = ({ session, onChanged }) => {
  const dispatch = useDispatch()
  const actions = session.available_actions || []
  const records = session.production_records || []
  const [actionType, setActionType] = useState(actions[0]?.key || '')
  const [recordId, setRecordId] = useState(idOf(records[0]))
  const [text, setText] = useState('The synthetic counterpart has shared a new update for review.')
  const [date, setDate] = useState('')
  const [stage, setStage] = useState('in_production')
  const [category, setCategory] = useState('issue')
  const [requestedAction, setRequestedAction] = useState('supplier_response')
  const [inspectionDecision, setInspectionDecision] = useState('accepted')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const currentAction = actions.find(item => item.key === actionType)
  const eligibleRecords = useMemo(() => {
    if (!currentAction?.requires_record) return records
    const eligibleRecordIds = new Set(currentAction.eligible_record_ids || [])
    return records.filter(record => eligibleRecordIds.has(idOf(record)))
  }, [currentAction, records])

  useEffect(() => {
    if (!actions.some(item => item.key === actionType && item.enabled)) setActionType(actions.find(item => item.enabled)?.key || '')
    if (!eligibleRecords.some(item => idOf(item) === recordId)) setRecordId(idOf(eligibleRecords[0]))
  }, [actionType, actions, eligibleRecords, recordId])
  const allowedStages = useMemo(() => currentAction?.allowed_values_by_record?.[recordId] || [], [currentAction, recordId])
  useEffect(() => {
    if (actionType === 'production.advance_stage' && !allowedStages.some(item => item.value === stage)) setStage(allowedStages[0]?.value || '')
  }, [actionType, allowedStages, stage])

  const send = async event => {
    event.preventDefault()
    const payload = {}
    if (currentAction?.requires_record) payload.production_record_id = recordId
    if (actionType === 'production.note') payload.body = text
    if (actionType === 'production.attention') Object.assign(payload, { category, explanation: text })
    if (actionType === 'production.attention_resolve') payload.reason = text
    if (actionType === 'relationship.decline') payload.reason = text
    if (actionType === 'production.quality_issue') Object.assign(payload, { explanation: text, requested_action: requestedAction })
    if (actionType === 'production.expected_ship') payload.expected_ship_date = date
    if (actionType === 'production.advance_stage') Object.assign(payload, { stage, reason: 'Synthetic presenter update' })
    if (actionType === 'production.assign') Object.assign(payload, { part_number: 'VK-DEMO-NEW', part_name: 'Priority flight component [Synthetic]', quantity: 12, required_offset: 14 })
    if (actionType === 'inspection.review_package') Object.assign(payload, { decision: inspectionDecision, note: text })
    setPending(true)
    setFeedback(null)
    const result = await dispatch(salesDemoRequest({
      url: `/sessions/${idOf(session)}/commands`,
      method: 'post',
      data: {
        action_type: actionType,
        expected_revision: session.revision,
        idempotency_key: `founder-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        payload,
      },
      requestKey: `sales-demo-command-${idOf(session)}`,
    }))
    setPending(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: result.payload?.data?.command?.result?.summary || 'Synthetic interaction sent.' })
    onChanged()
  }

  return <section className='salesDemoControlPanel'>
    <header><p className='technicalLabel'>Simulate an interaction</p><h3>Change what the guest sees</h3><p>These controls use the same product workflows as a real OEM or Supplier, but stay inside this isolated demo.</p></header>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <form onSubmit={send}>
      <label><span>Interaction</span><select value={actionType} onChange={event => setActionType(event.target.value)}>{actions.map(item => <option key={item.key} value={item.key} disabled={!item.enabled}>{item.label}</option>)}</select></label>
      {currentAction?.requires_record && <label><span>Production record</span><select required value={recordId} onChange={event => setRecordId(event.target.value)}>{eligibleRecords.map(record => <option key={idOf(record)} value={idOf(record)}>{record.part_number} · {record.part_name}</option>)}</select></label>}
      {['production.note', 'production.attention', 'production.attention_resolve', 'relationship.decline', 'production.quality_issue', 'inspection.review_package'].includes(actionType) && <label className='salesDemoControlPanel__wide'><span>{actionType === 'production.attention' ? 'What needs attention?' : actionType === 'production.attention_resolve' ? 'Resolution' : actionType === 'relationship.decline' ? 'Decline reason' : actionType === 'production.quality_issue' ? 'Quality finding' : actionType === 'inspection.review_package' ? 'Review note' : 'Update message'}</span><textarea rows={3} maxLength={1000} value={text} onChange={event => setText(event.target.value)} required /></label>}
      {actionType === 'production.attention' && <label><span>Flag category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value='non_conformance'>Non-conformance · high risk</option><option value='production_block'>Production block · high risk</option><option value='issue'>Issue · medium risk</option><option value='information_flag'>Information · no schedule risk</option></select></label>}
      {actionType === 'production.quality_issue' && <label><span>Requested supplier action</span><select value={requestedAction} onChange={event => setRequestedAction(event.target.value)}><option value='supplier_response'>Supplier response</option><option value='return_to_supplier'>Return to supplier</option><option value='replacement'>Replacement parts</option><option value='rework'>Rework plan</option></select></label>}
      {actionType === 'inspection.review_package' && <label><span>Review decision</span><select value={inspectionDecision} onChange={event => setInspectionDecision(event.target.value)}><option value='accepted'>Accept package</option><option value='changes_requested'>Request changes</option></select></label>}
      {actionType === 'production.expected_ship' && <label><span>Expected ship date</span><input type='date' value={date} onChange={event => setDate(event.target.value)} required /></label>}
      {actionType === 'production.advance_stage' && <label><span>New supplier stage</span><select value={stage} onChange={event => setStage(event.target.value)}>{allowedStages.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>}
      {actionType && <aside className='salesDemoControlPanel__consequence'><strong>What the guest will see</strong><span>{commandConsequences[actionType]}</span></aside>}
      <Button type='submit' disabled={pending || !actionType || (currentAction?.requires_record && !recordId)}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} {pending ? 'Sending…' : 'Send interaction'}</Button>
    </form>
  </section>
}

const SessionDetail = ({ sessionId, onClose }) => {
  const dispatch = useDispatch()
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const requestInFlight = useRef(false)

  const load = useCallback(async ({ quiet = false } = {}) => {
    if (requestInFlight.current) return
    requestInFlight.current = true
    if (!quiet) setLoading(true)
    try {
      const [detail, history] = await Promise.all([
        dispatch(salesDemoRequest({ url: `/sessions/${sessionId}`, requestKey: `sales-demo-detail-${sessionId}` })),
        dispatch(salesDemoRequest({ url: `/sessions/${sessionId}/events`, params: { page_size: 60 }, requestKey: `sales-demo-events-${sessionId}` })),
      ])
      if (detail?.ok) setSession(detail.payload?.data?.session || null)
      if (history?.ok) setEvents(history.payload?.data?.events || [])
      if (!detail?.ok && !detail?.cancelled) setFeedback({ type: 'error', message: safeMessage(detail) })
      setLoading(false)
    } finally {
      requestInFlight.current = false
    }
  }, [dispatch, sessionId])

  useEffect(() => {
    load()
    const timer = window.setInterval(() => load({ quiet: true }), 3_000)
    return () => window.clearInterval(timer)
  }, [load])

  const mutate = async (kind, data = {}) => {
    if (kind === 'reset' && !window.confirm('Reset this Sales Demo to its original baseline? The guest will remain logged in, but synthetic changes will be removed.')) return
    if (kind === 'end' && !window.confirm('End this Sales Demo now? The guest will lose access.')) return
    setFeedback(null)
    const result = await dispatch(salesDemoRequest({
      url: `/sessions/${sessionId}/${kind}`,
      method: 'post',
      data: kind === 'reset' ? { expected_revision: session.revision } : data,
      requestKey: `sales-demo-${kind}-${sessionId}`,
    }))
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: kind === 'reset' ? 'Demo reset to its pinned baseline.' : kind === 'extend' ? 'Demo extended.' : 'Demo ended.' })
    load({ quiet: true })
  }

  if (loading && !session) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (!session) return <ErrorState title='Sales Demo unavailable' description={feedback?.message} onRetry={() => load()} />
  const journey = session.template_version?.payload?.journey_steps?.find(step => step.key === session.current_journey_step)

  return <section className='salesDemoDetail appPanel'>
    <header className='salesDemoDetail__header'>
      <div><button type='button' onClick={onClose}>← All sessions</button><p className='technicalLabel'>{formatLabel(session.session_type)}</p><h2>{session.label}</h2><p>{formatLabel(session.experience)} experience · template v{session.template_version?.version_number || '—'}</p></div>
      <div className='salesDemoDetail__actions'>
        <StatusBadge tone={toneForPresence(session.presence)}>{formatLabel(session.presence)}</StatusBadge>
        {session.demo_active && <Button variant='secondary' onClick={() => mutate('extend', { hours: 2 })}><Clock3 aria-hidden='true' /> Add 2 hours</Button>}
        {session.demo_active && <Button variant='secondary' onClick={() => mutate('reset')}><RotateCcw aria-hidden='true' /> Reset baseline</Button>}
        {session.demo_active && <Button variant='secondary' onClick={() => mutate('end', { reason: 'Ended from the founder Sales Demo dashboard' })}><StopCircle aria-hidden='true' /> End</Button>}
      </div>
    </header>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <div className='salesDemoDetail__grid'>
      <section className='salesDemoJourney'>
        <p className='technicalLabel'>Guest progress</p><h3>{formatLabel(session.current_journey_step || 'overview')}</h3>
        {journey?.presenter_note && <div className='salesDemoJourney__note'><strong>Presenter guidance</strong><p>{journey.presenter_note}</p></div>}
        <dl><div><dt>Current screen</dt><dd>{formatLabel(session.current_route_key || 'overview')}</dd></div><div><dt>Started</dt><dd>{formatDateTime(session.started_at)}</dd></div><div><dt>Expires</dt><dd>{formatDateTime(session.expires_at)}</dd></div><div><dt>Baseline</dt><dd>Version {session.template_version?.version_number || '—'} · reset {session.reset_generation}</dd></div><div><dt>Presenter control</dt><dd>{session.active_controller_membership?.user ? [session.active_controller_membership.user.first_name, session.active_controller_membership.user.last_name].filter(Boolean).join(' ') : 'Available'}</dd></div></dl>
        {session.lead?.crm_organization && <Button href={`/app/crm/organizations/${session.lead.crm_organization}`} variant='secondary'>Open CRM record</Button>}
      </section>
      <section className='salesDemoScenario'>
        <p className='technicalLabel'>Scenario state</p><h3>{session.production_records?.length || 0} production records</h3>
        <div className='salesDemoRecordList'>{(session.production_records || []).map(record => <article key={idOf(record)}><div><strong>{record.part_number}</strong><span>{record.part_name}</span></div><div><StatusBadge>{formatLabel(record.current_stage)}</StatusBadge><StatusBadge tone={record.shared_schedule_health === 'at_risk' ? 'danger' : record.shared_schedule_health === 'needs_attention' ? 'warning' : 'success'}>{formatLabel(record.shared_schedule_health)}</StatusBadge></div></article>)}</div>
      </section>
      <section className='salesDemoTimeline'>
        <p className='technicalLabel'>Live activity</p><h3>Guest and founder events</h3>
        <div>{events.length ? events.map(event => <article key={idOf(event)}><span /><div><strong>{event.summary || formatLabel(event.event_type)}</strong><small>{formatLabel(event.actor?.source)} · {formatDateTime(event.occurred_at)}</small></div></article>) : <p>No activity recorded yet.</p>}</div>
      </section>
    </div>
    {session.demo_active && <CommandPanel session={session} onChanged={() => load({ quiet: true })} />}
  </section>
}

const TemplateEditor = ({ templates, onRefresh }) => {
  const dispatch = useDispatch()
  const [selectedId, setSelectedId] = useState(idOf(templates[0]))
  const [template, setTemplate] = useState(null)
  const [payload, setPayload] = useState(null)
  const [draftVersion, setDraftVersion] = useState(null)
  const [versions, setVersions] = useState([])
  const [publicationNote, setPublicationNote] = useState('Updated the Sales Demo baseline for upcoming presentations.')
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [previewing, setPreviewing] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newTemplate, setNewTemplate] = useState({ name: '', key: '', description: '' })
  const savedPayload = useRef('')

  useEffect(() => { if (!templates.some(item => idOf(item) === selectedId)) setSelectedId(idOf(templates[0])) }, [selectedId, templates])
  const load = useCallback(async () => {
    if (!selectedId) return
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}`, requestKey: `sales-demo-template-${selectedId}` }))
    if (!result?.ok) { if (!result?.cancelled) setFeedback({ type: 'error', message: safeMessage(result) }); return }
    const next = result.payload?.data?.template
    const editable = next?.draft_version || next?.published_version
    setTemplate(next)
    const nextPayload = editable?.payload ? clone(editable.payload) : null
    if (nextPayload && !nextPayload.supported_experiences) nextPayload.supported_experiences = next.supported_experiences?.length ? [...next.supported_experiences] : ['oem', 'supplier']
    savedPayload.current = nextPayload ? JSON.stringify(nextPayload) : ''
    setPayload(nextPayload)
    setDraftVersion(next?.draft_version || null)
    setVersions(result.payload?.data?.versions || [])
  }, [dispatch, selectedId])
  useEffect(() => { load() }, [load])
  const dirty = useMemo(() => Boolean(draftVersion && payload && JSON.stringify(payload) !== savedPayload.current), [draftVersion, payload])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const selectTemplate = nextId => {
    if (dirty && !window.confirm('Discard the unsaved baseline changes?')) return
    setSelectedId(nextId)
  }
  const createTemplate = async event => {
    event.preventDefault(); setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: '/templates', method: 'post', data: { ...newTemplate, clone_version_id: idOf(template?.published_version) || undefined }, requestKey: 'sales-demo-create-template' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    const nextId = idOf(result.payload?.data?.template)
    setNewTemplate({ name: '', key: '', description: '' }); setShowCreate(false); setSelectedId(nextId); onRefresh()
  }

  const updateCompany = (side, field, value) => setPayload(current => ({ ...current, companies: { ...current.companies, [side]: { ...current.companies[side], [field]: value } } }))
  const updateContact = (side, field, value) => setPayload(current => ({ ...current, companies: { ...current.companies, [side]: { ...current.companies[side], contact: { ...current.companies[side].contact, [field]: value } } } }))
  const updateRecord = (index, field, value) => setPayload(current => ({ ...current, production_records: current.production_records.map((record, row) => row === index ? { ...record, [field]: value } : record) }))
  const updateRecordAttention = (index, field, value) => setPayload(current => ({
    ...current,
    production_records: current.production_records.map((record, row) => {
      if (row !== index) return record
      const attention = {
        ...(record.attention || { category: 'issue', code: 'DEMO_ATTENTION', severity: 'medium', health: 'needs_attention', explanation: '' }),
        [field]: value,
      }
      if (field === 'category' && attentionCategoryDefaults[value]) Object.assign(attention, attentionCategoryDefaults[value])
      return { ...record, attention }
    }),
  }))
  const updateFacility = (field, value) => setPayload(current => ({ ...current, facility: { ...current.facility, [field]: value } }))
  const updateFacilityAddress = (field, value) => setPayload(current => ({ ...current, facility: { ...current.facility, address: { ...current.facility.address, [field]: value } } }))
  const updateSupplierProfile = (field, value) => setPayload(current => ({ ...current, supplier_profile: { ...current.supplier_profile, [field]: value } }))
  const updateMachine = (index, field, value) => setPayload(current => ({ ...current, machines: current.machines.map((machine, row) => row === index ? { ...machine, [field]: value } : machine) }))
  const addMachine = () => setPayload(current => ({ ...current, machines: [...current.machines, { shop_identifier: `DEMO-MACHINE-${current.machines.length + 1}`, manufacturer: 'Synthetic manufacturer', model: 'Synthetic model', machine_type_key: 'vertical_machining_center', axes: 3, work_envelope: '' }] }))
  const removeMachine = index => setPayload(current => current.machines.length <= 1 ? current : ({ ...current, machines: current.machines.filter((_machine, row) => row !== index) }))
  const updateCertification = (index, field, value) => setPayload(current => ({ ...current, certifications: current.certifications.map((certification, row) => row === index ? { ...certification, [field]: value } : certification) }))
  const addCertification = () => setPayload(current => ({ ...current, certifications: [...current.certifications, { type_key: `custom_${current.certifications.length + 1}`, name: 'Synthetic certification', reference_number: `CERT-DEMO-${current.certifications.length + 1}` }] }))
  const removeCertification = index => setPayload(current => ({ ...current, certifications: current.certifications.filter((_certification, row) => row !== index) }))
  const moveRecord = (index, direction) => setPayload(current => {
    const next = [...current.production_records]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return { ...current, production_records: next }
  })
  const duplicateRecord = index => setPayload(current => {
    const source = current.production_records[index]
    const suffix = Date.now().toString(36).slice(-5)
    const copy = { ...clone(source), key: `${source.key}-${suffix}`, reference: `${source.reference}-${suffix.toUpperCase()}`, partNumber: `${source.partNumber}-${suffix.toUpperCase()}` }
    return { ...current, production_records: [...current.production_records.slice(0, index + 1), copy, ...current.production_records.slice(index + 1)] }
  })
  const removeRecord = index => setPayload(current => current.production_records.length <= 1 ? current : ({ ...current, production_records: current.production_records.filter((_record, row) => row !== index) }))

  const createDraft = async () => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/draft`, method: 'post', requestKey: 'sales-demo-create-draft' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: 'Editable draft created. Published demos remain unchanged.' })
    load(); onRefresh()
  }

  const save = async event => {
    event.preventDefault(); setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/draft`, method: 'patch', data: { version: draftVersion.version, payload }, requestKey: 'sales-demo-save-draft' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: result.payload?.data?.draft?.validation?.valid ? 'Draft saved and ready to publish.' : 'Draft saved. Resolve the validation items before publishing.' })
    load(); onRefresh()
  }

  const publish = async () => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/publish`, method: 'post', data: { publication_note: publicationNote }, requestKey: 'sales-demo-publish' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: `Version ${result.payload?.data?.version?.version_number} published. New demos now use it; active demos remain pinned.` })
    load(); onRefresh()
  }

  const validateDraft = async () => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/validate`, method: 'post', requestKey: 'sales-demo-validate-draft' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: result.payload?.data?.validation?.valid ? 'success' : 'error', message: result.payload?.data?.validation?.valid ? 'The saved draft passed all server checks.' : 'The saved draft still has validation items to resolve.' })
    load()
  }

  const restoreVersion = async versionId => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/versions/${versionId}/restore-to-draft`, method: 'post', requestKey: 'sales-demo-restore-version' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: 'That published version was copied into a new editable draft. History was not changed.' })
    load(); onRefresh()
  }

  const previewDraft = async experience => {
    const previewWindow = window.open('about:blank', '_blank')
    setPreviewing(experience); setFeedback(null)
    const result = await dispatch(salesDemoRequest({
      url: '/previews',
      method: 'post',
      data: { experience, template_version_id: idOf(draftVersion) },
      requestKey: `sales-demo-draft-preview-${experience}`,
    }))
    setPreviewing('')
    if (!result?.ok) { previewWindow?.close(); setFeedback({ type: 'error', message: safeMessage(result) }); return }
    if (previewWindow) previewWindow.location = result.payload.data.preview_url
  }

  if (!templates.length) return <EmptyState title='No Sales Demo baselines' description='Create a template to begin.' />
  if (!payload) return <AppSkeleton lines={10} />
  const validation = draftVersion?.validation
  const changeSummary = templateChangeSummary(payload, template?.published_version?.payload)
  return <div className='salesDemoTemplateWorkspace'>
    <aside><p className='technicalLabel'>Baselines</p>{templates.map(item => <button type='button' className={idOf(item) === selectedId ? 'is-active' : ''} key={idOf(item)} onClick={() => selectTemplate(idOf(item))}><strong>{item.name}</strong><small>Published v{item.published_version?.version_number || '—'}{item.draft_version ? ' · draft open' : ''}</small></button>)}<button type='button' className='salesDemoTemplateWorkspace__new' onClick={() => setShowCreate(value => !value)}><Plus aria-hidden='true' /> New baseline</button>{showCreate && <form className='salesDemoTemplateCreate' onSubmit={createTemplate}><label><span>Name</span><input required minLength={2} value={newTemplate.name} onChange={event => setNewTemplate(value => ({ ...value, name: event.target.value, key: value.key || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') }))} /></label><label><span>URL-safe key</span><input required pattern='[a-z0-9]+(?:-[a-z0-9]+)*' value={newTemplate.key} onChange={event => setNewTemplate(value => ({ ...value, key: event.target.value.toLowerCase() }))} /></label><label><span>Purpose</span><textarea rows={2} value={newTemplate.description} onChange={event => setNewTemplate(value => ({ ...value, description: event.target.value }))} /></label><Button type='submit' disabled={working}>Create from current</Button></form>}</aside>
    <section>
      <header><div><p className='technicalLabel'>Visual baseline editor</p><h2>{template?.name}</h2><p>Changes here affect only future sessions after a deliberate publish.</p>{dirty && <StatusBadge tone='warning'>Unsaved changes</StatusBadge>}</div>{!draftVersion && <Button onClick={createDraft} disabled={working}><PencilLine aria-hidden='true' /> Create editable draft</Button>}</header>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      {!draftVersion && <div className='salesDemoPublishedNotice'><CheckCircle2 aria-hidden='true' /><div><strong>Published version is read-only</strong><p>Create a draft to safely update company names, people, and production scenarios.</p></div></div>}
      <form className='salesDemoTemplateForm' onSubmit={save}>
        <fieldset disabled={!draftVersion || working}>
          <legend>Presentation identity</legend>
          <label className='salesDemoTemplateForm__wide'><span>Baseline name</span><input value={payload.name || ''} maxLength={180} onChange={event => setPayload(current => ({ ...current, name: event.target.value }))} /></label>
          <label className='salesDemoTemplateForm__wide'><span>Presenter description</span><textarea rows={3} value={payload.description || ''} maxLength={1000} onChange={event => setPayload(current => ({ ...current, description: event.target.value }))} /></label>
          <div className='salesDemoExperienceChoices salesDemoTemplateForm__wide'><span>Available guest experiences</span>{['oem', 'supplier'].map(experience => <label key={experience}><input type='checkbox' checked={(payload.supported_experiences || ['oem', 'supplier']).includes(experience)} onChange={event => setPayload(current => ({ ...current, supported_experiences: event.target.checked ? [...new Set([...(current.supported_experiences || ['oem', 'supplier']), experience])] : (current.supported_experiences || ['oem', 'supplier']).filter(item => item !== experience) }))} /> {formatLabel(experience)}</label>)}</div>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Presenter journey</legend>
          <div className='salesDemoJourneyEditor'>{(payload.journey_steps || []).map((step, index) => <article key={step.key}><header><strong>{index + 1}. {step.label}</strong><small>{step.route_keys?.map(formatLabel).join(', ')}</small></header><label><span>Presenter note</span><textarea rows={2} maxLength={1000} value={step.presenter_note || ''} onChange={event => setPayload(current => ({ ...current, journey_steps: current.journey_steps.map((item, row) => row === index ? { ...item, presenter_note: event.target.value } : item) }))} /></label></article>)}</div>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Companies and synthetic contacts</legend>
          {['oem', 'supplier'].map(side => <div className='salesDemoCompanyEditor' key={side}><h3>{side.toUpperCase()} experience</h3><label><span>Company name</span><input value={payload.companies?.[side]?.name || ''} onChange={event => updateCompany(side, 'name', event.target.value)} /></label><label><span>First name</span><input value={payload.companies?.[side]?.contact?.first_name || ''} onChange={event => updateContact(side, 'first_name', event.target.value)} /></label><label><span>Last name</span><input value={payload.companies?.[side]?.contact?.last_name || ''} onChange={event => updateContact(side, 'last_name', event.target.value)} /></label><label><span>Title</span><input value={payload.companies?.[side]?.contact?.title || ''} onChange={event => updateContact(side, 'title', event.target.value)} /></label></div>)}
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Relationship scenario</legend>
          <div className='salesDemoCompanyEditor'>
            <h3>Additional prospective OEM</h3>
            <label><span>Company name</span><input value={payload.companies?.prospective_oem?.name || ''} onChange={event => updateCompany('prospective_oem', 'name', event.target.value)} /></label>
            <label><span>First name</span><input value={payload.companies?.prospective_oem?.contact?.first_name || ''} onChange={event => updateContact('prospective_oem', 'first_name', event.target.value)} /></label>
            <label><span>Last name</span><input value={payload.companies?.prospective_oem?.contact?.last_name || ''} onChange={event => updateContact('prospective_oem', 'last_name', event.target.value)} /></label>
            <label><span>Title</span><input value={payload.companies?.prospective_oem?.contact?.title || ''} onChange={event => updateContact('prospective_oem', 'title', event.target.value)} /></label>
          </div>
          <div className='salesDemoCompanyEditor'>
            <h3>Starting relationship</h3>
            <label><span>Status</span><select value={payload.relationship?.status || 'active'} onChange={event => setPayload(current => ({ ...current, relationship: { ...current.relationship, status: event.target.value } }))}><option value='active'>Active</option><option value='pending_supplier'>Awaiting supplier acceptance</option></select></label>
            <label><span>Supplier code prefix</span><input value={payload.relationship?.supplier_code_prefix || ''} maxLength={20} onChange={event => setPayload(current => ({ ...current, relationship: { ...current.relationship, supplier_code_prefix: event.target.value } }))} /></label>
          </div>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Supplier profile and primary facility</legend>
          <div className='salesDemoCompanyEditor'>
            <h3>Supplier profile</h3>
            <label><span>Website</span><input type='url' value={payload.supplier_profile?.website || ''} onChange={event => updateSupplierProfile('website', event.target.value)} /></label>
            <label className='salesDemoTemplateForm__wide'><span>Business description</span><textarea rows={3} value={payload.supplier_profile?.business_description || ''} maxLength={1200} onChange={event => updateSupplierProfile('business_description', event.target.value)} /></label>
          </div>
          <div className='salesDemoCompanyEditor'>
            <h3>Primary facility</h3>
            <label><span>Facility name</span><input value={payload.facility?.name_suffix || ''} onChange={event => updateFacility('name_suffix', event.target.value)} /></label>
            <label><span>Shop identifier</span><input value={payload.facility?.shop_identifier || ''} onChange={event => updateFacility('shop_identifier', event.target.value)} /></label>
            <label className='salesDemoTemplateForm__wide'><span>Street address</span><input value={payload.facility?.address?.line_1 || ''} onChange={event => updateFacilityAddress('line_1', event.target.value)} /></label>
            <label><span>City</span><input value={payload.facility?.address?.city || ''} onChange={event => updateFacilityAddress('city', event.target.value)} /></label>
            <label><span>State or region</span><input value={payload.facility?.address?.region || ''} onChange={event => updateFacilityAddress('region', event.target.value)} /></label>
            <label><span>Postal code</span><input value={payload.facility?.address?.postal_code || ''} onChange={event => updateFacilityAddress('postal_code', event.target.value)} /></label>
            <label><span>Country code</span><input value={payload.facility?.address?.country_code || ''} maxLength={2} onChange={event => updateFacilityAddress('country_code', event.target.value.toUpperCase())} /></label>
            <label><span>Time zone</span><input value={payload.facility?.timezone || ''} onChange={event => updateFacility('timezone', event.target.value)} /></label>
          </div>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Machines</legend>
          <div className='salesDemoCapabilityEditor'>{(payload.machines || []).map((machine, index) => <article key={`${machine.shop_identifier}-${index}`}><header><strong>{machine.shop_identifier || `Machine ${index + 1}`}</strong><button type='button' onClick={() => removeMachine(index)} disabled={payload.machines.length <= 1} aria-label={`Remove machine ${machine.shop_identifier || index + 1}`}><Trash2 aria-hidden='true' /></button></header><div><label><span>Shop identifier</span><input value={machine.shop_identifier || ''} onChange={event => updateMachine(index, 'shop_identifier', event.target.value)} /></label><label><span>Manufacturer</span><input value={machine.manufacturer || ''} onChange={event => updateMachine(index, 'manufacturer', event.target.value)} /></label><label><span>Model</span><input value={machine.model || ''} onChange={event => updateMachine(index, 'model', event.target.value)} /></label><label><span>Machine type</span><input value={machine.machine_type_key || ''} onChange={event => updateMachine(index, 'machine_type_key', event.target.value)} /></label><label><span>Axes</span><input type='number' min='1' max='20' value={machine.axes || ''} onChange={event => updateMachine(index, 'axes', Number(event.target.value))} /></label><label><span>Work envelope</span><input value={machine.work_envelope || ''} onChange={event => updateMachine(index, 'work_envelope', event.target.value)} /></label></div></article>)}</div>
          <Button type='button' variant='secondary' onClick={addMachine}><Plus aria-hidden='true' /> Add machine</Button>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Certifications</legend>
          <div className='salesDemoCapabilityEditor'>{(payload.certifications || []).map((certification, index) => <article key={`${certification.reference_number}-${index}`}><header><strong>{certification.name || `Certification ${index + 1}`}</strong><button type='button' onClick={() => removeCertification(index)} aria-label={`Remove certification ${certification.name || index + 1}`}><Trash2 aria-hidden='true' /></button></header><div><label><span>Type key</span><input value={certification.type_key || ''} onChange={event => updateCertification(index, 'type_key', event.target.value)} /></label><label><span>Display name</span><input value={certification.name || ''} onChange={event => updateCertification(index, 'name', event.target.value)} /></label><label><span>Reference number</span><input value={certification.reference_number || ''} onChange={event => updateCertification(index, 'reference_number', event.target.value)} /></label></div></article>)}</div>
          <Button type='button' variant='secondary' onClick={addCertification}><Plus aria-hidden='true' /> Add certification</Button>
        </fieldset>
        <fieldset disabled={!draftVersion || working}>
          <legend>Production portfolio</legend>
          <div className='salesDemoProductionEditor'>{payload.production_records.map((record, index) => <article key={record.key}>
            <header><strong>{record.partNumber || `Record ${index + 1}`}</strong><div className='salesDemoProductionEditor__actions'><StatusBadge>{formatLabel(record.stage)}</StatusBadge><button type='button' onClick={() => moveRecord(index, -1)} disabled={index === 0} aria-label={`Move ${record.partNumber} up`}><ArrowUp aria-hidden='true' /></button><button type='button' onClick={() => moveRecord(index, 1)} disabled={index === payload.production_records.length - 1} aria-label={`Move ${record.partNumber} down`}><ArrowDown aria-hidden='true' /></button><button type='button' onClick={() => duplicateRecord(index)} aria-label={`Duplicate ${record.partNumber}`}><CopyPlus aria-hidden='true' /></button><button type='button' onClick={() => removeRecord(index)} disabled={payload.production_records.length <= 1} aria-label={`Remove ${record.partNumber}`}><Trash2 aria-hidden='true' /></button></div></header>
            <div>
              <label><span>Scenario key</span><input value={record.key || ''} onChange={event => updateRecord(index, 'key', event.target.value)} /></label>
              <label><span>Reference suffix</span><input value={record.reference || ''} onChange={event => updateRecord(index, 'reference', event.target.value)} /></label>
              <label><span>Part number</span><input value={record.partNumber || ''} onChange={event => updateRecord(index, 'partNumber', event.target.value)} /></label>
              <label><span>Part name</span><input value={record.partName || ''} onChange={event => updateRecord(index, 'partName', event.target.value)} /></label>
              <label><span>Stage</span><select value={record.stage} onChange={event => updateRecord(index, 'stage', event.target.value)}><option value='assigned'>Assigned</option><option value='accepted'>Accepted</option><option value='material_ordered'>Material ordered</option><option value='material_received'>Material received</option><option value='programming'>Programming</option><option value='in_production'>In production</option><option value='inspection'>Inspection</option><option value='ready_to_ship'>Ready to ship</option><option value='shipped'>Shipped</option><option value='delivered'>Delivered</option><option value='quality_review'>Quality review</option><option value='approved'>Approved</option></select></label>
              <label><span>Supplier acceptance</span><select value={record.acceptance || 'accepted'} onChange={event => updateRecord(index, 'acceptance', event.target.value)}><option value='pending'>Pending</option><option value='accepted'>Accepted</option></select></label>
              <label><span>Lifecycle</span><select value={record.lifecycle || 'active'} onChange={event => updateRecord(index, 'lifecycle', event.target.value)}><option value='active'>Active</option><option value='completed'>Completed</option></select></label>
              <label><span>Schedule state</span><select value={record.health || 'on_schedule'} onChange={event => updateRecord(index, 'health', event.target.value)}><option value='on_schedule'>On schedule</option><option value='needs_attention'>Needs attention</option><option value='at_risk'>At risk</option><option value='delayed'>Delayed</option></select></label>
              <label><span>Quantity</span><input type='number' min='1' value={record.quantity} onChange={event => updateRecord(index, 'quantity', Number(event.target.value))} /></label>
              <label><span>Required arrival (days from start)</span><input type='number' min='-365' max='730' value={record.requiredOffset ?? ''} onChange={event => updateRecord(index, 'requiredOffset', event.target.value === '' ? null : Number(event.target.value))} /></label>
              <label><span>Expected ship (days from start)</span><input type='number' min='-365' max='730' value={record.expectedOffset ?? ''} onChange={event => updateRecord(index, 'expectedOffset', event.target.value === '' ? null : Number(event.target.value))} /></label>
              <label className='salesDemoTemplateForm__wide'><span>Starting update</span><textarea rows={2} maxLength={1000} value={record.note || ''} onChange={event => updateRecord(index, 'note', event.target.value)} /></label>
            </div>
            <section className='salesDemoAttentionEditor'>
              <label><input type='checkbox' checked={Boolean(record.attention)} onChange={event => updateRecord(index, 'attention', event.target.checked ? { category: 'issue', code: 'DEMO_ATTENTION', severity: 'medium', health: 'needs_attention', explanation: 'Synthetic attention scenario for the presentation.' } : null)} /> Include attention flag</label>
              {record.attention && <div><label><span>Category</span><select value={record.attention.category || 'issue'} onChange={event => updateRecordAttention(index, 'category', event.target.value)}><option value='non_conformance'>Non-conformance</option><option value='production_block'>Production block</option><option value='issue'>Issue</option><option value='information_flag'>Information</option></select></label><label><span>Severity</span><select value={record.attention.severity || 'medium'} onChange={event => updateRecordAttention(index, 'severity', event.target.value)}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select></label><label><span>Attention code</span><input value={record.attention.code || ''} onChange={event => updateRecordAttention(index, 'code', event.target.value)} /></label><label><span>Resulting health</span><select value={record.attention.health || 'needs_attention'} onChange={event => updateRecordAttention(index, 'health', event.target.value)}><option value='on_schedule'>On schedule</option><option value='needs_attention'>Needs attention</option><option value='at_risk'>At risk</option><option value='delayed'>Delayed</option></select></label><label className='salesDemoTemplateForm__wide'><span>Explanation</span><textarea rows={2} maxLength={1000} value={record.attention.explanation || ''} onChange={event => updateRecordAttention(index, 'explanation', event.target.value)} /></label></div>}
            </section>
          </article>)}</div>
        </fieldset>
        {draftVersion && <footer>
          <div>{validation?.valid ? <StatusBadge tone='success'>Saved draft valid</StatusBadge> : <StatusBadge tone='warning'>{validation?.errors?.length || 0} validation items</StatusBadge>}{(validation?.errors || []).map(item => <small className='is-error' key={`${item.field}-${item.message}`}>{item.field}: {item.message}</small>)}{(validation?.warnings || []).map(item => <small key={`${item.field}-${item.message}`}>{item.message}</small>)}{validation?.generated_counts && <div className='salesDemoValidationPreview'><strong>Saved draft will generate</strong><span>{validation.generated_counts.production_records} production records · {validation.generated_counts.machines} machines · {validation.generated_counts.certifications} certifications</span><span>OEM dashboard: {validation.expected_dashboards?.oem?.action_required || 0} action required · {validation.expected_dashboards?.oem?.awaiting_acceptance || 0} awaiting acceptance</span><span>Supplier dashboard: {validation.expected_dashboards?.supplier?.active_records || 0} active records · {validation.expected_dashboards?.supplier?.action_required || 0} action required</span></div>}</div>
          <div><Button type='button' variant='secondary' onClick={validateDraft} disabled={working}>Validate saved draft</Button><Button type='submit' disabled={working}>{working ? <LoaderCircle className='spin' aria-hidden='true' /> : <PencilLine aria-hidden='true' />} Save draft</Button></div>
        </footer>}
      </form>
      {draftVersion && <div className='salesDemoPublishBar'><div className='salesDemoPublishDiff'><strong>Compared with the published version</strong>{changeSummary.length ? <ul>{changeSummary.map(item => <li key={item}>{item}</li>)}</ul> : <p>No content differences yet.</p>}</div><label><span>Publication note</span><input value={publicationNote} minLength={3} maxLength={1000} onChange={event => setPublicationNote(event.target.value)} /></label><Button onClick={publish} disabled={working || !validation?.valid || publicationNote.trim().length < 3}><CheckCircle2 aria-hidden='true' /> Publish for future demos</Button></div>}
      {draftVersion && <div className='salesDemoDraftPreview'><div><strong>Review before publishing</strong><p>Open the draft as either role without changing your founder session or creating a CRM lead.</p></div><Button variant='secondary' onClick={() => previewDraft('oem')} disabled={Boolean(previewing)}><Building2 aria-hidden='true' /> Preview OEM draft</Button><Button variant='secondary' onClick={() => previewDraft('supplier')} disabled={Boolean(previewing)}><Factory aria-hidden='true' /> Preview Supplier draft</Button></div>}
      {!draftVersion && versions.length > 1 && <section className='salesDemoVersionHistory'><header><p className='technicalLabel'>Immutable history</p><h3>Published versions</h3></header>{versions.filter(version => version.state === 'published').map(version => <article key={idOf(version)}><div><strong>Version {version.version_number}</strong><small>{formatDateTime(version.published_at || version.updated_at)} · {version.content_hash?.slice(0, 12)}</small></div>{idOf(version) !== idOf(template?.published_version) && <Button type='button' variant='secondary' onClick={() => restoreVersion(idOf(version))} disabled={working}>Restore as new draft</Button>}</article>)}</section>}
    </section>
  </div>
}

const CampaignCard = ({ campaign, onToggle }) => {
  const [svg, setSvg] = useState('')
  const [png, setPng] = useState('')
  const url = typeof window === 'undefined' ? `/sales-demo/${campaign.slug}` : `${window.location.origin}/sales-demo/${campaign.slug}`
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 320, errorCorrectionLevel: 'H' }).then(setSvg).catch(() => setSvg(''))
    QRCode.toDataURL(url, { type: 'image/png', margin: 2, width: 1600, errorCorrectionLevel: 'H' }).then(setPng).catch(() => setPng(''))
  }, [url])
  const download = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''
  return <article className='salesDemoCampaignCard'><div className='salesDemoCampaignCard__qr' dangerouslySetInnerHTML={{ __html: svg }} /><div><header><div><strong>{campaign.name}</strong><small>/sales-demo/{campaign.slug}</small></div><StatusBadge tone={campaign.status === 'active' ? 'success' : 'neutral'}>{campaign.status}</StatusBadge></header><p>{campaign.fixed_experience ? `${formatLabel(campaign.fixed_experience)} only` : 'Guest chooses OEM or Supplier'} · {campaign.counts?.sessions || 0} sessions · {campaign.source}/{campaign.medium}{campaign.expires_at ? ` · expires ${formatDateTime(campaign.expires_at)}` : ''}</p><div><Button href={url} target='_blank' rel='noreferrer' variant='secondary'><ExternalLink aria-hidden='true' /> Test link</Button><Button variant='secondary' onClick={() => navigator.clipboard.writeText(url)}><Copy aria-hidden='true' /> Copy</Button>{download && <a className='vk-button vk-button--secondary' href={download} download={`velakron-sales-demo-${campaign.slug}.svg`}>QR · SVG</a>}{png && <a className='vk-button vk-button--secondary' href={png} download={`velakron-sales-demo-${campaign.slug}.png`}>QR · PNG</a>}<Button variant='secondary' onClick={() => onToggle(campaign)}>{campaign.status === 'active' ? 'Pause new sessions' : 'Reactivate'}</Button></div></div></article>
}

const CampaignsPanel = ({ campaigns, templates, onRefresh }) => {
  const dispatch = useDispatch()
  const [form, setForm] = useState({ name: '', slug: '', template_id: idOf(templates[0]), fixed_experience: '', source: 'sales_demo', medium: 'link', campaign: '', expires_at: '' })
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const selectedTemplate = templates.find(item => idOf(item) === form.template_id)
  const supportedExperiences = selectedTemplate?.supported_experiences || ['oem', 'supplier']
  useEffect(() => { if (!form.template_id && templates[0]) setForm(value => ({ ...value, template_id: idOf(templates[0]) })) }, [form.template_id, templates])
  useEffect(() => {
    if (form.fixed_experience && !supportedExperiences.includes(form.fixed_experience)) setForm(value => ({ ...value, fixed_experience: '' }))
  }, [form.fixed_experience, supportedExperiences])
  const create = async event => {
    event.preventDefault(); setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: '/campaigns', method: 'post', data: { ...form, fixed_experience: form.fixed_experience || null }, requestKey: 'sales-demo-create-campaign' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: 'Reusable Sales Demo link created.' }); setForm(value => ({ ...value, name: '', slug: '', campaign: '', expires_at: '' })); onRefresh()
  }
  const toggle = async campaign => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/campaigns/${idOf(campaign)}`, method: 'patch', data: { version: campaign.version, status: campaign.status === 'active' ? 'inactive' : 'active' }, requestKey: `sales-demo-campaign-${idOf(campaign)}` }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: campaign.status === 'active' ? 'New sessions are paused. Existing demos remain available.' : 'Campaign reactivated.' }); onRefresh()
  }
  return <div className='salesDemoCampaigns'>
    <form className='appPanel salesDemoCampaignCreate' onSubmit={create}><header><p className='technicalLabel'>Reusable acquisition link</p><h2>Create a Sales Demo campaign</h2><p>Each link can use a chosen baseline and may let the guest choose a role or open a fixed experience.</p></header><FormMessage type={feedback?.type}>{feedback?.message}</FormMessage><div><label><span>Campaign name</span><input required minLength={2} maxLength={180} value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value, slug: value.slug || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), campaign: value.campaign || event.target.value }))} /></label><label><span>URL name</span><input required pattern='[a-z0-9]+(?:-[a-z0-9]+)*' value={form.slug} onChange={event => setForm(value => ({ ...value, slug: event.target.value.toLowerCase() }))} /></label><label><span>Baseline</span><select required value={form.template_id} onChange={event => setForm(value => ({ ...value, template_id: event.target.value }))}>{templates.filter(item => item.published_version).map(item => <option key={idOf(item)} value={idOf(item)}>{item.name}</option>)}</select></label><label><span>Experience</span><select value={form.fixed_experience} onChange={event => setForm(value => ({ ...value, fixed_experience: event.target.value }))}><option value=''>Guest chooses</option>{supportedExperiences.includes('oem') && <option value='oem'>OEM only</option>}{supportedExperiences.includes('supplier') && <option value='supplier'>Supplier only</option>}</select></label><label><span>Source</span><input value={form.source} maxLength={100} onChange={event => setForm(value => ({ ...value, source: event.target.value }))} /></label><label><span>Medium</span><input value={form.medium} maxLength={100} onChange={event => setForm(value => ({ ...value, medium: event.target.value }))} /></label><label><span>Attribution label</span><input value={form.campaign} maxLength={160} onChange={event => setForm(value => ({ ...value, campaign: event.target.value }))} /></label><label><span>Stop accepting new demos after</span><input type='datetime-local' value={form.expires_at} onChange={event => setForm(value => ({ ...value, expires_at: event.target.value }))} /></label></div><Button type='submit' disabled={working || !form.template_id}>{working ? <LoaderCircle className='spin' aria-hidden='true' /> : <Plus aria-hidden='true' />} Create campaign</Button></form>
    <section className='salesDemoCampaignList'>{campaigns.map(campaign => <CampaignCard campaign={campaign} onToggle={toggle} key={idOf(campaign)} />)}</section>
  </div>
}

const SalesDemoDashboard = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const allowed = useSelector(getHasPermission('sales_demo.read'))
  const summary = useSelector(salesDemoSelectors.getSummary)
  const sessions = useSelector(salesDemoSelectors.getSessions)
  const templates = useSelector(salesDemoSelectors.getTemplates)
  const campaigns = useSelector(salesDemoSelectors.getCampaigns)
  const loading = useSelector(salesDemoSelectors.getLoading)
  const error = useSelector(salesDemoSelectors.getError)
  const [previewing, setPreviewing] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [previewLink, setPreviewLink] = useState('')
  const tab = tabs.some(item => item.key === router.query.tab) ? router.query.tab : 'overview'
  const sessionId = String(router.query.session || '')

  const refresh = useCallback(() => {
    dispatch(loadSalesDemoSummary())
    dispatch(loadSalesDemoSessions({ status: tab === 'history' ? '' : 'active', page_size: 100 }))
    dispatch(loadSalesDemoTemplates())
    dispatch(loadSalesDemoCampaigns())
  }, [dispatch, tab])
  useEffect(() => { if (allowed) refresh() }, [allowed, refresh])
  useEffect(() => {
    if (!allowed || !['overview', 'sessions'].includes(tab) || sessionId) return undefined
    let inFlight = false
    const refreshLive = async () => {
      if (document.visibilityState === 'hidden') return
      if (inFlight) return
      inFlight = true
      try {
        await Promise.all([
          dispatch(loadSalesDemoSummary()),
          dispatch(loadSalesDemoSessions({ status: 'active', page_size: 100 })),
        ])
      } finally {
        inFlight = false
      }
    }
    const timer = window.setInterval(refreshLive, 5_000)
    return () => window.clearInterval(timer)
  }, [allowed, dispatch, sessionId, tab])

  const setTab = next => router.replace({ pathname: router.pathname, query: { tab: next } }, undefined, { shallow: true })
  const openSession = session => router.replace({ pathname: router.pathname, query: { tab: session.status === 'active' ? 'sessions' : 'history', session: idOf(session) } }, undefined, { shallow: true })
  const closeSession = () => router.replace({ pathname: router.pathname, query: { tab } }, undefined, { shallow: true })

  const startPreview = async experience => {
    setPreviewing(experience); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: '/previews', method: 'post', data: { experience }, requestKey: `sales-demo-preview-${experience}` }))
    setPreviewing('')
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setPreviewLink(result.payload.data.preview_url)
    setFeedback({ type: 'success', message: 'Founder preview ready. Your founder dashboard remains signed in.' })
    refresh()
  }

  if (!allowed) return <PermissionDenied description='Sales Demo controls are available only to Velakron founders.' />
  const liveSessions = sessions.filter(item => item.status === 'active')
  const historySessions = sessions.filter(item => item.status !== 'active')
  const idleCount = liveSessions.filter(item => item.presence === 'idle').length

  return <>
    <Seo title='Sales Demo' description='Founder Sales Demo control center.' path='/app/sales-demo' noIndex />
    <AppPageHeader eyebrow='Founder sales workspace' title='Sales Demo' description='Prepare reusable product stories, follow live prospects, and introduce realistic synthetic interactions without touching customer data.' actions={<Button variant='secondary' onClick={refresh} disabled={loading}><RefreshCw aria-hidden='true' /> Refresh</Button>} />
    <nav className='salesDemoTabs' aria-label='Sales Demo sections'>{tabs.map(item => <button key={item.key} type='button' className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>{item.label}{item.key === 'sessions' && summary?.counts?.active_prospects > 0 && <strong>{summary.counts.active_prospects}</strong>}</button>)}</nav>
    {(feedback?.message || previewLink) && <FormMessage type={feedback?.type}>{feedback?.message}{previewLink && <Button href={previewLink} target='_blank' rel='noreferrer' variant='secondary'>Open latest preview</Button>}</FormMessage>}
    {error && <ErrorState title='Sales Demo controls could not be loaded' description={error.message} onRetry={refresh} />}
    {loading && !summary ? <section className='appPanel'><AppSkeleton lines={10} /></section> : <>
      {tab === 'overview' && <div className='salesDemoOverview'>
        <section className='metricGrid metricGrid--priority'><MetricCard label='Live prospects' value={summary?.counts?.active_prospects || 0} detail='Temporary guest experiences' icon={UsersRound} tone={summary?.counts?.active_prospects ? 'success' : 'default'} /><MetricCard label='Founder previews' value={summary?.counts?.active_previews || 0} detail='Open role explorations' icon={MonitorPlay} /><MetricCard label='Started today' value={summary?.counts?.started_today || 0} detail={`${summary?.counts?.started_last_7_days || 0} in the last 7 days`} icon={Activity} /><MetricCard label='Idle sessions' value={idleCount} detail='Active, but no recent heartbeat' icon={Clock3} tone={idleCount ? 'warning' : 'default'} /></section>
        {Boolean(summary?.operations?.alerts?.length) && <section className='salesDemoOperationalAlerts' aria-label='Sales Demo operational alerts'>{summary.operations.alerts.map(alert => <article className={`is-${alert.tone}`} key={alert.code}><AlertTriangle aria-hidden='true' /><div><strong>{formatLabel(alert.code)}</strong><span>{alert.message}</span></div></article>)}</section>}
        <div className='salesDemoOverview__grid'><section className='appPanel salesDemoQuickStart'><header><p className='technicalLabel'>Explore without logging out</p><h2>Start a founder preview</h2><p>Open either side in a separate tab. Your founder session remains active here.</p></header><div><Button onClick={() => startPreview('oem')} disabled={Boolean(previewing)}>{previewing === 'oem' ? <LoaderCircle className='spin' aria-hidden='true' /> : <Building2 aria-hidden='true' />} Explore OEM</Button><Button onClick={() => startPreview('supplier')} disabled={Boolean(previewing)} variant='secondary'>{previewing === 'supplier' ? <LoaderCircle className='spin' aria-hidden='true' /> : <Factory aria-hidden='true' />} Explore Supplier</Button><Button onClick={() => setTab('templates')} variant='secondary'><PencilLine aria-hidden='true' /> Edit baseline</Button><Button onClick={() => setTab('campaigns')} variant='secondary'><Plus aria-hidden='true' /> Create link</Button></div></section><section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Live now</p><h2>Prospect activity</h2></div><Button variant='secondary' onClick={() => setTab('sessions')}>Open all</Button></header>{liveSessions.length ? <div className='salesDemoSessionList'>{liveSessions.slice(0, 5).map(item => <SessionCard session={item} onOpen={openSession} key={idOf(item)} />)}</div> : <EmptyState compact title='No live prospects' description='New Sales Demo visitors and founder previews will appear here automatically.' />}</section></div>
        <section className='appPanel salesDemoPublishedBaselines'><header className='appPanel__header'><div><p className='technicalLabel'>Published stories</p><h2>Current baselines</h2></div><Button variant='secondary' onClick={() => setTab('templates')}>Manage baselines</Button></header><div>{templates.map(template => <article key={idOf(template)}><div><strong>{template.name}</strong><span>{template.description || 'Reusable synthetic product story'}</span></div><StatusBadge tone={template.draft_version ? 'warning' : 'success'}>Published v{template.published_version?.version_number || '—'}{template.draft_version ? ' · draft open' : ''}</StatusBadge></article>)}</div></section>
        <section className='appPanel salesDemoMix'><header className='appPanel__header'><div><p className='technicalLabel'>Experience mix</p><h2>How prospects explore</h2></div></header><div><article><Building2 aria-hidden='true' /><strong>{summary?.counts?.oem || 0}</strong><span>OEM sessions</span></article><article><Factory aria-hidden='true' /><strong>{summary?.counts?.supplier || 0}</strong><span>Supplier sessions</span></article><article><CheckCircle2 aria-hidden='true' /><strong>{summary?.counts?.ended || 0}</strong><span>Ended or expired</span></article></div></section>
      </div>}
      {tab === 'sessions' && (sessionId ? <SessionDetail sessionId={sessionId} onClose={closeSession} /> : <section className='appPanel salesDemoSessions'><header className='appPanel__header'><div><p className='technicalLabel'>Near-live monitoring</p><h2>Active Sales Demo sessions</h2><p>Presence and journey position refresh while this page stays open.</p></div></header>{liveSessions.length ? <div className='salesDemoSessionList'>{liveSessions.map(item => <SessionCard session={item} onOpen={openSession} key={idOf(item)} />)}</div> : <EmptyState icon={MonitorPlay} title='No active sessions' description='Start a founder preview or share a campaign link.' />}</section>)}
      {tab === 'templates' && <section className='appPanel salesDemoTemplates'><TemplateEditor templates={templates} onRefresh={refresh} /></section>}
      {tab === 'campaigns' && <CampaignsPanel campaigns={campaigns} templates={templates} onRefresh={refresh} />}
      {tab === 'history' && (sessionId ? <SessionDetail sessionId={sessionId} onClose={closeSession} /> : <section className='appPanel salesDemoSessions'><header className='appPanel__header'><div><p className='technicalLabel'>Append-only history</p><h2>Completed Sales Demos</h2></div></header>{historySessions.length ? <div className='salesDemoSessionList'>{historySessions.map(item => <SessionCard session={item} onOpen={openSession} key={idOf(item)} />)}</div> : <EmptyState icon={History} title='No completed demos yet' description='Ended and expired Sales Demo sessions will remain visible here.' />}</section>)}
    </>}
  </>
}

SalesDemoDashboard.getLayout = WidePortalPageLayout
export default SalesDemoDashboard
