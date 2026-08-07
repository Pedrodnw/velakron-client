import { Check, Circle } from 'lucide-react'

const ProductionStageStepper = ({ stages = [], currentStage, lifecycleState }) => {
  if (!currentStage) return <p className='productionStageEmpty'>This draft has not been assigned yet.</p>
  const currentIndex = stages.findIndex(stage => stage.key === currentStage)
  return <ol className='productionStages' aria-label='Production progress'>
    {stages.map((stage, index) => {
      const complete = index < currentIndex || currentStage === 'delivered'
      const current = index === currentIndex && currentStage !== 'delivered'
      return <li key={stage.key} className={`${complete ? 'is-complete' : ''} ${current ? 'is-current' : ''}`}>
        <span>{complete ? <Check aria-hidden='true' /> : <Circle aria-hidden='true' />}</span>
        <div><strong>{stage.label}</strong>{stage.skippable && <small>Optional</small>}</div>
      </li>
    })}
    {lifecycleState === 'cancelled' && <li className='is-cancelled'><span><Circle aria-hidden='true' /></span><div><strong>Cancelled</strong></div></li>}
  </ol>
}

export default ProductionStageStepper
