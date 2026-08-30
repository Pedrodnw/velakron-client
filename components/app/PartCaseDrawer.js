import { ArrowUpRight, CircleAlert, FileUp, LoaderCircle, MessageSquareText, Paperclip, Send, ShieldAlert, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import { formatDateTime, formatLabel, statusTone } from './formatters'
import PartAssetViewer from './PartAssetViewer'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'

const emptyForm = {
  type: 'clarification', title: '', description: '', priority: 'normal', schedule_effect: 'none', due_at: '', effectivity: '', share_id: '', production_record_ids: [],
}
const emptyProductionRecordIds = Object.freeze([])

const PartCaseDrawer = ({
  open,
  mode = 'create',
  itemDetail,
  shares = [],
  productionRecords = [],
  defaultProductionRecordIds = emptyProductionRecordIds,
  lockProductionContext = false,
  selectedAnchor,
  sourceAsset,
  linkedVisual,
  itarControlled = false,
  pending,
  upload,
  feedback,
  organizationType,
  relatedCompanyName,
  onClose,
  onCreate,
  onMessage,
  onUpdate,
  onAction,
  onUpload,
  onDownloadAttachment,
  onOpenAnchor,
  onArchive,
  onPromote,
  onRequestAnchor,
}) => {
  const [form, setForm] = useState(emptyForm)
  const [replyMode, setReplyMode] = useState('message')
  const [replyBody, setReplyBody] = useState('')
  const [workflowAction, setWorkflowAction] = useState('')
  const [promotion, setPromotion] = useState({ production_record_id: '', category: 'issue' })
  const [itarUploadAuthorized, setItarUploadAuthorized] = useState(false)
  const [assignment, setAssignment] = useState({ assignee_membership_id: '', watcher_membership_ids: [], due_at: '', priority: 'normal', schedule_effect: 'none' })
  const item = itemDetail?.item
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))

  useEffect(() => {
    if (!open || mode !== 'create') return
    setForm(current => ({
      ...emptyForm,
      share_id: shares.length === 1 ? String(shares[0].id || shares[0]._id) : current.share_id,
      production_record_ids: defaultProductionRecordIds.map(String),
    }))
    setPromotion(current => ({ ...current, production_record_id: defaultProductionRecordIds[0] ? String(defaultProductionRecordIds[0]) : '' }))
  }, [defaultProductionRecordIds, mode, open, shares.length])
  useEffect(() => {
    if (!item) return
    setReplyBody('')
    setWorkflowAction(current => item.available_actions?.some(action => action.key === current) ? current : item.available_actions?.[0]?.key || '')
    if (item.available_actions?.some(action => action.key === 'reopen')) setReplyMode('workflow')
    setAssignment({
      assignee_membership_id: String(item.assignee_membership?.id || item.assignee_membership?._id || item.assignee_membership || ''),
      watcher_membership_ids: (item.watchers || []).map(value => String(value?.id || value?._id || value)),
      due_at: item.due_at ? new Date(item.due_at).toISOString().slice(0, 10) : '',
      priority: item.priority || 'normal',
      schedule_effect: item.schedule_effect || 'none',
    })
  }, [item?.id, item?.version])
  useEffect(() => {
    if (replyMode === 'workflow' && !item?.available_actions?.length) setReplyMode('message')
    if (replyMode === 'attention' && (item?.escalated_attention || !productionRecords.length)) setReplyMode('message')
  }, [item?.available_actions?.length, item?.escalated_attention, productionRecords.length, replyMode])

  const relationshipLabel = organizationType === 'supplier' ? 'OEM customer' : 'Supplier relationship'
  const relationshipChoice = organizationType === 'supplier' ? 'Choose OEM customer' : 'Choose supplier'
  const isMyAction = item && item.current_actor_side === item.actor_side
  const canReopen = Boolean(item?.available_actions?.some(action => action.key === 'reopen'))
  const ownerLabel = !item || item.current_actor_side === 'none'
    ? 'No further action'
    : isMyAction
      ? 'Your company'
      : relatedCompanyName || `The ${formatLabel(item.current_actor_side)}`
  const selectedWorkflow = item?.available_actions?.find(action => action.key === workflowAction) || null
  const workflowSubmitLabel = selectedWorkflow
    ? /respond/i.test(selectedWorkflow.label) ? 'Send technical response'
      : /acknowledge/i.test(selectedWorkflow.label) ? 'Acknowledge and continue'
        : /approve/i.test(selectedWorkflow.label) ? 'Approve and continue'
          : /reopen/i.test(selectedWorkflow.label) ? 'Reopen case'
            : selectedWorkflow.label
    : 'Record decision'
  const canPromote = Boolean(productionRecords.length && !item?.escalated_attention)
  const replyDescription = replyMode === 'workflow'
    ? 'Record the decision and advance responsibility to the next workflow step.'
    : replyMode === 'attention'
      ? 'Create a production attention flag linked back to this technical case.'
      : 'Add context or ask a follow-up question without changing workflow responsibility.'
  const canSubmitReply = replyMode === 'workflow'
    ? Boolean(selectedWorkflow && (!selectedWorkflow.note_required || replyBody.trim().length >= 2))
    : replyMode === 'attention'
      ? Boolean(promotion.production_record_id && replyBody.trim().length >= 8)
      : Boolean(replyBody.trim())

  const submitReply = async event => {
    event.preventDefault()
    if (!canSubmitReply) return
    const result = replyMode === 'workflow'
      ? await onAction(workflowAction, replyBody)
      : replyMode === 'attention'
        ? await onPromote({ ...promotion, explanation: replyBody })
        : await onMessage(replyBody)
    if (result?.ok) setReplyBody('')
  }

  const submitCreate = event => {
    event.preventDefault()
    onCreate({
      ...form,
      effectivity: form.type === 'deviation_request' ? { scope: form.effectivity || 'This revision' } : null,
      production_record_ids: form.production_record_ids,
    })
  }

  return <ResponsiveDrawer open={open} title={mode === 'create' ? 'Create collaboration case' : item?.title || 'Collaboration case'} onClose={onClose} wide>
    {mode === 'create' ? <form className='partCaseForm' onSubmit={submitCreate}>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      <div className='partCaseForm__context'>
        <MessageSquareText aria-hidden='true' />
        <div><p className='technicalLabel'>{selectedAnchor ? 'Captured visual context' : 'Revision context'}</p><strong>{selectedAnchor ? selectedAnchor.label || formatLabel(selectedAnchor.anchor_kind || selectedAnchor.kind) : 'Revision-level case'}</strong><span>{selectedAnchor ? `${sourceAsset?.attachment?.display_filename || sourceAsset?.attachment?.original_filename || 'Selected technical file'} · The saved view will open with the case.` : 'No drawing or model selection is attached yet.'}</span></div>
        <Button type='button' variant='secondary' onClick={onRequestAnchor}>Select in viewer</Button>
      </div>
      {lockProductionContext && productionRecords[0] && <div className='partCaseLockedContext'><div><p className='technicalLabel'>Recipient</p><strong>{relatedCompanyName || (organizationType === 'supplier' ? 'OEM customer' : 'Supplier')}</strong><span>This case is shared with the company connected to this production.</span></div><div><p className='technicalLabel'>Linked production</p><strong>{productionRecords[0].public_reference || productionRecords[0].po_number}</strong><span>The case will remain visible in this production record and timeline.</span></div></div>}
      <div className='productionFormGrid'>
        <label className='selectField'><span>Case type</span><select value={form.type} onChange={event => set('type', event.target.value)}><option value='clarification'>Clarification</option><option value='information'>Information</option><option value='manufacturability_suggestion'>Manufacturability suggestion</option><option value='deviation_request'>Deviation request</option></select></label>
        {!lockProductionContext && <label className='selectField'><span>{relationshipLabel}</span><select required value={form.share_id} onChange={event => set('share_id', event.target.value)}><option value=''>{relationshipChoice}</option>{shares.filter(share => share.state === 'active').map(share => <option key={share.id || share._id} value={share.id || share._id}>{organizationType === 'supplier' ? (share.oem_organization?.name || 'OEM customer') : (share.supplier_organization?.name || 'Supplier')}</option>)}</select></label>}
        <label className='selectField'><span>Priority</span><select value={form.priority} onChange={event => set('priority', event.target.value)}><option value='low'>Low</option><option value='normal'>Normal</option><option value='high'>High</option></select></label>
        <label className='selectField'><span>Schedule effect</span><select value={form.schedule_effect} onChange={event => set('schedule_effect', event.target.value)}><option value='none'>No known effect</option><option value='possible'>Possible effect</option><option value='confirmed'>Confirmed effect</option></select></label>
        <FormField id='part-case-due' label='Due date (optional)' type='date' value={form.due_at} onChange={event => set('due_at', event.target.value)} />
        {form.type === 'deviation_request' && <FormField id='part-case-effectivity' label='Effectivity' value={form.effectivity} onChange={event => set('effectivity', event.target.value)} placeholder='Lot, quantity, serial range, or revision' required />}
      </div>
      <FormField id='part-case-title' label='Title' value={form.title} onChange={event => set('title', event.target.value)} required />
      <label className='textAreaField' htmlFor='part-case-description'><span>Question or technical context</span><textarea id='part-case-description' value={form.description} onChange={event => set('description', event.target.value)} required maxLength={6000} /></label>
      {!lockProductionContext && !!productionRecords.length && <fieldset className='partCaseLinks'><legend>Related production records (optional)</legend>{productionRecords.map(record => <label key={record.id || record._id}><input type='checkbox' checked={form.production_record_ids.includes(String(record.id || record._id))} onChange={event => set('production_record_ids', event.target.checked ? [...form.production_record_ids, String(record.id || record._id)] : form.production_record_ids.filter(id => id !== String(record.id || record._id)))} /> <span>{record.public_reference || record.po_number}</span></label>)}</fieldset>}
      <footer><Button type='button' variant='secondary' onClick={onClose}>Cancel</Button><Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} Create case</Button></footer>
    </form> : <div className='partCaseDetail'>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      {item && <>
        <div className={`partCaseNextAction${isMyAction || canReopen ? ' is-mine' : ''}`}><CircleAlert aria-hidden='true' /><div><p className='technicalLabel'>Current responsibility</p><strong>{canReopen ? 'This case is closed and can be reopened' : isMyAction ? 'Your company owns the next step' : item.current_actor_side === 'none' ? 'This workflow has no remaining action' : `Waiting on ${ownerLabel}`}</strong><span>{canReopen ? 'Review the discussion, add a reopening note, and use the prepared Reopen decision below.' : isMyAction ? 'Review the conversation, then use a workflow decision below or send a message if you need clarification.' : item.current_actor_side === 'none' ? 'The conversation and decision record remain available for reference.' : 'You can still add context to the conversation while the other company prepares its response.'}</span></div></div>
        <div className='partCaseDetail__summary'><div><p className='technicalLabel'>{formatLabel(item.type)}</p><h3>{item.title}</h3><p>{item.description}</p></div><div className='partCaseDetail__badges'><StatusBadge tone={statusTone(item.state)}>{formatLabel(item.state)}</StatusBadge><StatusBadge tone={item.priority === 'high' ? 'danger' : item.priority === 'normal' ? 'warning' : 'neutral'}>{formatLabel(item.priority)} priority</StatusBadge></div></div>
        <dl className='partCaseDetail__facts'><div><dt>Current owner</dt><dd>{ownerLabel}</dd></div><div><dt>Revision</dt><dd>{item.part_revision?.revision || 'Not available'}</dd></div><div><dt>Schedule effect</dt><dd>{formatLabel(item.schedule_effect)}</dd></div><div><dt>Due</dt><dd>{item.due_at ? formatDateTime(item.due_at) : 'No due date'}</dd></div><div><dt>Last activity</dt><dd>{formatDateTime(item.last_activity_at)}</dd></div></dl>
        <section className='partCaseMessages'><h3><MessageSquareText aria-hidden='true' /> Conversation</h3>{itemDetail.messages?.length ? itemDetail.messages.map(entry => <article key={entry.id || entry._id}><header><strong>{entry.author?.name || 'Workspace member'}</strong><time>{formatDateTime(entry.created_at)}</time></header><p>{entry.body}</p></article>) : <p className='partCaseMessages__empty'>No replies yet. The initial description above starts the record.</p>}</section>
        {item.visual_anchor && <section className='partCaseVisual'>
          <header><div><p className='technicalLabel'>Linked visual · shown in context</p><h3>{item.visual_anchor.label || formatLabel(item.visual_anchor.anchor_kind || item.visual_anchor.kind)}</h3></div><Button type='button' variant='secondary' onClick={() => onOpenAnchor?.(item.visual_anchor)}><ArrowUpRight aria-hidden='true' /> Open full viewer</Button></header>
          <div className='partCaseVisual__preview'>
            {linkedVisual?.protected
              ? <div className='partCaseVisual__notice'><ShieldAlert aria-hidden='true' /><strong>ITAR verification required</strong><span>Open this reference in the workspace and complete the required citizenship and handling confirmation.</span></div>
              : linkedVisual?.error
                ? <div className='partCaseVisual__notice'><CircleAlert aria-hidden='true' /><strong>Visual preview unavailable</strong><span>{linkedVisual.error}</span></div>
                : <PartAssetViewer asset={linkedVisual?.asset} source={linkedVisual?.source} loading={linkedVisual?.loading} anchors={[item.visual_anchor]} selectedAnchorId={item.visual_anchor.id || item.visual_anchor._id} />}
          </div>
        </section>}
        {item.archived_at && <div className='partCaseArchived'><CircleAlert aria-hidden='true' /><div><strong>Archived case</strong><span>This discussion remains available as a read-only record.</span></div></div>}
        {!item.archived_at && <form className='partCaseResponse' onSubmit={submitReply}>
          <header><div><p className='technicalLabel'>Respond</p><h3>Choose what this response should do</h3></div></header>
          <div className='partCaseResponse__modes' role='tablist' aria-label='Response type'>
            <button type='button' role='tab' aria-selected={replyMode === 'message'} className={replyMode === 'message' ? 'is-active' : ''} onClick={() => setReplyMode('message')}><strong>Reply</strong><small>Continue the conversation</small></button>
            {!!item.available_actions?.length && <button type='button' role='tab' aria-selected={replyMode === 'workflow'} className={replyMode === 'workflow' ? 'is-active' : ''} onClick={() => setReplyMode('workflow')}><strong>Decide</strong><small>Advance responsibility</small></button>}
            {canPromote && <button type='button' role='tab' aria-selected={replyMode === 'attention'} className={replyMode === 'attention' ? 'is-active' : ''} onClick={() => setReplyMode('attention')}><strong>Flag production</strong><small>Escalate schedule or quality risk</small></button>}
          </div>
          <p className='partCaseResponse__description'>{replyDescription}</p>
          {replyMode === 'workflow' && <label className='selectField'><span>Decision</span><select value={workflowAction} onChange={event => setWorkflowAction(event.target.value)}>{item.available_actions.map(action => <option key={action.key} value={action.key}>{action.label}</option>)}</select></label>}
          {replyMode === 'attention' && <div className='productionFormGrid'><label className='selectField'><span>Production record</span><select value={promotion.production_record_id} onChange={event => setPromotion(current => ({ ...current, production_record_id: event.target.value }))}><option value=''>Choose record</option>{productionRecords.map(record => <option key={record.id || record._id} value={record.id || record._id}>{record.public_reference || record.po_number}</option>)}</select></label><label className='selectField'><span>Attention type</span><select value={promotion.category} onChange={event => setPromotion(current => ({ ...current, category: event.target.value }))}><option value='information'>Information</option><option value='issue'>Issue</option><option value='production_block'>Production block</option><option value='non_conformance'>Non-conformance</option></select></label></div>}
          <label className='textAreaField' htmlFor='part-case-response'><span>{replyMode === 'workflow' ? 'Decision note' : replyMode === 'attention' ? 'Reason production attention is required' : 'Reply'}</span><textarea id='part-case-response' value={replyBody} onChange={event => setReplyBody(event.target.value)} maxLength={6000} placeholder={replyMode === 'workflow' ? 'Explain the decision or next expected action' : replyMode === 'attention' ? 'Explain the production risk and expected response' : 'Add context or ask a follow-up question'} /></label>
          <footer><Button type='submit' disabled={pending || !canSubmitReply}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />}{replyMode === 'workflow' ? workflowSubmitLabel : replyMode === 'attention' ? 'Create attention flag' : 'Send reply'}</Button></footer>
        </form>}
        <section className='partCaseAttachments'><header><h3><Paperclip aria-hidden='true' /> Evidence and files</h3>{!item.archived_at && <label className={`button button--secondary${itarControlled && !itarUploadAuthorized ? ' is-disabled' : ''}`} aria-disabled={itarControlled && !itarUploadAuthorized}><FileUp aria-hidden='true' /> Attach file<input type='file' hidden disabled={itarControlled && !itarUploadAuthorized} onChange={event => { const file = event.target.files?.[0]; if (file) onUpload(file, { itar_upload_authorized: itarUploadAuthorized, synthetic_data_acknowledged: itarUploadAuthorized }); event.target.value = '' }} /></label>}</header>{itarControlled && !item.archived_at && <label className='productionCheck partCaseAttachments__itar'><input type='checkbox' checked={itarUploadAuthorized} onChange={event => setItarUploadAuthorized(event.target.checked)} /><ShieldAlert aria-hidden='true' /><span><strong>I am authorized to attach this ITAR-controlled data</strong><small>The evidence inherits the same protected handling and access rules as this revision.</small></span></label>}{upload && <p><LoaderCircle className='spin' aria-hidden='true' /> {upload.filename} · {upload.progress}%</p>}{itemDetail.attachments?.length ? <ul>{itemDetail.attachments.map(file => <li key={file.id || file._id}><span>{file.display_filename || file.original_filename}</span><div>{file.export_control === 'itar' && <ShieldAlert aria-hidden='true' />}<Button type='button' variant='secondary' onClick={() => onDownloadAttachment?.(file)}><Paperclip aria-hidden='true' /> Download</Button></div></li>)}</ul> : <p>No files attached.</p>}</section>
        {!item.archived_at && <details className='partCaseAssignment'><summary>Assignment, watchers, and due date</summary><form onSubmit={event => { event.preventDefault(); onUpdate?.({ ...assignment, due_at: assignment.due_at || null, version: item.version }) }}><div className='productionFormGrid'><label className='selectField'><span>Assignee</span><select value={assignment.assignee_membership_id} onChange={event => setAssignment(value => ({ ...value, assignee_membership_id: event.target.value }))}><option value=''>Company queue</option>{(itemDetail.participants || []).map(person => <option key={person.id} value={person.id}>{person.name} · {formatLabel(person.side)}</option>)}</select></label><FormField id='part-case-assignment-due' label='Due date' type='date' value={assignment.due_at} onChange={event => setAssignment(value => ({ ...value, due_at: event.target.value }))} /><label className='selectField'><span>Priority</span><select value={assignment.priority} onChange={event => setAssignment(value => ({ ...value, priority: event.target.value }))}><option value='low'>Low</option><option value='normal'>Normal</option><option value='high'>High</option></select></label><label className='selectField'><span>Schedule effect</span><select value={assignment.schedule_effect} onChange={event => setAssignment(value => ({ ...value, schedule_effect: event.target.value }))}><option value='none'>No known effect</option><option value='possible'>Possible effect</option><option value='confirmed'>Confirmed effect</option></select></label></div><fieldset className='partCaseLinks'><legend>Watchers</legend>{(itemDetail.participants || []).map(person => <label key={person.id}><input type='checkbox' checked={assignment.watcher_membership_ids.includes(person.id)} onChange={event => setAssignment(value => ({ ...value, watcher_membership_ids: event.target.checked ? [...value.watcher_membership_ids, person.id] : value.watcher_membership_ids.filter(id => id !== person.id) }))} /><span>{person.name} · {formatLabel(person.side)}</span></label>)}</fieldset><Button type='submit' variant='secondary' disabled={pending}>Save responsibility</Button></form></details>}
        {item.can_archive && <div className='partCaseArchive'><Button type='button' variant='danger' disabled={pending} onClick={() => onArchive?.(item)}><Trash2 aria-hidden='true' /> Archive closed case</Button></div>}
      </>}
    </div>}
  </ResponsiveDrawer>
}

export default PartCaseDrawer
