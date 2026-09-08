import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Paperclip, ShieldAlert } from 'lucide-react'
import { Button } from '../design-system'
import FormMessage from '../auth/FormMessage'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import useDraftDiscard from './useDraftDiscard'
import { formatDateTime, formatLabel } from './formatters'
import { FormalCreationForm, TextField, idOf } from './FormalEscalationForms'
import { CONVERSATION_V2, newCommandKey } from '../../store/collaborationV2'

const Conversation = ({ mode, itemDetail, productionRecords = [], shares = [], relatedCompanyName, organizationType, pending, feedback, onClose, onCreate, onMessage, onAction, onPromote, onOpenFormal, onOpenAnchor, onUpload, onDownloadAttachment, selectedAnchor, itarControlled, upload, visual }) => {
  const item = itemDetail?.item
  const [draft, setDraft] = useState({ title: '', description: '', topic: 'general', priority: 'normal', due_at: '' })
  const [query, setQuery] = useState('')
  const [reply, setReply] = useState('')
  const [summary, setSummary] = useState('')
  const [action, setAction] = useState('message')
  const [dirty, setDirty] = useState(false)
  const { requestDiscard, discardDialog } = useDraftDiscard()
  const [authorized, setAuthorized] = useState(false)
  const [key] = useState(newCommandKey)
  const [actionVersion, setActionVersion] = useState(item?.version)
  const inputRef = useRef(null)
  const record = productionRecords[0]
  const actions = item?.available_actions || []
  const has = value => actions.some(entry => entry.key === value)
  const close = () => requestDiscard(dirty, onClose)
  useEffect(() => {
    if (!dirty) return undefined
    const warn = event => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const choose = next => {
    requestDiscard(action === 'escalate' && next !== action && dirty, () => {
      setAction(next)
      setActionVersion(item?.version)
      setDirty(Boolean(reply || summary))
    })
  }
  const act = async (name, note = '') => {
    const result = await onAction(name, note, name === 'close' ? actionVersion : item.version)
    if (result?.ok) {
      if (name === 'close') { setSummary(''); setDirty(Boolean(reply)); setAction('message') }
      else { setDirty(Boolean(reply || summary)); setAction(summary ? 'close' : 'message') }
    }
    return result
  }
  const waiting = item?.needs_response_from === 'none' ? 'Open discussion — no response requested' : item?.needs_response_from === organizationType ? 'Your company’s response is requested' : `Waiting on ${relatedCompanyName || (organizationType === 'supplier' ? 'OEM' : 'supplier')}`
  const canWrite = item?.state === 'open' && has('close')
  return <ResponsiveDrawer open title={mode === 'create' ? 'New conversation' : item?.title || 'Conversation'} onClose={close} wide>
    <div className='formalV2'><FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
      {mode === 'create' ? <form className='drawerForm' onSubmit={async event => {
        event.preventDefault()
        const result = await onCreate({ ...draft, collaboration_version: CONVERSATION_V2, version: 0, idempotency_key: key, share_id: idOf(shares[0]), production_record_ids: [idOf(record)] })
        if (result?.ok) setDirty(false)
      }} onChange={() => setDirty(true)}>
        <p>Discuss a question with {relatedCompanyName || 'the other company'} on {record?.public_reference || 'this production'}. Messages do not assign responsibility.</p>
        {selectedAnchor && <div className='formalV2__notice'><strong>Visual reference included</strong><p>{selectedAnchor.label || 'Selected drawing or model feature'}</p>{selectedAnchor.visual_preview?.data_url && <img className='formalV2__preview' src={selectedAnchor.visual_preview.data_url} alt='Selected technical context' />}</div>}
        <TextField type='text' label='Title' value={draft.title} onChange={title => setDraft(value => ({ ...value, title }))} minLength={3} maxLength={240} />
        <TextField label='Message' value={draft.description} onChange={description => setDraft(value => ({ ...value, description }))} minLength={3} maxLength={6000} />
        <div className='productionFormGrid'><label className='selectField'><span>Topic (optional)</span><select value={draft.topic} onChange={event => setDraft(value => ({ ...value, topic: event.target.value }))}>{['general', 'drawing', 'model', 'requirement', 'tooling', 'manufacturing', 'quality'].map(topic => <option key={topic} value={topic}>{formatLabel(topic)}</option>)}</select></label><label className='selectField'><span>Priority</span><select value={draft.priority} onChange={event => setDraft(value => ({ ...value, priority: event.target.value }))}>{['low', 'normal', 'high'].map(priority => <option key={priority} value={priority}>{formatLabel(priority)}</option>)}</select></label></div>
        <TextField type='date' label='Due date' value={draft.due_at} onChange={due_at => setDraft(value => ({ ...value, due_at }))} required={false} />
        <footer><Button type='button' variant='secondary' onClick={close}>Cancel</Button><Button type='submit' disabled={pending}>Start conversation</Button></footer>
      </form> : item && <>
        <div className='formalV2__heading'><StatusBadge tone={item.state === 'escalated' ? 'warning' : item.state === 'closed' ? 'success' : 'info'}>{formatLabel(item.state)}</StatusBadge><span>{formatLabel(item.topic || 'general')} · {formatLabel(item.priority)} priority</span></div>
        <div className='formalV2__notice' role='status'><strong>{item.state === 'escalated' ? 'Continue in the formal record' : item.state === 'closed' ? 'Conversation closed' : waiting}</strong><p>{item.state === 'escalated' ? 'This source conversation, evidence, and visual context are preserved as a read-only record.' : item.state === 'closed' ? item.closing_summary : 'Either company may close the conversation with a summary. Use Needs response to explicitly request the other company’s action.'}</p>{item.state === 'escalated' && <Button variant='secondary' onClick={() => onOpenFormal?.(idOf(item.escalated_attention))}>Open linked formal record <ArrowUpRight aria-hidden='true' /></Button>}</div>
        {!canWrite && Boolean(reply || summary) && <section className='formalV2__notice' aria-label='Preserved draft'><strong>Your unsent draft is preserved</strong><p>The conversation changed. You can copy your draft below before leaving this record.</p>{reply && <TextField label='Unsent reply' value={reply} readOnly required={false} />}{summary && <TextField label='Unsent closing summary' value={summary} readOnly required={false} />}</section>}
        <TextField type='search' label='Search conversation' value={query} onChange={setQuery} required={false} />
        <section className='partCaseMessages' aria-label='Conversation'><div className='partCaseMessages__thread'>{[{ id: 'opening', body: item.description, author: item.created_by, created_at: item.created_at }, ...(itemDetail.messages || [])].filter(entry => !query || `${entry.body} ${entry.author?.display_name || ''}`.toLowerCase().includes(query.toLowerCase())).map(entry => <article key={idOf(entry)} className={entry.author?.organization_type === organizationType ? 'is-own' : ''}><div className='partCaseMessages__content'><header><strong>{entry.author?.display_name || 'Workspace member'}<small>{entry.author?.organization_name || formatLabel(entry.author?.organization_type)}</small></strong><time>{formatDateTime(entry.created_at)}</time></header><p>{entry.body}</p></div></article>)}</div></section>
        {item.visual_anchor && <section className='partCaseVisual'><header><h3>{item.visual_anchor.label || 'Linked visual reference'}</h3><Button variant='secondary' onClick={() => onOpenAnchor?.(item.visual_anchor)}>Open full viewer</Button></header>{visual}</section>}
        {canWrite && <>
          <div className='formalV2__actions' aria-label='Conversation actions'>{[['message', 'Message'], ['needs_response', 'Needs response'], ['clear_needs_response', 'Clear needs response'], ['close', 'Close'], ['escalate', 'Escalate']].filter(([value]) => value === 'message' || has(value)).map(([value, label]) => <Button key={value} variant={action === value ? 'primary' : 'secondary'} aria-pressed={action === value} onClick={() => choose(value)}>{label}</Button>)}</div>
          {action === 'message' && <form className='drawerForm' onSubmit={async event => { event.preventDefault(); const result = await onMessage(reply); if (result?.ok) { setReply(''); setDirty(Boolean(summary)) } }}><TextField label='Reply' minLength={1} maxLength={6000} value={reply} onChange={value => { setReply(value); setDirty(Boolean(value || summary)) }} /><footer><Button type='submit' disabled={pending}>Send message</Button></footer></form>}
          {action === 'close' && <form className='drawerForm' onSubmit={event => { event.preventDefault(); act('close', summary) }}><TextField label='Closing summary' value={summary} onChange={value => { setSummary(value); setDirty(Boolean(value || reply)) }} />{actionVersion !== item.version && <div className='formalV2__notice'><p>The conversation changed. Your summary is preserved. Review the discussion above before closing.</p><Button type='button' variant='secondary' onClick={() => setActionVersion(item.version)}>I reviewed the updated conversation</Button></div>}<footer><Button type='submit' disabled={pending || actionVersion !== item.version}>Close conversation</Button></footer></form>}
          {['needs_response', 'clear_needs_response'].includes(action) && <div className='drawerForm'><p>{action === 'needs_response' ? `Request a response from ${relatedCompanyName || 'the other company'}. Sending a message later does not clear this marker.` : 'Clear your company’s response marker after providing the requested information.'}</p><Button disabled={pending} onClick={() => act(action)}>{action === 'needs_response' ? 'Request response' : 'Clear needs response'}</Button></div>}
        </>}
        {action === 'escalate' && <FormalCreationForm key={`escalate-${item.id}`} escalation unavailable={!canWrite} version={item.version} record={record} organizationType={organizationType} files={itemDetail.attachments} pending={pending} onDraftChange={setDirty} onCancel={() => choose('message')} onSubmit={async payload => {
          const result = await onPromote(payload)
          if (result?.ok) { setAction('message'); setDirty(Boolean(reply || summary)) }
          return result
        }} />}
        {has('reopen') && <Button disabled={pending} onClick={() => act('reopen')}>Reopen conversation</Button>}
        <section className='partCaseAttachments'><header><h3><Paperclip aria-hidden='true' /> Evidence and files</h3></header>{itemDetail.attachments?.length ? <ul>{itemDetail.attachments.map(file => <li key={idOf(file)}><span>{file.display_filename || file.original_filename} {file.state !== 'available' && `· ${formatLabel(file.state)}`}</span><Button type='button' variant='secondary' disabled={file.state !== 'available'} onClick={() => onDownloadAttachment?.(file)}>Download</Button></li>)}</ul> : <p>No evidence attached.</p>}{upload && <p role='status'>{upload.filename} · {upload.progress}%</p>}{canWrite && <>{itarControlled && <label className='productionCheck'><input type='checkbox' checked={authorized} onChange={event => setAuthorized(event.target.checked)} /><ShieldAlert aria-hidden='true' /><span>I am authorized to attach controlled data.</span></label>}<Button variant='secondary' disabled={pending || (itarControlled && !authorized)} onClick={() => inputRef.current?.click()}>Attach evidence</Button><input type='file' ref={inputRef} hidden onChange={event => { const file = event.target.files?.[0]; if (file) onUpload?.(file, { itar_upload_authorized: authorized, synthetic_data_acknowledged: authorized }); event.target.value = '' }} /></>}</section>
        <details className='formalV2__history'><summary>Conversation history</summary><ol>{(item.workflow_history || []).map((entry, index) => <li key={idOf(entry) || index}><strong>{formatLabel(entry.action)}</strong><p>{entry.note}</p><small>{entry.actor?.display_name} · {formatDateTime(entry.occurred_at)} · {formatLabel(entry.to_state)}</small></li>)}</ol></details>
      </>}
    </div>
    {discardDialog}
  </ResponsiveDrawer>
}
export default function PartConversationDrawerV2(props) {
  return props.open ? <Conversation key={props.mode === 'create' ? 'new' : idOf(props.itemDetail?.item)} {...props} /> : null
}
