import { Archive, Box, Download, FileText, Image, LoaderCircle, MessageSquarePlus, Pencil, Upload } from 'lucide-react'
import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { Button } from '../design-system'
import FormMessage from '../auth/FormMessage'
import EmptyState from './EmptyState'
import ProductionTimeline from './ProductionTimeline'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import Tabs from './Tabs'
import { formatDateTime, formatLabel } from './formatters'
import { isViewableModel, modelMimeForFilename } from '../../store/modelFiles'

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false })

const visibilityLabel = value => ({
  shared: 'Shared with both companies',
  oem_internal: 'OEM internal',
  velakron_internal: 'Velakron internal',
}[value] || formatLabel(value))

const NoteComposer = ({ organizationType, pending, feedback, onSubmit }) => {
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState(organizationType === 'velakron' ? 'velakron_internal' : 'shared')
  const choices = organizationType === 'oem'
    ? ['shared', 'oem_internal']
    : organizationType === 'velakron' ? ['velakron_internal'] : ['shared']
  return <form className='collaborationComposer' onSubmit={async event => {
    event.preventDefault()
    if (await onSubmit({ body, visibility })) setBody('')
  }}>
    <label className='textAreaField' htmlFor='production-note-body'><span>Add a note</span><textarea id='production-note-body' value={body} onChange={event => setBody(event.target.value)} maxLength={4000} placeholder='Write a plain-text operational note…' required /></label>
    <div className='collaborationComposer__footer'>
      <label className='selectField' htmlFor='production-note-visibility'><span>Who can see it</span><select id='production-note-visibility' value={visibility} onChange={event => setVisibility(event.target.value)}>{choices.map(item => <option key={item} value={item}>{visibilityLabel(item)}</option>)}</select></label>
      <Button type='submit' disabled={pending || !body.trim()}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <MessageSquarePlus aria-hidden='true' />} Add note</Button>
    </div>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
  </form>
}

const NoteList = ({ notes, userId, canArchive, pending, onRevise, onArchive }) => {
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')
  if (!notes.length) return <EmptyState compact title='No notes yet' description='Shared and private operational notes will appear here.' />
  return <div className='productionNotes'>{notes.map(note => {
    const own = String(note.author?.user_id || '') === String(userId || '')
    return <article key={note.id} className='productionNote'>
      <header><div><strong>{note.author?.display_name || 'Authorized user'}</strong><span>{note.author?.organization_name}</span></div><StatusBadge tone={note.visibility === 'shared' ? 'info' : 'warning'}>{visibilityLabel(note.visibility)}</StatusBadge></header>
      {editing === note.id
        ? <form onSubmit={async event => { event.preventDefault(); if (await onRevise(note, draft)) setEditing(null) }}><textarea value={draft} onChange={event => setDraft(event.target.value)} maxLength={4000} required /><div><Button type='submit' disabled={pending}>Save revision</Button><Button variant='secondary' onClick={() => setEditing(null)}>Cancel</Button></div></form>
        : <p>{note.body}</p>}
      <footer><small>{formatDateTime(note.created_at)}{note.revision_number > 1 ? ` · Revision ${note.revision_number}` : ''}</small><div>{own && !editing && <button type='button' onClick={() => { setEditing(note.id); setDraft(note.body) }}><Pencil aria-hidden='true' /> Edit</button>}{canArchive && <button type='button' disabled={pending} onClick={() => onArchive(note)}><Archive aria-hidden='true' /> Archive</button>}</div></footer>
    </article>
  })}</div>
}

