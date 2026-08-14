import { X } from 'lucide-react'

const CrmModal = ({ open, title, description, children, actions, onClose, wide = false }) => {
  if (!open) return null
  return <div className='crmModal' role='presentation' onMouseDown={event => event.target === event.currentTarget && onClose?.()}>
    <section className={`crmModal__panel${wide ? ' crmModal__panel--wide' : ''}`} role='dialog' aria-modal='true' aria-labelledby='crm-modal-title'>
      <header><div><h2 id='crm-modal-title'>{title}</h2>{description && <p>{description}</p>}</div><button type='button' onClick={onClose} aria-label='Close'><X aria-hidden='true' /></button></header>
      <div className='crmModal__body'>{children}</div>
      {actions && <footer>{actions}</footer>}
    </section>
  </div>
}

export default CrmModal
