import { AlertTriangle, Archive, ArrowLeft, CalendarCheck, Check, Cog, Edit3, LoaderCircle, PackageCheck, RefreshCw, RotateCcw, Send, Truck, UserRoundCheck, X } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ATTENTION_CATEGORIES, ErrorState, PermissionDenied, ProductionAttentionPanel, ProductionCollaborationPanel, ProductionStageStepper, ResponsiveDrawer, ScheduleHealthBadge, StatusBadge } from '../../../components/app'
import { formatDate, formatLabel, statusTone } from '../../../components/app/formatters'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import FormField from '../../../components/auth/FormField'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import { getAuthUser } from '../../../store/slices/auth'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { loadMachines, machineSelectors } from '../../../store/slices/entities/machines'
import { loadRelationships, relationshipSelectors } from '../../../store/slices/entities/relationships'
import {
  acceptProductionRecord,
  archiveProductionRecord,
  approveProductionQuality,
  assignProductionMachine,
  assignProductionRecord,
  cancelProductionRecord,
  confirmProductionDelivery,
  declineProductionRecord,
  editProductionRecord,
  loadProductionRecord,
  productionRecordSelectors,
  reopenProductionRecord,
  reportProductionQualityIssue,
  transitionProductionRecord,
} from '../../../store/slices/entities/productionRecords'
import { productionUnits } from '../../../components/app/ProductionRecordForm'
import {
  acknowledgeProductionAttention,
  archiveProductionAttachment,
  archiveProductionNote,
  createProductionNote,
  loadProductionCollaboration,
  loadProductionSummary,
  productionCollaborationSelectors,
  reportProductionAttention,
  requestAttachmentDownload,
  resolveProductionAttention,
  reviseProductionNote,
  updateProductionForecast,
  uploadProductionAttachment,
} from '../../../store/slices/entities/productionCollaboration'
import { trackProductEvent } from '../../../store/slices/entities/platformAdministration'

