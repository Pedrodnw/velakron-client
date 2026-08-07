import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { Button } from '../design-system'

const ConfirmationDialog = ({ open, title, description, confirmLabel = 'Confirm', onConfirm, onClose, danger = false, confirmDisabled = false, children }) => {
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const handleKeyDown = event => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    dialogRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [open])

  if (!open) return null

  return <div className='dialogBackdrop' role='presentation' onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <section className='confirmationDialog' role='dialog' aria-modal='true' aria-labelledby='confirmation-title' tabIndex={-1} ref={dialogRef}>
      <button className='confirmationDialog__close' type='button' aria-label='Close dialog' onClick={onClose}><X aria-hidden='true' /></button>
      <span className='confirmationDialog__icon'><AlertTriangle aria-hidden='true' /></span>
      <h2 id='confirmation-title'>{title}</h2>
      <p>{description}</p>
      {children && <div className='confirmationDialog__body'>{children}</div>}
      <div className='confirmationDialog__actions'>
        <Button variant='secondary' onClick={onClose}>Cancel</Button>
        <Button className={danger ? 'vk-button--danger' : ''} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
      </div>
    </section>
  </div>
}

export default ConfirmationDialog
