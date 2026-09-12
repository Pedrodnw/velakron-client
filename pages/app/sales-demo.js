import { useAppDialog } from '../../components/app/AppDialogProvider'
import { normalizeApprovedParts, selectApprovedPart } from '../../components/app/sales-demo/approvedParts'
import { changedTemplateFields } from '../../components/app/sales-demo/templateDraft'
import {
  Activity,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Copy,
  CopyPlus,
  ExternalLink,
  Factory,
  Filter,
  History,
  LoaderCircle,
  MonitorPlay,
  PencilLine,
  Plus,
  Search,
  Share2,
  Sparkles,
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
import SalesDemoLauncher from '../../components/app/sales-demo/SalesDemoLauncher'
import SalesDemoTemplateLibrary from '../../components/app/sales-demo/SalesDemoTemplateLibrary'
import SalesDemoSessionExplorer from '../../components/app/sales-demo/SalesDemoSessionExplorer'
import SalesDemoCampaignsPanel from '../../components/app/sales-demo/SalesDemoCampaignsPanel'
import SalesDemoTutorial from '../../components/app/sales-demo/SalesDemoTutorial'
import { getHasPermission } from '../../store/slices/appContext'
import {
  loadSalesDemoCampaigns,
  loadSalesDemoSessions,
  loadSalesDemoSummary,
  loadSalesDemoTemplates,
  salesDemoRequest,
  salesDemoSelectors,
  salesDemoTelemetry,
} from '../../store/slices/entities/salesDemos'

const tabs = [
  { key: 'overview', label: 'Home' },
  { key: 'templates', label: 'Templates' },
  { key: 'sessions', label: 'Live demos' },
  { key: 'campaigns', label: 'Shared links' },
  { key: 'history', label: 'History' },
  { key: 'tutorial', label: 'Tutorial' },
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
const recommendedActionByJourney = {
  relationship_network: 'relationship.request',
  supplier_profile: 'production.assign',
  production_portfolio: 'production.expected_ship',
  production_detail: 'production.note',
  production_action: 'production.attention',
}

const templateChangeSummary = (draft, published) => {
  if (!draft || !published) return []
  const changes = []
  if (draft.name !== published.name) changes.push(`Template renamed to “${draft.name}”`)
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
  if (JSON.stringify(draft.part_workspace) !== JSON.stringify(published.part_workspace)) changes.push('Part collaboration package or linked production story updated')
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

const SessionCard = ({ session, onOpen }) => {
  const isProspect = session.session_type === 'prospect'
  const type = isProspect ? 'Prospect' : session.session_purpose === 'presenter_led' ? 'Presenter-led' : 'Practice'
  return <button className='salesDemoSessionCard' type='button' onClick={() => onOpen(session)}>
  <span className={`salesDemoPresence salesDemoPresence--${session.presence}`} aria-hidden='true' />
  <span className='salesDemoSessionCard__identity'>
    <strong>{session.label || 'Sales Demo'}</strong>
    <small>{session.lead?.full_name || type} · {formatLabel(session.experience)}</small>
    <small>{session.campaign?.name || (isProspect ? 'Direct Sales Demo' : 'Private workspace')} · template v{session.template_version?.version_number || '—'}</small>
  </span>
  <span className='salesDemoSessionCard__journey'><small>Current step</small><strong>{formatLabel(session.current_journey_step || 'overview')}</strong></span>
  <span className='salesDemoSessionCard__time'><small>{session.last_event?.summary || 'Last activity'}</small><strong>{formatDateTime(session.last_activity_at || session.started_at)}</strong></span>
  <StatusBadge tone={session.status === 'active' ? toneForPresence(session.presence) : toneForStatus(session.status)}>{session.status === 'active' ? formatLabel(session.presence) : formatLabel(session.status)}</StatusBadge>
</button>
}

const CommandPanel = ({ session, journey, onChanged, onOpenScreen }) => {
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
  const recommendedKey = (journey?.action_presets || []).find(key => actions.some(item => item.key === key && item.enabled))
    || recommendedActionByJourney[session.current_journey_step]
  const recommendedAction = actions.find(item => item.key === recommendedKey && item.enabled) || actions.find(item => item.enabled)
  const currentAction = actions.find(item => item.key === actionType) || recommendedAction
  const eligibleRecords = useMemo(() => {
    if (!currentAction?.requires_record) return records
    const eligibleRecordIds = new Set(currentAction.eligible_record_ids || [])
    return records.filter(record => eligibleRecordIds.has(idOf(record)))
  }, [currentAction, records])

  useEffect(() => {
    if (!actions.some(item => item.key === actionType && item.enabled)) setActionType(actions.find(item => item.enabled)?.key || '')
    if (!eligibleRecords.some(item => idOf(item) === recordId)) setRecordId(idOf(eligibleRecords[0]))
  }, [actionType, actions, eligibleRecords, recordId])
  useEffect(() => {
    if (recommendedAction?.key) setActionType(recommendedAction.key)
  }, [recommendedAction?.key, session.current_journey_step])
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
    if (actionType === 'production.assign') Object.assign(payload, { quantity: 12, required_offset: 14 })
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
    setFeedback({ type: 'success', message: `${result.payload?.data?.command?.result?.summary || 'Demo event introduced.'} The guest view updates automatically.`, canOpen: session.session_type === 'founder_preview' })
    onChanged()
  }

  return <section className='salesDemoControlPanel'>
    <header><p className='technicalLabel'>Demo controls</p><h3>Introduce the next event</h3><p>Use the suggested moment for this outline step, or choose another safe event. Everything stays inside this isolated synthetic demo.</p></header>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}{feedback.canOpen && <Button type='button' variant='secondary' onClick={() => onOpenScreen(session.current_journey_step)}>Open where it appeared</Button>}</FormMessage>}
    <form onSubmit={send}>
      {recommendedAction && <aside className='salesDemoRecommendedEvent'><span>Recommended for this step</span><strong>{recommendedAction.label}</strong><p>{commandConsequences[recommendedAction.key]}</p></aside>}
      <details className='salesDemoMoreControls'><summary>More demo controls</summary><label><span>Event</span><select value={actionType} onChange={event => setActionType(event.target.value)}>{actions.filter(item => item.enabled).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label></details>
      {currentAction?.requires_record && <label><span>Production record</span><select required value={recordId} onChange={event => setRecordId(event.target.value)}>{eligibleRecords.map(record => <option key={idOf(record)} value={idOf(record)}>{record.part_number} · {record.part_name}</option>)}</select></label>}
      {['production.note', 'production.attention', 'production.attention_resolve', 'relationship.decline', 'production.quality_issue', 'inspection.review_package'].includes(actionType) && <label className='salesDemoControlPanel__wide'><span>{actionType === 'production.attention' ? 'What needs attention?' : actionType === 'production.attention_resolve' ? 'Resolution' : actionType === 'relationship.decline' ? 'Decline reason' : actionType === 'production.quality_issue' ? 'Quality finding' : actionType === 'inspection.review_package' ? 'Review note' : 'Update message'}</span><textarea rows={3} maxLength={1000} value={text} onChange={event => setText(event.target.value)} required /></label>}
      {actionType === 'production.attention' && <label><span>Flag category</span><select value={category} onChange={event => setCategory(event.target.value)}><option value='non_conformance'>Non-conformance · high risk</option><option value='production_block'>Production block · high risk</option><option value='issue'>Issue · medium risk</option><option value='information_flag'>Information · no schedule risk</option></select></label>}
      {actionType === 'production.quality_issue' && <label><span>Requested supplier action</span><select value={requestedAction} onChange={event => setRequestedAction(event.target.value)}><option value='supplier_response'>Supplier response</option><option value='return_to_supplier'>Return to supplier</option><option value='replacement'>Replacement parts</option><option value='rework'>Rework plan</option></select></label>}
      {actionType === 'inspection.review_package' && <label><span>Review decision</span><select value={inspectionDecision} onChange={event => setInspectionDecision(event.target.value)}><option value='accepted'>Accept package</option><option value='changes_requested'>Request changes</option></select></label>}
      {actionType === 'production.expected_ship' && <label><span>Expected ship date</span><input type='date' value={date} onChange={event => setDate(event.target.value)} required /></label>}
      {actionType === 'production.advance_stage' && <label><span>New supplier stage</span><select value={stage} onChange={event => setStage(event.target.value)}>{allowedStages.map(item => <option value={item.value} key={item.value}>{item.label}</option>)}</select></label>}
      {actionType && <aside className='salesDemoControlPanel__consequence'><strong>What the guest will see</strong><span>{commandConsequences[actionType]}</span></aside>}
      <Button type='submit' disabled={pending || !actionType || (currentAction?.requires_record && !recordId)}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} {pending ? 'Introducing…' : 'Introduce event'}</Button>
    </form>
  </section>
}

