import { Mail, MapPin } from 'lucide-react'
import LinkWrap from './LinkWrap'
import { VelakronLogo } from './design-system'
import { navigation } from '../content/site'

const SiteFooter = () => (
  <footer className='siteFooter'>
    <div className='siteFooter__main max'>
      <div className='siteFooter__brand'>
        <LinkWrap href='/' aria-label='Velakron home'><VelakronLogo /></LinkWrap>
        <strong>One Accountable Partner.</strong>
        <p>Engineering-Led Manufacturing Solutions.</p>
      </div>

      <nav className='siteFooter__links' aria-label='Footer navigation'>
        {navigation.slice(1).map(item => <LinkWrap href={item.href} key={item.href}>{item.label}</LinkWrap>)}
      </nav>

      <div className='siteFooter__contact'>
        <p><MapPin aria-hidden='true' />Vancouver, WA, USA</p>
        <a href='mailto:info@velakron.com'><Mail aria-hidden='true' />info@velakron.com</a>
        <a className='siteFooter__social' href='https://www.linkedin.com' aria-label='Velakron on LinkedIn'>
          <span aria-hidden='true'>in</span>
        </a>
      </div>
    </div>

    <div className='siteFooter__bottom'>
      <div className='max'>
        <span>© 2026 Velakron. All Rights Reserved.</span>
        <span>Engineering. Manufacturing. Quality. One Accountable Partner.</span>
      </div>
    </div>
  </footer>
)

export default SiteFooter