const FileUploader = ({ kind, organizationType, pending, upload, feedback, onUpload }) => {
  const [file, setFile] = useState(null)
  const [visibility, setVisibility] = useState(organizationType === 'velakron' ? 'velakron_internal' : 'shared')
  const [category, setCategory] = useState(kind === 'photo' ? 'photo' : 'document')
  const [regulatedDataAcknowledged, setRegulatedDataAcknowledged] = useState(false)
  const choices = organizationType === 'oem'
    ? ['shared', 'oem_internal']
    : organizationType === 'velakron' ? ['velakron_internal'] : ['shared']
  const selectFile = event => {
    const selected = event.target.files?.[0] || null
    setFile(selected)
    if (selected && modelMimeForFilename(selected.name)) setCategory('drawing_reference')
  }
  return <form className='fileUploader' onSubmit={async event => { event.preventDefault(); const form = event.currentTarget; if (file && regulatedDataAcknowledged && await onUpload({ file, category, visibility, regulated_data_acknowledged: true })) { setFile(null); setRegulatedDataAcknowledged(false); form.reset() } }}>
    <label className='fileUploader__drop' htmlFor={`production-${kind}-upload`}><Upload aria-hidden='true' /><span><strong>{kind === 'photo' ? 'Add production photos' : 'Add a document or 3D model'}</strong><small>{kind === 'photo' ? 'JPEG, PNG, or WebP up to 25 MB' : 'PDF, images, text, STEP, or STL up to 25 MB'}</small></span><input id={`production-${kind}-upload`} type='file' accept={kind === 'photo' ? 'image/jpeg,image/png,image/webp' : 'application/pdf,image/jpeg,image/png,image/webp,text/plain,.stp,.step,.stl,model/step,model/stl'} onChange={selectFile} /></label>
    <div className='fileUploader__controls'>
      {kind !== 'photo' && <label className='selectField' htmlFor='production-file-category'><span>Document type</span><select id='production-file-category' value={category} onChange={event => setCategory(event.target.value)}><option value='document'>Document</option><option value='quality_record'>Quality record</option><option value='drawing_reference'>Drawing reference / 3D model</option></select></label>}
      <label className='selectField' htmlFor={`production-${kind}-visibility`}><span>Who can see it</span><select id={`production-${kind}-visibility`} value={visibility} onChange={event => setVisibility(event.target.value)}>{choices.map(item => <option value={item} key={item}>{visibilityLabel(item)}</option>)}</select></label>
      <Button type='submit' disabled={!file || !regulatedDataAcknowledged || pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Upload aria-hidden='true' />} Upload</Button>
    </div>
    {file && <p className='fileUploader__selection'>{file.name} · {(file.size / 1024).toFixed(1)} KB</p>}
    {upload && <div className='uploadProgress'><span style={{ width: `${upload.progress || 0}%` }} /><small>{formatLabel(upload.state)} {upload.progress || 0}%</small></div>}
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <label className='productionCheck complianceAcknowledgement'><input type='checkbox' checked={regulatedDataAcknowledged} onChange={event => setRegulatedDataAcknowledged(event.target.checked)} /><span><strong>I confirm this file is permitted in the prototype</strong><small>It does not contain ITAR, EAR-controlled, CUI, classified, or other regulated technical data.</small></span></label>
    <p className='complianceHint'>Prototype files are checked for their real file format before download. Malware scanning is not enabled in this prototype.</p>
  </form>
}

const FileList = ({ files, canArchive, pending, onDownload, onArchive, onView }) => {
  if (!files.length) return <EmptyState compact title='No files yet' description='Finalized, authorized files will appear here.' />
  return <div className='productionFiles'>{files.map(file => <article className='productionFile' key={file.id}>
    <span>{file.category === 'photo' ? <Image aria-hidden='true' /> : isViewableModel(file) ? <Box aria-hidden='true' /> : <FileText aria-hidden='true' />}</span>
    <div><strong>{file.display_filename || file.original_filename}</strong><small>{formatLabel(file.category)} · {visibilityLabel(file.visibility)} · {(file.byte_size / 1024).toFixed(1)} KB</small></div>
    <StatusBadge tone={file.state === 'available' ? 'success' : 'warning'}>{file.state === 'available' && file.scan_status === 'unavailable' ? 'Format verified' : formatLabel(file.state)}</StatusBadge>
    {file.state === 'available' && isViewableModel(file) && <button type='button' onClick={() => onView(file)}><Box aria-hidden='true' /><span>View 3D</span></button>}
    {file.state === 'available' && <button type='button' onClick={() => onDownload(file)}><Download aria-hidden='true' /><span>Download</span></button>}
    {canArchive && file.state === 'available' && <button type='button' disabled={pending} onClick={() => onArchive(file)}><Archive aria-hidden='true' /><span>Archive</span></button>}
  </article>)}</div>
}

