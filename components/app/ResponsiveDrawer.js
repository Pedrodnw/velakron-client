import { X } from 'lucide-react'
import { useEffect, useId, useRef } from 'react'

const ResponsiveDrawer = ({ open, title, children, footer, onClose, wide = false }) => {
  const titleId = useId()
  const drawerRef = useRef(null)
  const backdropRef = useRef(null)
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
    const viewport = window.visualViewport
    let viewportFrame
    const fitViewport = () => {
      if (!backdropRef.current || (viewport && viewport.scale !== 1)) return
      backdropRef.current.style.setProperty('--drawer-height', `${viewport?.height || window.innerHeight}px`)
      backdropRef.current.style.setProperty('--drawer-top', `${viewport?.offsetTop || 0}px`)
    }
    const scheduleViewport = () => {
      cancelAnimationFrame(viewportFrame)
      viewportFrame = requestAnimationFrame(fitViewport)
    }
    fitViewport()
    viewport?.addEventListener('resize', scheduleViewport)
    viewport?.addEventListener('scroll', scheduleViewport)
    window.addEventListener('resize', scheduleViewport)
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${scrollPosition}px`
    document.body.style.width = '100%'
    if (scrollbarGap) document.body.style.paddingRight = `${scrollbarGap}px`
    const handleKeyDown = event => {
      const dialogs = [...document.querySelectorAll('[role=dialog][aria-modal=true]')]
      if (dialogs.at(-1) !== drawerRef.current) return
      if (event.key === 'Escape') onCloseRef.current()
      if (event.key !== 'Tab') return
      const focusable = [...drawerRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(element => !element.disabled && element.getClientRects().length && element.getAttribute('aria-hidden') !== 'true')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (document.activeElement === drawerRef.current || !drawerRef.current.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    drawerRef.current?.focus({ preventScroll: true })
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(viewportFrame)
      viewport?.removeEventListener('resize', scheduleViewport)
      viewport?.removeEventListener('scroll', scheduleViewport)
      window.removeEventListener('resize', scheduleViewport)
      document.documentElement.style.overflow = previousRootOverflow
      Object.assign(document.body.style, previousBody)
      window.scrollTo({ top: scrollPosition, left: 0, behavior: 'instant' })
      previousFocus?.focus?.({ preventScroll: true })
    }
  }, [open])

  if (!open) return null

  return <div className='drawerBackdrop' ref={backdropRef} role='presentation' onMouseDown={event => {
    if (event.target === event.currentTarget) onClose()
  }}>
    <aside className={`responsiveDrawer${wide ? ' responsiveDrawer--wide' : ''}`} role='dialog' aria-modal='true' aria-labelledby={titleId} tabIndex={-1} ref={drawerRef}>
      <header>
        <h2 id={titleId}>{title}</h2>
        <button type='button' aria-label='Close panel' onClick={onClose}><X aria-hidden='true' /></button>
      </header>
      <div className='responsiveDrawer__body' onWheel={event => event.stopPropagation()} onTouchMove={event => event.stopPropagation()}>{children}</div>
      {footer && <footer className='responsiveDrawer__footer'>{footer}</footer>}
    </aside>
  </div>
}

export default ResponsiveDrawer
