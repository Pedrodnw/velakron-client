import { Check, Circle } from 'lucide-react'

const ProductionStageStepper = ({ stages = [], currentStage, currentStepId, lifecycleState }) => {
  if (!currentStage) return <p className='productionStageEmpty'>This draft has not been assigned yet.</p>
  const currentIndex = currentStepId
    ? stages.findIndex(stage => stage.id === currentStepId)
    : stages.findIndex(stage => stage.key === currentStage)
  const workflowCompleted = lifecycleState === 'completed'
  const workflowCancelled = lifecycleState === 'cancelled'
  const completed = workflowCompleted
    ? stages.length
    : Math.max(0, currentIndex)
  const currentLabel = workflowCompleted
    ? 'Production completed'
    : workflowCancelled ? 'Production cancelled'
      : stages[currentIndex]?.label || currentStage
  const progress = stages.length ? Math.round((completed / stages.length) * 100) : 0

  return <div className='productionStageTracker'>
    <div className='productionStageSummary'>
      <div>
        <span>{workflowCompleted || workflowCancelled ? 'Workflow status' : 'Current stage'}</span>
        <strong>{currentLabel}</strong>
      </div>
      <div className='productionStageSummary__progress'>
        <span>{completed} of {stages.length} stages complete</span>
        <div role='progressbar' aria-label='Production workflow completion' aria-valuemin='0' aria-valuemax='100' aria-valuenow={progress}>
          <span style={{ width: `${progress}%` }} />
        </div>
      </div>
    </div>
    <ol className='productionStages' aria-label='Production progress'>
      {stages.map((stage, index) => {
        const complete = workflowCompleted || index < currentIndex
        const current = index === currentIndex && !workflowCompleted && !workflowCancelled
        const owner = stage.skippable ? 'Optional' : stage.owner === 'oem' ? 'OEM action' : stage.owner === 'supplier' ? 'Supplier action' : 'Automatic'
        return <li key={stage.id || `${stage.key}-${index}`} className={`${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}>
          <span className='productionStageMarker'>{complete ? <Check aria-hidden='true' /> : index + 1}</span>
          <div>
            <small>Step {index + 1} of {stages.length}</small>
            <strong>{stage.label}</strong>
            <span>{owner}</span>
          </div>
          <em>{complete ? 'Complete' : current ? 'Current' : 'Upcoming'}</em>
        </li>
      })}
      {lifecycleState === 'cancelled' && <li className='is-cancelled'><span className='productionStageMarker'><Circle aria-hidden='true' /></span><div><small>Workflow status</small><strong>Cancelled</strong><span>Production stopped</span></div><em>Closed</em></li>}
    </ol>
  </div>
}

export default ProductionStageStepper