const inputDate = value => value ? String(value).slice(0, 10) : ''
const requestKey = prefix => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`
const relatedSupplier = relationship => relationship.supplier_organization
const updateAge = value => {
  if (!value) return 'No supplier update yet'
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000))
  if (hours < 1) return 'Less than an hour ago'
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}
const qualityStatusLabel = value => ({
  not_ready: 'Not ready',
  pending: 'Awaiting OEM inspection',
  issue_open: 'Quality issue open',
  approved: 'OEM approved',
  legacy_completed: 'Completed before QA workflow',
}[value] || formatLabel(value || 'not_ready'))

const FormActions = ({ pending, submitLabel, icon: Icon = Send }) => <Button type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Saving…</> : <><Icon aria-hidden='true' /> {submitLabel}</>}</Button>

const AcceptanceForm = ({ record, machines, pending, feedback, onSubmit, onDecline }) => {
  const [form, setForm] = useState({ expected_ship_date: '', machine_id: '', note: '' })
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ ...form, version: record.version, idempotency_key: requestKey('accept') }) }}>
    <p>Acceptance acknowledges the assignment and provides your current shipping forecast. It is not price or commercial PO acceptance.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FormField id='accept-ship-date' label='Expected ship date' type='date' value={form.expected_ship_date} onInput={event => setForm(current => ({ ...current, expected_ship_date: event.target.value }))} onBlur={event => setForm(current => ({ ...current, expected_ship_date: event.target.value }))} required />
    <label className='selectField' htmlFor='accept-machine'><span>Primary machine</span><select id='accept-machine' value={form.machine_id} onChange={event => setForm(current => ({ ...current, machine_id: event.target.value }))}><option value=''>Assign later</option>{machines.map(machine => <option key={machine.id} value={machine.id}>{machine.shop_identifier} — {machine.manufacturer} {machine.model}</option>)}</select><small>A machine is required before work can move to In production.</small></label>
    {!machines.length && <Button href={`/app/machines?next=${encodeURIComponent(`/app/production/${record.id}`)}`} variant='secondary'><Cog aria-hidden='true' /> Add a machine first</Button>}
    <label className='textAreaField' htmlFor='accept-note'><span>Optional shared note</span><textarea id='accept-note' value={form.note} onChange={event => setForm(current => ({ ...current, note: event.target.value }))} maxLength={2000} /></label>
    <FormActions pending={pending} submitLabel='Accept assignment' icon={Check} />
    <Button variant='secondary' onClick={onDecline} disabled={pending} className='drawerDanger'><X aria-hidden='true' /> Decline assignment</Button>
  </form>
}

const ReasonForm = ({ pending, feedback, description, submitLabel, onSubmit, danger = false }) => {
  const [reason, setReason] = useState('')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit(reason) }}>
    <p>{description}</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='textAreaField' htmlFor='production-action-reason'><span>Reason</span><textarea id='production-action-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={1000} required /></label>
    <Button className={danger ? 'vk-button--danger' : ''} type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Saving…</> : submitLabel}</Button>
  </form>
}

const AssignmentForm = ({ record, relationships, pending, feedback, onSubmit }) => {
  const [supplierId, setSupplierId] = useState('')
  const [reason, setReason] = useState('')
  const reassigning = Boolean(record.supplier_organization)
  const active = relationships.filter(item => item.status === 'active' && relatedSupplier(item)?.id)
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ supplier_organization_id: supplierId, reason, version: record.version }) }}>
    <p>{reassigning ? 'The former supplier immediately loses access. Its prior contributions remain in OEM history.' : 'Assignment sends this record to the supplier’s action-required queue.'}</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='assignment-supplier'><span>Connected supplier</span><select id='assignment-supplier' value={supplierId} onChange={event => setSupplierId(event.target.value)} required><option value=''>Select supplier</option>{active.map(relationship => { const supplier = relatedSupplier(relationship); return <option key={supplier.id} value={supplier.id}>{supplier.name}</option> })}</select><small>All active members of the connected supplier can collaborate under the Platform Confidentiality Terms.</small></label>
    {reassigning && <label className='textAreaField' htmlFor='reassignment-reason'><span>Reason for reassignment</span><textarea id='reassignment-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={1000} required /></label>}
    <FormActions pending={pending} submitLabel={reassigning ? 'Reassign supplier' : 'Assign supplier'} icon={UserRoundCheck} />
  </form>
}

const MachineForm = ({ record, machines, pending, feedback, onSubmit }) => {
  const [machineId, setMachineId] = useState(record.current_machine?.id || '')
  const [reason, setReason] = useState('')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ machine_id: machineId || null, reason, version: record.version }) }}>
    <p>One primary machine is shown on the live record. Previous machine assignments remain in history.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='record-machine'><span>Primary machine</span><select id='record-machine' value={machineId} onChange={event => setMachineId(event.target.value)}><option value=''>No machine assigned</option>{machines.map(machine => <option value={machine.id} key={machine.id}>{machine.shop_identifier} — {machine.manufacturer} {machine.model}</option>)}</select></label>
    <FormField id='machine-change-reason' label='Optional note' value={reason} onChange={event => setReason(event.target.value)} />
    <FormActions pending={pending} submitLabel='Save machine' icon={Cog} />
  </form>
}

const validStageTargets = (workflow, currentStage) => {
  const stages = workflow?.stages || []
  const current = stages.findIndex(item => item.key === currentStage)
  return stages.filter((stage, index) => {
    if (stage.owner !== 'supplier' || stage.key === currentStage || stage.key === 'accepted') return false
    if (index < current) return index > 1
    return stages.slice(current + 1, index).every(item => item.skippable)
  })
}

const StageForm = ({ record, workflow, pending, feedback, onSubmit }) => {
  const targets = validStageTargets(workflow, record.current_stage)
  const [stage, setStage] = useState(targets[0]?.key || '')
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [shipmentDate, setShipmentDate] = useState('')
  const currentIndex = workflow?.stages?.findIndex(item => item.key === record.current_stage) ?? -1
  const targetIndex = workflow?.stages?.findIndex(item => item.key === stage) ?? -1
  const reasonNeeded = targetIndex < currentIndex || targetIndex > currentIndex + 1
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ stage, reason, note, shipment_date: stage === 'shipped' ? shipmentDate : undefined, version: record.version, idempotency_key: requestKey('stage') }) }}>
    <p>Optional stages may be skipped with an explanation. Moving backward also requires a reason.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='next-stage'><span>New production stage</span><select id='next-stage' value={stage} onChange={event => setStage(event.target.value)} required>{targets.map(item => <option key={item.key} value={item.key}>{item.label}{item.skippable ? ' (optional)' : ''}</option>)}</select></label>
    {stage === 'shipped' && <FormField id='shipment-date' label='Shipment date' type='date' value={shipmentDate} onInput={event => setShipmentDate(event.target.value)} onBlur={event => setShipmentDate(event.target.value)} required />}
    <label className='textAreaField' htmlFor='stage-reason'><span>{reasonNeeded ? 'Required explanation' : 'Optional reason'}</span><textarea id='stage-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={reasonNeeded ? 8 : undefined} maxLength={1000} required={reasonNeeded} /></label>
    <label className='textAreaField' htmlFor='stage-note'><span>Optional shared note</span><textarea id='stage-note' value={note} onChange={event => setNote(event.target.value)} maxLength={2000} /></label>
    <FormActions pending={pending} submitLabel='Update production stage' icon={RefreshCw} />
  </form>
}

const EditForm = ({ record, pending, feedback, onSubmit }) => {
  const [form, setForm] = useState({
    part_number: record.part_number || '', part_name: record.part_name || '', drawing_revision: record.drawing_revision || '',
    po_number: record.po_number || '', po_line_number: record.po_line_number || '', quantity: record.quantity ?? '', unit: record.unit || 'each', unit_other: record.unit_other || '',
    required_delivery_date: inputDate(record.required_delivery_date), transit_days: record.transit_days ?? '', first_article_required: Boolean(record.first_article_required),
    first_article_note: record.first_article_note || '', process_summary: record.process_summary || '', external_erp_reference: record.external_erp_reference || '', oem_internal_note: record.oem_internal_note || '',
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ ...form, quantity: Number(form.quantity), transit_days: form.transit_days === '' ? null : Number(form.transit_days), version: record.version }) }}>
    <p>Changing the part number, drawing revision, quantity, unit, or required arrival date after acceptance requires supplier acceptance again.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FormField id='edit-part-number' label='Part number' value={form.part_number} onChange={event => set('part_number', event.target.value)} required />
    <FormField id='edit-part-name' label='Part name' value={form.part_name} onChange={event => set('part_name', event.target.value)} required />
    <FormField id='edit-revision' label='Drawing revision' value={form.drawing_revision} onChange={event => set('drawing_revision', event.target.value)} />
    <div className='productionFormGrid'><FormField id='edit-po' label='PO number' value={form.po_number} onChange={event => set('po_number', event.target.value)} required /><FormField id='edit-line' label='PO line' value={form.po_line_number} onChange={event => set('po_line_number', event.target.value)} /></div>
    <div className='productionFormGrid'><FormField id='edit-quantity' label='Quantity' type='number' min='0.000001' step='any' value={form.quantity} onChange={event => set('quantity', event.target.value)} required /><label className='selectField' htmlFor='edit-unit'><span>Unit</span><select id='edit-unit' value={form.unit} onChange={event => set('unit', event.target.value)}>{productionUnits.map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
    {form.unit === 'other' && <FormField id='edit-unit-other' label='Describe the unit' value={form.unit_other} onChange={event => set('unit_other', event.target.value)} required />}
    <div className='productionFormGrid'><FormField id='edit-required-date' label='Required arrival' type='date' value={form.required_delivery_date} onInput={event => set('required_delivery_date', event.target.value)} onBlur={event => set('required_delivery_date', event.target.value)} required /><FormField id='edit-transit' label='Transit days' type='number' min='0' max='365' step='1' value={form.transit_days} onChange={event => set('transit_days', event.target.value)} /></div>
    <label className='productionCheck'><input type='checkbox' checked={form.first_article_required} onChange={event => set('first_article_required', event.target.checked)} /><span><strong>First article required</strong></span></label>
    <label className='textAreaField' htmlFor='edit-first-article'><span>First article instructions</span><textarea id='edit-first-article' value={form.first_article_note} onChange={event => set('first_article_note', event.target.value)} /></label>
    <label className='textAreaField' htmlFor='edit-internal-note'><span>OEM-internal note</span><textarea id='edit-internal-note' value={form.oem_internal_note} onChange={event => set('oem_internal_note', event.target.value)} /></label>
    <FormActions pending={pending} submitLabel='Save production details' icon={Edit3} />
  </form>
}

const DeliveryForm = ({ record, pending, feedback, onSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ delivered_date: date, note, version: record.version, idempotency_key: requestKey('delivery') }) }}>
    <p>Confirm this only after the OEM has received the shipment. The record will stay active until receiving inspection is complete and the OEM approves the parts.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FormField id='delivery-date' label='Delivery date' type='date' value={date} onInput={event => setDate(event.target.value)} onBlur={event => setDate(event.target.value)} required />
    <label className='textAreaField' htmlFor='delivery-note'><span>Optional receiving note</span><textarea id='delivery-note' value={note} onChange={event => setNote(event.target.value)} maxLength={2000} /></label>
    <FormActions pending={pending} submitLabel='Confirm delivery' icon={PackageCheck} />
  </form>
}

const QualityIssueForm = ({ record, pending, feedback, onSubmit }) => {
  const [explanation, setExplanation] = useState('')
  const [severity, setSeverity] = useState('high')
  const [requestedAction, setRequestedAction] = useState('supplier_response')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ explanation, severity, requested_action: requestedAction, version: record.version, idempotency_key: requestKey('quality-issue') }) }}>
    <p>This opens a shared quality issue, returns the record to both companies’ active work, and places it in the supplier’s attention queue.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='textAreaField' htmlFor='quality-issue-explanation'><span>What failed inspection?</span><textarea id='quality-issue-explanation' value={explanation} onChange={event => setExplanation(event.target.value)} minLength={8} maxLength={1000} placeholder='Describe the nonconformance, affected quantity, and inspection evidence.' required /></label>
    <label className='selectField' htmlFor='quality-requested-action'><span>Requested supplier action</span><select id='quality-requested-action' value={requestedAction} onChange={event => setRequestedAction(event.target.value)}><option value='supplier_response'>Review and respond</option><option value='replacement_or_rework'>Replacement or rework</option><option value='return_or_disposition'>Return or disposition instructions</option><option value='corrective_action'>Corrective action for future parts</option></select></label>
    <label className='selectField' htmlFor='quality-issue-severity'><span>Priority</span><select id='quality-issue-severity' value={severity} onChange={event => setSeverity(event.target.value)}><option value='high'>High</option><option value='medium'>Medium</option><option value='low'>Low</option></select></label>
    <p className='complianceHint'>Use shared notes, photos, and quality documents on this record for the response and supporting evidence.</p>
    <FormActions pending={pending} submitLabel='Open shared quality issue' icon={AlertTriangle} />
  </form>
}

const QualityApprovalForm = ({ record, pending, feedback, onSubmit }) => {
  const [note, setNote] = useState('')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ note, version: record.version, idempotency_key: requestKey('quality-approval') }) }}>
    <p>Approve only after receiving inspection confirms that the delivered parts meet the OEM’s requirements. This is the final step and completes the record.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='textAreaField' htmlFor='quality-approval-note'><span>Optional acceptance note</span><textarea id='quality-approval-note' value={note} onChange={event => setNote(event.target.value)} maxLength={2000} placeholder='Record the inspection result or accepted quality documentation.' /></label>
    <FormActions pending={pending} submitLabel='Approve parts and complete' icon={Check} />
  </form>
}

const AttentionCategoryField = ({ name, value, onChange }) => <fieldset className='attentionCategoryField'>
  <legend>Flag category</legend>
  <div className='attentionCategoryGrid'>
    {ATTENTION_CATEGORIES.map(item => <label key={item.value} className={`attentionCategoryOption ${value === item.value ? 'attentionCategoryOption--selected' : ''}`}>
      <input type='radio' name={name} value={item.value} checked={value === item.value} onChange={() => onChange(item.value)} />
      <span><strong>{item.label}</strong><small>{item.description}</small></span>
      <StatusBadge tone={item.tone}>{item.riskLabel}</StatusBadge>
    </label>)}
  </div>
</fieldset>

const ForecastForm = ({ record, pending, feedback, onSubmit }) => {
  const [form, setForm] = useState({
    expected_ship_date: inputDate(record.expected_ship_date),
    reason: '',
    note: '',
    report_issue: false,
    issue: '',
    attention_category: 'issue',
  })
  const later = form.expected_ship_date && record.expected_ship_date
    && new Date(`${form.expected_ship_date}T00:00:00.000Z`) > new Date(record.expected_ship_date)
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ ...form, version: record.version, idempotency_key: requestKey('forecast') }) }}>
    <p>Update the current shipping forecast separately from the production stage. A later forecast always creates a visible attention reason.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FormField id='forecast-date' label='Expected ship date' type='date' value={form.expected_ship_date} onInput={event => set('expected_ship_date', event.target.value)} onBlur={event => set('expected_ship_date', event.target.value)} required />
    <label className='textAreaField' htmlFor='forecast-reason'><span>{later ? 'Reason for later date' : 'Optional reason'}</span><textarea id='forecast-reason' value={form.reason} onChange={event => set('reason', event.target.value)} minLength={later ? 8 : undefined} maxLength={1000} required={later} /></label>
    <label className='textAreaField' htmlFor='forecast-note'><span>Optional shared note</span><textarea id='forecast-note' value={form.note} onChange={event => set('note', event.target.value)} maxLength={2000} /></label>
    <label className='productionCheck'><input type='checkbox' checked={form.report_issue} onChange={event => set('report_issue', event.target.checked)} /><span><strong>This update includes a flag for the OEM</strong><small>The selected category will control its schedule risk automatically.</small></span></label>
    {form.report_issue && <><AttentionCategoryField name='forecast-attention-category' value={form.attention_category} onChange={value => set('attention_category', value)} /><label className='textAreaField' htmlFor='forecast-issue'><span>What should the OEM know?</span><textarea id='forecast-issue' value={form.issue} onChange={event => set('issue', event.target.value)} minLength={8} maxLength={1000} required /></label></>}
    <FormActions pending={pending} submitLabel='Save supplier update' icon={RefreshCw} />
  </form>
}

const AttentionForm = ({ pending, feedback, organizationType, onSubmit }) => {
  const [explanation, setExplanation] = useState('')
  const [category, setCategory] = useState('issue')
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit({ explanation, category }) }}>
    <p>Send a shared flag directly to the {organizationType === 'supplier' ? 'OEM' : 'supplier'}. The category determines the risk level and schedule impact.</p>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <AttentionCategoryField name='attention-category' value={category} onChange={setCategory} />
    <label className='textAreaField' htmlFor='attention-explanation'><span>What needs attention?</span><textarea id='attention-explanation' value={explanation} onChange={event => setExplanation(event.target.value)} minLength={8} maxLength={1000} required /></label>
    <FormActions pending={pending} submitLabel='Send attention flag' icon={AlertTriangle} />
  </form>
}

const ProductionRecordDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const user = useSelector(getAuthUser)
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('production_record.read'))
  const record = useSelector(state => router.query.id ? productionRecordSelectors.getRecordById(router.query.id)(state) : null)
  const detail = useSelector(state => router.query.id ? productionRecordSelectors.getDetailById(router.query.id)(state) : null)
  const workflow = useSelector(productionRecordSelectors.getWorkflow)
  const loading = useSelector(productionRecordSelectors.getDetailLoading)
  const pending = useSelector(productionRecordSelectors.getMutating)
  const error = useSelector(productionRecordSelectors.getError)
  const machines = useSelector(machineSelectors.getEntities)
  const relationships = useSelector(relationshipSelectors.getEntities)
  const collaboration = useSelector(state => router.query.id ? productionCollaborationSelectors.getRecord(router.query.id)(state) : null)
  const canArchiveNote = useSelector(getHasPermission('note.archive'))
  const canArchiveAttachment = useSelector(getHasPermission('attachment.archive'))
  const canReportAttention = useSelector(getHasPermission('attention.report'))
  const canAcknowledgeAttention = useSelector(getHasPermission('attention.acknowledge'))
  const canResolveAttention = useSelector(getHasPermission('attention.resolve'))
  const [drawer, setDrawer] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [actionTarget, setActionTarget] = useState(null)
  const trackedRecordId = useRef(null)

  useEffect(() => {
    if (allowed && router.isReady) {
      dispatch(loadProductionRecord(router.query.id))
      dispatch(loadProductionCollaboration(router.query.id))
      if (trackedRecordId.current !== router.query.id) {
        trackedRecordId.current = router.query.id
        dispatch(trackProductEvent('production.detail_viewed', 'production_detail'))
      }
    }
  }, [allowed, dispatch, router.isReady, router.query.id])
  useEffect(() => {
    if (!organization?.id) return
    if (organization.type === 'supplier') dispatch(loadMachines({ status: 'active', page_size: 100 }))
    if (organization.type === 'oem') dispatch(loadRelationships(organization.id))
  }, [dispatch, organization?.id, organization?.type])
  useEffect(() => {
    if (!allowed || !router.isReady) return undefined
    const refresh = () => {
      if (document.visibilityState !== 'hidden') {
        dispatch(loadProductionRecord(router.query.id))
        dispatch(loadProductionCollaboration(router.query.id))
      }
    }
    const interval = window.setInterval(refresh, 45_000)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [allowed, dispatch, router.isReady, router.query.id])

  const activeMachines = useMemo(() => machines.filter(machine => machine.status === 'active'), [machines])
  const returnPath = typeof router.query.return_to === 'string' && router.query.return_to.startsWith('/app/production?') ? router.query.return_to : '/app/production'
  if (!allowed) return <PermissionDenied />
  if (loading && !record) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  if (!record) return <ErrorState title='Production record unavailable' description={error?.message && error.message !== 'Production record not found' ? error.message : 'This record is not available in the active company workspace.'} action={<Button href={returnPath} variant='secondary'><ArrowLeft aria-hidden='true' /> Return to production</Button>} />

  const closeDrawer = () => { setDrawer(null); setFeedback(null); setActionTarget(null) }
  const currentStageLabel = workflow?.stages?.find(item => item.key === record.current_stage)?.label || formatLabel(record.current_stage || 'Not assigned')
  const qualityStatus = record.quality_review_status === 'not_ready' && record.current_stage === 'delivered' && record.lifecycle_state === 'completed'
    ? 'legacy_completed'
    : record.quality_review_status
  const run = async (action, successMessage) => {
    setFeedback(null)
    dispatch(trackProductEvent('production.update_started', 'production_update'))
    const result = await action()
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'We could not update this production record.') })
      return false
    }
    setFeedback({ type: 'success', message: successMessage })
    await Promise.all([
      dispatch(loadProductionRecord(record.id)),
      dispatch(loadProductionCollaboration(record.id)),
      dispatch(loadProductionSummary()),
    ])
    dispatch(trackProductEvent('production.update_completed', 'production_update'))
    setDrawer(null)
    return true
  }

  const runInline = async (action, successMessage) => {
    setFeedback(null)
    dispatch(trackProductEvent('production.update_started', 'production_update'))
    const result = await action()
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'We could not save that update.') })
      return false
    }
    setFeedback({ type: 'success', message: successMessage })
    const refreshes = [
      dispatch(loadProductionRecord(record.id)),
      dispatch(loadProductionCollaboration(record.id)),
      dispatch(loadProductionSummary()),
    ]
    await Promise.all(refreshes)
    dispatch(trackProductEvent('production.update_completed', 'production_update'))
    return true
  }

  const actionButtons = <>
    {detail?.actions?.accept && <Button onClick={() => setDrawer('accept')}><Check aria-hidden='true' /> Review assignment</Button>}
    {detail?.actions?.transition && <Button onClick={() => setDrawer('stage')}><RefreshCw aria-hidden='true' /> Update stage</Button>}
    {organization.type === 'supplier' && record.acceptance_status === 'accepted' && record.lifecycle_state === 'active' && <Button variant='secondary' onClick={() => setDrawer('forecast')}><CalendarCheck aria-hidden='true' /> Shipping forecast</Button>}
    {detail?.actions?.confirm_delivery && <Button onClick={() => setDrawer('delivery')}><PackageCheck aria-hidden='true' /> Confirm delivery</Button>}
    {detail?.actions?.approve_quality && <Button onClick={() => setDrawer('quality-approval')}><Check aria-hidden='true' /> Approve parts</Button>}
    {detail?.actions?.report_quality_issue && <Button variant='secondary' onClick={() => setDrawer('quality-issue')}><AlertTriangle aria-hidden='true' /> Report quality issue</Button>}
    {detail?.actions?.edit && <Button variant='secondary' onClick={() => setDrawer('edit')}><Edit3 aria-hidden='true' /> Edit</Button>}
    {detail?.actions?.assign && organization.type === 'oem' && <Button variant='secondary' onClick={() => setDrawer('assign')}><UserRoundCheck aria-hidden='true' /> {record.supplier_organization ? 'Reassign' : 'Assign'}</Button>}
    {detail?.actions?.assign_machine && <Button variant='secondary' onClick={() => setDrawer('machine')}><Cog aria-hidden='true' /> Machine</Button>}
    {canReportAttention && <Button variant='secondary' onClick={() => setDrawer('attention')}><AlertTriangle aria-hidden='true' /> Flag attention</Button>}
  </>

  const projectedLate = record.projected_arrival_date && record.required_delivery_date
    && new Date(record.projected_arrival_date) > new Date(record.required_delivery_date)
  return <>
    <Seo title={`${record.public_reference} production record`} description='Production commitment detail.' path={`/app/production/${record.id}`} noIndex />
    <Button href={returnPath} variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Production</Button>
    <AppPageHeader eyebrow={record.public_reference} title={record.part_number || 'Draft production record'} description={record.part_name || 'Complete the draft before assigning it to a supplier.'} actions={actionButtons} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadProductionRecord(record.id))} />}
    <div className='productionStatusStrip'>
      <div><span>Lifecycle</span><StatusBadge tone={statusTone(record.lifecycle_state)}>{formatLabel(record.lifecycle_state)}</StatusBadge></div>
      <div><span>Stage</span><StatusBadge tone='neutral'>{currentStageLabel}</StatusBadge></div>
      <div><span>Acceptance</span><StatusBadge tone={statusTone(record.acceptance_status)}>{formatLabel(record.acceptance_status)}</StatusBadge></div>
      <div><span>Quality</span><StatusBadge tone={qualityStatus === 'approved' ? 'success' : qualityStatus === 'issue_open' ? 'danger' : 'neutral'}>{qualityStatusLabel(qualityStatus)}</StatusBadge></div>
      <div><span>Schedule</span><ScheduleHealthBadge value={projectedLate ? 'at_risk' : record.schedule_health} /></div>
    </div>
    {record.acceptance_status === 'declined' && <div className='supplierStateNotice supplierStateNotice--changes_requested'><X aria-hidden='true' /><div><strong>Supplier declined this assignment</strong><p>Reassign or cancel the record. The supplier’s reason remains in the timeline.</p></div></div>}
    {record.acceptance_status === 'reacceptance_required' && <div className='supplierStateNotice'><RefreshCw aria-hidden='true' /><div><strong>Supplier acceptance is required again</strong><p>An accepted commitment changed. The previous commitment remains in history.</p></div></div>}
    {record.quality_review_status === 'pending' && <div className='supplierStateNotice'><PackageCheck aria-hidden='true' /><div><strong>Parts received — OEM inspection pending</strong><p>Delivery is confirmed, but this record remains active until the OEM accepts the parts.</p></div></div>}
    {record.quality_review_status === 'issue_open' && <div className='supplierStateNotice supplierStateNotice--changes_requested'><AlertTriangle aria-hidden='true' /><div><strong>Quality review requires action</strong><p>The shared issue, discussion, photos, and documents remain available to both companies until the OEM resolves it.</p></div></div>}
    {projectedLate && <div className='supplierStateNotice supplierStateNotice--changes_requested'><CalendarCheck aria-hidden='true' /><div><strong>The current forecast arrives after the required date</strong><p>The forecast remains visible instead of blocking acceptance so both companies can act on the real schedule.</p></div></div>}
    <ProductionAttentionPanel conditions={collaboration?.attention || []} canAcknowledge={canAcknowledgeAttention} canResolve={item => canResolveAttention && (organization.type !== 'supplier' || item.source === 'supplier')} pending={collaboration?.mutating} onAcknowledge={item => runInline(() => dispatch(acknowledgeProductionAttention(record.id, item.id)), 'Attention reason acknowledged.')} onResolve={item => { setActionTarget(item); setDrawer('resolve-attention') }} />
    <div className='productionDetailGrid'>
      <section className='appPanel productionFacts'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Commitment</p><h2>Production details</h2></div><Truck aria-hidden='true' /></header>
        <dl className='appDetailList'>
          <div><dt>OEM customer</dt><dd>{record.oem_organization?.name}</dd></div>
          <div><dt>Supplier</dt><dd>{record.supplier_organization?.name || 'Not assigned'}</dd></div>
          <div><dt>PO reference</dt><dd>{record.po_number || 'Not provided'}{record.po_line_number ? ` / line ${record.po_line_number}` : ''}</dd></div>
          <div><dt>Drawing revision</dt><dd>{record.drawing_revision || 'Not provided'}</dd></div>
          <div><dt>Quantity</dt><dd>{record.quantity || 'Not provided'} {record.unit === 'other' ? record.unit_other : formatLabel(record.unit)}</dd></div>
          <div><dt>Required arrival</dt><dd>{formatDate(record.required_delivery_date)}</dd></div>
          <div><dt>Expected ship</dt><dd>{formatDate(record.expected_ship_date)}</dd></div>
          <div><dt>Projected arrival</dt><dd>{formatDate(record.projected_arrival_date)}</dd></div>
          <div><dt>Last supplier update</dt><dd>{updateAge(record.last_supplier_update_at)}</dd></div>
          <div><dt>Primary machine</dt><dd>{record.current_machine ? `${record.current_machine.shop_identifier} — ${record.current_machine.manufacturer} ${record.current_machine.model}` : 'Not assigned'}</dd></div>
          <div><dt>First article</dt><dd>{record.first_article_required ? 'Required' : 'Not required'}</dd></div>
        </dl>
      </section>
      <section className='appPanel productionProgress'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Current workflow</p><h2>Production progress</h2></div></header>
        <ProductionStageStepper stages={workflow?.stages || []} currentStage={record.current_stage} lifecycleState={record.lifecycle_state} />
      </section>
      {record.oem_internal_note && <section className='appPanel productionInternalNote'><header className='appPanel__header'><div><p className='technicalLabel'>OEM only</p><h2>Internal note</h2></div></header><p>{record.oem_internal_note}</p></section>}
      <ProductionCollaborationPanel record={record} detail={detail} collaboration={collaboration} organization={organization} userId={user?.id || user?._id} permissions={{ canArchiveNote, canArchiveAttachment }} feedback={feedback} onCreateNote={payload => runInline(() => dispatch(createProductionNote(record.id, payload)), 'Note added.')} onReviseNote={(note, body) => runInline(() => dispatch(reviseProductionNote(record.id, note.id, { body })), 'Note revision saved.')} onArchiveNote={note => { setActionTarget(note); setDrawer('archive-note') }} onUpload={payload => runInline(() => dispatch(uploadProductionAttachment(record.id, payload)), 'File uploaded and verified.')} onDownload={file => dispatch(requestAttachmentDownload(record.id, file.id))} onArchiveAttachment={file => { setActionTarget(file); setDrawer('archive-attachment') }} />
      {organization.type === 'oem' && (detail?.actions?.cancel || detail?.actions?.reopen || detail?.actions?.archive) && <section className='appPanel productionLifecycleActions'><header className='appPanel__header'><div><p className='technicalLabel'>Record controls</p><h2>Lifecycle</h2></div></header><div>{detail.actions.cancel && <Button variant='secondary' onClick={() => setDrawer('cancel')}><X aria-hidden='true' /> Cancel record</Button>}{detail.actions.reopen && <Button variant='secondary' onClick={() => setDrawer('reopen')}><RotateCcw aria-hidden='true' /> Reopen record</Button>}{detail.actions.archive && <Button variant='secondary' onClick={() => setDrawer('archive')}><Archive aria-hidden='true' /> Archive record</Button>}</div></section>}
    </div>
    <ResponsiveDrawer open={Boolean(drawer)} title={{ accept: 'Review assignment', decline: 'Decline assignment', assign: record.supplier_organization ? 'Reassign supplier' : 'Assign supplier', machine: 'Primary machine', stage: 'Update production stage', forecast: 'Update shipping forecast', attention: 'Flag for attention', 'quality-issue': 'Report quality issue', 'quality-approval': 'Approve delivered parts', 'resolve-attention': 'Resolve attention reason', 'archive-note': 'Archive note', 'archive-attachment': 'Remove file', edit: 'Edit production record', delivery: 'Confirm delivery', cancel: 'Cancel production record', reopen: 'Reopen production record', archive: 'Archive production record' }[drawer] || 'Production action'} onClose={closeDrawer}>
      {drawer === 'accept' && <AcceptanceForm record={record} machines={activeMachines} pending={pending} feedback={feedback} onDecline={() => { setFeedback(null); setDrawer('decline') }} onSubmit={payload => run(() => dispatch(acceptProductionRecord(record.id, payload)), 'Assignment accepted.')} />}
      {drawer === 'decline' && <ReasonForm pending={pending} feedback={feedback} danger description='Declining returns the decision to the OEM. A reason is required and remains in history.' submitLabel='Decline assignment' onSubmit={reason => run(() => dispatch(declineProductionRecord(record.id, { reason, version: record.version, idempotency_key: requestKey('decline') })), 'Assignment declined.')} />}
      {drawer === 'assign' && <AssignmentForm record={record} relationships={relationships} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(assignProductionRecord(record.id, payload)), 'Supplier assignment saved.')} />}
      {drawer === 'machine' && <MachineForm record={record} machines={activeMachines} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(assignProductionMachine(record.id, payload)), 'Primary machine saved.')} />}
      {drawer === 'stage' && <StageForm record={record} workflow={workflow} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(transitionProductionRecord(record.id, payload)), 'Production stage updated.')} />}
      {drawer === 'forecast' && <ForecastForm record={record} pending={collaboration?.mutating} feedback={feedback} onSubmit={async payload => {
        const { report_issue: reportIssue, issue, attention_category: attentionCategory, ...forecast } = payload
        const updated = await runInline(() => dispatch(updateProductionForecast(record.id, forecast)), 'Shipping forecast updated.')
        if (!updated) return false
        if (reportIssue) await runInline(() => dispatch(reportProductionAttention(record.id, { explanation: issue, category: attentionCategory })), 'Shipping forecast and attention flag reported.')
        setDrawer(null)
        return true
      }} />}
      {drawer === 'attention' && <AttentionForm organizationType={organization.type} pending={collaboration?.mutating} feedback={feedback} onSubmit={payload => run(() => dispatch(reportProductionAttention(record.id, payload)), 'Attention flag added.')} />}
      {drawer === 'quality-issue' && <QualityIssueForm record={record} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(reportProductionQualityIssue(record.id, payload)), 'Shared quality issue opened for the supplier.')} />}
      {drawer === 'quality-approval' && <QualityApprovalForm record={record} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(approveProductionQuality(record.id, payload)), 'Parts approved and production record completed.')} />}
      {drawer === 'resolve-attention' && <ReasonForm pending={collaboration?.mutating} feedback={feedback} description={`Resolving “${formatLabel(actionTarget?.code)}” keeps the full history and records your reason.`} submitLabel='Resolve attention reason' onSubmit={reason => run(() => dispatch(resolveProductionAttention(record.id, actionTarget.id, reason)), 'Attention reason resolved.')} />}
      {drawer === 'archive-note' && <ReasonForm pending={collaboration?.mutating} feedback={feedback} description='The note will leave the current conversation but remain in immutable history.' submitLabel='Archive note' onSubmit={reason => run(() => dispatch(archiveProductionNote(record.id, actionTarget.id, reason)), 'Note archived.')} />}
      {drawer === 'archive-attachment' && <ReasonForm pending={collaboration?.mutating} feedback={feedback} description='The file will no longer be downloadable, while its audit history remains.' submitLabel='Remove file' onSubmit={reason => run(() => dispatch(archiveProductionAttachment(record.id, actionTarget.id, reason)), 'File removed.')} />}
      {drawer === 'edit' && <EditForm record={record} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(editProductionRecord(record.id, payload)), 'Production details saved.')} />}
      {drawer === 'delivery' && <DeliveryForm record={record} pending={pending} feedback={feedback} onSubmit={payload => run(() => dispatch(confirmProductionDelivery(record.id, payload)), 'Delivery confirmed. OEM receiving inspection is now pending.')} />}
      {drawer === 'cancel' && <ReasonForm pending={pending} feedback={feedback} danger description='Cancellation stops this record. The current supplier will see the cancellation and its reason.' submitLabel='Cancel production record' onSubmit={reason => run(() => dispatch(cancelProductionRecord(record.id, { reason, version: record.version })), 'Production record cancelled.')} />}
      {drawer === 'reopen' && <ReasonForm pending={pending} feedback={feedback} description='Reopening a delivered record returns it to Shipped. Reopening a cancelled assignment creates a fresh supplier acceptance request.' submitLabel='Reopen production record' onSubmit={reason => run(() => dispatch(reopenProductionRecord(record.id, { reason, version: record.version })), 'Production record reopened.')} />}
      {drawer === 'archive' && <ReasonForm pending={pending} feedback={feedback} description='Archiving removes this record from current work views without deleting its history.' submitLabel='Archive production record' onSubmit={reason => run(() => dispatch(archiveProductionRecord(record.id, { reason, version: record.version })), 'Production record archived.')} />}
    </ResponsiveDrawer>
  </>
}

ProductionRecordDetail.getLayout = PortalPageLayout
export default ProductionRecordDetail
