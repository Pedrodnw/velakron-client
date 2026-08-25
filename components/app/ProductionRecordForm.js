import { AlertTriangle, ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, FileText, GripVertical, Package, Plus, Save, Send, Settings2, ShieldAlert, Trash2, UsersRound } from 'lucide-react'
import { useMemo, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import { formatDate, formatLabel } from './formatters'
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

const ProductionRecordForm = ({ initial = blankProductionRecord, relationships = [], pending, feedback, workflow, itarCapability, onSubmit }) => {
  const builder = workflow?.builder || fallbackWorkflowBuilder
  const [form, setForm] = useState(() => ({
    ...blankProductionRecord,
    ...initial,
    workflow_configuration: workflowConfiguration(initial.workflow_configuration, builder),
  }))
  const [step, setStep] = useState(0)
  const [draggedStage, setDraggedStage] = useState(null)
  const activeRelationships = useMemo(() => relationships.filter(item => (
    item.status === 'active' && supplierFromRelationship(item)?.id
  )), [relationships])
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const setWorkflow = (key, value) => setForm(current => ({
    ...current,
    workflow_configuration: {
      ...current.workflow_configuration,
      [key]: value,
      ...(key === 'material_source' && value !== 'oem' ? { supplier_material_quantity_confirmation: false } : {}),
    },
  }))
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

  const save = action => onSubmit({
    ...form,
    action,
    quantity: form.quantity === '' ? null : Number(form.quantity),
    transit_days: form.transit_days === '' ? null : Number(form.transit_days),
    supplier_organization_id: action === 'assign' ? form.supplier_organization_id : undefined,
  })

  return <section className='appPanel productionFormPanel'>
    <nav className='productionFormSteps' aria-label='Production record steps'>
      {steps.map((item, index) => <button key={item.key} type='button' className={index === step ? 'is-active' : index < step ? 'is-complete' : ''} onClick={() => setStep(index)}>
        <item.icon aria-hidden='true' /><span>{item.label}</span>
      </button>)}
    </nav>
    <div className='productionFormBody'>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      {step === 0 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 1 of 5</p><h2>Identify the awarded part</h2><p>Part numbers can repeat across orders. Velakron will create a unique tracking reference.</p></header>
        <div className='productionFormGrid'>
          <FormField id='production-part-number' label='Part number' value={form.part_number} onChange={event => set('part_number', event.target.value)} required />
          <FormField id='production-revision' label='Drawing revision' value={form.drawing_revision} onChange={event => set('drawing_revision', event.target.value)} hint='Optional structured reference, such as C or Rev 7.' />
          <FormField id='production-part-name' label='Part name or description' value={form.part_name} onChange={event => set('part_name', event.target.value)} required />
          <FormField id='production-process' label='Process summary' value={form.process_summary} onChange={event => set('process_summary', event.target.value)} hint='Optional, such as five-axis machining and anodizing.' />
        </div>
        <label className={`productionCheck itarClassificationControl${form.export_control === 'itar' ? ' is-selected' : ''}`}><input type='checkbox' checked={form.export_control === 'itar'} disabled={!itarCapability?.enabled && !itarCapability?.preview} onChange={event => set('export_control', event.target.checked ? 'itar' : 'none')} /><ShieldAlert aria-hidden='true' /><span><strong>This production record contains ITAR-controlled technical data</strong><small>This is a permanent high-security classification. Every file access will require a fresh U.S.-person and ITAR-handling confirmation.</small></span></label>
        {!itarCapability?.enabled && itarCapability?.preview && <div className='itarAvailabilityNotice itarAvailabilityNotice--preview'><AlertTriangle aria-hidden='true' /><p><strong>Local preview only.</strong> Use synthetic files to review this workflow. Real ITAR data remains blocked until the GovCloud/FIPS environment is enabled.</p></div>}
        {!itarCapability?.enabled && !itarCapability?.preview && <div className='itarAvailabilityNotice'><ShieldAlert aria-hidden='true' /><p><strong>ITAR storage is not yet enabled.</strong> Records cannot be marked ITAR until Velakron is running in the approved GovCloud/FIPS environment.</p></div>}
      </div>}
      {step === 1 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 2 of 5</p><h2>Add the purchase-order reference</h2><p>This record represents one awarded commitment or PO line. Pricing is intentionally not stored here.</p></header>
        <div className='productionFormGrid'>
          <FormField id='production-po' label='PO number' value={form.po_number} onChange={event => set('po_number', event.target.value)} required />
          <FormField id='production-po-line' label='PO line' value={form.po_line_number} onChange={event => set('po_line_number', event.target.value)} hint='Optional' />
          <FormField id='production-erp' label='ERP reference' value={form.external_erp_reference} onChange={event => set('external_erp_reference', event.target.value)} hint='Optional plain-text reference only.' />
        </div>
      </div>}
      {step === 2 && <div className='productionFormSection'>
        <header><p className='technicalLabel'>Step 3 of 5</p><h2>Define the production commitment</h2><p>The required date is when the OEM needs the order to arrive.</p></header>
        <div className='productionFormGrid'>
          <FormField id='production-quantity' label='Quantity' type='number' min='0.000001' step='any' value={form.quantity} onChange={event => set('quantity', event.target.value)} required />
          <label className='selectField' htmlFor='production-unit'><span>Unit of measure</span><select id='production-unit' value={form.unit} onChange={event => set('unit', event.target.value)}>{productionUnits.map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          {form.unit === 'other' && <FormField id='production-unit-other' label='Describe the unit' value={form.unit_other} onChange={event => set('unit_other', event.target.value)} required />}
          <FormField id='production-required-date' label='Required arrival date' type='date' value={form.required_delivery_date} onInput={event => set('required_delivery_date', event.target.value)} onBlur={event => set('required_delivery_date', event.target.value)} required />
          <FormField id='production-transit' label='Estimated transit days' type='number' min='0' max='365' step='1' value={form.transit_days} onChange={event => set('transit_days', event.target.value)} hint='Optional. Used to compare the supplier forecast with arrival.' />
        </div>
        <div className='workflowBuilder'>
          <header><p className='technicalLabel'>Job-specific route</p><h3>Choose how this part will move through production</h3><p>The current Velakron workflow is preselected. Change only the stages this job needs.</p></header>
          <fieldset className='workflowChoiceGroup'>
            <legend>Who provides the raw material?</legend>
            <div className='workflowChoiceGrid'>{builder.material_sources.map(source => <label key={source.key} className={form.workflow_configuration.material_source === source.key ? 'is-selected' : ''}><input type='radio' name='material-source' value={source.key} checked={form.workflow_configuration.material_source === source.key} onChange={() => setWorkflow('material_source', source.key)} /><span><strong>{source.label}</strong><small>{source.key === 'supplier' ? 'Supplier orders and receives material.' : 'OEM orders material; supplier confirms receipt.'}</small></span></label>)}</div>
          </fieldset>
          {form.workflow_configuration.material_source === 'oem' && <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.supplier_material_quantity_confirmation} onChange={event => setWorkflow('supplier_material_quantity_confirmation', event.target.checked)} /><span><strong>Supplier must confirm the received material quantity</strong><small>Adds a required confirmation between the OEM material order and material receipt.</small></span></label>}
          <div className='workflowToggleGrid'>
            <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.include_programming} onChange={event => setWorkflow('include_programming', event.target.checked)} /><span><strong>Programming</strong><small>Include programming before first article or production.</small></span></label>
            <label className='productionCheck'><input type='checkbox' checked={form.first_article_required} onChange={event => set('first_article_required', event.target.checked)} /><span><strong>First article approval</strong><small>Add supplier inspection and explicit OEM approval before production.</small></span></label>
            <label className='productionCheck'><input type='checkbox' checked={form.workflow_configuration.include_quality_review} onChange={event => setWorkflow('include_quality_review', event.target.checked)} /><span><strong>Receiving quality review</strong><small>Add an OEM quality-review stage after the shipment is received.</small></span></label>
          </div>
          {form.first_article_required && <label className='textAreaField' htmlFor='production-first-article'><span>First article instructions</span><textarea id='production-first-article' value={form.first_article_note} onChange={event => set('first_article_note', event.target.value)} maxLength={2000} /></label>}
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
        <label className='selectField' htmlFor='production-supplier'><span>Connected supplier</span><select id='production-supplier' value={form.supplier_organization_id} onChange={event => set('supplier_organization_id', event.target.value)}><option value=''>Select supplier</option>{activeRelationships.map(relationship => { const supplier = supplierFromRelationship(relationship); return <option key={supplier.id} value={supplier.id}>{supplier.name}</option> })}</select><small>You can still save this record as a private draft without choosing a supplier. Once assigned, active members of both companies collaborate under the Platform Confidentiality Terms.</small></label>
        <div className='regulatedDataNotice regulatedDataNotice--form'><FileText aria-hidden='true' /><p><strong>{form.export_control === 'itar' ? 'ITAR handling applies.' : 'Do not upload unsupported regulated data.'}</strong> {form.export_control === 'itar' ? 'All files on this record inherit the ITAR classification and protected access workflow.' : 'EAR-controlled, CUI, classified, and similar data are not supported. ITAR data is accepted only on a record explicitly marked ITAR in an enabled environment.'}</p></div>
        <label className='textAreaField' htmlFor='production-internal-note'><span>OEM-internal note</span><textarea id='production-internal-note' value={form.oem_internal_note} onChange={event => set('oem_internal_note', event.target.value)} maxLength={3000} /><small>Never visible to the supplier.</small></label>
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
        : <Button onClick={() => save('assign')} disabled={pending || !form.supplier_organization_id}><Send aria-hidden='true' /> Assign to supplier</Button>}
    </footer>
  </section>
}

export default ProductionRecordForm
