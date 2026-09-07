import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { Button } from '../design-system'
import FormMessage from '../auth/FormMessage'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import ItarAccessDialog from './ItarAccessDialog'
import { FormalActionForm, FormalCreationForm, formalLabel, idOf } from './FormalEscalationForms'
import { formatDateTime, formatLabel } from './formatters'
import { getHasPermission } from '../../store/slices/appContext'
import { isFormalV2, workflowError } from '../../store/collaborationV2'
import { actOnFormalRecord, createFormalRecord, loadCollaborationNotifications, loadFormalRecord, loadFormalRecords, productionCollaborationSelectors } from '../../store/slices/entities/productionCollaboration'
import { loadProductionRecord } from '../../store/slices/entities/productionRecords'

const scalarFields = new Set(['summary', 'reason', 'original_condition', 'accepted_change', 'effectivity', 'lot', 'serial_start', 'serial_end', 'shipment_reference', 'affected_quantity', 'produced_quantity', 'reported_containment', 'quantity_override_reason', 'preliminary_cause', 'root_cause', 'method', 'notes', 'type', 'instructions', 'verification_plan'])
const labels = { accepted_change: 'Accepted change', summary: 'Summary', type: 'Disposition', affected_scope: 'Affected scope', verification_evidence: 'Verification evidence' }
export const DataSummary = ({ data, participants = [], files = [], onDownload }) => <div className='formalV2__data'>{Object.entries(data || {}).filter(([, value]) => value != null && value !== '' && (!Array.isArray(value) || value.length)).map(([key, value]) => {
  if (key === 'owner_membership_id') return <div className='formalV2__datum' key={key}><strong>Investigation owner</strong><p>{participants.find(member => idOf(member) === idOf(value))?.name || 'Previously assigned supplier member'}</p></div>
  if (['attachment_ids', 'evidence_ids'].includes(key) && Array.isArray(value)) return <div key={key}><strong>Referenced evidence</strong>{value.map(id => { const file = files.find(item => idOf(item) === idOf(id)); return file && onDownload ? <Button key={idOf(id)} variant='secondary' onClick={() => onDownload(file)}>{file.display_filename || file.original_filename}</Button> : <p key={idOf(id)}>Preserved evidence reference · available through the source conversation or production files</p> })}</div>
  if (scalarFields.has(key)) return <div className='formalV2__datum' key={key}><strong>{labels[key] || formatLabel(key)}</strong><p>{key === 'type' ? formatLabel(value) : String(value)}</p></div>
  if (value?.actor && value?.occurred_at) return <div className='formalV2__datum' key={key}><strong>{formatLabel(key)}</strong><p>{value.actor.display_name || 'Company member'} · {value.actor.organization_name || formatLabel(value.actor.organization_type)} · {formatDateTime(value.occurred_at)}</p></div>
  if (value && typeof value === 'object' && !Array.isArray(value) && !key.startsWith('_')) return <section key={key}><h4>{labels[key] || formatLabel(key)}</h4><DataSummary data={value} participants={participants} files={files} onDownload={onDownload} /></section>
  return null
})}</div>

export const TechnicalAcceptance = ({ acceptance }) => acceptance ? <section className='formalV2__acceptance'><h3>Accepted for this production only</h3><DataSummary data={acceptance.change} /><p>OEM approved by {acceptance.approval?.actor?.display_name || 'an authorized OEM member'} · {formatDateTime(acceptance.approval?.occurred_at)}.</p><small>The released revision and its source files remain unchanged.</small></section> : null

