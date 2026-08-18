import { AlertTriangle, Archive, CheckCircle2, CircleDot, Cog, FileCheck2, MessageSquareText, PackageCheck, RotateCcw, Truck, UserRoundCheck, XCircle } from 'lucide-react'
import { attentionCategoryFor } from './attentionCategories'
import TimelineRow from './TimelineRow'
import { formatDateTime, formatLabel } from './formatters'

const presentation = {
  'production_record.created': { title: 'Production record created', icon: CircleDot },
  'production_record.updated': { title: 'Production details updated', icon: CircleDot },
  'production_record.commitment_changed': { title: 'Commitment changed — acceptance required', icon: RotateCcw },
  'supplier_assignment.created': { title: 'Supplier assigned', icon: UserRoundCheck },
  'supplier_assignment.reassigned': { title: 'Supplier reassigned', icon: RotateCcw },
  'supplier_assignment.accepted': { title: 'Assignment accepted', icon: CheckCircle2 },
  'supplier_assignment.declined': { title: 'Assignment declined', icon: XCircle },
  'machine_assignment.created': { title: 'Machine assigned', icon: Cog },
  'machine_assignment.changed': { title: 'Machine changed', icon: Cog },
  'machine_assignment.removed': { title: 'Machine removed', icon: Cog },
  'production_stage.changed': { title: 'Production stage updated', icon: CircleDot },
  'production_record.delivered': { title: 'Delivery confirmed', icon: PackageCheck },
  'production_record.cancelled': { title: 'Production record cancelled', icon: XCircle },
  'production_record.reopened': { title: 'Production record reopened', icon: RotateCcw },
  'production_record.archived': { title: 'Production record archived', icon: Truck },
  'production_record.forecast_updated': { title: 'Shipping forecast updated', icon: Truck },
  'note.created': { title: 'Note added', icon: MessageSquareText },
  'note.revised': { title: 'Note revised', icon: MessageSquareText },
  'note.archived': { title: 'Note archived', icon: Archive },
  'attachment.available': { title: 'File uploaded and verified', icon: FileCheck2 },
  'attachment.archived': { title: 'File archived', icon: Archive },
  'attention.reported': { title: 'Attention reason reported', icon: AlertTriangle },
  'attention.resolved': { title: 'Attention reason resolved', icon: CheckCircle2 },
  'production_record.quality_issue_reported': { title: 'Quality issue opened', icon: AlertTriangle },
  'production_record.quality_approved': { title: 'Parts approved by OEM', icon: CheckCircle2 },
}

const describe = event => {
  const actor = event.actor?.display_name || event.actor?.organization_name || 'Authorized user'
  const stage = event.new_stage && event.previous_stage !== event.new_stage
    ? `Moved from ${formatLabel(event.previous_stage)} to ${formatLabel(event.new_stage)}.`
    : ''
  const dateChange = event.expected_ship_before && event.expected_ship_after
    ? `Expected ship moved from ${formatDateTime(event.expected_ship_before)} to ${formatDateTime(event.expected_ship_after)}.`
    : ''
  const message = event.note_reference?.body || event.note || event.reason || dateChange || stage
  const attachments = event.attachment_references?.length
    ? ` ${event.attachment_references.map(item => item.display_filename || item.original_filename).join(', ')}.`
    : ''
  return `${actor}${message ? ` — ${message}` : ''}${attachments}`
}

const ProductionTimeline = ({ events = [] }) => <div className='productionTimeline'>
  {[...events].reverse().map(event => {
    const item = presentation[event.event_type] || {
      title: formatLabel(event.event_type?.replaceAll('.', '_')),
      icon: CircleDot,
    }
    const category = attentionCategoryFor(event.after?.category)
    const title = category && event.event_type === 'attention.reported'
      ? `${category.label} flagged`
      : category && event.event_type === 'attention.resolved'
        ? `${category.label} resolved`
        : item.title
    return <TimelineRow
      key={event.id || event._id}
      title={title}
      description={describe(event)}
      time={formatDateTime(event.occurred_at)}
      icon={item.icon}
    />
  })}
</div>

export default ProductionTimeline
