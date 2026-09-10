import { formatLabel } from './formatters'

const ProductionCardProgress = ({ progress, currentStage, lifecycleState }) => {
  const state = lifecycleState || progress?.lifecycle_state
  const closedLabel = { completed: 'Production completed', cancelled: 'Production cancelled', archived: 'Production archived', draft: 'Not yet assigned' }[state]
  const known = Number.isInteger(progress?.position) && progress.position > 0 && Number.isInteger(progress?.total) && progress.position <= progress.total
  const label = closedLabel || progress?.current_label || (currentStage ? formatLabel(currentStage) : 'Stage not available')
  const showPosition = !closedLabel && known
  const fraction = state === 'completed' ? 1 : showPosition ? (progress.position - 1) / Math.max(1, progress.total - 1) : 0
  return <div className={`productionCard__progress${state === 'completed' ? ' is-completed' : ''}`}>
    <div><strong>{label}</strong><span>{showPosition ? `Stage ${progress.position} of ${progress.total}` : closedLabel ? 'Workflow status' : 'Current stage'}</span></div>
    {(showPosition || state === 'completed') && <div className='productionCard__track' aria-hidden='true'><span style={{ width: `${fraction * 100}%` }} /><i style={{ left: `${fraction * 100}%` }} /></div>}
  </div>
}

export default ProductionCardProgress