const SessionDetail = ({ sessionId, onClose }) => {
  const ask = useAppDialog()
  const [mutation, setMutation] = useState('')
  const mutationInFlight = useRef(false)
  const dispatch = useDispatch()
  const [session, setSession] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState(null)
  const [followUp, setFollowUp] = useState({ outcome: '', notes: '', follow_up_at: '' })
  const followUpDirty = useRef(false)
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
      if (detail?.ok) {
        const nextSession = detail.payload?.data?.session || null
        setSession(nextSession)
        if (nextSession && !followUpDirty.current) setFollowUp({
          outcome: nextSession.presenter_outcome || '',
          notes: nextSession.presenter_notes || '',
          follow_up_at: nextSession.follow_up_at ? new Date(nextSession.follow_up_at).toISOString().slice(0, 16) : '',
        })
      }
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
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    try {
      if (kind === 'reset' && !await ask({ title: 'Reset this Sales Demo?', description: 'All synthetic changes in this session will be removed and its published starting point restored. The guest will remain signed in.', confirmLabel: 'Reset demo', danger: true })) return
      if (kind === 'end' && !await ask({ title: 'End this Sales Demo?', description: 'The guest will lose access. Session history is retained. Reset the demo first to remove test changes.', confirmLabel: 'End demo', danger: true })) return
      setMutation(kind)
      setFeedback(null)
      const result = await dispatch(salesDemoRequest({
        url: `/sessions/${sessionId}/${kind}`,
        method: 'post',
        data: kind === 'reset' ? { expected_revision: session.revision } : data,
        requestKey: `sales-demo-${kind}-${sessionId}`,
      }))
      if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
      setFeedback({ type: 'success', message: kind === 'reset' ? 'Demo reset to its published starting point.' : kind === 'extend' ? 'Demo extended.' : 'Demo ended.' })
      await load({ quiet: true })
    } finally {
      mutationInFlight.current = false
      setMutation('')
    }
  }

  const advanceJourney = async (stepKey, complete = false) => {
    if (mutationInFlight.current) return
    mutationInFlight.current = true
    setMutation('journey')
    setFeedback(null)
    try {
      const result = await dispatch(salesDemoRequest({
        url: `/sessions/${sessionId}/journey`,
        method: 'post',
        data: { expected_revision: session.revision, step_key: stepKey, complete },
        requestKey: `sales-demo-journey-${sessionId}`,
      }))
      if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
      setFeedback({ type: 'success', message: complete ? 'Demo outline marked complete. Capture the outcome and follow-up below.' : 'Demo outline advanced. Guest activity continues to update automatically.' })
      await load({ quiet: true })
    } finally {
      mutationInFlight.current = false
      setMutation('')
    }
  }

  const openPresenterScreen = async stepKey => {
    if (session.session_type !== 'founder_preview') return
    const previewWindow = window.open('about:blank', '_blank')
    setMutation('presenter-link')
    setFeedback(null)
    const result = await dispatch(salesDemoRequest({
      url: `/sessions/${sessionId}/presenter-link`,
      method: 'post',
      data: { step_key: stepKey },
      requestKey: `sales-demo-presenter-link-${sessionId}`,
    }))
    setMutation('')
    if (!result?.ok) {
      previewWindow?.close()
      setFeedback({ type: 'error', message: safeMessage(result) })
      return
    }
    const url = result.payload?.data?.preview_url
    if (previewWindow) previewWindow.location = url
    else setFeedback({ type: 'error', message: 'Your browser blocked the demo tab. Allow popups for Velakron and try again.' })
  }

  const saveFollowUp = async event => {
    event.preventDefault()
    setMutation('follow-up')
    setFeedback(null)
    const result = await dispatch(salesDemoRequest({
      url: `/sessions/${sessionId}/follow-up`,
      method: 'patch',
      data: { version: session.version, outcome: followUp.outcome, notes: followUp.notes, follow_up_at: followUp.follow_up_at || null },
      requestKey: `sales-demo-follow-up-${sessionId}`,
    }))
    setMutation('')
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    followUpDirty.current = false
    setFeedback({
      type: 'success',
      message: session.lead
        ? 'Follow-up saved to this demo and its CRM activity.'
        : session.session_purpose === 'presenter_led'
          ? 'Presenter note saved to this demo.'
          : 'Practice note saved to this demo.',
    })
    await load({ quiet: true })
  }

  const updateFollowUp = (field, value) => {
    followUpDirty.current = true
    setFollowUp(current => ({ ...current, [field]: value }))
  }

  if (loading && !session) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (!session) return <ErrorState title='Sales Demo unavailable' description={feedback?.message} onRetry={() => load()} />
  const journeySteps = session.template_version?.payload?.journey_steps || []
  const journeyIndex = Math.max(0, journeySteps.findIndex(step => step.key === session.current_journey_step))
  const journey = journeySteps[journeyIndex]
  const nextJourney = journeySteps[journeyIndex + 1]
  const previousJourney = journeySteps[journeyIndex - 1]
  const sessionType = session.session_type === 'prospect' ? 'Prospect demo' : session.session_purpose === 'presenter_led' ? 'Presenter-led demo' : 'Practice demo'

  return <section className='salesDemoDetail appPanel'>
    <header className='salesDemoDetail__header'>
      <div><button type='button' onClick={onClose}>← All demos</button><p className='technicalLabel'>{sessionType}</p><h2>{session.label}</h2><p>{formatLabel(session.experience)} guest role · template v{session.template_version?.version_number || '—'}</p></div>
      <div className='salesDemoDetail__actions'>
        <StatusBadge tone={toneForPresence(session.presence)}>{formatLabel(session.presence)}</StatusBadge>
        {session.demo_active && <Button variant='secondary' disabled={Boolean(mutation)} onClick={() => mutate('extend', { hours: 2 })}><Clock3 aria-hidden='true' /> Add 2 hours</Button>}
        {session.demo_active && <Button variant='secondary' disabled={Boolean(mutation)} onClick={() => mutate('reset')}><RotateCcw aria-hidden='true' /> Reset demo</Button>}
        {session.demo_active && <Button variant='secondary' disabled={Boolean(mutation)} onClick={() => mutate('end', { reason: 'Ended from the founder Sales Demo dashboard' })}><StopCircle aria-hidden='true' /> End</Button>}
      </div>
    </header>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <section className='salesDemoLiveOutline'><header><div><p className='technicalLabel'>Demo outline</p><h3>Guide the story</h3></div><span>Step {journeyIndex + 1} of {journeySteps.length || 1}</span></header><div>{journeySteps.map((step, index) => <button type='button' className={index === journeyIndex ? 'is-current' : index < journeyIndex ? 'is-complete' : ''} onClick={() => session.demo_active && advanceJourney(step.key)} disabled={!session.demo_active || Boolean(mutation)} key={step.key}><span>{index < journeyIndex ? '✓' : index + 1}</span><strong>{step.label}</strong><small>{index === journeyIndex ? 'Current' : index < journeyIndex ? 'Covered' : 'Upcoming'}</small></button>)}</div></section>
    <div className='salesDemoDetail__grid'>
      <section className='salesDemoJourney'>
        <p className='technicalLabel'>Recommended next moment</p><h3>{journey?.label || formatLabel(session.current_journey_step || 'overview')}</h3>
        {journey?.sales_point && <p className='salesDemoJourney__point'>{journey.sales_point}</p>}
        {journey?.presenter_note && <div className='salesDemoJourney__note'><strong>What to emphasize</strong><p>{journey.presenter_note}</p></div>}
        {journey && <div className='salesDemoJourney__expectations'><div><strong>Starting condition</strong><span>{journey.precondition || 'Use the prepared synthetic starting state.'}</span></div><div><strong>Guest should notice</strong><span>{journey.expected_result || 'The workflow result appears in context.'}</span></div>{journey.branch_note && <div><strong>Branch guidance</strong><span>{journey.branch_note}</span></div>}</div>}
        {session.demo_active && <div className='salesDemoJourney__controls'>{session.session_type === 'founder_preview' && <Button variant='secondary' disabled={Boolean(mutation)} onClick={() => openPresenterScreen(journey?.key || session.current_journey_step)}>Open this screen</Button>}{previousJourney && <Button variant='secondary' disabled={Boolean(mutation)} onClick={() => advanceJourney(previousJourney.key)}>Previous</Button>}{nextJourney ? <Button disabled={Boolean(mutation)} onClick={() => advanceJourney(nextJourney.key)}>Mark complete & next <ChevronRight aria-hidden='true' /></Button> : session.journey_completed_at ? <StatusBadge tone='success'>Outline complete</StatusBadge> : <Button disabled={Boolean(mutation) || !journey} onClick={() => journey && advanceJourney(journey.key, true)}><CheckCircle2 aria-hidden='true' /> Mark outline complete</Button>}</div>}
        <dl><div><dt>Current screen</dt><dd>{journey?.destination_label || formatLabel(session.current_route_key || 'overview')}</dd></div><div><dt>Started</dt><dd>{formatDateTime(session.started_at)}</dd></div><div><dt>Expires</dt><dd>{formatDateTime(session.expires_at)}</dd></div><div><dt>Template</dt><dd>Version {session.template_version?.version_number || '—'} · reset {session.reset_generation}</dd></div><div><dt>Presenter control</dt><dd>{session.active_controller_membership?.user ? [session.active_controller_membership.user.first_name, session.active_controller_membership.user.last_name].filter(Boolean).join(' ') : 'Available'}</dd></div></dl>
      </section>
      <section className='salesDemoScenario'>
        <p className='technicalLabel'>Scenario state</p><h3>{session.production_records?.length || 0} production records</h3>
        <div className='salesDemoRecordList'>{(session.production_records || []).map(record => <article key={idOf(record)}><div><strong>{record.part_number}</strong><span>{record.part_name}</span></div><div><StatusBadge>{formatLabel(record.current_stage)}</StatusBadge><StatusBadge tone={record.shared_schedule_health === 'at_risk' ? 'danger' : record.shared_schedule_health === 'needs_attention' ? 'warning' : 'success'}>{formatLabel(record.shared_schedule_health)}</StatusBadge></div></article>)}</div>
      </section>
      <section className='salesDemoTimeline'>
        <p className='technicalLabel'>{session.demo_active ? 'Live activity' : 'Activity history'}</p><h3>Guest and presenter events</h3>
        <div>{events.length ? events.map(event => <article key={idOf(event)}><span /><div><strong>{event.summary || formatLabel(event.event_type)}</strong><small>{formatLabel(event.actor?.source)} · {formatDateTime(event.occurred_at)}</small></div></article>) : <p>No activity recorded yet.</p>}</div>
      </section>
    </div>
    <section className='salesDemoFollowUp'>
      <header><div><p className='technicalLabel'>{session.demo_active ? 'Capture context as you go' : 'Close the loop'}</p><h3>Demo outcome and follow-up</h3><p>{session.lead
        ? 'These notes are also added to the prospect’s CRM activity so the next conversation starts with context.'
        : session.session_purpose === 'presenter_led'
          ? 'Presenter notes stay with this controlled demo for review in History; they are not added to prospect reporting or CRM.'
          : 'Practice notes stay with this rehearsal and never enter prospect reporting.'}</p></div>{session.lead?.crm_organization && <Button href={`/app/crm/organizations/${session.lead.crm_organization}`} variant='secondary'>Open CRM record</Button>}</header>
      <form onSubmit={saveFollowUp}><label><span>Outcome</span><select value={followUp.outcome} onChange={event => updateFollowUp('outcome', event.target.value)}><option value=''>Choose an outcome</option><option value='qualified'>Qualified opportunity</option><option value='follow_up'>Follow-up requested</option><option value='not_now'>Interested, not now</option><option value='not_fit'>Not a fit</option></select></label><label><span>Follow-up date <small>Optional</small></span><input type='datetime-local' value={followUp.follow_up_at} onChange={event => updateFollowUp('follow_up_at', event.target.value)} /></label><label className='salesDemoFollowUp__notes'><span>Notes</span><textarea rows={3} maxLength={2000} value={followUp.notes} onChange={event => updateFollowUp('notes', event.target.value)} placeholder='Questions, objections, proof points that resonated, and the agreed next step.' /></label><Button type='submit' disabled={Boolean(mutation) || (!followUp.outcome && !followUp.notes.trim())}>{mutation === 'follow-up' ? <LoaderCircle className='spin' aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />} Save follow-up</Button></form>
    </section>
    {session.demo_active && <CommandPanel session={session} journey={journey} onOpenScreen={openPresenterScreen} onChanged={() => load({ quiet: true })} />}
  </section>
}

