import { Check, Circle } from 'lucide-react'

const ProductionStageStepper = ({ stages = [], currentStage, currentStepId, lifecycleState }) => {
  if (!currentStage) return <p className='productionStageEmpty'>This draft has not been assigned yet.</p>
  const currentIndex = currentStepId
    ? stages.findIndex(stage => stage.id === currentStepId)
    : stages.findIndex(stage => stage.key === currentStage)
  return <ol className='productionStages' aria-label='Production progress'>
    {stages.map((stage, index) => {
      const complete = index < currentIndex || (index === currentIndex && lifecycleState === 'completed')
      const current = index === currentIndex && lifecycleState !== 'completed'
      return <li key={stage.id || `${stage.key}-${index}`} className={`${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}>
        <span>{complete ? <Check aria-hidden='true' /> : <Circle aria-hidden='true' />}</span>
        <div><strong>{stage.label}</strong><small>{stage.skippable ? 'Optional' : stage.owner === 'oem' ? 'OEM action' : stage.owner === 'supplier' ? 'Supplier action' : 'Automatic'}</small></div>
      </li>
    })}
    {lifecycleState === 'cancelled' && <li className='is-cancelled'><span><Circle aria-hidden='true' /></span><div><strong>Cancelled</strong></div></li>}
  </ol>
}

export default ProductionStageStepper
