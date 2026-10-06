import { Download, FileText } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDateTime, formatLabel } from './formatters'
import styles from './RequirementDocuments.module.scss'

const RequirementDocuments = ({ files, onDownload, pending }) => {
  if (!files.length) return null
  return <ul className={styles.documents} aria-label='Requirement documents'>
    {files.map(file => <li key={file.id || file._id}>
      <FileText aria-hidden='true' />
      <div className={styles.file}>
        <strong>{file.display_filename || file.original_filename}</strong>
        <span className={styles.metadata}>{file.uploader?.display_name || 'Authorized user'} · {formatDateTime(file.created_at)} · {(file.byte_size / 1024).toFixed(1)} KB</span>
        <StatusBadge tone={file.state === 'available' ? 'success' : ['failed', 'quarantined'].includes(file.state) ? 'danger' : 'warning'}>
          {file.state === 'available' ? 'Document attached' : file.state === 'scanning' ? 'Security check in progress' : formatLabel(file.state)}
        </StatusBadge>
      </div>
      {file.state === 'available' && <button type='button' disabled={pending} onClick={() => onDownload(file)} aria-label={`Download ${file.display_filename || file.original_filename}`}><Download aria-hidden='true' /> Download</button>}
    </li>)}
  </ul>
}

export default RequirementDocuments
