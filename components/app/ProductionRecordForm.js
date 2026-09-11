import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Box, Check, FileText, GripVertical, Package, Plus, Save, Send, Settings2, ShieldAlert, Trash2, UsersRound } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import { formatDate, formatLabel } from './formatters'
import { productionErrorTarget, productionServerIssues, validateProductionForm } from './productionRecordValidation'
import styles from './ProductionRecordForm.module.scss'
import { buildWorkflowPreview, fallbackWorkflowBuilder, workflowConfiguration } from './productionWorkflowBuilder'

export const productionUnits = [
  ['each', 'Each / pieces'],
  ['lot', 'Lot'],
  ['set', 'Set'],
  ['assembly', 'Assembly'],
  ['pound', 'Pound'],
  ['kilogram', 'Kilogram'],
  ['foot', 'Foot'],
  ['meter', 'Meter'],
  ['other', 'Other'],
]

export const blankProductionRecord = {
  part_revision_id: '',
  part_number: '',
  part_name: '',
  drawing_revision: '',
  po_number: '',
  po_line_number: '',
  quantity: '',
  unit: 'each',
  unit_other: '',
  required_delivery_date: '',
  transit_days: '',
  first_article_required: false,
  first_article_note: '',
  process_summary: '',
  external_erp_reference: '',
  oem_internal_note: '',
  supplier_organization_id: '',
  export_control: 'none',
  workflow_configuration: workflowConfiguration(),
}

const steps = [
  { key: 'part', label: 'Part', icon: Package },
  { key: 'order', label: 'Order', icon: FileText },
  { key: 'production', label: 'Production', icon: Settings2 },
  { key: 'supplier', label: 'Supplier', icon: UsersRound },
  { key: 'review', label: 'Review', icon: Check },
]

const supplierFromRelationship = relationship => relationship.supplier_organization
const previewSampleCount = (policy, quantity) => {
  const total = Math.max(1, Number.parseInt(quantity, 10) || 1)
  const value = Number(policy?.value)
  if (policy?.strategy === 'first_and_last') return Math.min(total, 2)
  if (policy?.strategy === 'every_piece') return total
  if (policy?.strategy === 'fixed_quantity') return Math.min(total, Math.max(1, Math.ceil(value || 1)))
  if (policy?.strategy === 'every_nth_piece') return Math.max(1, Math.ceil(total / Math.max(1, Math.ceil(value || 1))))
  if (policy?.strategy === 'percentage') return Math.min(total, Math.max(1, Math.ceil(total * Math.min(100, Math.max(.01, value || 100)) / 100)))
  return 1
}

const FieldError = ({ id, message }) => message ? <small id={`${id}-error`} className={styles.fieldError}>{message}</small> : null
const ProductionField = ({ error, id, hint, ...props }) => <div>
  <FormField id={id} hint={hint} {...props} aria-invalid={Boolean(error) || undefined} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined} />
  <FieldError id={id} message={error} />
</div>

