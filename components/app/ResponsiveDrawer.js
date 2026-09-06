import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

const ResponsiveDrawer = ({ open, title, children, onClose, wide = false }) => {
  const drawerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return undefined
    const previousFocus = document.activeElement
    const scrollPosition = window.scrollY
    const previousBody = {
      overflow: document.body.style.overflow,
      paddingRight: document.body.style.paddingRight,
      position: document.body.style.position,
      top: document.body.style.top,
      width: document.body.style.width,
    }
    const previousRootOverflow = document.documentElement.style.overflow
    const scrollbarGap = Math.max(0, window.innerWidth - document.documentElement.clientWidth)
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollPosition}px`
    document.body.style.width = '100%'
    if (scrollbarGap) document.body.style.paddingRight = `${scrollbarGap}px`
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
      document.documentElement.style.overflow = previousRootOverflow
      Object.assign(document.body.style, previousBody)
      window.scrollTo(0, scrollPosition)
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
      <div className='responsiveDrawer__body' onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}>{children}</div>
    </aside>
  </div>
}

export default ResponsiveDrawer
