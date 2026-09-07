import { useId, useState } from 'react'
import { Button } from '../design-system'
import { formatLabel } from './formatters'
import { newCommandKey } from '../../store/collaborationV2'

export const FORMAL_CATEGORIES = [
  { value: 'issue', label: 'Issue', description: 'Request a supplier resolution and OEM approval. Production can continue.' },
  { value: 'production_block', label: 'Production Block', description: 'Stop production immediately. Only the OEM can release the block after approving the solution.' },
  { value: 'non_conformance', label: 'Non-Conformance', description: 'Track affected parts, containment, investigation, disposition, and OEM verification. Add a separate Block if production must stop.' },
]
export const formalLabel = category => FORMAL_CATEGORIES.find(item => item.value === category)?.label || formatLabel(category)
export const idOf = value => String(value?.id || value?._id || value || '')

export const TextField = ({ label, value = '', onChange, required = true, minLength = 8, maxLength = 3000, type, ...props }) => {
  const id = useId()
  return <label className={type ? 'selectField' : 'textAreaField'} htmlFor={id}><span>{label}{!required && ' (optional)'}</span>{type
    ? <input id={id} type={type} value={value} onChange={event => onChange(event.target.value)} required={required} minLength={minLength} maxLength={maxLength} {...props} />
    : <textarea id={id} value={value} onChange={event => onChange(event.target.value)} required={required} minLength={minLength} maxLength={maxLength} {...props} />}</label>
}
export const EvidenceSelect = ({ files = [], value = [], onChange }) => {
  const available = files.filter(file => file.state === 'available' && file.visibility === 'shared')
  if (!available.length) return <p className='complianceHint'>Attach shared evidence in this record’s Files section, then select it here.</p>
  return <fieldset className='partCaseLinks'><legend>Supporting evidence (optional)</legend>{available.map(file => <label key={idOf(file)}><input type='checkbox' checked={value.includes(idOf(file))} onChange={event => onChange(event.target.checked ? [...value, idOf(file)] : value.filter(id => id !== idOf(file)))} /><span>{file.display_filename || file.original_filename}</span></label>)}</fieldset>
}
const emptyChange = { original_condition: '', accepted_change: '', reason: '', effectivity: '', attachment_ids: [], visual_anchor_id: null }
const emptyResolution = () => ({ summary: '', reason: '', technical_change: null })
export const ResolutionFields = ({ value, onChange, files, visualAnchor }) => {
  const set = (key, next) => onChange({ ...value, [key]: next })
  return <>
    <TextField label='Proposed resolution' value={value.summary} onChange={next => set('summary', next)} />
    <TextField label='Reason this resolves the issue' value={value.reason} onChange={next => set('reason', next)} />
    <label className='productionCheck'><input type='checkbox' checked={Boolean(value.technical_change)} onChange={event => set('technical_change', event.target.checked ? { ...emptyChange, visual_anchor_id: idOf(visualAnchor) || null } : null)} /><span><strong>Propose a technical change for this production</strong><small>OEM approval records an exception to this exact revision. The released drawing and model stay unchanged.</small></span></label>
    {value.technical_change && <fieldset className='formalV2__fieldset'><legend>Proposed production exception</legend>{[['original_condition', 'Original condition'], ['accepted_change', 'Proposed change'], ['reason', 'Technical justification'], ['effectivity', 'Effectivity: lot, quantity, serial range, or scope']].map(([key, label]) => <TextField key={key} label={label} value={value.technical_change[key]} onChange={next => set('technical_change', { ...value.technical_change, [key]: next })} />)}<EvidenceSelect files={files} value={value.technical_change.attachment_ids} onChange={next => set('technical_change', { ...value.technical_change, attachment_ids: next })} /></fieldset>}
  </>
}
export const FormalCreationForm = ({ record, organizationType, files = [], relatedRecords = [], formalRecords = [], defaultRelatedFormal = '', onSubmit, onCancel, pending, unavailable = false, escalation = false, onDraftChange, version = 0 }) => {
  const [reviewedVersion, setReviewedVersion] = useState(version)
  const [category, setCategory] = useState('issue')
  const [explanation, setExplanation] = useState('')
  const [scope, setScope] = useState({ affected_quantity: '', produced_quantity: '', lot: '', serial_start: '', serial_end: '', shipment_reference: '', quantity_override_reason: '', evidence_ids: [] })
  const [resolution, setResolution] = useState(null)
  const [related, setRelated] = useState([])
  const [formal, setFormal] = useState(defaultRelatedFormal ? [defaultRelatedFormal] : [])
  const [key] = useState(newCommandKey)
  const group = useId()
  const setScopeField = (field, value) => setScope(current => ({ ...current, [field]: value }))
  const exceeds = Number(scope.affected_quantity) > Number(scope.produced_quantity || record?.quantity) || Number(scope.produced_quantity) > Number(record?.quantity)
  return <form className='drawerForm formalV2' onChange={() => onDraftChange?.(true)} onSubmit={async event => {
    event.preventDefault()
    if (unavailable || reviewedVersion !== version) return
    const initial = category === 'non_conformance' ? { affected_scope: { ...scope, affected_quantity: Number(scope.affected_quantity), produced_quantity: scope.produced_quantity ? Number(scope.produced_quantity) : null } } : category === 'issue' && resolution ? { resolution } : {}
    const result = await onSubmit({ category, explanation, initial, related_production_record_ids: related, related_formal_record_ids: formal, idempotency_key: key, version: reviewedVersion })
    if (result?.ok) onDraftChange?.(false)
  }}>
    <p>{escalation ? 'Escalation preserves the complete conversation and makes it read-only. Continue all decisions and evidence in the new formal record.' : `Create a shared formal record for ${record?.public_reference || 'this production'}.`}</p>
    <fieldset className='attentionCategoryField'><legend>Choose the required response</legend><div className='formalV2__categories'>{FORMAL_CATEGORIES.map(item => <label key={item.value} className={`attentionCategoryOption ${category === item.value ? 'attentionCategoryOption--selected' : ''}`}><input type='radio' name={group} checked={category === item.value} onChange={() => setCategory(item.value)} /><span><strong>{item.label}</strong><small>{item.description}</small></span></label>)}</div></fieldset>
    <TextField label='What requires formal action?' value={explanation} onChange={setExplanation} maxLength={1000} />
    {category === 'non_conformance' && <fieldset className='formalV2__fieldset'><legend>Affected scope</legend><p>Production quantity: {record?.quantity ?? 'Unknown'}. Only the quantity identified below is affected by this Non-Conformance.</p><div className='productionFormGrid'><TextField type='number' label='Affected quantity' value={scope.affected_quantity} onChange={value => setScopeField('affected_quantity', value)} min='1' step='1' /><TextField type='number' label='Quantity produced' value={scope.produced_quantity} onChange={value => setScopeField('produced_quantity', value)} min='1' step='1' required={false} />{[['lot', 'Lot'], ['serial_start', 'First serial'], ['serial_end', 'Last serial'], ['shipment_reference', 'Shipment reference']].map(([field, label]) => <TextField key={field} type='text' label={label} value={scope[field]} onChange={value => setScopeField(field, value)} required={false} maxLength={240} />)}</div>{exceeds && <TextField label='Explain quantity beyond this production' value={scope.quantity_override_reason} onChange={value => setScopeField('quantity_override_reason', value)} maxLength={1000} />}<EvidenceSelect files={files} value={scope.evidence_ids} onChange={value => setScopeField('evidence_ids', value)} /></fieldset>}
    {category === 'issue' && organizationType === 'supplier' && <><label className='productionCheck'><input type='checkbox' checked={Boolean(resolution)} onChange={event => setResolution(event.target.checked ? emptyResolution() : null)} /><span><strong>Include a proposed resolution</strong><small>The Issue will go directly to OEM approval.</small></span></label>{resolution && <ResolutionFields value={resolution} onChange={setResolution} files={files} />}</>}
    {!!relatedRecords.length && <fieldset className='partCaseLinks'><legend>Additional affected production records (optional)</legend>{relatedRecords.map(item => <label key={idOf(item)}><input type='checkbox' checked={related.includes(idOf(item))} onChange={event => setRelated(event.target.checked ? [...related, idOf(item)] : related.filter(id => id !== idOf(item)))} /><span>{item.public_reference}</span></label>)}</fieldset>}
    {!!formalRecords.length && <fieldset className='partCaseLinks'><legend>Related formal records (optional)</legend>{formalRecords.map(item => <label key={idOf(item)}><input type='checkbox' checked={formal.includes(idOf(item))} onChange={event => setFormal(event.target.checked ? [...formal, idOf(item)] : formal.filter(id => id !== idOf(item)))} /><span>{formalLabel(item.category)} · {item.explanation}</span></label>)}</fieldset>}
    {unavailable ? <p className='formalV2__notice' role='status'>This action is no longer available. Your draft is preserved below for copying.</p> : reviewedVersion !== version && <div className='formalV2__notice'><p>This record changed. Review the latest context before creating the formal record.</p><Button type='button' variant='secondary' onClick={() => setReviewedVersion(version)}>I reviewed the updated record</Button></div>}
    <footer><Button type='button' variant='secondary' onClick={onCancel}>Cancel</Button><Button type='submit' disabled={pending || unavailable || reviewedVersion !== version}>{pending ? 'Saving…' : `${escalation ? 'Escalate to' : 'Create'} ${formalLabel(category)}`}</Button></footer>
  </form>
}

