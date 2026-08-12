import {
  CalendarClock,
  CheckCircle2,
  Download,
  FileText,
  Image,
  LoaderCircle,
  MessageSquare,
  Paperclip,
  Pencil,
  Send,
  Upload,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import UserAvatar from '../../UserAvatar'
import FormMessage from '../../auth/FormMessage'
import { Button } from '../../design-system'
import EmptyState from '../EmptyState'
import ResponsiveDrawer from '../ResponsiveDrawer'
import StatusBadge from '../StatusBadge'
import Tabs from '../Tabs'
import { formatDate, formatDateTime, formatLabel, statusTone } from '../formatters'

const byteLabel = bytes => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const TaskDiscussion = ({ messages, pending, feedback, onSend }) => {
  const [body, setBody] = useState('')
  return <div className='taskDiscussion'>
    <div className='taskMessages' aria-live='polite'>
      {messages.length ? messages.map(message => <article className='taskMessage' key={message.id}>
        <UserAvatar user={message.author} size={32} />
        <div>
          <header><strong>{message.author?.full_name || message.author?.email || 'Velakron team member'}</strong><span>{formatDateTime(message.created_at)}</span></header>
          <p>{message.body}</p>
        </div>
      </article>) : <EmptyState compact icon={MessageSquare} title='No messages yet' description='Start the conversation with the task creator and assignees.' />}
    </div>
    <form className='taskMessageComposer' onSubmit={async event => {
      event.preventDefault()
      if (await onSend(body)) setBody('')
    }}>
      <label className='textAreaField' htmlFor='founder-task-message'><span>New message</span><textarea id='founder-task-message' value={body} onChange={event => setBody(event.target.value)} maxLength={4000} placeholder='Share an update, question, or decision…' required /></label>
      <div><small>Visible to the Velakron founder workspace.</small><Button type='submit' disabled={pending || !body.trim()}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Send aria-hidden='true' />} Send message</Button></div>
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    </form>
  </div>
}

const TaskFiles = ({ files, pending, upload, feedback, onUpload, onDownload }) => {
  const [file, setFile] = useState(null)
  return <div className='taskFiles'>
    <form className='fileUploader taskFileUploader' onSubmit={async event => {
      event.preventDefault()
      const form = event.currentTarget
      if (file && await onUpload(file)) {
        setFile(null)
        form.reset()
      }
    }}>
      <label className='fileUploader__drop' htmlFor='founder-task-file'><Upload aria-hidden='true' /><span><strong>Add a picture or file</strong><small>PDF, JPEG, PNG, WebP, text, STEP, or STL up to 25 MB</small></span><input id='founder-task-file' type='file' accept='application/pdf,image/jpeg,image/png,image/webp,text/plain,.stp,.step,.stl,model/step,model/stl' onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      {file && <p className='fileUploader__selection'>{file.name} · {byteLabel(file.size)}</p>}
      {upload && <div className='uploadProgress'><span style={{ width: `${upload.progress || 0}%` }} /><small>{formatLabel(upload.state)} {upload.progress || 0}%</small></div>}
      <div className='taskFileUploader__actions'><small>Files are private to the Velakron workspace and verified before download.</small><Button type='submit' disabled={!file || pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Upload aria-hidden='true' />} Upload file</Button></div>
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    </form>
    <div className='productionFiles taskFileList'>
      {files.length ? files.map(fileItem => <article className='productionFile' key={fileItem.id}>
        <span>{fileItem.category === 'photo' ? <Image aria-hidden='true' /> : <FileText aria-hidden='true' />}</span>
        <div><strong>{fileItem.display_filename || fileItem.original_filename}</strong><small>{byteLabel(fileItem.byte_size)} · {fileItem.state === 'available' && fileItem.scan_status === 'unavailable' ? 'Format verified' : formatLabel(fileItem.state)}</small></div>
        <StatusBadge tone={fileItem.state === 'available' ? 'success' : 'warning'}>{formatLabel(fileItem.state)}</StatusBadge>
        {fileItem.state === 'available' && <button type='button' onClick={() => onDownload(fileItem)}><Download aria-hidden='true' /><span>Download</span></button>}
      </article>) : <EmptyState compact icon={Paperclip} title='No files yet' description='Pictures and supporting documents will appear here.' />}
    </div>
  </div>
}

const FounderTaskDetailDrawer = ({
  open,
  detail,
  fallbackTask,
  loading,
  pending,
  upload,
  feedback,
  onClose,
  onEdit,
  onComplete,
  onMessage,
  onUpload,
  onDownload,
  canUpdate,
}) => {
  const [tab, setTab] = useState('details')
  const task = detail?.task || fallbackTask
  useEffect(() => { if (open) setTab('details') }, [open, task?.id])
  if (!task) return null
  const messages = detail?.messages || []
  const files = detail?.attachments || []

  return <ResponsiveDrawer open={open} title={task.title} onClose={onClose} wide>
    <div className='taskDetailDrawer'>
      <div className='taskDetailDrawer__summary'>
        <div><StatusBadge tone={statusTone(task.status)}>{formatLabel(task.status)}</StatusBadge><span className={task.overdue ? 'is-overdue' : ''}><CalendarClock aria-hidden='true' /> {task.overdue ? 'Overdue · ' : ''}{formatDate(task.due_at)}</span></div>
        {canUpdate && <div>{!['completed', 'cancelled'].includes(task.status) && <Button variant='secondary' onClick={() => onComplete(task)} disabled={pending}><CheckCircle2 aria-hidden='true' /> Complete</Button>}<Button variant='secondary' onClick={() => onEdit(task)} disabled={pending}><Pencil aria-hidden='true' /> Edit</Button></div>}
      </div>
      <Tabs items={[
        { key: 'details', label: 'Details' },
        { key: 'discussion', label: 'Discussion', count: task.message_count || messages.length },
        { key: 'files', label: 'Files', count: task.attachment_count || files.length },
      ]} activeKey={tab} onChange={setTab} label='Task collaboration sections' />
      {loading ? <div className='taskDetailDrawer__loading'><LoaderCircle className='spin' aria-hidden='true' /> Loading task…</div> : <div className='taskDetailDrawer__body'>
        {tab === 'details' && <div className='taskDetailOverview'>
          <section><span>Outcome and context</span><p>{task.description || 'No description has been added.'}</p></section>
          <dl><div><dt>Project</dt><dd>{task.project_name || 'No workstream'}</dd></div><div><dt>Created by</dt><dd>{task.creator?.full_name || task.creator?.email || 'Velakron founder'}</dd></div><div><dt>Importance</dt><dd>{formatLabel(task.importance)}</dd></div><div><dt>Due date</dt><dd>{formatDate(task.due_at)}</dd></div></dl>
          <section><span>Assignees</span><div className='taskDetailAssignees'>{(task.assignees || []).length ? task.assignees.map(assignee => <div key={assignee.id}><UserAvatar user={assignee.user} size={34} /><span><strong>{assignee.user?.full_name}</strong><small>{formatLabel(assignee.role)}</small></span></div>) : <p>Unassigned</p>}</div></section>
        </div>}
        {tab === 'discussion' && <TaskDiscussion messages={messages} pending={pending} feedback={feedback} onSend={onMessage} />}
        {tab === 'files' && <TaskFiles files={files} pending={pending} upload={upload} feedback={feedback} onUpload={onUpload} onDownload={onDownload} />}
      </div>}
    </div>
  </ResponsiveDrawer>
}

export default FounderTaskDetailDrawer
