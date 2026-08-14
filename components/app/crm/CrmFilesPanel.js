import { Download, FileText, Image, LoaderCircle, Paperclip, Trash2, Upload } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import FormMessage from '../../auth/FormMessage'
import { Button } from '../../design-system'
import { openDownloadTarget, uploadFileToIntent } from '../../../store/fileTransfer'
import { uploadMimeForFile } from '../../../store/modelFiles'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'
import EmptyState from '../EmptyState'
import StatusBadge from '../StatusBadge'

const byteLabel = bytes => {
  if (!Number.isFinite(bytes)) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const CrmFilesPanel = ({ subject, subjectId }) => {
  const dispatch = useDispatch()
  const [files, setFiles] = useState([])
  const [file, setFile] = useState(null)
  const [working, setWorking] = useState(false)
  const [progress, setProgress] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const load = useCallback(async () => {
    if (!subjectId) return
    const result = await dispatch(crmRequest({ url: `/files/${subject}/${subjectId}`, requestKey: `crm-files-${subject}-${subjectId}` }))
    if (result?.ok) setFiles(result.payload.data.attachments || [])
    else setFeedback({ type: 'error', message: crmErrorMessage(result, 'Files could not be loaded.') })
  }, [dispatch, subject, subjectId])
  useEffect(() => { load() }, [load])
  const upload = async event => {
    event.preventDefault()
    if (!file) return
    setWorking(true); setProgress(0); setFeedback(null)
    const intent = await dispatch(crmRequest({ url: `/files/${subject}/${subjectId}/intents`, method: 'post', requestKey: `crm-file-intent-${subjectId}`, data: { filename: file.name, mime_type: uploadMimeForFile(file), byte_size: file.size } }))
    if (!intent?.ok) { setWorking(false); return setFeedback({ type: 'error', message: crmErrorMessage(intent, 'The file upload could not be prepared.') }) }
    try {
      await uploadFileToIntent({ file, upload: intent.payload.data.upload, onProgress: value => setProgress(Math.round(value * .9)) })
      setProgress(95)
    } catch (error) {
      setWorking(false); return setFeedback({ type: 'error', message: error.response?.data?.error?.message || error.message })
    }
    const finalized = await dispatch(crmRequest({ url: `/files/${subject}/${subjectId}/${intent.payload.data.attachment.id}/finalize`, method: 'post', data: {}, requestKey: `crm-file-finalize-${intent.payload.data.attachment.id}` }))
    setWorking(false)
    if (!finalized?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(finalized, 'The file could not be verified.') })
    setProgress(100); setFile(null); setFeedback({ type: 'success', message: 'File uploaded and verified.' }); load()
  }
  const download = async item => {
    const result = await dispatch(crmRequest({ url: `/files/${subject}/${subjectId}/${item.id}/download-intent`, method: 'post', data: {}, requestKey: `crm-file-download-${item.id}` }))
    if (result?.ok) openDownloadTarget(result.payload.data.download.target)
    else setFeedback({ type: 'error', message: crmErrorMessage(result, 'The file could not be downloaded.') })
  }
  const remove = async item => {
    if (!window.confirm(`Remove ${item.display_filename || item.original_filename}? This action is audited.`)) return
    const result = await dispatch(crmRequest({ url: `/files/${subject}/${subjectId}/${item.id}`, method: 'delete', data: { reason: 'Removed by a founder from the CRM record.' }, requestKey: `crm-file-remove-${item.id}` }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'The file could not be removed.') })
    else { setFeedback({ type: 'success', message: 'File removed from the CRM record.' }); load() }
  }
  return <div className='taskFiles crmFilesPanel'>
    <form className='fileUploader taskFileUploader' onSubmit={upload}>
      <label className='fileUploader__drop'><Upload aria-hidden='true' /><span><strong>Add a private CRM file</strong><small>PDF, JPEG, PNG, WebP, text, STEP, or STL up to 25 MB</small></span><input type='file' accept='application/pdf,image/jpeg,image/png,image/webp,text/plain,.stp,.step,.stl,model/step,model/stl' onChange={event => { setFile(event.target.files?.[0] || null); setProgress(0) }} /></label>
      {file && <p className='fileUploader__selection'>{file.name} · {byteLabel(file.size)}</p>}
      {working && <div className='uploadProgress'><span style={{ width: `${progress}%` }} /><small>{progress < 95 ? 'Uploading' : 'Verifying'} {progress}%</small></div>}
      <div className='taskFileUploader__actions'><small>Files remain private to founders and are verified before download.</small><Button type='submit' disabled={!file || working}>{working ? <LoaderCircle className='spin' aria-hidden='true' /> : <Upload aria-hidden='true' />} Upload file</Button></div>
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    </form>
    <div className='productionFiles taskFileList'>
      {files.length ? files.map(item => <article className='productionFile' key={item.id}><span>{item.category === 'photo' ? <Image aria-hidden='true' /> : <FileText aria-hidden='true' />}</span><div><strong>{item.display_filename || item.original_filename}</strong><small>{byteLabel(item.byte_size)} · Private CRM file</small></div><StatusBadge tone={item.state === 'available' ? 'success' : 'warning'}>{item.state}</StatusBadge>{item.state === 'available' && <button type='button' onClick={() => download(item)}><Download aria-hidden='true' /><span>Download</span></button>}<button type='button' disabled={working} onClick={() => remove(item)}><Trash2 aria-hidden='true' /><span>Remove</span></button></article>) : <EmptyState compact icon={Paperclip} title='No files yet' description='Pictures and supporting documents will appear here.' />}
    </div>
  </div>
}

export default CrmFilesPanel
