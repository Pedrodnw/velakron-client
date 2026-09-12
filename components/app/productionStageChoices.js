export const productionStageChoices = (workflow, record, actorType) => {
  const stages = workflow?.stages || []
  const currentIndex = record.current_workflow_step_id
    ? stages.findIndex(stage => stage.id === record.current_workflow_step_id)
    : stages.findIndex(stage => stage.key === record.current_stage)
  const current = stages[currentIndex]
  const next = current ? stages[currentIndex + 1] : null
  const choices = { current, next, advance: null, skips: [], backward: [] }
  if (!current) return choices

  stages.forEach((stage, index) => {
    if (stage.owner !== actorType || index === currentIndex || ['accepted', 'delivered', 'quality_review', 'approved'].includes(stage.key)) return
    if (index < currentIndex) {
      if (index > 1) choices.backward.push(stage)
    } else if (index === currentIndex + 1) choices.advance = stage
    else if (stages.slice(currentIndex + 1, index).every(item => item.skippable)) choices.skips.push(stage)
  })
  return choices
}
