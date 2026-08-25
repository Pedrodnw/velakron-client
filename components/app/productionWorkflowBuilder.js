export const fallbackWorkflowBuilder = Object.freeze({
  configuration_defaults: Object.freeze({
    material_source: 'supplier',
    supplier_material_quantity_confirmation: false,
    include_programming: true,
    include_quality_review: true,
    custom_process_stages: Object.freeze([]),
  }),
  material_sources: Object.freeze([
    Object.freeze({ key: 'supplier', label: 'Supplier-provided material' }),
    Object.freeze({ key: 'oem', label: 'OEM-provided material' }),
  ]),
  custom_stage_catalog: Object.freeze([
    Object.freeze({ key: 'secondary_machining', label: 'Secondary machining' }),
    Object.freeze({ key: 'heat_treatment', label: 'Heat treatment' }),
    Object.freeze({ key: 'paint', label: 'Paint' }),
    Object.freeze({ key: 'anodizing', label: 'Anodizing' }),
    Object.freeze({ key: 'secondary_inspection', label: 'Secondary inspection' }),
  ]),
  maximum_custom_stages: 20,
})

export const workflowConfiguration = (input, builder = fallbackWorkflowBuilder) => ({
  ...builder.configuration_defaults,
  ...(input || {}),
  custom_process_stages: [...(input?.custom_process_stages || builder.configuration_defaults.custom_process_stages || [])],
})

export const buildWorkflowPreview = ({ configuration, firstArticleRequired, builder = fallbackWorkflowBuilder }) => {
  const config = workflowConfiguration(configuration, builder)
  const catalog = new Map(builder.custom_stage_catalog.map(stage => [stage.key, stage]))
  const steps = [
    { key: 'assigned', label: 'Assigned', owner: 'system' },
    { key: 'accepted', label: 'Accepted', owner: 'supplier' },
    {
      key: 'material_ordered',
      label: config.material_source === 'oem' ? 'OEM orders material' : 'Supplier orders material',
      owner: config.material_source === 'oem' ? 'oem' : 'supplier',
    },
  ]
  if (config.material_source === 'oem' && config.supplier_material_quantity_confirmation) {
    steps.push({ key: 'material_quantity_confirmed', label: 'Supplier confirms material quantity', owner: 'supplier' })
  }
  steps.push({ key: 'material_received', label: 'Material received', owner: 'supplier' })
  if (config.include_programming) steps.push({ key: 'programming', label: 'Programming', owner: 'supplier' })
  if (firstArticleRequired) {
    steps.push({ key: 'first_article_inspection', label: 'First article inspection', owner: 'supplier' })
    steps.push({ key: 'first_article_approved', label: 'OEM first article approval', owner: 'oem' })
  }
  steps.push({ key: 'in_production', label: 'In production', owner: 'supplier' })
  config.custom_process_stages.forEach((key, index) => {
    const stage = catalog.get(key)
    if (stage) steps.push({ key, label: stage.label, owner: 'supplier', customIndex: index })
  })
  steps.push(
    { key: 'inspection', label: 'Final inspection', owner: 'supplier' },
    { key: 'ready_to_ship', label: 'Ready to ship', owner: 'supplier' },
    { key: 'shipped', label: 'Shipped', owner: 'supplier' },
    { key: 'delivered', label: 'Received / awaiting inspection', owner: 'oem' },
  )
  if (config.include_quality_review) steps.push({ key: 'quality_review', label: 'Quality review', owner: 'oem' })
  steps.push({ key: 'approved', label: 'OEM approved', owner: 'oem' })
  return steps
}
