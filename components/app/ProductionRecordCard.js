import { AlertTriangle, ArrowRight, CalendarDays, Clock3, Truck } from 'lucide-react'
import LinkWrap from '../LinkWrap'
import { formatDate, formatDateTime, formatLabel } from './formatters'
import StageBadge from './StageBadge'
import ScheduleHealthBadge from './ScheduleHealthBadge'
import StatusBadge from './StatusBadge'
import ProductionCardThumbnail from './ProductionCardThumbnail'
import ProductionCardProgress from './ProductionCardProgress'
import ProductionPendingActions from './ProductionPendingActions'

const ProductionRecordCard = ({ record, organizationType, compact = false, showAttention = true }) => {
  const presentation = record.card_presentation
  const name = presentation?.identity?.name || record.part_name || record.part_number || 'Production record'
  const partNumber = presentation?.identity?.part_number || record.part_number
  const revision = presentation?.identity?.revision
  const company = organizationType === 'supplier' ? record.oem_organization?.name || 'OEM customer' : record.supplier_organization?.name || 'Unassigned supplier'
  const blocked = Number(record.active_production_block_count) > 0
  const detailedSources = new Set((record.pending_actions || []).map(action => action.source))
  const reasons = [...new Set(record.active_attention_codes || [])].filter(code => !detailedSources.has(code))
  return <article className={`productionCard${compact ? ' productionCard--compact' : ''}`}>
    <header className='productionCard__header'>
      <ProductionCardThumbnail descriptor={presentation?.thumbnail} protectedImage={record.export_control === 'itar' || record.confidentiality_locked} />
      <div className='productionCard__identity'>
        <h3>{name}</h3>
        {partNumber && partNumber !== name && <p className='productionCard__partNumber'>{partNumber}{revision && <span>Rev {revision}</span>}</p>}
        {(!partNumber || partNumber === name) && revision && <p className='productionCard__partNumber'><span>Rev {revision}</span></p>}
        <p className='productionCard__company'>{company}</p>
        <p className='productionCard__reference'>{record.public_reference}</p>
      </div>
    </header>
    <div className='productionCard__badges'>
      {record.export_control === 'itar' && <StatusBadge tone='danger'>ITAR</StatusBadge>}
      <StageBadge value={record.current_stage} />
      <ScheduleHealthBadge value={record.schedule_health} />
      {blocked && <StatusBadge tone='danger'>Production blocked</StatusBadge>}
      {showAttention && <ProductionPendingActions record={record} />}
    </div>
    <dl className='productionCard__schedule'>
      {[['Required arrival', formatDate(record.required_delivery_date), CalendarDays], ['Expected ship', formatDate(record.expected_ship_date), Truck], ['Last supplier update', formatDateTime(record.last_supplier_update_at), Clock3]].map(([label, value, Icon]) => <div key={label}><dt>{label}</dt><dd><Icon aria-hidden='true' /><span>{value}</span></dd></div>)}
    </dl>
    <ProductionCardProgress progress={presentation?.progress} currentStage={record.current_stage} lifecycleState={record.lifecycle_state} />
    <LinkWrap className='productionCard__open' href={`/app/production/${record.id}`} aria-label={`Open ${name} production record ${record.public_reference || ''}`}>Open <ArrowRight aria-hidden='true' /></LinkWrap>
    {showAttention && reasons.length > 0 && <div className='productionCard__attention'><AlertTriangle aria-hidden='true' /><ul aria-label='Attention required'>{reasons.map(reason => <li key={reason}>{formatLabel(reason)}</li>)}</ul></div>}
  </article>
}

export default ProductionRecordCard
