const fields = {
  part_number: ['production-part-number', 0, 'Part number', 160],
  part_name: ['production-part-name', 0, 'Part name', 300],
  drawing_revision: ['production-revision', 0, 'Drawing revision', 120],
  process_summary: ['production-process', 0, 'Process summary', 1000],
  part_revision_id: ['production-part-workspace', 0, 'Released Part Workspace revision'],
  export_control: ['production-export-control', 0, 'Export control'],
  po_number: ['production-po', 1, 'PO number', 160],
  po_line_number: ['production-po-line', 1, 'PO line', 80],
  external_erp_reference: ['production-erp', 1, 'ERP reference', 160],
  quantity: ['production-quantity', 2, 'Quantity'],
  unit: ['production-unit', 2, 'Unit of measure'],
  unit_other: ['production-unit-other', 2, 'Unit description', 80],
  required_delivery_date: ['production-required-date', 2, 'Required arrival date'],
  transit_days: ['production-transit', 2, 'Estimated transit days'],
  first_article_required: ['production-first-article-required', 2, 'First article approval'],
  first_article_note: ['production-first-article', 2, 'First article instructions', 2000],
  workflow_configuration: ['production-workflow', 2, 'Production route'],
  supplier_organization_id: ['production-supplier', 3, 'Connected supplier'],
  oem_internal_note: ['production-internal-note', 3, 'OEM-internal note', 3000],
}

export const productionErrorTarget = (field, form = {}) => {
  let key = field.startsWith('workflow_configuration.') ? 'workflow_configuration' : field
  if (form.part_revision_id && ['part_number', 'part_name', 'drawing_revision', 'export_control'].includes(key)) key = 'part_revision_id'
  if (key === 'unit_other' && form.unit !== 'other') key = 'unit'
  if (key === 'first_article_note' && !form.first_article_required) key = 'first_article_required'
  const definition = fields[key]
  return definition ? { id: definition[0], step: definition[1], label: definition[2] } : null
}

const empty = value => value === null || value === undefined || String(value).trim() === ''
const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

// Mirror the editable create-form constraints; the API remains authoritative.
export const validateProductionForm = (form, action = 'assign') => {
  const errors = {}
  if (action === 'assign') {
    for (const key of ['part_number', 'part_name', 'po_number', 'quantity', 'unit', 'required_delivery_date']) {
      if (empty(form[key])) errors[key] = `${fields[key][2]} is required`
    }
    if (empty(form.supplier_organization_id)) errors.supplier_organization_id = 'Select an active connected supplier'
  }
  for (const [key, [, , label, maximum]] of Object.entries(fields)) {
    if (maximum && String(form[key] ?? '').trim().length > maximum) errors[key] = `${label} must contain at most ${maximum.toLocaleString('en-US')} characters`
  }
  if (!empty(form.quantity) && (!Number.isFinite(Number(form.quantity)) || Number(form.quantity) <= 0 || Number(form.quantity) > 1_000_000_000)) errors.quantity = 'Quantity must be greater than zero and no more than 1,000,000,000'
  if (form.unit === 'other' && empty(form.unit_other)) errors.unit_other = 'Describe the unit when Other is selected'
  if (!empty(form.required_delivery_date) && !validDate(form.required_delivery_date)) errors.required_delivery_date = 'Enter a valid required arrival date'
  if (!empty(form.transit_days) && (!Number.isInteger(Number(form.transit_days)) || Number(form.transit_days) < 0 || Number(form.transit_days) > 365)) errors.transit_days = 'Transit days must be a whole number between 0 and 365'
  return errors
}

export const productionServerIssues = feedback => {
  const mapped = {}
  const general = []
  for (const [key, value] of Object.entries(feedback?.details || {})) {
    const message = typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : ''
    if (!message) continue
    if (productionErrorTarget(key)) mapped[key] = message
    else general.push(message)
  }
  const fieldForCode = { RELATIONSHIP_REQUIRED: 'supplier_organization_id', PART_REVISION_REQUIRED: 'part_revision_id' }[feedback?.code]
  if (fieldForCode && feedback?.message) mapped[fieldForCode] = feedback.message
  if (!Object.keys(mapped).length && !general.length && feedback?.type === 'error') general.push(feedback.message || 'The record could not be saved. Please try again.')
  return { fields: mapped, general }
}
