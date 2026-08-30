import { AlertTriangle, Archive, CheckCircle2, CircleDot, Cog, FileCheck2, MessageSquareText, PackageCheck, RotateCcw, Ruler, Truck, UserRoundCheck, XCircle } from 'lucide-react'
import { Button } from '../design-system'
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
  'attention.workflow_action': { title: 'Attention workflow updated', icon: CircleDot },
  'production_record.quality_issue_reported': { title: 'Quality issue opened', icon: AlertTriangle },
  'production_record.quality_approved': { title: 'Parts approved by OEM', icon: CheckCircle2 },
  'collaboration.created': { title: 'Technical case created', icon: MessageSquareText },
  'collaboration.message_added': { title: 'Technical case reply added', icon: MessageSquareText },
  'collaboration.promoted_to_attention': { title: 'Technical case promoted to production attention', icon: AlertTriangle },
  'part_review.acknowledged': { title: 'Released revision acknowledged', icon: CheckCircle2 },
  'inspection.run_started': { title: 'Inspection run started', icon: Ruler },
  'inspection.result_recorded': { title: 'Inspection result recorded', icon: Ruler },
  'inspection.submitted': { title: 'Inspection package submitted', icon: FileCheck2 },
  'inspection.accepted': { title: 'Inspection package accepted', icon: CheckCircle2 },
  'inspection.rejected': { title: 'Inspection package returned', icon: AlertTriangle },
}

const describe = event => {
  const actor = event.actor?.display_name || event.actor?.organization_name || 'Authorized user'
  const workflowChange = event.event_type === 'attention.workflow_action'
    && event.after?.previous_state
    && event.after?.next_state
    ? `Workflow moved from ${formatLabel(event.after.previous_state)} to ${formatLabel(event.after.next_state)}.`
    : ''
  const stage = event.new_stage && event.previous_stage !== event.new_stage
    ? `Moved from ${formatLabel(event.previous_stage)} to ${formatLabel(event.new_stage)}.`
    : ''
  const dateChange = event.expected_ship_before && event.expected_ship_after
    ? `Expected ship moved from ${formatDateTime(event.expected_ship_before)} to ${formatDateTime(event.expected_ship_after)}.`
    : ''
  const message = event.note_reference?.body || event.note || event.reason || workflowChange || dateChange || stage
  const attachments = event.attachment_references?.length
    ? ` ${event.attachment_references.map(item => item.display_filename || item.original_filename).join(', ')}.`
    : ''
  return `${actor}${message ? ` — ${message}` : ''}${attachments}`
}

const ProductionTimeline = ({ events = [], onOpenPartCase }) => <div className='productionTimeline'>
  {[...events].sort((left, right) => new Date(right.occurred_at || right.created_at || 0) - new Date(left.occurred_at || left.created_at || 0)).map(event => {
    const isCollaboration = event.event_type?.startsWith('collaboration.')
    const isInspection = event.event_type?.startsWith('inspection.')
    const item = presentation[event.event_type] || (isCollaboration
      ? { title: formatLabel(event.event_type.replace('collaboration.', 'technical_case_')), icon: MessageSquareText }
      : isInspection
        ? { title: formatLabel(event.event_type.replace('inspection.', 'inspection_')), icon: Ruler }
        : { title: formatLabel(event.event_type?.replaceAll('.', '_')), icon: CircleDot })
    const category = attentionCategoryFor(event.after?.category)
    const title = event.event_type === 'attention.workflow_action' && event.after?.action
      ? `${formatLabel(event.after.action)} — ${category?.label || 'attention flag'}`
      : category && event.event_type === 'attention.reported'
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
      action={event.collaboration_item && onOpenPartCase ? <Button variant='secondary' onClick={() => onOpenPartCase(String(event.collaboration_item?.id || event.collaboration_item?._id || event.collaboration_item))}><MessageSquareText aria-hidden='true' /> Open discussion</Button> : null}
    />
  })}
</div>

export default ProductionTimeline
