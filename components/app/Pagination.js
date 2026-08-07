import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '../design-system'

const Pagination = ({ meta, onPageChange, label = 'Pages' }) => {
  if (!meta || meta.total_pages <= 1) return null
  return <nav className='paginationControls' aria-label={label}>
    <Button variant='secondary' onClick={() => onPageChange(meta.page - 1)} disabled={!meta.has_previous}>
      <ArrowLeft aria-hidden='true' /> Previous
    </Button>
    <span>Page {meta.page} of {meta.total_pages} · {meta.total} results</span>
    <Button variant='secondary' onClick={() => onPageChange(meta.page + 1)} disabled={!meta.has_next}>
      Next <ArrowRight aria-hidden='true' />
    </Button>
  </nav>
}

export default Pagination