const ProductionRecordForm = ({ initial = blankProductionRecord, relationships = [], partWorkspaces = [], initialPartRevisionId = '', inspectionPlanSummary = null, pending, feedback, workflow, itarCapability, onPartRevisionSelected, onSubmit }) => {
  const builder = workflow?.builder || fallbackWorkflowBuilder
  const [form, setForm] = useState(() => ({
    ...blankProductionRecord,
    ...initial,
    workflow_configuration: workflowConfiguration(initial.workflow_configuration, builder),
  }))
  const [step, setStep] = useState(0)
  const [validationAction, setValidationAction] = useState(null)
  const [serverIssues, setServerIssues] = useState({ fields: {}, general: [] })
  const [focusTarget, setFocusTarget] = useState(null)
  const panelRef = useRef(null)
  const assignmentErrors = validateProductionForm(form, 'assign')
  const errors = { ...(validationAction ? validateProductionForm(form, validationAction) : {}), ...serverIssues.fields }
  const errorEntries = Object.entries(errors)
  const errorProps = key => ({ 'aria-invalid': Boolean(errors[key]) || undefined, 'aria-describedby': errors[key] ? `${productionErrorTarget(key, form)?.id}-error` : undefined })
  const clearServerErrors = (...keys) => setServerIssues(current => ({ ...current, fields: Object.fromEntries(Object.entries(current.fields).filter(([key]) => !keys.some(changed => key === changed || key.startsWith(`${changed}.`)))) }))
  const goToError = key => {
    const target = productionErrorTarget(key, form)
    if (!target) return
    setStep(target.step)
    setFocusTarget(target)
  }
  useEffect(() => {
    setServerIssues(productionServerIssues(feedback))
    if (feedback?.type === 'error') setFocusTarget({ id: 'production-errors' })
  }, [feedback])
  useEffect(() => {
    if (!focusTarget) return undefined
    const frame = requestAnimationFrame(() => {
      const target = panelRef.current?.querySelector(`#${focusTarget.id}`)
      target?.focus({ preventScroll: true })
      target?.scrollIntoView({ block: focusTarget.id === 'production-errors' ? 'start' : 'center' })
      setFocusTarget(null)
    })
    return () => cancelAnimationFrame(frame)
  }, [focusTarget, step])
  const [draggedStage, setDraggedStage] = useState(null)
  const releasedParts = useMemo(() => partWorkspaces.filter(item => item.current_released_revision?.id || item.current_released_revision?._id), [partWorkspaces])
  const activeRelationships = useMemo(() => relationships.filter(item => (
    item.status === 'active' && supplierFromRelationship(item)?.id
  )), [relationships])
  const set = (key, value) => { clearServerErrors(key, ...(key === 'unit' ? ['unit_other'] : [])); setForm(current => ({ ...current, [key]: value })) }
  const selectPartRevision = value => {
    clearServerErrors('part_revision_id', 'part_number', 'part_name', 'drawing_revision', 'export_control')
    const selected = releasedParts.find(item => String(item.current_released_revision?.id || item.current_released_revision?._id) === String(value))
    setForm(current => ({
      ...current,
      part_revision_id: value,
      ...(selected ? {
        part_number: selected.part_number || '',
        part_name: selected.name || '',
        drawing_revision: selected.current_released_revision?.revision || '',
        export_control: selected.current_released_revision?.export_control || 'none',
      } : {}),
    }))
    onPartRevisionSelected?.(selected || null, value)
  }
  useEffect(() => {
    if (!initialPartRevisionId || form.part_revision_id || !releasedParts.length) return
    selectPartRevision(initialPartRevisionId)
  }, [form.part_revision_id, initialPartRevisionId, releasedParts])
  useEffect(() => {
    const characteristics = inspectionPlanSummary?.characteristics || []
    if (!characteristics.length) return
    setForm(current => ({
      ...current,
      first_article_required: current.first_article_required || characteristics.some(item => item.inspection_stage === 'first_article'),
      workflow_configuration: {
        ...current.workflow_configuration,
        include_quality_review: current.workflow_configuration.include_quality_review || characteristics.some(item => item.inspection_stage === 'receiving'),
      },
    }))
  }, [inspectionPlanSummary])
  const setWorkflow = (key, value) => { clearServerErrors('workflow_configuration'); setForm(current => ({
    ...current,
    workflow_configuration: {
      ...current.workflow_configuration,
      [key]: value,
      ...(key === 'material_source' && value !== 'oem' ? { supplier_material_quantity_confirmation: false } : {}),
    },
  })) }
  const customStages = form.workflow_configuration.custom_process_stages
  const addCustomStage = key => {
    if (customStages.length >= builder.maximum_custom_stages) return
    setWorkflow('custom_process_stages', [...customStages, key])
  }
  const removeCustomStage = index => setWorkflow('custom_process_stages', customStages.filter((_, itemIndex) => itemIndex !== index))
  const moveCustomStage = (from, to) => {
    if (to < 0 || to >= customStages.length || from === to) return
    const reordered = [...customStages]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    setWorkflow('custom_process_stages', reordered)
  }
  const routePreview = useMemo(() => buildWorkflowPreview({
    configuration: form.workflow_configuration,
    firstArticleRequired: form.first_article_required,
    builder,
  }), [builder, form.first_article_required, form.workflow_configuration])
  const inspectionPreview = useMemo(() => {
    const characteristics = inspectionPlanSummary?.characteristics || []
    return ['first_article', 'in_process', 'final', 'receiving'].map(stage => {
      const stageCharacteristics = characteristics.filter(item => item.inspection_stage === stage)
      return { stage, checkpoints: stageCharacteristics.length, results: stageCharacteristics.reduce((sum, item) => sum + previewSampleCount(item.sample_policy, form.quantity), 0) }
    }).filter(item => item.checkpoints)
  }, [form.quantity, inspectionPlanSummary])

  const save = action => {
    setValidationAction(action)
    setServerIssues({ fields: {}, general: [] })
    if (Object.keys(validateProductionForm(form, action)).length) {
      setFocusTarget({ id: 'production-errors' })
      return
    }
    return onSubmit({
      ...form,
      action,
      quantity: form.quantity === '' ? null : Number(form.quantity),
      transit_days: form.transit_days === '' ? null : Number(form.transit_days),
      supplier_organization_id: action === 'assign' ? form.supplier_organization_id : undefined,
    })
  }

  return <section className={`appPanel productionFormPanel ${styles.panel}`} ref={panelRef}>
    <nav className='productionFormSteps' aria-label='Production record steps'>
      {steps.map((item, index) => {
        const count = errorEntries.filter(([key]) => productionErrorTarget(key, form)?.step === index).length
        const complete = index < step && !Object.keys(assignmentErrors).some(key => productionErrorTarget(key, form)?.step === index)
        return <button key={item.key} type='button' className={[index === step ? 'is-active' : complete ? 'is-complete' : '', count ? styles.invalidStep : ''].join(' ')} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}>
          {count ? <AlertTriangle aria-hidden='true' /> : <item.icon aria-hidden='true' />}<span>{item.label}{count > 0 && <> <span className={styles.count} aria-label={`${count} items to fix`}>{count}</span></>}</span>
        </button>
      })}
    </nav>
    <div className='productionFormBody'>
      {(errorEntries.length > 0 || serverIssues.general.length > 0) && <section id='production-errors' className={styles.summary} role='alert' tabIndex={-1} aria-label='Production record errors'>
        <header><AlertTriangle aria-hidden='true' /><div><strong>{errorEntries.length ? `Fix ${errorEntries.length === 1 ? 'this item' : `these ${errorEntries.length} items`} to ${validationAction === 'draft' ? 'save the draft' : 'assign this record'}` : 'This record could not be saved'}</strong><p>{errorEntries.length > 0 ? 'Tap an item to go directly to the field that needs attention.' : 'Your entries are still here.'}</p></div></header>
        {serverIssues.general.map((message, index) => <p key={index}>{message}</p>)}
        {errorEntries.length > 0 && <ul>{errorEntries.map(([key, message]) => { const target = productionErrorTarget(key, form); return <li key={key}>{target ? <button type='button' onClick={() => goToError(key)}><span><strong>{message}</strong><small>{steps[target.step].label} · {target.label}</small></span><ArrowRight aria-hidden='true' /></button> : <p>{message}</p>}</li> })}</ul>}
      </section>}
      {feedback?.type !== 'error' && <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>}
      {step === 0 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 1 of 5</p><h2>Identify the awarded part</h2><p>Part numbers can repeat across orders. Velakron will create a unique tracking reference.</p></header>
        {(releasedParts.length > 0 || form.part_revision_id || errors.part_revision_id) && <label className='selectField productionPartWorkspaceSelect' htmlFor='production-part-workspace'><span>Released Part Workspace revision (recommended)</span><select id='production-part-workspace' {...errorProps('part_revision_id')} value={form.part_revision_id} onChange={event => selectPartRevision(event.target.value)}><option value=''>Create an unlinked production record</option>{releasedParts.map(item => <option key={item.current_released_revision.id || item.current_released_revision._id} value={item.current_released_revision.id || item.current_released_revision._id}>{item.part_number} · Rev {item.current_released_revision.revision} · {item.name}</option>)}</select><FieldError id='production-part-workspace' message={errors.part_revision_id} /><small>A linked record freezes the released manifest and can only be assigned to a supplier that has access to that revision.</small></label>}
        {form.part_revision_id && <div className='productionLinkedPartNotice'><Box aria-hidden='true' /><div><strong>Controlled Part Workspace revision selected</strong><span>Part identity, revision, and ITAR classification come from the immutable release and cannot drift from production.</span></div></div>}
        <div className='productionFormGrid'>
          <ProductionField error={errors.part_number} id='production-part-number' label='Part number' value={form.part_number} onChange={event => set('part_number', event.target.value)} required disabled={Boolean(form.part_revision_id)} />
          <ProductionField error={errors.drawing_revision} id='production-revision' label='Drawing revision' value={form.drawing_revision} onChange={event => set('drawing_revision', event.target.value)} hint='Optional structured reference, such as C or Rev 7.' disabled={Boolean(form.part_revision_id)} />
          <ProductionField error={errors.part_name} id='production-part-name' label='Part name or description' value={form.part_name} onChange={event => set('part_name', event.target.value)} required disabled={Boolean(form.part_revision_id)} />
          <ProductionField error={errors.process_summary} id='production-process' label='Process summary' value={form.process_summary} onChange={event => set('process_summary', event.target.value)} hint='Optional, such as five-axis machining and anodizing.' />
        </div>
        <label className={`productionCheck itarClassificationControl${form.export_control === 'itar' ? ' is-selected' : ''}`}><input id='production-export-control' {...errorProps('export_control')} type='checkbox' checked={form.export_control === 'itar'} disabled={Boolean(form.part_revision_id) || (!itarCapability?.enabled && !itarCapability?.preview)} onChange={event => set('export_control', event.target.checked ? 'itar' : 'none')} /><ShieldAlert aria-hidden='true' /><span><strong>This production record contains ITAR-controlled technical data</strong><small>{form.part_revision_id ? 'Classification is inherited from the released Part Workspace revision.' : 'This is a permanent high-security classification. Every file access will require a fresh U.S.-person and ITAR-handling confirmation.'}</small></span></label>
        <FieldError id='production-export-control' message={errors.export_control} />
        {!itarCapability?.enabled && itarCapability?.preview && <div className='itarAvailabilityNotice itarAvailabilityNotice--preview'><AlertTriangle aria-hidden='true' /><p><strong>Local preview only.</strong> Use synthetic files to review this workflow. Real ITAR data remains blocked until the GovCloud/FIPS environment is enabled.</p></div>}
        {!itarCapability?.enabled && !itarCapability?.preview && <div className='itarAvailabilityNotice'><ShieldAlert aria-hidden='true' /><p><strong>ITAR storage is not yet enabled.</strong> Records cannot be marked ITAR until Velakron is running in the approved GovCloud/FIPS environment.</p></div>}
      </div>}
      {step === 1 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 2 of 5</p><h2>Add the purchase-order reference</h2><p>This record represents one awarded commitment or PO line. Pricing is intentionally not stored here.</p></header>
        <div className='productionFormGrid'>
          <ProductionField error={errors.po_number} id='production-po' label='PO number' value={form.po_number} onChange={event => set('po_number', event.target.value)} required />
          <ProductionField error={errors.po_line_number} id='production-po-line' label='PO line' value={form.po_line_number} onChange={event => set('po_line_number', event.target.value)} hint='Optional' />
          <ProductionField error={errors.external_erp_reference} id='production-erp' label='ERP reference' value={form.external_erp_reference} onChange={event => set('external_erp_reference', event.target.value)} hint='Optional plain-text reference only.' />
        </div>
      </div>}
      {step === 2 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 3 of 5</p><h2>Define the production commitment</h2><p>The required date is when the OEM needs the order to arrive.</p></header>
        <div className='productionFormGrid'>
          <ProductionField error={errors.quantity} id='production-quantity' label='Quantity' type='number' min='0' max='1000000000' step='any' value={form.quantity} onChange={event => set('quantity', event.target.value)} required />
          <label className='selectField' htmlFor='production-unit'><span>Unit of measure</span><select id='production-unit' {...errorProps('unit')} value={form.unit} onChange={event => set('unit', event.target.value)}>{productionUnits.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select><FieldError id='production-unit' message={errors.unit} /></label>
          {form.unit === 'other' && <ProductionField error={errors.unit_other} id='production-unit-other' label='Describe the unit' value={form.unit_other} onChange={event => set('unit_other', event.target.value)} required />}
          <ProductionField error={errors.required_delivery_date} id='production-required-date' label='Required arrival date' type='date' value={form.required_delivery_date} onChange={event => set('required_delivery_date', event.target.value)} onInput={event => set('required_delivery_date', event.target.value)} onBlur={event => set('required_delivery_date', event.target.value)} required />
          <ProductionField error={errors.transit_days} id='production-transit' label='Estimated transit days' type='number' min='0' max='365' step='1' value={form.transit_days} onChange={event => set('transit_days', event.target.value)} hint='Optional. Used to compare the supplier forecast with arrival.' />
        </div>
        {form.part_revision_id && inspectionPlanSummary && <section className='productionInspectionPreview'><header><div><p className='technicalLabel'>Inherited from the released revision</p><h3>{inspectionPlanSummary.plan?.title || 'Inspection plan'}</h3><p>Sample counts update with quantity. The server freezes the authoritative scope when this record is created.</p></div><span>{inspectionPlanSummary.characteristics?.length || 0} checkpoints</span></header>{inspectionPreview.length ? <div>{inspectionPreview.map(item => <article key={item.stage}><strong>{formatLabel(item.stage)}</strong><span>{item.checkpoints} checkpoint{item.checkpoints === 1 ? '' : 's'}</span><small>{item.results} expected result{item.results === 1 ? '' : 's'}</small></article>)}</div> : <p>This released revision has an empty inspection plan and will not create inspection runs.</p>}<footer><span>Final gate</span><strong>{formatLabel(inspectionPlanSummary.plan?.final_approval_policy || 'submission_required')}</strong></footer></section>}
        <div className='workflowBuilder' id='production-workflow' tabIndex={-1}>
          <FieldError id='production-workflow' message={errorEntries.filter(([key]) => key.startsWith('workflow_configuration')).map(([, message]) => message).join('. ')} />
          <header><p className='technicalLabel'>Job-specific route</p><h3>Choose how this part will move through production</h3><p>The current Velakron workflow is preselected. Change only the stages this job needs.</p></header>
          <fieldset className='workflowChoiceGroup'>
            <legend>Who provides the raw material?</legend>
            <div className='workflowChoiceGrid'>{builder.material_sources.map(source => <label key={source.key} className={form.workflow_configuration.material_source === source.key ? 'is-selected' : ''}><input type='radio' name='material-source' value={source.key} checked={form.workflow_configuration.material_source === source.key} onChange={() => setWorkflow('material_source', source.key)} /><span><strong>{source.label}</strong><small>{source.key === 'supplier' ? 'Supplier orders and receives material.' : 'OEM orders material; supplier confirms receipt.'}</small></span></label>)}</div>
          </fieldset>
          {form.workflow_configuration.material_source === 'oem' && <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.supplier_material_quantity_confirmation} onChange={event => setWorkflow('supplier_material_quantity_confirmation', event.target.checked)} /><span><strong>Supplier must confirm the received material quantity</strong><small>Adds a required confirmation between the OEM material order and material receipt.</small></span></label>}
          <div className='workflowToggleGrid'>
            <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.include_programming} onChange={event => setWorkflow('include_programming', event.target.checked)} /><span><strong>Programming</strong><small>Include programming before first article or production.</small></span></label>
            <label className='productionCheck'><input id='production-first-article-required' {...errorProps('first_article_required')} type='checkbox' checked={form.first_article_required} onChange={event => set('first_article_required', event.target.checked)} /><span><strong>First article approval</strong><small>Add supplier inspection and explicit OEM approval before production.</small></span></label>
            <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.include_quality_review} onChange={event => setWorkflow('include_quality_review', event.target.checked)} /><span><strong>Receiving quality review</strong><small>Add an OEM quality-review stage after the shipment is received.</small></span></label>
          </div>
          <FieldError id='production-first-article-required' message={errors.first_article_required} />
          {form.first_article_required && <label className='textAreaField' htmlFor='production-first-article'><span>First article instructions</span><textarea id='production-first-article' {...errorProps('first_article_note')} value={form.first_article_note} onChange={event => set('first_article_note', event.target.value)} maxLength={2000} /><FieldError id='production-first-article' message={errors.first_article_note} /></label>}
          <section className='customRouteBuilder' aria-labelledby='custom-route-title'>
            <div><h4 id='custom-route-title'>Custom process route</h4><p>Add stages in the order the supplier will perform them. A stage can be used more than once.</p></div>
            <div className='customStageCatalog'>{builder.custom_stage_catalog.map(stage => <button type='button' key={stage.key} onClick={() => addCustomStage(stage.key)} disabled={customStages.length >= builder.maximum_custom_stages}><Plus aria-hidden='true' /> {stage.label}</button>)}</div>
            {customStages.length ? <ol className='customStageList'>{customStages.map((key, index) => {
              const stage = builder.custom_stage_catalog.find(item => item.key === key)
              return <li key={`${key}-${index}`} draggable onDragStart={() => setDraggedStage(index)} onDragOver={event => event.preventDefault()} onDrop={() => { moveCustomStage(draggedStage, index); setDraggedStage(null) }}>
                <GripVertical aria-hidden='true' /><span><small>Stage {index + 1}</small><strong>{stage?.label || formatLabel(key)}</strong></span>
                <button type='button' aria-label={`Move ${stage?.label || key} up`} onClick={() => moveCustomStage(index, index - 1)} disabled={index === 0}><ArrowUp aria-hidden='true' /></button>
                <button type='button' aria-label={`Move ${stage?.label || key} down`} onClick={() => moveCustomStage(index, index + 1)} disabled={index === customStages.length - 1}><ArrowDown aria-hidden='true' /></button>
                <button type='button' aria-label={`Remove ${stage?.label || key}`} onClick={() => removeCustomStage(index)}><Trash2 aria-hidden='true' /></button>
              </li>
            })}</ol> : <p className='customStageEmpty'>No custom process stages. The route moves from In production to Final inspection.</p>}
          </section>
          <section className='workflowPreview' aria-labelledby='workflow-preview-title'><div><h4 id='workflow-preview-title'>Workflow preview</h4><p>{routePreview.length} stages · frozen for this production record</p></div><ol>{routePreview.map((routeStep, index) => <li key={`${routeStep.key}-${index}`}><span>{index + 1}</span><strong>{routeStep.label}</strong><small>{routeStep.owner === 'oem' ? 'OEM action' : routeStep.owner === 'supplier' ? 'Supplier action' : 'Automatic'}</small></li>)}</ol></section>
        </div>
      </div>}
      {step === 3 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 4 of 5</p><h2>Choose the supplier</h2><p>Only active, connected supplier companies can receive the assignment.</p></header>
        <label className='selectField' htmlFor='production-supplier'><span>Connected supplier</span><select id='production-supplier' {...errorProps('supplier_organization_id')} value={form.supplier_organization_id} onChange={event => set('supplier_organization_id', event.target.value)}><option value=''>Select supplier</option>{activeRelationships.map(relationship => { const supplier = supplierFromRelationship(relationship); return <option key={supplier.id} value={supplier.id}>{supplier.name}</option> })}</select><FieldError id='production-supplier' message={errors.supplier_organization_id} /><small>You can still save this record as a private draft without choosing a supplier. Once assigned, active members of both companies collaborate under the Platform Confidentiality Terms.</small></label>
        <div className='regulatedDataNotice regulatedDataNotice--form'><FileText aria-hidden='true' /><p><strong>{form.export_control === 'itar' ? 'ITAR handling applies.' : 'Do not upload unsupported regulated data.'}</strong> {form.export_control === 'itar' ? 'All files on this record inherit the ITAR classification and protected access workflow.' : 'EAR-controlled, CUI, classified, and similar data are not supported. ITAR data is accepted only on a record explicitly marked ITAR in an enabled environment.'}</p></div>
        <label className='textAreaField' htmlFor='production-internal-note'><span>OEM-internal note</span><textarea id='production-internal-note' {...errorProps('oem_internal_note')} value={form.oem_internal_note} onChange={event => set('oem_internal_note', event.target.value)} maxLength={3000} /><FieldError id='production-internal-note' message={errors.oem_internal_note} /><small>Never visible to the supplier.</small></label>
      </div>}
      {step === 4 && <div className='productionFormSection productionReview'>
        <header><p className='technicalLabel'>Step 5 of 5</p><h2>Review the commitment</h2><p>Assigning sends the record to the supplier’s action-required queue. Acceptance will require an expected shipping date.</p></header>
        <dl className='appDetailList'>
          <div><dt>Part</dt><dd>{form.part_number || 'Missing'} — {form.part_name || 'Missing'}</dd></div>
          <div><dt>Revision</dt><dd>{form.drawing_revision || 'Not provided'}</dd></div>
          <div><dt>PO</dt><dd>{form.po_number || 'Missing'}{form.po_line_number ? ` / line ${form.po_line_number}` : ''}</dd></div>
          <div><dt>Quantity</dt><dd>{form.quantity || 'Missing'} {productionUnits.find(([key]) => key === form.unit)?.[1] || formatLabel(form.unit)}</dd></div>
          <div><dt>Required arrival</dt><dd>{formatDate(form.required_delivery_date)}</dd></div>
          <div><dt>Supplier</dt><dd>{activeRelationships.find(item => supplierFromRelationship(item)?.id === form.supplier_organization_id)?.supplier_organization?.name || 'Not selected'}</dd></div>
          <div><dt>Document protection</dt><dd>Velakron Platform Confidentiality Terms</dd></div>
          <div><dt>Export control</dt><dd>{form.export_control === 'itar' ? 'ITAR controlled' : 'Not marked ITAR'}</dd></div>
          <div><dt>First article</dt><dd>{form.first_article_required ? 'Required' : 'Not required'}</dd></div>
          <div><dt>Material</dt><dd>{form.workflow_configuration.material_source === 'oem' ? 'OEM provided' : 'Supplier provided'}</dd></div>
          <div><dt>Production route</dt><dd>{routePreview.map(item => item.label).join(' → ')}</dd></div>
        </dl>
      </div>}
    </div>
    <footer className='productionFormFooter'>
      <div>
        {step > 0 && <Button variant='secondary' onClick={() => setStep(current => current - 1)} disabled={pending}><ArrowLeft aria-hidden='true' /> Back</Button>}
        <Button variant='secondary' onClick={() => save('draft')} disabled={pending}><Save aria-hidden='true' /> Save draft</Button>
      </div>
      {step < steps.length - 1
        ? <Button onClick={() => setStep(current => current + 1)} disabled={pending}>Continue <ArrowRight aria-hidden='true' /></Button>
        : <Button onClick={() => save('assign')} disabled={pending}><Send aria-hidden='true' /> Assign to supplier</Button>}
    </footer>
  </section>
}

export default ProductionRecordForm