const initialActionData = (action, item) => {
  const data = item.workflow?.data || {}
  if (action === 'submit_resolution') return data.resolution || emptyResolution()
  if (action === 'submit_investigation') return data.investigation || { owner_membership_id: '', preliminary_cause: '', root_cause: '', method: '', notes: '' }
  if (action === 'submit_disposition') return data.disposition || { type: 'rework', instructions: '', reason: '', verification_plan: '' }
  return { summary: '', attachment_ids: [] }
}
export const FormalActionForm = ({ item, action, participants = [], files = [], pending, unavailable = false, onSubmit, onCancel, onDraftChange }) => {
  const [data, setData] = useState(() => initialActionData(action.key, item))
  const [reviewedVersion, setReviewedVersion] = useState(item.version)
  const [note, setNote] = useState('')
  const set = (field, value) => setData(current => ({ ...current, [field]: value }))
  const labels = { submit_containment: 'Containment and affected-part isolation', complete_corrective_action: 'Corrective action completed', submit_evidence: 'Verification evidence and results', verify_and_close: 'OEM final verification', add_message: 'Message' }
  return <form className='drawerForm formalV2' onChange={() => onDraftChange?.(true)} onSubmit={event => { event.preventDefault(); if (!unavailable && reviewedVersion === item.version) onSubmit({ action: action.key, version: reviewedVersion, data: action.data_kind || action.key === 'add_message' ? data : {}, note }) }}>
    <h3>{action.label}</h3>
    {action.key === 'release_production' && <p>Release this Block only when production may safely resume. Any other active Block will continue to prevent progress.</p>}
    {action.key === 'approve_resolution' && <p>{item.category === 'production_block' ? 'Approve the supplier’s solution. Production remains blocked until you separately release production.' : 'Approve the proposed resolution and permanently close this Issue.'}</p>}
    {action.data_kind === 'resolution' && <ResolutionFields value={data} onChange={setData} files={files} visualAnchor={item.visual_anchor} />}
    {action.data_kind === 'investigation' && <><label className='selectField'><span>Supplier investigation owner</span><select value={data.owner_membership_id} onChange={event => set('owner_membership_id', event.target.value)} required><option value=''>Choose an active supplier member</option>{participants.map(person => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>{[['preliminary_cause', 'Preliminary cause', false], ['root_cause', 'Root cause', true], ['method', 'Investigation method and findings', true], ['notes', 'Investigation notes', false]].map(([field, label, required]) => <TextField key={field} label={label} required={required} value={data[field]} onChange={value => set(field, value)} />)}</>}
    {action.data_kind === 'disposition' && <><label className='selectField'><span>Proposed disposition</span><select value={data.type} onChange={event => set('type', event.target.value)}>{['use_as_is', 'repair', 'rework', 'scrap', 'return'].map(type => <option key={type} value={type}>{formatLabel(type)}</option>)}</select></label><TextField label={`${formatLabel(data.type)} instructions and scope`} value={data.instructions} onChange={value => set('instructions', value)} /><TextField label='Disposition justification' value={data.reason} onChange={value => set('reason', value)} /><TextField label='Verification plan' value={data.verification_plan} onChange={value => set('verification_plan', value)} /></>}
    {(['summary', 'evidence'].includes(action.data_kind) || action.key === 'add_message') && <><TextField label={labels[action.key] || 'Summary'} value={data.summary} minLength={action.key === 'add_message' ? 1 : 8} maxLength={action.key === 'add_message' ? 6000 : 3000} onChange={value => set('summary', value)} /><EvidenceSelect files={files} value={data.attachment_ids} onChange={value => set('attachment_ids', value)} /></>}
    {action.key !== 'add_message' && <TextField label={action.requires_note ? 'Reason for returning to supplier' : 'Comments'} value={note} onChange={setNote} required={Boolean(action.requires_note)} maxLength={1000} />}
    {unavailable ? <p className='formalV2__notice' role='status'>The workflow has advanced and this action is no longer available. Your draft is preserved for copying.</p> : reviewedVersion !== item.version && <div className='formalV2__notice'><p>This formal record changed. Your draft is preserved. Review the current record above before continuing.</p><Button type='button' variant='secondary' onClick={() => setReviewedVersion(item.version)}>I reviewed the updated record</Button></div>}
    <footer><Button type='button' variant='secondary' onClick={onCancel}>Cancel</Button><Button type='submit' disabled={pending || unavailable || reviewedVersion !== item.version}>{pending ? 'Saving…' : action.label}</Button></footer>
  </form>
}
