import { AlertTriangle, ArrowDown, ArrowUp, ClipboardCheck, Copy, Crosshair, Eye, Plus, Settings2, ShieldCheck, Trash2, Edit3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import FormMessage from '../auth/FormMessage'
import { resultError } from '../auth/utils'
import { Button } from '../design-system'
import { formatLabel } from './formatters'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import {
  addInspectionCharacteristic,
  archiveInspectionCharacteristic,
  bulkUpdateInspectionCharacteristics,
  createInspectionPlan,
  inspectionSelectors,
  loadInspectionPlan,
  reorderInspectionCharacteristics,
  updateInspectionCharacteristic,
  updateInspectionPlan,
  validateInspectionPlan,
} from '../../store/slices/entities/inspection'

const blank = { characteristic_id: '', title: '', description: '', type: 'numeric', nominal_value: '', lower_limit: '', upper_limit: '', tolerance_notation: '', attribute_expectation: 'pass', unit: 'inch', display_precision: 3, criticality: 'standard', inspection_stage: 'final', method_instructions: '', instrument_guidance: '', sample_policy: { strategy: 'first_piece', value: '' }, evidence_requirements: [], source_asset_id: '', visual_anchor_id: '', anchor_review_state: 'not_required' }
const idOf = value => String(value?.id || value?._id || value || '')

const CharacteristicForm = ({ value, onChange, onSubmit, onClose, pending, selectedAnchor, onRequestVisualContext }) => {
  const numeric = value.type === 'numeric'
  const set = (key, next) => onChange(current => ({ ...current, [key]: next }))
  useEffect(() => {
    if (!selectedAnchor) return
    onChange(current => ({ ...current, visual_anchor_id: idOf(selectedAnchor), source_asset_id: idOf(selectedAnchor.source_asset), anchor_review_state: 'ready' }))
  }, [onChange, selectedAnchor])
  return <form className='inspectionCharacteristicForm' onSubmit={event => { event.preventDefault(); onSubmit() }}>
    <div className='inspectionFormGrid'>
      <label><span>Characteristic ID</span><input value={value.characteristic_id} onChange={event => set('characteristic_id', event.target.value.toUpperCase())} placeholder='C001' required /></label>
      <label><span>Title</span><input value={value.title} onChange={event => set('title', event.target.value)} placeholder='Bore diameter' required /></label>
      <label className='inspectionFormGrid__wide'><span>Purpose / description</span><textarea value={value.description} onChange={event => set('description', event.target.value)} rows={2} placeholder='Explain what must be verified and why.' /></label>
      <label><span>Result type</span><select value={value.type} onChange={event => set('type', event.target.value)}><option value='numeric'>Numeric measurement</option><option value='attribute'>Pass / fail attribute</option></select></label>
      <label><span>Criticality</span><select value={value.criticality} onChange={event => set('criticality', event.target.value)}>{['standard', 'major', 'critical', 'key_characteristic'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
      <label><span>Inspection stage</span><select value={value.inspection_stage} onChange={event => set('inspection_stage', event.target.value)}>{['first_article', 'in_process', 'final', 'receiving'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
      <label><span>Sampling</span><select value={value.sample_policy.strategy} onChange={event => set('sample_policy', { ...value.sample_policy, strategy: event.target.value })}>{['first_piece', 'first_and_last', 'every_piece', 'fixed_quantity', 'every_nth_piece', 'percentage', 'once_per_lot'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label>
      {['fixed_quantity', 'every_nth_piece', 'percentage'].includes(value.sample_policy.strategy) && <label><span>Sample value</span><input type='number' min='0.01' step='0.01' value={value.sample_policy.value} onChange={event => set('sample_policy', { ...value.sample_policy, value: event.target.value })} required /></label>}
      {numeric ? <>
        <label><span>Nominal (optional)</span><input inputMode='decimal' value={value.nominal_value} onChange={event => set('nominal_value', event.target.value)} /></label>
        <label><span>Lower limit</span><input inputMode='decimal' value={value.lower_limit} onChange={event => set('lower_limit', event.target.value)} required /></label>
        <label><span>Upper limit</span><input inputMode='decimal' value={value.upper_limit} onChange={event => set('upper_limit', event.target.value)} required /></label>
        <label><span>Original tolerance notation</span><input value={value.tolerance_notation} onChange={event => set('tolerance_notation', event.target.value)} placeholder='Ø .375 +.000 / -.001' /></label>
        <label><span>Unit</span><select value={value.unit} onChange={event => set('unit', event.target.value)}>{['inch', 'mm', 'degree', 'dimensionless', 'percent', 'lbf', 'n', 'hrc', 'ra_uin', 'ra_um'].map(item => <option key={item} value={item}>{item}</option>)}</select></label>
        <label><span>Display precision</span><input type='number' min='0' max='12' value={value.display_precision} onChange={event => set('display_precision', event.target.value)} /></label>
      </> : <label><span>Expected result</span><select value={value.attribute_expectation} onChange={event => set('attribute_expectation', event.target.value)}><option value='pass'>Pass</option><option value='present'>Present</option><option value='absent'>Absent</option></select></label>}
      <label className='inspectionFormGrid__wide'><span>Method and instructions</span><textarea value={value.method_instructions} onChange={event => set('method_instructions', event.target.value)} rows={3} placeholder='Describe the gage, setup, or inspection method.' /></label>
      <label className='inspectionFormGrid__wide'><span>Instrument guidance</span><input value={value.instrument_guidance} onChange={event => set('instrument_guidance', event.target.value)} placeholder='Calibrated bore gage, CMM, visual inspection…' /></label>
    </div>
    {numeric && <div className='inspectionTolerancePreview'><span>Released acceptance range</span><strong>{value.lower_limit || '—'} ≤ result ≤ {value.upper_limit || '—'} {value.unit}</strong><small>Inclusive limits. The server performs the authoritative exact-decimal evaluation.</small></div>}
    <fieldset className='inspectionEvidenceRequirements'><legend>Required evidence</legend>{[
      ['photo', 'Photo'], ['quality_record', 'Inspection report'], ['certification', 'Certification'], ['document', 'Supporting document'],
    ].map(([category, label]) => {
      const selected = value.evidence_requirements.some(item => item.category === category)
      return <label key={category}><input type='checkbox' checked={selected} onChange={event => set('evidence_requirements', event.target.checked ? [...value.evidence_requirements.filter(item => item.category !== category), { category, minimum_count: 1 }] : value.evidence_requirements.filter(item => item.category !== category))} /><span>{label}</span></label>
    })}</fieldset>
    <div className={`inspectionAnchorChoice${value.visual_anchor_id ? ' is-ready' : ''}`}>
      <Crosshair aria-hidden='true' /><div><strong>{value.visual_anchor_id ? 'Visual context captured' : 'Add drawing or model context'}</strong><p>{value.visual_anchor_id ? 'The checkpoint opens at the selected feature or drawing region.' : 'Recommended: connect this checkpoint to the exact place the inspector needs to review.'}</p></div><Button type='button' variant='secondary' onClick={onRequestVisualContext}>{value.visual_anchor_id ? 'Replace selection' : 'Select feature'}</Button>
    </div>
    <footer><Button type='button' variant='secondary' onClick={onClose}>Cancel</Button><Button type='submit' disabled={pending}>Save checkpoint</Button></footer>
  </form>
}

const InspectionPlanPanel = ({ partId, revisionId, revision, organizationType, selectedAnchor, onRequestVisualContext, onOpenAnchor, readOnly = false, configureHref = '' }) => {
  const dispatch = useDispatch()
  const data = useSelector(inspectionSelectors.getPlan(revisionId))
  const pending = useSelector(inspectionSelectors.getMutating)
  const loading = useSelector(inspectionSelectors.getLoading)
  const [drawer, setDrawer] = useState(false)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [filter, setFilter] = useState({ stage: 'all', criticality: 'all', type: 'all', evidence: 'all', anchor: 'all' })
  const [supplierPreview, setSupplierPreview] = useState(false)
  const [selected, setSelected] = useState([])
  const [bulk, setBulk] = useState({ inspection_stage: '', criticality: '', sample_strategy: '', evidence: '' })
  const [settings, setSettings] = useState({ title: '', description: '', governing_references: '', package_instructions: '', final_approval_policy: 'submission_required' })
  const plan = data?.plan
  const characteristics = data?.characteristics || []
  const canManage = data?.allowed_actions?.can_manage && organizationType === 'oem'
  const effectiveManage = canManage && !supplierPreview && !readOnly
  useEffect(() => { if (partId && revisionId) dispatch(loadInspectionPlan(partId, revisionId)) }, [dispatch, partId, revisionId])
  useEffect(() => {
    setSelected([]); setSupplierPreview(false)
  }, [revisionId])
  useEffect(() => {
    if (!plan) return
    setSettings({ title: plan.title || '', description: plan.description || '', governing_references: (plan.governing_references || []).join('\n'), package_instructions: plan.package_instructions || '', final_approval_policy: plan.final_approval_policy || 'submission_required' })
  }, [plan?.id, plan?._id, plan?.version])
  const visible = useMemo(() => characteristics.filter(item => (
    (filter.stage === 'all' || item.inspection_stage === filter.stage)
    && (filter.criticality === 'all' || item.criticality === filter.criticality)
    && (filter.type === 'all' || item.type === filter.type)
    && (filter.evidence === 'all' || (filter.evidence === 'required') === Boolean(item.evidence_requirements?.length))
    && (filter.anchor === 'all' || (filter.anchor === 'linked') === Boolean(item.visual_anchor))
  )), [characteristics, filter])
  const reload = () => dispatch(loadInspectionPlan(partId, revisionId))
  const act = async (operation, success) => {
    setFeedback(null); const result = await operation()
    if (!result?.ok) { setFeedback({ type: 'error', message: resultError(result, 'The inspection plan could not be updated.') }); return result }
    setFeedback({ type: 'success', message: success }); await reload(); return result
  }
  const openNew = source => { setEditing(null); setForm({ ...blank, characteristic_id: `C${String(characteristics.length + 1).padStart(3, '0')}`, visual_anchor_id: idOf(source), source_asset_id: idOf(source?.source_asset), anchor_review_state: source ? 'ready' : 'not_required' }); setDrawer(true) }
  const openEdit = item => { setEditing(item); setForm({ ...blank, ...item, source_asset_id: idOf(item.source_asset), visual_anchor_id: idOf(item.visual_anchor), sample_policy: { ...blank.sample_policy, ...(item.sample_policy || {}) } }); setDrawer(true) }
  const save = () => act(() => dispatch(editing ? updateInspectionCharacteristic(idOf(editing), { ...form, version: editing.version }) : addInspectionCharacteristic(idOf(plan), form)), editing ? 'Inspection checkpoint updated.' : 'Inspection checkpoint added.').then(result => { if (result?.ok) setDrawer(false) })
  const move = async (item, offset) => {
    const index = characteristics.findIndex(candidate => idOf(candidate) === idOf(item)); const target = index + offset
    if (target < 0 || target >= characteristics.length) return
    const ids = characteristics.map(idOf); [ids[index], ids[target]] = [ids[target], ids[index]]
    await act(() => dispatch(reorderInspectionCharacteristics(idOf(plan), ids)), 'Checkpoint order updated.')
  }
  const toggleSelected = id => setSelected(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
  const applyBulk = async () => {
    const updates = {}
    if (bulk.inspection_stage) updates.inspection_stage = bulk.inspection_stage
    if (bulk.criticality) updates.criticality = bulk.criticality
    if (bulk.sample_strategy) updates.sample_policy = { strategy: bulk.sample_strategy }
    if (bulk.evidence) updates.evidence_requirements = bulk.evidence === 'none' ? [] : [{ category: bulk.evidence, minimum_count: 1 }]
    const versions = Object.fromEntries(characteristics.filter(item => selected.includes(idOf(item))).map(item => [idOf(item), item.version]))
    const result = await act(() => dispatch(bulkUpdateInspectionCharacteristics(idOf(plan), selected, versions, updates)), `${selected.length} checkpoints updated.`)
    if (result?.ok) { setSelected([]); setBulk({ inspection_stage: '', criticality: '', sample_strategy: '', evidence: '' }) }
  }
  const saveSettings = event => {
    event.preventDefault()
    return act(() => dispatch(updateInspectionPlan(idOf(plan), { ...settings, governing_references: settings.governing_references.split('\n').map(item => item.trim()).filter(Boolean), version: plan.version })), 'Inspection plan settings updated.')
  }
  if (loading && !data) return <section className='partWorkspacePanel inspectionPlanPanel'><p>Loading inspection plan…</p></section>
  if (!plan) return <section className='partWorkspacePanel inspectionPlanPanel inspectionPlanEmpty inspectionPlanEmpty--compact'><ClipboardCheck aria-hidden='true' /><p className='technicalLabel'>Collaborative inspection</p><h2>{!readOnly && (canManage || (organizationType === 'oem' && revision?.lifecycle_state === 'draft')) ? 'Turn design intent into executable checkpoints' : organizationType === 'supplier' ? 'No structured inspection requested' : 'No inspection plan on this revision'}</h2><p>{!readOnly && organizationType === 'oem' && revision?.lifecycle_state === 'draft' ? 'Define exactly what the supplier must inspect, how often, and what evidence is required. The plan freezes with the revision.' : organizationType === 'supplier' ? 'The OEM did not release structured checkpoints for this revision. Continue using the released files and requirements as the technical definition.' : 'This released revision does not currently require structured inspection checkpoints.'}</p>{!readOnly && organizationType === 'oem' && revision?.lifecycle_state === 'draft' && <Button onClick={() => act(() => dispatch(createInspectionPlan(partId, revisionId, { title: `${revision?.revision || ''} inspection plan`, default_stage: 'final', default_sample_policy: { strategy: 'first_piece' } })), 'Inspection plan created.')}><Plus aria-hidden='true' /> Create inspection plan</Button>}{readOnly && configureHref && <Button href={configureHref}><Plus aria-hidden='true' /> Configure inspection plan</Button>}</section>
  return <section className='partWorkspacePanel inspectionPlanPanel'>
    <header><div><p className='technicalLabel'>{readOnly ? 'Released inspection definition' : supplierPreview ? 'Supplier preview' : 'Released quality definition'}</p><h2>{plan.title}</h2><p>{readOnly || supplierPreview ? 'This is the released, read-only plan and guidance for this production record.' : plan.description || 'Inspection checkpoints, sampling, evidence, and workflow gates for this exact part revision.'}</p></div><div className='inspectionPlanPanel__actions'>{effectiveManage && <Button onClick={() => openNew(selectedAnchor)}><Plus aria-hidden='true' /> Add checkpoint</Button>}{!readOnly && organizationType === 'oem' && <Button variant='secondary' onClick={() => { setSupplierPreview(value => !value); setSelected([]) }}><Eye aria-hidden='true' /> {supplierPreview ? 'Return to authoring' : 'Preview as supplier'}</Button>}{!readOnly && <Button variant='secondary' onClick={() => act(() => dispatch(validateInspectionPlan(idOf(plan))), 'Plan validation completed.').then(result => { const validation = result?.payload?.data; if (validation) setFeedback({ type: validation.valid ? 'success' : 'error', message: validation.valid ? `Plan ready · ${validation.plan_hash.slice(0, 12)}…` : validation.errors.map(item => item.message).join(' ') }) })}><ShieldCheck aria-hidden='true' /> Validate</Button>}</div></header>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {supplierPreview && <div className='inspectionSupplierPreviewBanner'><Eye aria-hidden='true' /><div><strong>Supplier read-only preview</strong><p>Editing controls are hidden. Sampling, evidence, stage, method, and visual context remain visible exactly as the supplier will use them.</p></div></div>}
    {canManage && !supplierPreview && !readOnly && <details className='inspectionPlanSettings'><summary><Settings2 aria-hidden='true' /> Plan instructions and release policy</summary><form onSubmit={saveSettings}><div className='inspectionFormGrid'><label><span>Plan title</span><input required value={settings.title} onChange={event => setSettings(current => ({ ...current, title: event.target.value }))} /></label><label><span>Final approval gate</span><select value={settings.final_approval_policy} onChange={event => setSettings(current => ({ ...current, final_approval_policy: event.target.value }))}><option value='completion_required'>Completion required</option><option value='submission_required'>Submission required</option><option value='oem_approval_required'>OEM acceptance required</option></select></label><label className='inspectionFormGrid__wide'><span>Purpose</span><textarea rows={2} value={settings.description} onChange={event => setSettings(current => ({ ...current, description: event.target.value }))} /></label><label className='inspectionFormGrid__wide'><span>Governing references (one per line)</span><textarea rows={2} value={settings.governing_references} onChange={event => setSettings(current => ({ ...current, governing_references: event.target.value }))} /></label><label className='inspectionFormGrid__wide'><span>Package instructions for the supplier</span><textarea rows={3} value={settings.package_instructions} onChange={event => setSettings(current => ({ ...current, package_instructions: event.target.value }))} /></label></div><Button type='submit' disabled={pending}>Save plan settings</Button></form></details>}
    <div className='inspectionPlanSummary'><div><strong>{characteristics.length}</strong><span>Checkpoints</span></div><div><strong>{new Set(characteristics.map(item => item.inspection_stage)).size}</strong><span>Inspection stages</span></div><div><strong>{characteristics.filter(item => ['critical', 'key_characteristic'].includes(item.criticality)).length}</strong><span>Critical / key</span></div><div><strong>{characteristics.filter(item => item.visual_anchor).length}</strong><span>With visual context</span></div></div>
    <div className='inspectionPlanFilters'><label><span>Stage</span><select value={filter.stage} onChange={event => setFilter(current => ({ ...current, stage: event.target.value }))}><option value='all'>All stages</option>{['first_article', 'in_process', 'final', 'receiving'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label><label><span>Criticality</span><select value={filter.criticality} onChange={event => setFilter(current => ({ ...current, criticality: event.target.value }))}><option value='all'>All criticalities</option>{['standard', 'major', 'critical', 'key_characteristic'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select></label><label><span>Type</span><select value={filter.type} onChange={event => setFilter(current => ({ ...current, type: event.target.value }))}><option value='all'>All types</option><option value='numeric'>Numeric</option><option value='attribute'>Pass / fail</option></select></label><label><span>Evidence</span><select value={filter.evidence} onChange={event => setFilter(current => ({ ...current, evidence: event.target.value }))}><option value='all'>Any evidence</option><option value='required'>Evidence required</option><option value='none'>No evidence</option></select></label><label><span>Visual context</span><select value={filter.anchor} onChange={event => setFilter(current => ({ ...current, anchor: event.target.value }))}><option value='all'>Any context</option><option value='linked'>Linked</option><option value='none'>Revision-level</option></select></label></div>
    {effectiveManage && selected.length > 0 && <section className='inspectionBulkBar'><div><strong>{selected.length} selected</strong><button type='button' onClick={() => setSelected([])}>Clear</button></div><select aria-label='Bulk stage' value={bulk.inspection_stage} onChange={event => setBulk(current => ({ ...current, inspection_stage: event.target.value }))}><option value=''>Keep stage</option>{['first_article', 'in_process', 'final', 'receiving'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><select aria-label='Bulk criticality' value={bulk.criticality} onChange={event => setBulk(current => ({ ...current, criticality: event.target.value }))}><option value=''>Keep criticality</option>{['standard', 'major', 'critical', 'key_characteristic'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><select aria-label='Bulk sampling' value={bulk.sample_strategy} onChange={event => setBulk(current => ({ ...current, sample_strategy: event.target.value }))}><option value=''>Keep sampling</option>{['first_piece', 'first_and_last', 'every_piece', 'once_per_lot'].map(item => <option key={item} value={item}>{formatLabel(item)}</option>)}</select><select aria-label='Bulk evidence' value={bulk.evidence} onChange={event => setBulk(current => ({ ...current, evidence: event.target.value }))}><option value=''>Keep evidence</option><option value='none'>No evidence</option><option value='photo'>Require photo</option><option value='quality_record'>Require report</option><option value='certification'>Require certification</option></select><Button disabled={pending || !Object.values(bulk).some(Boolean)} onClick={applyBulk}>Apply changes</Button></section>}
    {visible.length ? <div className='inspectionCharacteristicList'>{visible.map((item, index) => <article key={idOf(item)} className={`inspectionCharacteristic inspectionCharacteristic--${item.criticality}${effectiveManage ? ' is-manageable' : ''}`}>
      {effectiveManage && <label className='inspectionCharacteristic__select'><input type='checkbox' checked={selected.includes(idOf(item))} onChange={() => toggleSelected(idOf(item))} /><span className='srOnly'>Select {item.characteristic_id}</span></label>}
      <button type='button' className='inspectionCharacteristic__marker' onClick={() => item.visual_anchor && onOpenAnchor?.(item.visual_anchor)} aria-label={`Open visual context for ${item.characteristic_id}`}>{item.characteristic_id}</button>
      <div><div className='inspectionCharacteristic__title'><strong>{item.title}</strong><StatusBadge tone={['critical', 'key_characteristic'].includes(item.criticality) ? 'danger' : item.criticality === 'major' ? 'warning' : 'neutral'}>{formatLabel(item.criticality)}</StatusBadge><StatusBadge tone='info'>{formatLabel(item.inspection_stage)}</StatusBadge></div><p>{item.type === 'numeric' ? `${item.lower_limit} to ${item.upper_limit} ${item.unit}` : `Expected: ${formatLabel(item.attribute_expectation)}`} · {formatLabel(item.sample_policy?.strategy)}</p><small>{item.visual_anchor ? 'Visual context attached' : 'Revision-level checkpoint'} · {item.evidence_requirements?.length ? `${item.evidence_requirements.map(evidence => formatLabel(evidence.category)).join(', ')} required` : 'No required file evidence'}{item.method_instructions ? ` · ${item.method_instructions}` : ''}</small></div>
      {effectiveManage && <div className='inspectionCharacteristic__actions'><Button variant='secondary' aria-label={`Move ${item.characteristic_id} up`} disabled={index === 0} onClick={() => move(item, -1)}><ArrowUp aria-hidden='true' /></Button><Button variant='secondary' aria-label={`Move ${item.characteristic_id} down`} disabled={index === visible.length - 1} onClick={() => move(item, 1)}><ArrowDown aria-hidden='true' /></Button><Button variant='secondary' onClick={() => openEdit(item)}><Edit3 aria-hidden='true' /> Edit</Button><Button variant='secondary' onClick={() => { setEditing(null); setForm({ ...blank, ...item, _id: undefined, id: undefined, version: undefined, characteristic_id: `${item.characteristic_id}-COPY`, title: `${item.title} copy`, visual_anchor_id: idOf(item.visual_anchor), source_asset_id: idOf(item.source_asset) }); setDrawer(true) }}><Copy aria-hidden='true' /></Button><Button variant='danger' onClick={() => window.confirm(`Archive ${item.characteristic_id}?`) && act(() => dispatch(archiveInspectionCharacteristic(idOf(item), { version: item.version })), 'Checkpoint archived.')}><Trash2 aria-hidden='true' /></Button></div>}
    </article>)}</div> : <div className='partWorkspaceEmpty'><AlertTriangle aria-hidden='true' /><h3>No checkpoints match these filters</h3><Button variant='secondary' onClick={() => setFilter({ stage: 'all', criticality: 'all', type: 'all', evidence: 'all', anchor: 'all' })}>Clear filters</Button></div>}
    <ResponsiveDrawer open={drawer} title={editing ? `Edit ${editing.characteristic_id}` : 'Add inspection checkpoint'} onClose={() => setDrawer(false)}><CharacteristicForm value={form} onChange={setForm} onSubmit={save} onClose={() => setDrawer(false)} pending={pending} selectedAnchor={selectedAnchor} onRequestVisualContext={onRequestVisualContext} /></ResponsiveDrawer>
  </section>
}

export default InspectionPlanPanel
