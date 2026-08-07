import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const ResponsiveDrawer = ({ open, title, children, onClose, wide = false }) => {
  const drawerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const handleKeyDown = event => {
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = [...drawerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled)
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    drawerRef.current?.focus()
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previousFocus?.focus?.()
    }
  }, [open])

  if (!open) return null

  return <div className='drawerBackdrop' role='presentation' onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <aside className={`responsiveDrawer${wide ? ' responsiveDrawer--wide' : ''}`} role='dialog' aria-modal='true' aria-labelledby='drawer-title' tabIndex={-1} ref={drawerRef}>
      <header>
        <h2 id='drawer-title'>{title}</h2>
        <button type='button' aria-label='Close panel' onClick={onClose}><X aria-hidden='true' /></button>
      </header>
      <div className='responsiveDrawer__body'>{children}</div>
    </aside>
  </div>
}

export default ResponsiveDrawer
