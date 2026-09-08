import { AlertTriangle, X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'
import { Button } from '../design-system'

const ConfirmationDialog = ({ open, title, description, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm, onClose, danger = false, confirmDisabled = false, children }) => {
  const titleId = useId()
  const dialogRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const handleKeyDown = event => {
      if ([...document.querySelectorAll('[role=dialog][aria-modal=true]')].at(-1) !== dialogRef.current) return
      if (event.key === 'Escape') { event.preventDefault(); onCloseRef.current(); return }
      if (event.key !== 'Tab') return
      const focusable = [...dialogRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled && element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (document.activeElement === dialogRef.current || !dialogRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
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
    <section className='confirmationDialog' role='dialog' aria-modal='true' aria-labelledby={titleId} tabIndex={-1} ref={dialogRef}>
      <button className='confirmationDialog__close' type='button' aria-label='Close dialog' onClick={onClose}><X aria-hidden='true' /></button>
      <span className='confirmationDialog__icon'><AlertTriangle aria-hidden='true' /></span>
      <h2 id={titleId}>{title}</h2>
      <p>{description}</p>
      {children && <div className='confirmationDialog__body'>{children}</div>}
      <div className='confirmationDialog__actions'>
        <Button variant='secondary' onClick={onClose}>{cancelLabel}</Button>
        <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm} disabled={confirmDisabled}>{confirmLabel}</Button>
      </div>
    </section>
  </div>
}

export default ConfirmationDialog
