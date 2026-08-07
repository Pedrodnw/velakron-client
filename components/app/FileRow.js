import { Download, FileText } from 'lucide-react'

const FileRow = ({ name, meta, href, actionLabel = 'Download' }) => <article className='fileRow'>
  <span className='fileRow__icon'><FileText aria-hidden='true' /></span>
  <div>
    <strong>{name}</strong>
    {meta && <span>{meta}</span>}
  </div>
  {href && <a href={href} download aria-label={`${actionLabel} ${name}`}>
    <Download aria-hidden='true' />
    <span>{actionLabel}</span>
  </a>}
</article>

export default FileRow
