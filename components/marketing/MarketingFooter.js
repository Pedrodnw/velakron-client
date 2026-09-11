import Link from 'next/link'
import VelakronLogo from '../design-system/VelakronLogo'
import { footerGroups } from '../../content/marketing/site'

export default function MarketingFooter() {
  return <footer className='mk-footer'>
    <div className='mk-container'>
      <div className='mk-footer__main'><div className='mk-footer__brand'><Link href='/' aria-label='Velakron home'><VelakronLogo sizes='160px' /></Link><p>Production visibility.<br />Shared understanding.</p><span>For OEMs and manufacturing suppliers.</span><a href='mailto:info@velakron.com'>info@velakron.com</a></div>
        {footerGroups.map(([title,links]) => <nav key={title} aria-label={title}><h2>{title}</h2>{links.map(([label,href]) => <Link href={href} key={href}>{label}</Link>)}</nav>)}
      </div>
      <div className='mk-footer__bottom'><span>© {new Date().getFullYear()} Velakron</span><div><Link href='/privacy'>Privacy</Link><Link href='/terms'>Website terms</Link><Link href='/confidentiality-terms'>Confidentiality terms</Link><Link href='/acceptable-use'>Acceptable use & data restrictions</Link></div></div>
    </div>
  </footer>
}