const templateEditorSections = [
  { key: 'essentials', label: 'Essentials', description: 'Audience, role, duration, and featured part' },
  { key: 'outline', label: 'Demo outline', description: 'Story sequence and presenter guidance' },
  { key: 'story', label: 'Featured story', description: 'Production records and starting conditions' },
  { key: 'supporting', label: 'Supporting data', description: 'Companies, capabilities, and facilities' },
  { key: 'review', label: 'Preview & publish', description: 'Readiness, role previews, and versions' },
]
const defaultScenarioModules = [
  { key: 'executive_visibility', label: 'Executive visibility', description: 'Portfolio health and urgent action.' },
  { key: 'supplier_relationship', label: 'Supplier relationship', description: 'Controlled OEM and Supplier connection.' },
  { key: 'supplier_capabilities', label: 'Supplier capabilities', description: 'Facility, machines, and certifications.' },
  { key: 'production_portfolio', label: 'Production portfolio', description: 'Multiple parts, stages, and schedule states.' },
  { key: 'schedule_risk', label: 'Schedule risk and recovery', description: 'Supplier forecast updates and attention.' },
  { key: 'assignment_acceptance', label: 'Assignment and acceptance', description: 'Commitment and machine selection.' },
  { key: 'part_collaboration', label: 'Part collaboration', description: 'Visual context and flexible conversation.' },
  { key: 'formal_escalation', label: 'Formal escalation', description: 'Issue, Production Block, and NC.' },
  { key: 'inspection_quality', label: 'Inspection and quality', description: 'Inspection packages and findings.' },
  { key: 'shipping_receiving', label: 'Shipping and receiving', description: 'Shipment through receiving quality.' },
]
const journeyStepCatalog = [
  { key: 'overview', label: 'Executive overview', route_keys: ['overview'], sales_point: 'Give leaders an immediate view of risk, ownership, and delivery confidence.', guest_role: 'both', destination_label: 'Workspace overview', precondition: 'The portfolio contains active, at-risk, and completed synthetic work.', expected_result: 'The prospect can identify what needs attention without chasing a supplier.', estimated_minutes: 2, action_presets: [] },
  { key: 'relationship_network', label: 'Supplier network', route_keys: ['relationships', 'relationship_detail'], sales_point: 'Show that every supplier connection has explicit access and accountability.', guest_role: 'both', destination_label: 'Supplier relationships', precondition: 'At least one synthetic OEM–Supplier relationship is available.', expected_result: 'The prospect understands how controlled relationships support shared work.', estimated_minutes: 3, action_presets: ['relationship.request'] },
  { key: 'supplier_profile', label: 'Supplier capabilities', route_keys: ['supplier_profile', 'facilities', 'machines', 'certifications'], sales_point: 'Connect verified supplier capability data to better sourcing decisions.', guest_role: 'both', destination_label: 'Supplier capability profile', precondition: 'The supplier has a facility, machines, and certifications.', expected_result: 'The prospect can evaluate sourcing fit without searching disconnected files.', estimated_minutes: 3, action_presets: [] },
  { key: 'production_portfolio', label: 'Production portfolio', route_keys: ['production_portfolio'], sales_point: 'Make schedule risk and responsibility visible across outsourced production.', guest_role: 'both', destination_label: 'Production portfolio', precondition: 'At least two records have distinct stages or schedule states.', expected_result: 'The prospect can find the record that deserves attention first.', estimated_minutes: 3, action_presets: ['production.assign', 'production.attention'] },
  { key: 'production_detail', label: 'Production record', route_keys: ['production_detail'], sales_point: 'Create one shared source of truth for commitments, technical context, and decisions.', guest_role: 'both', destination_label: 'Featured production record', precondition: 'The featured record has a released synthetic part and production history.', expected_result: 'The prospect sees the complete record without switching tools.', estimated_minutes: 4, action_presets: ['production.note', 'production.expected_ship'] },
  { key: 'production_action', label: 'Collaboration and action', route_keys: ['production_action'], sales_point: 'Show how a real operational change reaches the right person in context.', guest_role: 'both', destination_label: 'Production action', precondition: 'At least one presenter event is eligible for the featured record.', expected_result: 'The guest sees the event and resulting workflow state immediately.', estimated_minutes: 4, action_presets: ['production.note', 'production.advance_stage'] },
  { key: 'facilities', label: 'Facility', route_keys: ['facilities'], sales_point: 'Review the physical location behind supplier capability.', guest_role: 'both', destination_label: 'Facilities', precondition: 'A synthetic supplier facility exists.', expected_result: 'The prospect understands where work can be performed.', estimated_minutes: 2, action_presets: [] },
  { key: 'machines', label: 'Machines', route_keys: ['machines'], sales_point: 'Match equipment capability to the manufacturing need.', guest_role: 'both', destination_label: 'Machines', precondition: 'At least one synthetic machine exists.', expected_result: 'The prospect connects an assignment to qualified equipment.', estimated_minutes: 2, action_presets: [] },
  { key: 'certifications', label: 'Certifications', route_keys: ['certifications'], sales_point: 'Make supplier certification evidence easy to review.', guest_role: 'both', destination_label: 'Certifications', precondition: 'At least one synthetic certification exists.', expected_result: 'The prospect verifies quality credentials in context.', estimated_minutes: 2, action_presets: [] },
  { key: 'team', label: 'Team', route_keys: ['team'], sales_point: 'Show clear people and role ownership.', guest_role: 'both', destination_label: 'Team', precondition: 'Synthetic OEM and Supplier participants exist.', expected_result: 'The prospect sees who owns the next action.', estimated_minutes: 2, action_presets: [] },
  { key: 'completed', label: 'Wrap-up', route_keys: ['completed'], sales_point: 'Close with the business outcome and agreed next step.', guest_role: 'both', destination_label: 'Demo recap', precondition: 'The main story and interactive moment have been presented.', expected_result: 'The presenter summarizes value and captures follow-up.', estimated_minutes: 2, action_presets: [] },
]

