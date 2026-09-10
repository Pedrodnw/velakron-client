import Link from 'next/link'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import VelakronLogo from '../design-system/VelakronLogo'
import { navigation } from '../../content/marketing/site'

export default function MarketingHeader() {
  const [open, setOpen] = useState(false)
  const button = useRef(null)
  const header = useRef(null)
  const router = useRouter()
  useEffect(() => { setOpen(false) }, [router.asPath])
  useEffect(() => {
    if (!open) return undefined
    const close = event => {
      if (event.key === 'Escape') { setOpen(false); button.current?.focus() }
    }
    const outside = event => { if (!header.current?.contains(event.target)) setOpen(false) }
    const resize = () => { if (window.innerWidth > 1100) setOpen(false) }
    document.addEventListener('keydown', close)
    document.addEventListener('pointerdown', outside)
    window.addEventListener('resize', resize)
    return () => { document.removeEventListener('keydown', close); document.removeEventListener('pointerdown', outside); window.removeEventListener('resize', resize) }
  }, [open])
  return <header className={`mk-header${open ? ' is-open' : ''}`} ref={header}>
    <div className='mk-container mk-header__inner'>
      <Link className='mk-brand' href='/' aria-label='Velakron home'><VelakronLogo priority sizes='148px' /></Link>
      <button className='mk-menu' type='button' ref={button} aria-controls='marketing-navigation' aria-expanded={open} onClick={() => setOpen(value => !value)}>{open ? <X aria-hidden /> : <Menu aria-hidden />}<span>{open ? 'Close' : 'Menu'}</span></button>
      <nav id='marketing-navigation' className='mk-nav' aria-label='Main navigation'>
        {navigation.map(([label,href]) => <Link key={href} href={href} aria-current={router.pathname === href ? 'page' : undefined}>{label}</Link>)}
        <div className='mk-nav__actions'><Link href='/login'>Log in</Link><Link className='mk-button mk-button--small' href='/early-access'>Apply for Early Access<ArrowUpRight size={16} aria-hidden /></Link></div>
      </nav>
    </div>
  </header>
}