const ProductionCollaborationPanel = ({
  record,
  detail,
  collaboration,
  organization,
  userId,
  permissions,
  feedback,
  onCreateNote,
  onReviseNote,
  onArchiveNote,
  onUpload,
  onDownload,
  onArchiveAttachment,
}) => {
  const [tab, setTab] = useState('timeline')
  const [viewingModel, setViewingModel] = useState(null)
  const documents = useMemo(() => collaboration.attachments.filter(item => item.category !== 'photo'), [collaboration.attachments])
  const photos = useMemo(() => collaboration.attachments.filter(item => item.category === 'photo'), [collaboration.attachments])
  const timeline = collaboration.timeline.length ? collaboration.timeline : detail?.timeline || []
  const tabs = [
    { key: 'timeline', label: 'Timeline', count: timeline.length },
    { key: 'notes', label: 'Notes', count: collaboration.notes.length },
    { key: 'documents', label: 'Documents', count: documents.length },
    { key: 'photos', label: 'Photos', count: photos.length },
    { key: 'machine', label: 'Machine' },
    { key: 'assignments', label: 'Assignments', count: detail?.assignments?.length || 0 },
  ]
  const modelSource = viewingModel
    ? `${process.env.NEXT_PUBLIC_API_URL || ''}/production-records/${record.id}/attachments/${viewingModel.id}/view-content`
    : ''
  return <>
  <section className='appPanel productionCollaborationPanel'>
    <header className='appPanel__header'><div><p className='technicalLabel'>Shared operating record</p><h2>Updates and collaboration</h2></div>{collaboration.loading && <LoaderCircle className='spin' aria-label='Refreshing collaboration' />}</header>
    <Tabs items={tabs} activeKey={tab} onChange={setTab} label='Production detail sections' />
    <div className='productionTabBody'>
      {tab === 'timeline' && (timeline.length ? <ProductionTimeline events={timeline} /> : <EmptyState compact title='No timeline events' description='Production activity will appear here.' />)}
      {tab === 'notes' && <><NoteComposer organizationType={organization.type} pending={collaboration.mutating} feedback={feedback} onSubmit={onCreateNote} /><NoteList notes={collaboration.notes} userId={userId} canArchive={permissions.canArchiveNote} pending={collaboration.mutating} onRevise={onReviseNote} onArchive={onArchiveNote} /></>}
      {tab === 'documents' && <><FileUploader kind='document' organizationType={organization.type} pending={collaboration.mutating} upload={collaboration.upload} feedback={feedback} onUpload={onUpload} /><FileList files={documents} canArchive={permissions.canArchiveAttachment} pending={collaboration.mutating} onDownload={onDownload} onArchive={onArchiveAttachment} onView={setViewingModel} /></>}
      {tab === 'photos' && <><FileUploader kind='photo' organizationType={organization.type} pending={collaboration.mutating} upload={collaboration.upload} feedback={feedback} onUpload={onUpload} /><FileList files={photos} canArchive={permissions.canArchiveAttachment} pending={collaboration.mutating} onDownload={onDownload} onArchive={onArchiveAttachment} onView={setViewingModel} /></>}
      {tab === 'machine' && (record.current_machine ? <dl className='appDetailList'><div><dt>Shop ID</dt><dd>{record.current_machine.shop_identifier}</dd></div><div><dt>Machine</dt><dd>{record.current_machine.manufacturer} {record.current_machine.model}</dd></div><div><dt>Facility</dt><dd>{record.current_machine.facility?.name || 'Not provided'}</dd></div></dl> : <EmptyState compact title='No primary machine' description='The supplier can assign a machine after accepting the work.' />)}
      {tab === 'assignments' && <div className='assignmentHistory'>{(detail?.assignments || []).map(item => <article key={item.id}><div><strong>Assignment {item.sequence}</strong><StatusBadge tone={item.current ? 'success' : 'neutral'}>{formatLabel(item.state)}</StatusBadge></div><p>{item.assigned_by?.organization_name || 'Authorized organization'} · {formatDateTime(item.assigned_at)}</p>{item.change_reason && <small>{item.change_reason}</small>}</article>)}</div>}
    </div>
  </section>
  <ResponsiveDrawer open={Boolean(viewingModel)} title={viewingModel?.display_filename || viewingModel?.original_filename || '3D model'} onClose={() => setViewingModel(null)} wide>
    {viewingModel && <ModelViewer file={viewingModel} source={modelSource} />}
  </ResponsiveDrawer>
  </>
}

export default ProductionCollaborationPanel