const TemplateEditor = ({ campaigns, defaultPartPresetKey, partPresets, templates, recipes, scenarioModules, onRefresh, onLaunch, onShare }) => {
  const ask = useAppDialog()
  const dispatch = useDispatch()
  const [libraryMode, setLibraryMode] = useState(true)
  const [selectedId, setSelectedId] = useState(idOf(templates[0]))
  const [editorSection, setEditorSection] = useState('essentials')
  const [template, setTemplate] = useState(null)
  const [payload, setPayload] = useState(null)
  const [draftVersion, setDraftVersion] = useState(null)
  const [versions, setVersions] = useState([])
  const [publicationNote, setPublicationNote] = useState('Updated the Sales Demo template for upcoming presentations.')
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [previewing, setPreviewing] = useState('')
  const [saveState, setSaveState] = useState('saved')
  const [journeyToAdd, setJourneyToAdd] = useState('')
  const [undoChange, setUndoChange] = useState(null)
  const [captureAccounts, setCaptureAccounts] = useState({ oem_email: '', supplier_email: '' })
  const savingRef = useRef(false)
  const draftVersionRef = useRef(null)
  const savedPayload = useRef('')

  useEffect(() => {
    if (!selectedId && templates.length) setSelectedId(idOf(templates[0]))
    else if (libraryMode && selectedId && !templates.some(item => idOf(item) === selectedId)) setSelectedId(idOf(templates[0]))
  }, [libraryMode, selectedId, templates])
  const load = useCallback(async () => {
    if (!selectedId) return
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}`, requestKey: `sales-demo-template-${selectedId}` }))
    if (!result?.ok) { if (!result?.cancelled) setFeedback({ type: 'error', message: safeMessage(result) }); return }
    const next = result.payload?.data?.template
    const editable = next?.draft_version || next?.published_version
    setTemplate(next)
    let nextPayload = editable?.payload ? clone(editable.payload) : null
    const storedPayload = nextPayload ? JSON.stringify(nextPayload) : ''
    if (nextPayload) {
      nextPayload.schema_version = 'sales-demo-template-v2'
      nextPayload.presentation ||= { persona: 'Cross-functional evaluation team', use_case: 'full_platform', duration_minutes: 20, tags: ['Full Platform'] }
      nextPayload.scenario_modules = Array.isArray(nextPayload.scenario_modules) && nextPayload.scenario_modules.length
        ? nextPayload.scenario_modules
        : (scenarioModules.length ? scenarioModules : defaultScenarioModules).map(item => item.key)
      nextPayload.journey_steps = (nextPayload.journey_steps || []).map(step => ({
        ...(journeyStepCatalog.find(item => item.key === step.key) || {}),
        ...step,
        guest_role: step.guest_role || 'both',
        estimated_minutes: Number(step.estimated_minutes) || 2,
        branch_note: step.branch_note || '',
      }))
    }
    if (nextPayload && !nextPayload.supported_experiences) nextPayload.supported_experiences = next.supported_experiences?.length ? [...next.supported_experiences] : ['oem', 'supplier']
    if (nextPayload && !nextPayload.part_workspace) nextPayload.part_workspace = {
      preset_key: defaultPartPresetKey || partPresets[0]?.key || '',
      production_record_key: nextPayload.production_records?.[0]?.key || '',
    }
    if (nextPayload) nextPayload = normalizeApprovedParts(nextPayload, partPresets)
    savedPayload.current = storedPayload
    setPayload(nextPayload)
    setDraftVersion(next?.draft_version || null)
    draftVersionRef.current = next?.draft_version || null
    setSaveState('saved')
    setVersions(result.payload?.data?.versions || [])
  }, [defaultPartPresetKey, dispatch, partPresets, scenarioModules, selectedId])
  useEffect(() => { load() }, [load])
  const dirty = useMemo(() => Boolean(draftVersion && payload && JSON.stringify(payload) !== savedPayload.current), [draftVersion, payload])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const selectTemplate = async nextId => {
    if (dirty && !await ask({ title: 'Discard template changes?', description: 'Your unsaved template changes will be lost.', confirmLabel: 'Discard changes', cancelLabel: 'Keep editing', danger: true })) return
    setSelectedId(nextId)
  }
  const createTemplate = async values => {
    setWorking(true); setFeedback(null)
    const keyBase = values.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80) || 'sales-demo-template'
    const result = await dispatch(salesDemoRequest({ url: '/templates', method: 'post', data: { ...values, key: `${keyBase}-${Date.now().toString(36).slice(-5)}` }, requestKey: 'sales-demo-create-template' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return false }
    const nextId = idOf(result.payload?.data?.template)
    dispatch(salesDemoTelemetry('template.builder_opened'))
    setSelectedId(nextId); setLibraryMode(false); setEditorSection('essentials'); onRefresh()
    return true
  }

  const archiveTemplate = async item => {
    if (!await ask({ title: `Archive ${item.name}?`, description: 'The template will leave the active library. Active shared links must be paused first. Published history and completed demos remain available.', confirmLabel: 'Archive template', cancelLabel: 'Keep template', danger: true })) return
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${idOf(item)}`, method: 'patch', data: { version: item.version, status: 'archived' }, requestKey: `sales-demo-archive-template-${idOf(item)}` }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: `${item.name} was archived. Published session history was retained.` })
    onRefresh()
  }

  const editTemplate = item => {
    dispatch(salesDemoTelemetry('template.builder_opened'))
    setSelectedId(idOf(item))
    setEditorSection('essentials')
    setLibraryMode(false)
  }

  const updateCompany = (side, field, value) => setPayload(current => ({ ...current, companies: { ...current.companies, [side]: { ...current.companies[side], [field]: value } } }))
  const updateContact = (side, field, value) => setPayload(current => ({ ...current, companies: { ...current.companies, [side]: { ...current.companies[side], contact: { ...current.companies[side].contact, [field]: value } } } }))
  const updateRecord = (index, field, value) => setPayload(current => ({ ...current, production_records: current.production_records.map((record, row) => row === index ? { ...record, [field]: value } : record) }))
  const updatePartWorkspace = (field, value) => setPayload(current => {
    const nextPartWorkspace = { ...(current.part_workspace || {}), [field]: value }
    const preset = partPresets.find(item => item.key === nextPartWorkspace.preset_key)
    if (!preset) return { ...current, part_workspace: nextPartWorkspace }
    return {
      ...current,
      part_workspace: nextPartWorkspace,
      production_records: current.production_records.map(record => record.key === nextPartWorkspace.production_record_key ? {
        ...record,
        partNumber: preset.part_number,
        partName: preset.name,
        revision: preset.revision,
      } : record),
    }
  })
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
  const removeMachine = index => setPayload(current => {
    if (current.machines.length <= 1) return current
    setUndoChange({ label: `Removed ${current.machines[index]?.shop_identifier || 'machine'}`, payload: clone(current) })
    return { ...current, machines: current.machines.filter((_machine, row) => row !== index) }
  })
  const updateCertification = (index, field, value) => setPayload(current => ({ ...current, certifications: current.certifications.map((certification, row) => row === index ? { ...certification, [field]: value } : certification) }))
  const addCertification = () => setPayload(current => ({ ...current, certifications: [...current.certifications, { type_key: `custom_${current.certifications.length + 1}`, name: 'Synthetic certification', reference_number: `CERT-DEMO-${current.certifications.length + 1}` }] }))
  const removeCertification = index => setPayload(current => {
    setUndoChange({ label: `Removed ${current.certifications[index]?.name || 'certification'}`, payload: clone(current) })
    return { ...current, certifications: current.certifications.filter((_certification, row) => row !== index) }
  })
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
    const copy = { ...clone(source), key: `${source.key}-${suffix}`, reference: `${source.reference}-${suffix.toUpperCase()}` }
    return { ...current, production_records: [...current.production_records.slice(0, index + 1), copy, ...current.production_records.slice(index + 1)] }
  })
  const removeRecord = index => setPayload(current => {
    if (current.production_records.length <= 1) return current
    setUndoChange({ label: `Removed ${current.production_records[index]?.partNumber || 'production record'}`, payload: clone(current) })
    return { ...current, production_records: current.production_records.filter((_record, row) => row !== index) }
  })
  const moveJourneyStep = (index, direction) => setPayload(current => {
    const next = [...(current.journey_steps || [])]
    const target = index + direction
    if (target < 0 || target >= next.length) return current
    ;[next[index], next[target]] = [next[target], next[index]]
    return { ...current, journey_steps: next }
  })
  const removeJourneyStep = index => setPayload(current => {
    if ((current.journey_steps || []).length <= 1) return current
    setUndoChange({ label: `Removed ${current.journey_steps[index]?.label || 'outline step'}`, payload: clone(current) })
    return { ...current, journey_steps: current.journey_steps.filter((_step, row) => row !== index) }
  })
  const updateJourneyStep = (index, patch) => setPayload(current => ({
    ...current,
    journey_steps: current.journey_steps.map((step, row) => row === index ? { ...step, ...patch } : step),
  }))
  const addJourneyStep = () => {
    const source = journeyStepCatalog.find(item => item.key === journeyToAdd)
    if (!source) return
    setPayload(current => ({ ...current, journey_steps: [...(current.journey_steps || []), { ...source, presenter_note: 'Explain why this matters to the prospect and invite a question.' }] }))
    setJourneyToAdd('')
  }

  const createDraft = async () => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/draft`, method: 'post', requestKey: 'sales-demo-create-draft' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: 'Editable draft created. Published demos remain unchanged.' })
    load(); onRefresh()
  }

  const persistDraft = useCallback(async (nextPayload, { announce = false } = {}) => {
    const currentDraft = draftVersionRef.current
    if (!currentDraft || savingRef.current) return false
    savingRef.current = true
    setSaveState('saving')
    if (announce) setFeedback(null)
    const serialized = JSON.stringify(nextPayload)
    const changes = changedTemplateFields(savedPayload.current, nextPayload)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/draft`, method: 'patch', data: { version: currentDraft.version, changes }, requestKey: 'sales-demo-save-draft' }))
    savingRef.current = false
    if (!result?.ok) {
      setSaveState('error')
      setFeedback({ type: 'error', message: safeMessage(result) })
      return false
    }
    const nextDraft = result.payload?.data?.draft
    if (nextDraft) {
      draftVersionRef.current = nextDraft
      setDraftVersion(nextDraft)
    }
    if (result.payload?.data?.template) setTemplate(result.payload.data.template)
    savedPayload.current = serialized
    setSaveState('saved')
    if (announce) setFeedback({ type: 'success', message: nextDraft?.validation?.ready ? 'Draft saved and ready to preview.' : 'Draft saved. Review the readiness items before publishing.' })
    return true
  }, [dispatch, selectedId])

  useEffect(() => {
    if (!draftVersion || !dirty || libraryMode) return undefined
    setSaveState('unsaved')
    const timer = window.setTimeout(() => persistDraft(payload), 1200)
    return () => window.clearTimeout(timer)
  }, [dirty, draftVersion, libraryMode, payload, persistDraft])

  const save = async event => {
    event?.preventDefault?.()
    await persistDraft(payload, { announce: true })
  }

  const captureStartingPoint = async () => {
    if (dirty && !await persistDraft(payload)) return
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/capture-accounts`, method: 'post', data: { ...captureAccounts, version: draftVersionRef.current?.version }, requestKey: 'sales-demo-capture-accounts' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setCaptureAccounts({ oem_email: '', supplier_email: '' })
    await load()
    onRefresh()
    setFeedback({ type: 'success', message: 'Account starting point captured. The draft includes the approved parts, orders, discussions, decisions, and history.' })
  }

  const publish = async () => {
    if (dirty && !await persistDraft(payload, { announce: true })) return
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/templates/${selectedId}/publish`, method: 'post', data: { publication_note: publicationNote }, requestKey: 'sales-demo-publish' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: safeMessage(result) }); return }
    setFeedback({ type: 'success', message: `Version ${result.payload?.data?.version?.version_number} published. New demos now use it; active demos remain pinned.` })
    load(); onRefresh()
  }

  const validateDraft = async () => {
    if (dirty && !await persistDraft(payload)) return
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
    if (dirty && !await persistDraft(payload)) { previewWindow?.close(); return }
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

  if (libraryMode) return <>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <SalesDemoTemplateLibrary
      templates={templates}
      recipes={recipes}
      working={working}
      onCreate={createTemplate}
      onEdit={editTemplate}
      onLaunch={onLaunch}
      onShare={onShare}
      onArchive={archiveTemplate}
    />
  </>
  if (!templates.length) return <EmptyState title='No Sales Demo templates' description='Create a template to begin.' />
  if (!payload) return <AppSkeleton lines={10} />
  const validation = draftVersion?.validation
  const changeSummary = templateChangeSummary(payload, template?.published_version?.payload)
  const linkedCampaigns = (campaigns || []).filter(item => idOf(item.template) === selectedId)
  const selectedPartPreset = partPresets.find(item => item.key === payload.part_workspace?.preset_key) || partPresets[0]
  const sectionIndex = templateEditorSections.findIndex(item => item.key === editorSection)
  return <div className='salesDemoTemplateWorkspace salesDemoTemplateWorkspace--builder'>
    <aside><Button variant='secondary' onClick={() => setLibraryMode(true)}>← Template library</Button><p className='technicalLabel'>Builder sections</p>{templateEditorSections.map(item => <button type='button' className={editorSection === item.key ? 'is-active' : ''} key={item.key} onClick={() => setEditorSection(item.key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</aside>
    <section>
      <header className='salesDemoBuilderHeader'><div><p className='technicalLabel'>Demo template builder</p><h2>{template?.name}</h2><p>Build a reusable starting point. Published demos and active sessions remain unchanged until you publish.</p></div>{!draftVersion && <Button onClick={createDraft} disabled={working}><PencilLine aria-hidden='true' /> Create editable draft</Button>}</header>
      {draftVersion && <div className={`salesDemoBuilderBar is-${saveState}`}><span><strong>{saveState === 'saving' ? 'Saving draft…' : saveState === 'error' ? 'Draft could not be saved' : saveState === 'unsaved' ? 'Unsaved changes' : 'Draft saved'}</strong><small>{saveState === 'saved' ? `Last saved ${formatDateTime(draftVersion.updated_at)}` : saveState === 'error' ? 'Your changes remain on this screen. Retry before leaving.' : 'Velakron saves edits automatically.'}</small></span><div><Button variant='secondary' onClick={() => previewDraft('oem')} disabled={Boolean(previewing) || saveState === 'saving'}><Building2 aria-hidden='true' /> Preview OEM</Button><Button variant='secondary' onClick={() => previewDraft('supplier')} disabled={Boolean(previewing) || saveState === 'saving'}><Factory aria-hidden='true' /> Preview Supplier</Button><Button onClick={() => setEditorSection('review')} disabled={saveState === 'saving'}><CheckCircle2 aria-hidden='true' /> Review & publish</Button></div></div>}
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
      {undoChange && <aside className='salesDemoUndo'><span>{undoChange.label}.</span><Button variant='secondary' onClick={() => { setPayload(undoChange.payload); setUndoChange(null) }}>Undo</Button><button type='button' onClick={() => setUndoChange(null)} aria-label='Dismiss undo'>×</button></aside>}
      {!draftVersion && <div className='salesDemoPublishedNotice'><CheckCircle2 aria-hidden='true' /><div><strong>Published version is read-only</strong><p>Create a draft to safely update company names, people, and production scenarios.</p></div></div>}
      <form className='salesDemoTemplateForm salesDemoTemplateForm--sectioned' data-section={editorSection} onSubmit={save}>
        <fieldset className='is-essentials' disabled={!draftVersion || working || saveState === 'saving'}>
          <legend>Capture an account starting point</legend>
          <p className='salesDemoTemplateForm__wide'>Copy the connected OEM and Supplier workspaces into this draft. Only the five approved Velakron model and drawing packages are included. Each demo gets its own copy; reset restores the captured story.</p>
          <label><span>OEM account email</span><input type='email' autoComplete='off' value={captureAccounts.oem_email} onChange={event => setCaptureAccounts(current => ({ ...current, oem_email: event.target.value }))} /></label>
          <label><span>Supplier account email</span><input type='email' autoComplete='off' value={captureAccounts.supplier_email} onChange={event => setCaptureAccounts(current => ({ ...current, supplier_email: event.target.value }))} /></label>
          <Button type='button' onClick={captureStartingPoint} disabled={!captureAccounts.oem_email.trim() || !captureAccounts.supplier_email.trim()}>{working ? 'Capturing…' : payload.source_snapshot ? 'Recapture starting point' : 'Capture starting point'}</Button>
          {payload.source_snapshot && <div className='salesDemoTemplateForm__wide' role='status'><strong>Captured {formatDateTime(payload.source_snapshot.captured_at)}</strong><p>{payload.source_snapshot.summary.companies.oem} + {payload.source_snapshot.summary.companies.supplier}</p><p>{payload.source_snapshot.summary.parts} approved parts · {payload.source_snapshot.summary.active_records} active orders · {payload.source_snapshot.summary.production_records} total orders · {payload.source_snapshot.summary.conversations} discussions · {payload.source_snapshot.summary.machines} machines</p><p>{payload.source_snapshot.summary.excluded_production_records} older orders excluded because they use other parts. Captured production and supplier data are preserved together; recapture to update them. Presenter wording remains editable.</p></div>}
        </fieldset>
        <fieldset className='is-essentials' disabled={!draftVersion || working}>
          <legend>Presentation essentials</legend>
          <label className='salesDemoTemplateForm__wide'><span>Template name</span><input value={payload.name || ''} maxLength={180} onChange={event => setPayload(current => ({ ...current, name: event.target.value }))} /></label>
          <label className='salesDemoTemplateForm__wide'><span>Presenter description</span><textarea rows={3} value={payload.description || ''} maxLength={1000} onChange={event => setPayload(current => ({ ...current, description: event.target.value }))} /></label>
          <label><span>Target audience</span><input value={payload.presentation?.persona || ''} maxLength={180} onChange={event => setPayload(current => ({ ...current, presentation: { ...current.presentation, persona: event.target.value } }))} placeholder='Example: Supply Chain and Operations' /></label>
          <label><span>Primary sales scenario</span><select value={payload.presentation?.use_case || 'full_platform'} onChange={event => setPayload(current => ({ ...current, presentation: { ...current.presentation, use_case: event.target.value } }))}>{recipes.map(recipe => <option value={recipe.use_case} key={recipe.key}>{recipe.name}</option>)}<option value='custom'>Custom scenario</option></select></label>
          <label><span>Expected duration</span><select value={payload.presentation?.duration_minutes || 20} onChange={event => setPayload(current => ({ ...current, presentation: { ...current.presentation, duration_minutes: Number(event.target.value) } }))}><option value='10'>10 minutes</option><option value='12'>12 minutes</option><option value='15'>15 minutes</option><option value='20'>20 minutes</option><option value='30'>30 minutes</option></select></label>
          <label><span>Search tags</span><input value={(payload.presentation?.tags || []).join(', ')} onChange={event => setPayload(current => ({ ...current, presentation: { ...current.presentation, tags: event.target.value.split(',').map(item => item.trim()).filter(Boolean).slice(0, 12) } }))} placeholder='Quality, Aerospace, Production Block' /></label>
          <div className='salesDemoExperienceChoices salesDemoTemplateForm__wide'><span>Available guest experiences</span>{['oem', 'supplier'].map(experience => <label key={experience}><input type='checkbox' checked={(payload.supported_experiences || ['oem', 'supplier']).includes(experience)} onChange={event => setPayload(current => ({ ...current, supported_experiences: event.target.checked ? [...new Set([...(current.supported_experiences || ['oem', 'supplier']), experience])] : (current.supported_experiences || ['oem', 'supplier']).filter(item => item !== experience) }))} /> {formatLabel(experience)}</label>)}</div>
        </fieldset>
        <fieldset className='is-essentials' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
          <legend>Part collaboration package</legend>
          <div className='salesDemoPartPresetIntro salesDemoTemplateForm__wide'>
            <div><strong>Choose the model and matching drawing used in this demo</strong><span>Each package is synthetic and includes a verified STEP model, its drawing, realistic visual anchors, cases, and inspection context.</span></div>
            <label><span>Linked production story</span><select value={payload.part_workspace?.production_record_key || payload.production_records?.[0]?.key || ''} onChange={event => updatePartWorkspace('production_record_key', event.target.value)}>{payload.production_records.map(record => <option value={record.key} key={record.key}>{record.partNumber} · {record.partName}</option>)}</select></label>
          </div>
          <div className='salesDemoPartPresetGrid salesDemoTemplateForm__wide' role='radiogroup' aria-label='Synthetic part package'>
            {partPresets.map(preset => <label className={preset.key === selectedPartPreset?.key ? 'is-selected' : ''} key={preset.key}>
              <input type='radio' name='sales-demo-part-preset' value={preset.key} checked={preset.key === selectedPartPreset?.key} onChange={() => updatePartWorkspace('preset_key', preset.key)} />
              <span className='salesDemoPartPresetGrid__check' aria-hidden='true'><CheckCircle2 /></span>
              <strong>{preset.part_number}</strong>
              <b>{preset.name.replace(' [Synthetic]', '')}</b>
              <small>{preset.material} · Rev {preset.revision}</small>
              <small>{preset.model_filename}</small>
              <small>{preset.drawing_filename}</small>
            </label>)}
          </div>
          {selectedPartPreset && <div className='salesDemoPartPresetSummary salesDemoTemplateForm__wide'><strong>{selectedPartPreset.name.replace(' [Synthetic]', '')}</strong><span>{selectedPartPreset.description}</span><span>{selectedPartPreset.finish}</span></div>}
        </fieldset>
        <fieldset className='is-outline' disabled={!draftVersion || working}>
          <legend>Included sales moments</legend>
          <p className='salesDemoFieldsetHelp'>Choose only the proof points this audience needs. Readiness checks make sure the supporting synthetic data exists.</p>
          <div className='salesDemoModuleGrid salesDemoTemplateForm__wide'>{(scenarioModules.length ? scenarioModules : defaultScenarioModules).map(module => <label className={(payload.scenario_modules || []).includes(module.key) ? 'is-selected' : ''} key={module.key}><input type='checkbox' checked={(payload.scenario_modules || []).includes(module.key)} onChange={event => setPayload(current => ({ ...current, scenario_modules: event.target.checked ? [...new Set([...(current.scenario_modules || []), module.key])] : (current.scenario_modules || []).filter(item => item !== module.key) }))} /><strong>{module.label}</strong><span>{module.description}</span></label>)}</div>
        </fieldset>
        <fieldset className='is-outline' disabled={!draftVersion || working}>
          <legend>Demo outline</legend>
          <p className='salesDemoFieldsetHelp'>Put the story in the order you plan to present it. The live presenter console will use this sequence.</p>
          <div className='salesDemoJourneyEditor'>{(payload.journey_steps || []).map((step, index) => <article key={step.key}>
            <header><strong>{index + 1}. {step.label}</strong><div><button type='button' onClick={() => moveJourneyStep(index, -1)} disabled={index === 0} aria-label={`Move ${step.label} up`}><ArrowUp aria-hidden='true' /></button><button type='button' onClick={() => moveJourneyStep(index, 1)} disabled={index === payload.journey_steps.length - 1} aria-label={`Move ${step.label} down`}><ArrowDown aria-hidden='true' /></button><button type='button' onClick={() => removeJourneyStep(index)} disabled={payload.journey_steps.length <= 1} aria-label={`Remove ${step.label}`}><Trash2 aria-hidden='true' /></button></div><small>{step.destination_label || step.route_keys?.map(formatLabel).join(', ')} · {step.estimated_minutes || 2} min</small></header>
            <div className='salesDemoJourneyEditor__fields'>
              <label><span>Step title</span><input maxLength={160} value={step.label || ''} onChange={event => updateJourneyStep(index, { label: event.target.value })} /></label>
              <label><span>Guest role</span><select value={step.guest_role || 'both'} onChange={event => updateJourneyStep(index, { guest_role: event.target.value })}><option value='both'>OEM or Supplier</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
              <label><span>Destination</span><input maxLength={160} value={step.destination_label || ''} onChange={event => updateJourneyStep(index, { destination_label: event.target.value })} /></label>
              <label><span>Estimated time</span><select value={step.estimated_minutes || 2} onChange={event => updateJourneyStep(index, { estimated_minutes: Number(event.target.value) })}>{[1, 2, 3, 4, 5, 7, 10, 15, 20].map(value => <option value={value} key={value}>{value} min</option>)}</select></label>
              <label className='salesDemoTemplateForm__wide'><span>Business point this step proves</span><input maxLength={500} value={step.sales_point || ''} onChange={event => updateJourneyStep(index, { sales_point: event.target.value })} /></label>
              <label className='salesDemoTemplateForm__wide'><span>What to emphasize</span><textarea rows={2} maxLength={1000} value={step.presenter_note || ''} onChange={event => updateJourneyStep(index, { presenter_note: event.target.value })} /></label>
              <label><span>Starting condition</span><textarea rows={2} maxLength={500} value={step.precondition || ''} onChange={event => updateJourneyStep(index, { precondition: event.target.value })} /></label>
              <label><span>What the guest should notice</span><textarea rows={2} maxLength={500} value={step.expected_result || ''} onChange={event => updateJourneyStep(index, { expected_result: event.target.value })} /></label>
              <label className='salesDemoTemplateForm__wide'><span>Optional branch or skip guidance</span><input maxLength={500} value={step.branch_note || ''} onChange={event => updateJourneyStep(index, { branch_note: event.target.value })} placeholder='Example: Skip if the prospect is not involved in supplier sourcing.' /></label>
            </div>
          </article>)}</div>
          <div className='salesDemoJourneyAdd salesDemoTemplateForm__wide'><select value={journeyToAdd} onChange={event => setJourneyToAdd(event.target.value)}><option value=''>Add an outline step…</option>{journeyStepCatalog.filter(item => !(payload.journey_steps || []).some(step => step.key === item.key)).map(item => <option value={item.key} key={item.key}>{item.label}</option>)}</select><Button type='button' variant='secondary' disabled={!journeyToAdd} onClick={addJourneyStep}><Plus aria-hidden='true' /> Add step</Button></div>
        </fieldset>
        <fieldset className='is-supporting' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
          <legend>Companies and synthetic contacts</legend>
          {['oem', 'supplier'].map(side => <div className='salesDemoCompanyEditor' key={side}><h3>{side.toUpperCase()} experience</h3><label><span>Company name</span><input value={payload.companies?.[side]?.name || ''} onChange={event => updateCompany(side, 'name', event.target.value)} /></label><label><span>First name</span><input value={payload.companies?.[side]?.contact?.first_name || ''} onChange={event => updateContact(side, 'first_name', event.target.value)} /></label><label><span>Last name</span><input value={payload.companies?.[side]?.contact?.last_name || ''} onChange={event => updateContact(side, 'last_name', event.target.value)} /></label><label><span>Title</span><input value={payload.companies?.[side]?.contact?.title || ''} onChange={event => updateContact(side, 'title', event.target.value)} /></label></div>)}
        </fieldset>
        <fieldset className='is-supporting' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
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
            <details className='salesDemoAdvanced salesDemoTemplateForm__wide'><summary>Advanced identifier</summary><label><span>Supplier code prefix</span><input value={payload.relationship?.supplier_code_prefix || ''} maxLength={20} onChange={event => setPayload(current => ({ ...current, relationship: { ...current.relationship, supplier_code_prefix: event.target.value } }))} /></label></details>
          </div>
        </fieldset>
        <fieldset className='is-supporting' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
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
        <fieldset className='is-supporting' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
          <legend>Machines</legend>
          <div className='salesDemoCapabilityEditor'>{(payload.machines || []).map((machine, index) => <details open={index === 0} key={`${machine.shop_identifier}-${index}`}><summary><strong>{machine.shop_identifier || `Machine ${index + 1}`}</strong><span>{machine.manufacturer} {machine.model}</span></summary><article><header><span /><button type='button' onClick={() => removeMachine(index)} disabled={payload.machines.length <= 1} aria-label={`Remove machine ${machine.shop_identifier || index + 1}`}><Trash2 aria-hidden='true' /> Remove</button></header><div><label><span>Shop identifier</span><input value={machine.shop_identifier || ''} onChange={event => updateMachine(index, 'shop_identifier', event.target.value)} /></label><label><span>Manufacturer</span><input value={machine.manufacturer || ''} onChange={event => updateMachine(index, 'manufacturer', event.target.value)} /></label><label><span>Model</span><input value={machine.model || ''} onChange={event => updateMachine(index, 'model', event.target.value)} /></label><label><span>Axes</span><input type='number' min='1' max='20' value={machine.axes || ''} onChange={event => updateMachine(index, 'axes', Number(event.target.value))} /></label><label><span>Work envelope</span><input value={machine.work_envelope || ''} onChange={event => updateMachine(index, 'work_envelope', event.target.value)} /></label><details className='salesDemoAdvanced'><summary>Advanced identifier</summary><label><span>Machine type key</span><input value={machine.machine_type_key || ''} onChange={event => updateMachine(index, 'machine_type_key', event.target.value)} /></label></details></div></article></details>)}</div>
          <Button type='button' variant='secondary' onClick={addMachine}><Plus aria-hidden='true' /> Add machine</Button>
        </fieldset>
        <fieldset className='is-supporting' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
          <legend>Certifications</legend>
          <div className='salesDemoCapabilityEditor'>{(payload.certifications || []).map((certification, index) => <details open={index === 0} key={`${certification.reference_number}-${index}`}><summary><strong>{certification.name || `Certification ${index + 1}`}</strong><span>{certification.reference_number}</span></summary><article><header><span /><button type='button' onClick={() => removeCertification(index)} aria-label={`Remove certification ${certification.name || index + 1}`}><Trash2 aria-hidden='true' /> Remove</button></header><div><label><span>Display name</span><input value={certification.name || ''} onChange={event => updateCertification(index, 'name', event.target.value)} /></label><label><span>Reference number</span><input value={certification.reference_number || ''} onChange={event => updateCertification(index, 'reference_number', event.target.value)} /></label><details className='salesDemoAdvanced'><summary>Advanced identifier</summary><label><span>Type key</span><input value={certification.type_key || ''} onChange={event => updateCertification(index, 'type_key', event.target.value)} /></label></details></div></article></details>)}</div>
          <Button type='button' variant='secondary' onClick={addCertification}><Plus aria-hidden='true' /> Add certification</Button>
        </fieldset>
        <fieldset className='is-story' disabled={!draftVersion || working || Boolean(payload.source_snapshot)}>
          <legend>Production portfolio</legend>
          <div className='salesDemoProductionEditor'>{payload.production_records.map((record, index) => <article key={record.key}>
            <header><strong>{record.partNumber || `Record ${index + 1}`}</strong><div className='salesDemoProductionEditor__actions'><StatusBadge>{formatLabel(record.stage)}</StatusBadge><button type='button' onClick={() => moveRecord(index, -1)} disabled={index === 0} aria-label={`Move ${record.partNumber} up`}><ArrowUp aria-hidden='true' /></button><button type='button' onClick={() => moveRecord(index, 1)} disabled={index === payload.production_records.length - 1} aria-label={`Move ${record.partNumber} down`}><ArrowDown aria-hidden='true' /></button><button type='button' onClick={() => duplicateRecord(index)} aria-label={`Duplicate ${record.partNumber}`}><CopyPlus aria-hidden='true' /></button><button type='button' onClick={() => removeRecord(index)} disabled={payload.production_records.length <= 1} aria-label={`Remove ${record.partNumber}`}><Trash2 aria-hidden='true' /></button></div></header>
            <div>
              <label className='salesDemoApprovedPart'><span>Approved model and drawing</span><select value={partPresets.find(preset => preset.part_number === record.partNumber)?.key || ''} onChange={event => setPayload(current => selectApprovedPart(current, index, partPresets.find(preset => preset.key === event.target.value)))}><option value='' disabled>Choose an approved Velakron part</option>{partPresets.map(preset => <option key={preset.key} value={preset.key}>{preset.part_number} · {preset.name.replace(' [Synthetic]', '')}</option>)}</select></label>
              <label className='salesDemoApprovedPart'><span>Part name</span><input value={record.partName || ''} readOnly /></label>
              <label><span>Drawing revision</span><input value={record.revision || ''} readOnly /></label>
              <label><span>Stage</span><select value={record.stage} onChange={event => updateRecord(index, 'stage', event.target.value)}><option value='assigned'>Assigned</option><option value='accepted'>Accepted</option><option value='material_ordered'>Material ordered</option><option value='material_received'>Material received</option><option value='programming'>Programming</option><option value='in_production'>In production</option><option value='inspection'>Inspection</option>{payload.source_snapshot && <><option value='heat_treatment'>Heat treatment</option><option value='first_article_inspection'>First article inspection</option></>}<option value='ready_to_ship'>Ready to ship</option><option value='shipped'>Shipped</option><option value='delivered'>Delivered</option><option value='quality_review'>Quality review</option><option value='approved'>Approved</option></select></label>
              <label><span>Supplier acceptance</span><select value={record.acceptance || 'accepted'} onChange={event => updateRecord(index, 'acceptance', event.target.value)}><option value='pending'>Pending</option><option value='accepted'>Accepted</option></select></label>
              <label><span>Lifecycle</span><select value={record.lifecycle || 'active'} onChange={event => updateRecord(index, 'lifecycle', event.target.value)}><option value='active'>Active</option><option value='completed'>Completed</option>{payload.source_snapshot && <option value='archived'>Archived</option>}</select></label>
              <label><span>Schedule state</span><select value={record.health || 'on_schedule'} onChange={event => updateRecord(index, 'health', event.target.value)}><option value='on_schedule'>On schedule</option><option value='needs_attention'>Needs attention</option><option value='at_risk'>At risk</option><option value='delayed'>Delayed</option></select></label>
              <label><span>Quantity</span><input type='number' min='1' value={record.quantity} onChange={event => updateRecord(index, 'quantity', Number(event.target.value))} /></label>
              <label><span>Required arrival (days from start)</span><input type='number' min='-365' max='730' value={record.requiredOffset ?? ''} onChange={event => updateRecord(index, 'requiredOffset', event.target.value === '' ? null : Number(event.target.value))} /></label>
              <label><span>Expected ship (days from start)</span><input type='number' min='-365' max='730' value={record.expectedOffset ?? ''} onChange={event => updateRecord(index, 'expectedOffset', event.target.value === '' ? null : Number(event.target.value))} /></label>
              <label className='salesDemoTemplateForm__wide'><span>Starting update</span><textarea rows={2} maxLength={1000} value={record.note || ''} onChange={event => updateRecord(index, 'note', event.target.value)} /></label>
              <details className='salesDemoAdvanced salesDemoTemplateForm__wide'><summary>Advanced identifiers</summary><div><label><span>Scenario key</span><input value={record.key || ''} onChange={event => updateRecord(index, 'key', event.target.value)} /></label><label><span>Reference suffix</span><input value={record.reference || ''} onChange={event => updateRecord(index, 'reference', event.target.value)} /></label></div></details>
            </div>
            <section className='salesDemoAttentionEditor'>
              <label><input type='checkbox' checked={Boolean(record.attention)} onChange={event => updateRecord(index, 'attention', event.target.checked ? { category: 'issue', code: 'DEMO_ATTENTION', severity: 'medium', health: 'needs_attention', explanation: 'Synthetic attention scenario for the presentation.' } : null)} /> Include attention flag</label>
              {record.attention && <div><label><span>Category</span><select value={record.attention.category || 'issue'} onChange={event => updateRecordAttention(index, 'category', event.target.value)}><option value='non_conformance'>Non-conformance</option><option value='production_block'>Production block</option><option value='issue'>Issue</option><option value='information_flag'>Information</option></select></label><label><span>Severity</span><select value={record.attention.severity || 'medium'} onChange={event => updateRecordAttention(index, 'severity', event.target.value)}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select></label><label><span>Resulting health</span><select value={record.attention.health || 'needs_attention'} onChange={event => updateRecordAttention(index, 'health', event.target.value)}><option value='on_schedule'>On schedule</option><option value='needs_attention'>Needs attention</option><option value='at_risk'>At risk</option><option value='delayed'>Delayed</option></select></label><label className='salesDemoTemplateForm__wide'><span>Explanation</span><textarea rows={2} maxLength={1000} value={record.attention.explanation || ''} onChange={event => updateRecordAttention(index, 'explanation', event.target.value)} /></label><details className='salesDemoAdvanced salesDemoTemplateForm__wide'><summary>Advanced identifier</summary><label><span>Attention code</span><input value={record.attention.code || ''} onChange={event => updateRecordAttention(index, 'code', event.target.value)} /></label></details></div>}
            </section>
          </article>)}</div>
        </fieldset>
        <fieldset className='is-review salesDemoReadiness' disabled={!draftVersion || working}>
          <legend>Demo readiness</legend>
          <header className={validation?.ready ? 'is-ready' : 'needs-work'}>{validation?.ready ? <CheckCircle2 aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}<div><strong>{validation?.ready ? 'Ready to present' : 'Needs attention before publishing'}</strong><span>{validation?.ready ? 'Every selected sales moment has the required synthetic data and role coverage.' : 'Resolve the blocking items below, save, and run the readiness check again.'}</span></div></header>
          <div className='salesDemoReadinessChecks salesDemoTemplateForm__wide'>{(validation?.readiness_checks || []).map(check => <button type='button' onClick={() => { const target = ['machines', 'supplier_profile'].includes(check.field) ? 'supporting' : check.field === 'production_records' ? 'story' : check.field === 'part_workspace' ? 'essentials' : 'outline'; setEditorSection(target) }} className={check.status === 'passed' ? 'is-passed' : 'is-blocked'} key={check.key}><span>{check.status === 'passed' ? '✓' : '!'}</span><div><strong>{check.label}</strong><small>{check.message}</small></div><ChevronRight aria-hidden='true' /></button>)}</div>
          {validation?.generated_counts && <div className='salesDemoValidationPreview salesDemoTemplateForm__wide'><strong>This template will generate</strong><span>{validation.generated_counts.production_records} production records · {validation.generated_counts.machines} machines · {validation.generated_counts.certifications} certifications</span><span>OEM dashboard: {validation.expected_dashboards?.oem?.action_required || 0} action required · {validation.expected_dashboards?.oem?.awaiting_acceptance || 0} awaiting acceptance</span><span>Supplier dashboard: {validation.expected_dashboards?.supplier?.active_records || 0} active records · {validation.expected_dashboards?.supplier?.action_required || 0} action required</span></div>}
          <div className='salesDemoAffectedLinks salesDemoTemplateForm__wide'><strong>Shared links using this template</strong>{linkedCampaigns.length ? <ul>{linkedCampaigns.map(item => <li key={idOf(item)}><span>{item.name}</span><StatusBadge tone={item.version_policy === 'pinned' ? 'neutral' : 'info'}>{item.version_policy === 'pinned' ? `Pinned to v${item.pinned_template_version?.version_number || '—'}` : 'Will use this version next'}</StatusBadge></li>)}</ul> : <p>No shared links use this template yet.</p>}</div>
        </fieldset>
        {draftVersion && editorSection === 'review' && <footer>
          <div>{validation?.valid ? <StatusBadge tone='success'>Saved draft valid</StatusBadge> : <StatusBadge tone='warning'>{validation?.errors?.length || 0} validation items</StatusBadge>}{(validation?.errors || []).map(item => <small className='is-error' key={`${item.field}-${item.message}`}>{item.field}: {item.message}</small>)}{(validation?.warnings || []).map(item => <small key={`${item.field}-${item.message}`}>{item.message}</small>)}{validation?.generated_counts && <div className='salesDemoValidationPreview'><strong>Saved draft will generate</strong><span>{validation.generated_counts.production_records} production records · {validation.generated_counts.machines} machines · {validation.generated_counts.certifications} certifications</span><span>OEM dashboard: {validation.expected_dashboards?.oem?.action_required || 0} action required · {validation.expected_dashboards?.oem?.awaiting_acceptance || 0} awaiting acceptance</span><span>Supplier dashboard: {validation.expected_dashboards?.supplier?.active_records || 0} active records · {validation.expected_dashboards?.supplier?.action_required || 0} action required</span></div>}</div>
          <div><Button type='button' variant='secondary' onClick={validateDraft} disabled={working}>Validate saved draft</Button><Button type='submit' disabled={working}>{working ? <LoaderCircle className='spin' aria-hidden='true' /> : <PencilLine aria-hidden='true' />} Save draft</Button></div>
        </footer>}
      </form>
      <nav className='salesDemoBuilderNavigation' aria-label='Template builder navigation'>{sectionIndex > 0 ? <Button variant='secondary' onClick={() => setEditorSection(templateEditorSections[sectionIndex - 1].key)}>← {templateEditorSections[sectionIndex - 1].label}</Button> : <span />}{sectionIndex < templateEditorSections.length - 1 && <Button onClick={() => setEditorSection(templateEditorSections[sectionIndex + 1].key)}>{templateEditorSections[sectionIndex + 1].label} <ChevronRight aria-hidden='true' /></Button>}</nav>
      {draftVersion && editorSection === 'review' && <div className='salesDemoPublishBar'><div className='salesDemoPublishDiff'><strong>Compared with the published version</strong>{changeSummary.length ? <ul>{changeSummary.map(item => <li key={item}>{item}</li>)}</ul> : <p>No content differences yet.</p>}</div><label><span>Publication note</span><input value={publicationNote} minLength={3} maxLength={1000} onChange={event => setPublicationNote(event.target.value)} /></label><Button onClick={publish} disabled={working || saveState === 'saving' || !validation?.ready || publicationNote.trim().length < 3}><CheckCircle2 aria-hidden='true' /> Publish for future demos</Button></div>}
      {draftVersion && editorSection === 'review' && <div className='salesDemoDraftPreview'><div><strong>Review both roles before publishing</strong><p>Open this draft without changing your founder session or creating a CRM lead.</p></div><Button variant='secondary' onClick={() => previewDraft('oem')} disabled={Boolean(previewing)}><Building2 aria-hidden='true' /> Preview OEM draft</Button><Button variant='secondary' onClick={() => previewDraft('supplier')} disabled={Boolean(previewing)}><Factory aria-hidden='true' /> Preview Supplier draft</Button></div>}
      {editorSection === 'review' && versions.length > 1 && <section className='salesDemoVersionHistory'><header><p className='technicalLabel'>Immutable history</p><h3>Published versions</h3><p>Publishing creates a new version for future demos. Active demos never change.</p></header>{versions.filter(version => version.state === 'published').map(version => <article key={idOf(version)}><div><strong>Version {version.version_number}</strong><small>{formatDateTime(version.published_at || version.updated_at)} · {version.publication_note || 'Published template'}</small></div>{!draftVersion && idOf(version) !== idOf(template?.published_version) && <Button type='button' variant='secondary' onClick={() => restoreVersion(idOf(version))} disabled={working}>Restore as new draft</Button>}</article>)}</section>}
    </section>
  </div>
}

const SalesDemoDashboard = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const allowed = useSelector(getHasPermission('sales_demo.read'))
  const summary = useSelector(salesDemoSelectors.getSummary)
  const sessions = useSelector(salesDemoSelectors.getSessions)
  const sessionPagination = useSelector(salesDemoSelectors.getSessionPagination)
  const templates = useSelector(salesDemoSelectors.getTemplates)
  const partPresets = useSelector(salesDemoSelectors.getPartPresets)
  const defaultPartPresetKey = useSelector(salesDemoSelectors.getDefaultPartPresetKey)
  const recipes = useSelector(salesDemoSelectors.getRecipes)
  const scenarioModules = useSelector(salesDemoSelectors.getScenarioModules)
  const campaigns = useSelector(salesDemoSelectors.getCampaigns)
  const loading = useSelector(salesDemoSelectors.getLoading)
  const loadingByResource = useSelector(salesDemoSelectors.getLoadingByResource)
  const error = useSelector(salesDemoSelectors.getError)
  const [previewing, setPreviewing] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [previewLink, setPreviewLink] = useState('')
  const [launcherOpen, setLauncherOpen] = useState(false)
  const [launcherTemplateId, setLauncherTemplateId] = useState('')
  const [campaignTemplateId, setCampaignTemplateId] = useState('')
  const [campaignOpenRequest, setCampaignOpenRequest] = useState(0)
  const [firstRunDismissed, setFirstRunDismissed] = useState(true)
  const launcherStartedAt = useRef(0)
  const trackedWorkspaceOpen = useRef(false)
  const tabBarRef = useRef(null)
  const tab = tabs.some(item => item.key === router.query.tab) ? router.query.tab : 'overview'
  const sessionId = String(router.query.session || '')

  const refresh = useCallback(() => {
    dispatch(loadSalesDemoSummary())
    dispatch(loadSalesDemoSessions({ view: tab === 'history' ? 'history' : 'active', page_size: 100 }))
    dispatch(loadSalesDemoTemplates())
    dispatch(loadSalesDemoCampaigns())
  }, [dispatch, tab])
  const queryHistory = useCallback(params => dispatch(loadSalesDemoSessions(params)), [dispatch])
  useEffect(() => { if (allowed) refresh() }, [allowed, refresh])
  useEffect(() => {
    if (!allowed || trackedWorkspaceOpen.current) return
    trackedWorkspaceOpen.current = true
    dispatch(salesDemoTelemetry('workspace.opened'))
  }, [allowed, dispatch])
  useEffect(() => { setFirstRunDismissed(window.localStorage.getItem('velakron:sales-demo-guide-dismissed') === 'true') }, [])
  useEffect(() => {
    tabBarRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [tab])
  useEffect(() => {
    if (!allowed || !['overview', 'sessions'].includes(tab) || sessionId) return undefined
    let inFlight = false
    const refreshLive = async () => {
      if (document.visibilityState === 'hidden') return
      if (inFlight) return
      inFlight = true
      try {
        await Promise.all([
          dispatch(loadSalesDemoSummary({ background: true })),
          dispatch(loadSalesDemoSessions({ view: 'active', page_size: 100 }, { background: true })),
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
  const openLauncher = template => {
    launcherStartedAt.current = Date.now()
    dispatch(salesDemoTelemetry('launcher.opened'))
    setLauncherTemplateId(idOf(template))
    setLauncherOpen(true)
  }
  const closeLauncher = () => {
    if (launcherOpen && launcherStartedAt.current) dispatch(salesDemoTelemetry('launcher.abandoned', Date.now() - launcherStartedAt.current))
    launcherStartedAt.current = 0
    setLauncherOpen(false)
  }
  const openShare = template => {
    dispatch(salesDemoTelemetry('shared_link.wizard_opened'))
    setCampaignTemplateId(idOf(template))
    setCampaignOpenRequest(value => value + 1)
    setTab('campaigns')
  }

  const launchDemo = async values => {
    const previewWindow = window.open('about:blank', '_blank')
    setPreviewing(values.experience); setFeedback(null); setPreviewLink('')
    const result = await dispatch(salesDemoRequest({ url: '/previews', method: 'post', data: values, requestKey: `sales-demo-preview-${values.experience}` }))
    setPreviewing('')
    if (!result?.ok) { previewWindow?.close(); setFeedback({ type: 'error', message: safeMessage(result) }); return }
    const url = result.payload.data.preview_url
    if (previewWindow) previewWindow.location = url
    else setPreviewLink(url)
    if (launcherStartedAt.current) dispatch(salesDemoTelemetry('launcher.completed', Date.now() - launcherStartedAt.current))
    launcherStartedAt.current = 0
    setLauncherOpen(false)
    setFeedback({ type: 'success', message: previewWindow ? 'Demo opened in a new tab. This workspace remains signed in.' : 'Your browser blocked the new tab. Use the button below to open the demo.' })
    refresh()
  }
  const quickPractice = experience => launchDemo({ experience, purpose: 'practice', template_version_id: idOf(templates.find(item => item.published_version)?.published_version) })
  const handleAlert = alert => alert.code === 'invalid_drafts' ? setTab('templates') : setTab('history')

  if (!allowed) return <PermissionDenied description='Sales Demo controls are available only to Velakron founders.' />
  const liveSessions = sessions.filter(item => item.status === 'active')
  const prospectSessions = liveSessions.filter(item => item.session_type === 'prospect')
  const idleCount = liveSessions.filter(item => item.presence === 'idle').length
  const draftCount = templates.filter(item => item.draft_version).length
  const activeLinks = campaigns.filter(item => item.status === 'active').length

  return <>
    <Seo title='Sales Demo' description='Founder Sales Demo control center.' path='/app/sales-demo' noIndex />
    <AppPageHeader eyebrow='Founder sales workspace' title='Sales Demo' description='Start the right product story, guide live prospects, and prepare reusable demos without touching customer data.' actions={<><Button variant='secondary' onClick={() => setTab('tutorial')}><BookOpen aria-hidden='true' /> Tutorial</Button><Button onClick={() => openLauncher()}><MonitorPlay aria-hidden='true' /> Start a demo</Button><Button variant='secondary' onClick={refresh} disabled={loading}><RefreshCw aria-hidden='true' /> Refresh</Button></>} />
    <nav ref={tabBarRef} className='salesDemoTabs' aria-label='Sales Demo sections'>{tabs.map(item => <button key={item.key} type='button' className={tab === item.key ? 'is-active' : ''} onClick={() => setTab(item.key)}>{item.label}{item.key === 'sessions' && summary?.counts?.active_prospects > 0 && <strong>{summary.counts.active_prospects}</strong>}</button>)}</nav>
    {(feedback?.message || previewLink) && <FormMessage type={feedback?.type}>{feedback?.message}{previewLink && <Button href={previewLink} target='_blank' rel='noreferrer' variant='secondary'>Open demo</Button>}</FormMessage>}
    {error && <ErrorState title='Sales Demo controls could not be loaded' description={error.message} onRetry={refresh} />}
    {loading && !summary && tab !== 'tutorial' ? <section className='appPanel'><AppSkeleton lines={10} /></section> : <>
      {tab === 'overview' && <div className='salesDemoOverview'>
        <section className='salesDemoStartHero'><div><p className='technicalLabel'>What would you like to do?</p><h2>Prepare the right Velakron story</h2><p>Choose the purpose first. Velakron will guide you through the template and guest role.</p><Button onClick={() => openLauncher()}><Sparkles aria-hidden='true' /> Start a demo</Button></div><div className='salesDemoStartChoices'><button type='button' onClick={() => quickPractice('oem')} disabled={Boolean(previewing)}><Building2 aria-hidden='true' /><strong>Practice OEM</strong><span>Use the latest ready template</span></button><button type='button' onClick={() => quickPractice('supplier')} disabled={Boolean(previewing)}><Factory aria-hidden='true' /><strong>Practice Supplier</strong><span>Open automatically in a new tab</span></button><button type='button' onClick={() => setTab('templates')}><PencilLine aria-hidden='true' /><strong>Create a template</strong><span>Tailor a reusable starting point</span></button><button type='button' onClick={() => openShare()}><Share2 aria-hidden='true' /><strong>Create a shared link</strong><span>Send a self-guided demo</span></button></div></section>
        <section className='salesDemoCurrentWork'><button type='button' onClick={() => setTab('sessions')}><UsersRound aria-hidden='true' /><span><small>Prospects live now</small><strong>{summary?.counts?.active_prospects || 0}</strong></span></button><button type='button' onClick={() => setTab('templates')}><PencilLine aria-hidden='true' /><span><small>Drafts to review</small><strong>{draftCount}</strong></span></button><button type='button' onClick={() => setTab('campaigns')}><Share2 aria-hidden='true' /><span><small>Active shared links</small><strong>{activeLinks}</strong></span></button><button type='button' onClick={() => (summary?.operations?.alerts?.[0] ? handleAlert(summary.operations.alerts[0]) : setTab('history'))}><AlertTriangle aria-hidden='true' /><span><small>Operational alerts</small><strong>{summary?.operations?.alerts?.length || 0}</strong></span></button></section>
        {Boolean(summary?.operations?.alerts?.length) && <section className='salesDemoOperationalAlerts' aria-label='Sales Demo operational alerts'>{summary.operations.alerts.map(alert => <button type='button' className={`is-${alert.tone}`} key={alert.code} onClick={() => handleAlert(alert)}><AlertTriangle aria-hidden='true' /><div><strong>{formatLabel(alert.code)}</strong><span>{alert.message}</span></div><ChevronRight aria-hidden='true' /></button>)}</section>}
        {!firstRunDismissed && <section className='appPanel salesDemoFirstRun'><header><div><p className='technicalLabel'>Five-minute orientation</p><h2>Become demo-ready</h2></div><button type='button' onClick={() => { window.localStorage.setItem('velakron:sales-demo-guide-dismissed', 'true'); setFirstRunDismissed(true) }}>Dismiss</button></header><ol><li><button type='button' onClick={() => quickPractice('oem')}>Practice an OEM demo</button></li><li><button type='button' onClick={() => quickPractice('supplier')}>Practice a Supplier demo</button></li><li><button type='button' onClick={() => setTab('templates')}>Duplicate a recommended template</button></li><li><button type='button' onClick={() => setTab('templates')}>Preview both guest roles</button></li><li><button type='button' onClick={() => openShare()}>Create a shared link</button></li></ol></section>}
        <div className='salesDemoOverview__grid'><section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Needs attention now</p><h2>Live prospects</h2></div><Button variant='secondary' onClick={() => setTab('sessions')}>Open live demos</Button></header>{prospectSessions.length ? <div className='salesDemoSessionList'>{prospectSessions.slice(0, 4).map(item => <SessionCard session={item} onOpen={openSession} key={idOf(item)} />)}</div> : <EmptyState compact title='No prospects are live' description='Presenter-led demos and shared-link visitors will appear here.' action={<Button onClick={() => openLauncher()}>Start a demo</Button>} />}</section><section className='appPanel salesDemoRecentTemplates'><header className='appPanel__header'><div><p className='technicalLabel'>Reusable stories</p><h2>Recent templates</h2></div><Button variant='secondary' onClick={() => setTab('templates')}>View library</Button></header><div>{templates.slice(0, 4).map(template => <article key={idOf(template)}><div><strong>{template.name}</strong><span>{template.draft_version ? 'Draft needs review' : `Ready · v${template.published_version?.version_number || '—'}`}</span></div><Button variant='secondary' onClick={() => openLauncher(template)}>Start</Button></article>)}</div></section></div>
        <section className='metricGrid metricGrid--priority salesDemoInsights'><MetricCard label='Started today' value={summary?.counts?.started_today || 0} detail={`${summary?.counts?.started_last_7_days || 0} in the last 7 days`} icon={Activity} /><MetricCard label='Practice demos' value={summary?.counts?.active_practice || 0} detail='Private rehearsals open now' icon={MonitorPlay} /><MetricCard label='Presenter-led' value={summary?.counts?.active_presenter_led || 0} detail='Controlled demos open now' icon={Sparkles} /><MetricCard label='Idle demos' value={idleCount} detail='Open, but no recent activity' icon={Clock3} tone={idleCount ? 'warning' : 'default'} /></section>
        <section id='sales-demo-guide' className='appPanel salesDemoPresenterGuide'><p className='technicalLabel'>Presenter guide</p><h2>Keep the conversation focused</h2><div><article><strong>1. Start with the prospect's pain</strong><p>Choose a template that matches the operational problem, not the longest product tour.</p></article><article><strong>2. Follow the outline</strong><p>Use the next recommended moment, then pause for questions before introducing an event.</p></article><article><strong>3. End with evidence</strong><p>Review the activity history and CRM context so the follow-up reflects what the prospect explored.</p></article></div></section>
      </div>}
      {tab === 'sessions' && (sessionId ? <SessionDetail sessionId={sessionId} onClose={closeSession} /> : <SalesDemoSessionExplorer sessions={sessions} templates={templates} campaigns={campaigns} loading={loadingByResource.sessions} onOpen={openSession} onStart={() => openLauncher()} onShare={() => openShare()} />)}
      {tab === 'templates' && <section className='appPanel salesDemoTemplates'><TemplateEditor campaigns={campaigns} defaultPartPresetKey={defaultPartPresetKey} partPresets={partPresets} templates={templates} recipes={recipes} scenarioModules={scenarioModules} onRefresh={refresh} onLaunch={openLauncher} onShare={openShare} /></section>}
      {tab === 'campaigns' && <SalesDemoCampaignsPanel campaigns={campaigns} templates={templates} initialTemplateId={campaignTemplateId} openRequest={campaignOpenRequest} onRefresh={refresh} onActivity={() => setTab('history')} />}
      {tab === 'history' && (sessionId ? <SessionDetail sessionId={sessionId} onClose={closeSession} /> : <SalesDemoSessionExplorer history sessions={sessions} pagination={sessionPagination} onQuery={queryHistory} templates={templates} campaigns={campaigns} loading={loadingByResource.sessions} onOpen={openSession} onStart={() => openLauncher()} onShare={() => openShare()} />)}
      {tab === 'tutorial' && <SalesDemoTutorial onNavigate={setTab} onStart={() => openLauncher()} />}
    </>}
    <SalesDemoLauncher open={launcherOpen} templates={templates} initialTemplateId={launcherTemplateId} working={Boolean(previewing)} onClose={closeLauncher} onLaunch={launchDemo} onShare={template => { launcherStartedAt.current = 0; setLauncherOpen(false); openShare(template) }} />
  </>
}

SalesDemoDashboard.getLayout = WidePortalPageLayout
export default SalesDemoDashboard