export const FormalDetail = ({ item, detail, context, files, pending, record, onAction, onSource, onNewCase, onRelated, onDraftChange, onDownload, canCreate }) => {
  const [selected, setSelected] = useState(null)
  const [actionDirty, setActionDirty] = useState(false)
  const actions = item.workflow?.available_actions || []
  const actionAvailable = !item.workflow?.terminal && (selected?.key === 'add_message' ? item.workflow?.can_message : actions.some(action => action.key === selected?.key))
  const draftChanged = value => { setActionDirty(value); onDraftChange?.(value) }
  const chooseAction = action => {
    if (selected?.key === action?.key) return
    if (actionDirty && !window.confirm('Discard this action draft?')) return
    setSelected(action)
    draftChanged(false)
  }
  const scope = item.workflow?.data?.affected_scope
  const summaryProps = { participants: context.supplier_members || [], files, onDownload }
  if (!isFormalV2(item)) return <div className='formalV2'><p className='formalV2__notice'>Legacy history · read-only</p><h3>{item.explanation}</h3><p>{item.resolution_reason || item.workflow?.state_label}</p><DataSummary data={item.workflow?.data} {...summaryProps} /><ol>{(item.workflow?.history || []).map((entry, index) => <li key={idOf(entry) || index}><strong>{formatLabel(entry.action)}</strong><p>{entry.actor?.display_name} · {formatDateTime(entry.occurred_at)}</p><p>{entry.note}</p></li>)}</ol>{item.legacy_replaced_by && <Button variant='secondary' onClick={() => onRelated(idOf(item.legacy_replaced_by))}>Open replacement formal record</Button>}</div>
  return <div className='formalV2'>
    <div className='formalV2__heading'><StatusBadge tone={item.workflow?.terminal ? 'success' : item.workflow?.production_blocked ? 'danger' : 'warning'}>{item.workflow?.state_label}</StatusBadge><span>{item.record_number}</span></div>
    <div className='formalV2__notice' role='status'><strong>{item.workflow?.responsibility_label}</strong><p>{item.workflow?.production_blocked ? 'Production is stopped until the OEM releases this Block. Approving the solution alone does not release production.' : item.workflow?.terminal ? 'This formal record is permanently closed. Start a new case for any additional work.' : item.category === 'non_conformance' ? 'This Non-Conformance controls the affected parts. A separate active Production Block is required to stop production.' : item.category === 'production_block' ? 'This Block has been released by the OEM. Supplier acknowledgement completes its record.' : 'Supplier resolution requires OEM approval.'}</p></div>
    <p className='formalV2__explanation'>{item.explanation}</p>
    <dl className='partCaseDetail__facts'><div><dt>Production</dt><dd>{record.public_reference}</dd></div><div><dt>Category</dt><dd>{formalLabel(item.category)}</dd></div><div><dt>Last activity</dt><dd>{formatDateTime(item.last_seen_at)}</dd></div><div><dt>Current responsibility</dt><dd>{item.workflow?.current_actor_side === 'none' ? 'Closed' : formatLabel(item.workflow?.current_actor_side)}</dd></div></dl>
    {scope && <section className='formalV2__scope'><h3>{scope.affected_quantity} affected · {Math.max(0, Number(scope.produced_quantity ?? record.quantity) - scope.affected_quantity)} outside the reported scope</h3><DataSummary data={scope} {...summaryProps} />{canCreate && <Button variant='secondary' onClick={() => onNewCase('formal', item.id)}>Create a related formal record</Button>}</section>}
    {detail?.source_conversation && <details className='formalV2__source' open><summary>Source conversation · {detail.source_conversation.title}</summary><p>{detail.source_conversation.description}</p>{(detail.source_messages || []).map(message => <article key={idOf(message)}><strong>{message.author?.display_name || 'Workspace member'}</strong><small>{formatDateTime(message.created_at)}</small><p>{message.body}</p></article>)}<Button variant='secondary' onClick={() => onSource(idOf(detail.source_conversation))}>Open source, visual references, and files</Button><div className='formalV2__boundary'>Escalated here · {formatDateTime(item.created_at)}</div></details>}
    <TechnicalAcceptance acceptance={item.technical_acceptance} />
    <section><h3>Current formal record</h3><DataSummary data={item.workflow?.data} {...summaryProps} /></section>
    {item.workflow?.terminal ? canCreate && <Button variant='secondary' onClick={() => onNewCase('conversation', item.id)}>Start a new case referencing this record</Button> : <>
      <div className='formalV2__actions'>{actions.map((action, index) => <Button key={action.key} variant={index === 0 ? 'primary' : 'secondary'} disabled={pending} onClick={() => chooseAction(action)}>{action.label}</Button>)}{item.workflow?.can_message && <Button variant='secondary' onClick={() => chooseAction({ key: 'add_message', label: 'Send message' })}>Add message</Button>}</div>
    </>}
    {selected && <FormalActionForm key={`${item.id}:${selected.key}`} item={item} action={selected} unavailable={!actionAvailable} files={files} participants={context.supplier_members || []} pending={pending} onDraftChange={draftChanged} onCancel={() => chooseAction(null)} onSubmit={async payload => { const result = await onAction(payload); if (result?.ok) { setSelected(null); draftChanged(false) } }} />}
    {!!item.related_formal_records?.length && <section><h3>Related formal records</h3>{item.related_formal_records.map(value => <Button key={idOf(value)} variant='secondary' onClick={() => onRelated(idOf(value))}>Open related record</Button>)}</section>}
    <details className='formalV2__history'><summary>Complete formal history · {item.workflow?.history?.length || 0} entries</summary><ol>{(item.workflow?.history || []).map((entry, index) => <li key={idOf(entry) || index}><strong>{formatLabel(entry.action)}</strong><p>{entry.actor?.display_name} · {entry.actor?.organization_name || formatLabel(entry.actor?.organization_type)} · {formatDateTime(entry.occurred_at)}</p><p>{entry.note}</p><DataSummary data={entry.data} {...summaryProps} /><small>{formatLabel(entry.from_state)} → {formatLabel(entry.to_state)}</small></li>)}</ol></details>
    {!!files?.length && <details className='partCaseAttachments'><summary>Shared production evidence</summary><ul>{files.filter(file => file.visibility === 'shared').map(file => <li key={idOf(file)}><span>{file.display_filename || file.original_filename}</span><Button variant='secondary' disabled={file.state !== 'available'} onClick={() => onDownload(file)}>Download</Button></li>)}</ul></details>}
  </div>
}

