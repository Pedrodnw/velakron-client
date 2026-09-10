import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ChevronDown, Menu, X } from 'lucide-react'
import VelakronLogo from '../design-system/VelakronLogo'

const groups = [
  ['Product', [['How it works', '/how-it-works'], ['For OEMs', '/for-oems'], ['For suppliers', '/for-suppliers'], ['Quality', '/quality']]],
  ['Resources', [['Insights', '/insights'], ['FAQ', '/faq'], ['Security & data', '/security'], ['Visibility assessment', '/visibility-assessment']]],
]
export default function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const button = useRef(null)
  const header = useRef(null)
  const router = useRouter()
  const path = router.asPath.split(/[?#]/)[0]
  useEffect(() => {
    setOpen(false)
    header.current?.querySelectorAll('details').forEach(node => { node.open = false })
  }, [router.asPath])
  useEffect(() => {
    const closeGroups = () => header.current?.querySelectorAll('details[open]').forEach(node => { node.open = false })
    const close = event => {
      if (event.key !== 'Escape') return
      const group = header.current?.querySelector('details[open]')
      if (group) { closeGroups(); group.querySelector('summary')?.focus() }
      else if (open) { setOpen(false); button.current?.focus() }
    }
    const outside = event => { if (!header.current?.contains(event.target)) { closeGroups(); setOpen(false) } }
    const resize = () => { if (window.innerWidth > 1100) setOpen(false) }
    document.addEventListener('keydown', close); document.addEventListener('pointerdown', outside); window.addEventListener('resize', resize)
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize) }
  }, [open])
  return <header className={`mk-header${open ? ' is-open' : ''}`} ref={header}>
    <div className='mk-container mk-header__inner'>
      <Link className='mk-brand' href='/' aria-label='Velakron home'><VelakronLogo priority sizes='148px' /></Link>
      <button className='mk-menu' type='button' ref={button} aria-controls='marketing-navigation' aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X aria-hidden /> : <Menu aria-hidden />}<span>{open ? 'Close' : 'Menu'}</span></button>
      <nav id='marketing-navigation' className='mk-nav' aria-label='Main navigation'>
        {groups.map(([title, links]) => <details className='mk-nav-group' key={title} name='public-navigation'><summary className={links.some(([, href]) => path === href) ? 'is-current' : ''}>{title}<ChevronDown size={15} aria-hidden /></summary><div>{links.map(([label, href]) => <Link key={href} href={href} aria-current={path === href ? 'page' : undefined}>{label}</Link>)}</div></details>)}
        <Link href='/about' aria-current={path === '/about' ? 'page' : undefined}>About</Link>
        <Link href='/contact' aria-current={path === '/contact' ? 'page' : undefined}>Contact</Link>
        <div className='mk-nav__actions'><Link href='/login'>Log in</Link><Link href='/request-demo'>Request a demo</Link><Link className='mk-button mk-button--small' href='/early-access'>Early Access<ArrowRight size={16} aria-hidden /></Link></div>
      </nav>
    </div>
  </header>
}