export default function FormalEscalationPanel({ record, organization, enabled, files = [], onDownload }) {
  const dispatch = useDispatch()
  const router = useRouter()
  const canCreate = useSelector(getHasPermission('formal_escalation.create'))
  const collaboration = useSelector(productionCollaborationSelectors.getRecord(record.id))
  const [protectedFile, setProtectedFile] = useState(null)
  const [downloadPending, setDownloadPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [filter, setFilter] = useState('active')
  const formalId = typeof router.query.formal === 'string' ? router.query.formal : ''
  const creating = formalId === 'new'
  const detail = collaboration.formalDetails?.[formalId]
  const item = detail?.condition || collaboration.formalRecords?.find(value => idOf(value) === formalId)
  const context = collaboration.formalContext || {}
  const records = (collaboration.formalRecords || []).filter(value => isFormalV2(value) || !value.active)
  const navigate = (next, { saved = false } = {}) => {
    if (dirty && !saved && !window.confirm('Discard your unsaved draft?')) return false
    setDirty(false)
    const { formal: previous, collaboration: source, formal_related: previousRelated, ...query } = router.query
    router.replace({ pathname: router.pathname, query: { ...query, ...next } }, undefined, { shallow: true })
    return true
  }
  const open = (id, options) => { if (navigate({ formal: id }, options)) setFeedback(null) }
  const close = () => navigate({})
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === 'hidden') return
      dispatch(loadFormalRecords(record.id))
      dispatch(loadCollaborationNotifications(record.id))
      if (formalId && formalId !== 'new') dispatch(loadFormalRecord(record.id, formalId))
    }
    refresh()
    const timer = window.setInterval(refresh, 45000)
    window.addEventListener('focus', refresh)
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh) }
  }, [dispatch, record.id, formalId])
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const submit = async payload => {
    setFeedback(null)
    const { version, ...command } = payload
    const result = await dispatch(creating ? createFormalRecord(record.id, { ...command, version }) : actOnFormalRecord(record.id, formalId, version ?? item.version, command))
    if (!result?.ok) { setFeedback({ type: 'error', message: workflowError(result) }); if (result?.error?.code === 'VERSION_CONFLICT') dispatch(loadProductionRecord(record.id)) }
    else {
      setDirty(false)
      setFeedback({ type: 'success', message: creating ? 'Formal record created.' : 'Formal action recorded.' })
      dispatch(loadProductionRecord(record.id))
      if (creating) open(idOf(result.payload.data.condition), { saved: true })
    }
    return result
  }
  const visible = records.filter(value => filter === 'all' || (filter === 'active' ? value.active : !value.active))
  if (!enabled && !records.length && !formalId) return null
  return <section className='appPanel formalV2 formalV2__panel' id='formal-records'>
    <header className='appPanel__header'><div><p className='technicalLabel'>Shared formal control</p><h2>Formal records</h2><p>Issues, Production Blocks, and Non-Conformances retain their own decisions and evidence.</p></div>{enabled && canCreate && <Button variant='secondary' onClick={() => open('new')}>Create formal record</Button>}</header>
    <div className='formalV2__filters' role='group' aria-label='Formal record status'>{[['active', 'Active'], ['closed', 'Closed'], ['all', 'All history']].map(([value, label]) => <Button key={value} variant={filter === value ? 'primary' : 'secondary'} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</Button>)}</div>
    {collaboration.formalError && <FormMessage type='error'>{collaboration.formalError.message}</FormMessage>}
    {visible.length ? <div className='formalV2__list'>{visible.map(value => <button type='button' key={idOf(value)} onClick={() => open(idOf(value))}><div><span className='technicalLabel'>{formalLabel(value.category)} · {value.record_number}</span><strong>{value.explanation}</strong><small>{isFormalV2(value) ? value.workflow?.state_label : 'Legacy history · read-only'}</small></div><StatusBadge tone={value.workflow?.production_blocked ? 'danger' : value.workflow?.responsibility_label === 'Action required' ? 'warning' : value.active ? 'info' : 'success'}>{isFormalV2(value) ? value.workflow?.responsibility_label : 'Closed'}</StatusBadge></button>)}</div> : <p role='status'>{collaboration.formalLoading ? 'Loading formal records…' : `No ${filter === 'all' ? '' : `${filter} `}formal records.`}</p>}
    {!!collaboration.notifications?.length && <details className='formalV2__notifications'><summary>Recent collaboration updates</summary><ul>{collaboration.notifications.slice(0, 12).map(notification => <li key={idOf(notification)}><button type='button' onClick={() => notification.formal_record ? open(idOf(notification.formal_record)) : navigate({ part_tab: 'cases', collaboration: idOf(notification.conversation) })}>{notification.subject || formatLabel(notification.event_type)}</button><small>{formatDateTime(notification.occurred_at)}</small></li>)}</ul></details>}
    <ResponsiveDrawer open={Boolean(formalId)} title={creating ? 'Create formal record' : item ? formalLabel(item.category) : 'Formal record'} wide onClose={close}>
      <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      {creating && enabled && canCreate ? <FormalCreationForm key={`new:${router.query.formal_related || ''}`} record={record} version={record.version} organizationType={organization.type} files={files} relatedRecords={context.related_production_records} formalRecords={records} defaultRelatedFormal={router.query.formal_related || ''} pending={collaboration.mutating} onDraftChange={setDirty} onCancel={close} onSubmit={submit} /> : item ? <FormalDetail canCreate={enabled && canCreate} key={item.id} item={item} detail={detail} context={context} files={files} record={record} pending={collaboration.mutating} onAction={submit} onDraftChange={setDirty} onSource={id => navigate({ part_tab: 'cases', collaboration: id })} onRelated={open} onNewCase={(kind, id) => navigate(kind === 'formal' ? { formal: 'new', formal_related: id } : { part_tab: 'cases', new_conversation: '1', references_formal_record: id })} onDownload={file => file.export_control === 'itar' ? setProtectedFile(file) : onDownload(file)} /> : <p role='status'>{collaboration.formalError?.message || 'Loading formal record…'}</p>}
    </ResponsiveDrawer>
    <ItarAccessDialog open={Boolean(protectedFile)} file={protectedFile} purpose='download' pending={downloadPending} feedback={feedback} onClose={() => setProtectedFile(null)} onConfirm={async attestation => { setDownloadPending(true); const result = await onDownload(protectedFile, attestation); setDownloadPending(false); if (result?.ok) setProtectedFile(null); else setFeedback({ type: 'error', message: workflowError(result) }); return result }} />
  </section>
}
