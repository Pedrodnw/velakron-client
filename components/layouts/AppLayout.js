import { Menu, UserRound, X } from 'lucide-react'
import LinkWrap from '../LinkWrap'
import { VelakronLogo } from '../design-system'
import AppNavigation from '../app/AppNavigation'
import AppBreadcrumbs from '../app/AppBreadcrumbs'
import OrganizationSwitcher from '../app/OrganizationSwitcher'
import AppAccessBoundary from '../app/AppAccessBoundary'
import { useState } from 'react'
import { useSelector } from 'react-redux'
import { getAuthUser } from '../../store/slices/auth'
import { getActiveMembership } from '../../store/slices/appContext'
import UserAvatar from '../UserAvatar'

const roleLabels = {
  velakron_admin: 'Velakron administrator',
  oem_admin: 'Company administrator',
  oem_user: 'Company member',
  supplier_admin: 'Supplier administrator',
  supplier_user: 'Supplier member',
}

const AppLayout = ({ children }) => {
  const [navigationOpen, setNavigationOpen] = useState(false)
  const user = useSelector(getAuthUser)
  const membership = useSelector(getActiveMembership)
  const closeNavigation = () => setNavigationOpen(false)

  return <div className='appLayout'>
    <a className='skipLink' href='#app-main-content'>Skip to main content</a>
    <aside className={`appSidebar${navigationOpen ? ' is-open' : ''}`} aria-label='Primary portal navigation'>
      <div className='appSidebar__brand'>
        <LinkWrap href='/app' aria-label='Velakron portal home'><VelakronLogo priority sizes='138px' /></LinkWrap>
        <button type='button' aria-label='Close navigation' onClick={closeNavigation}><X aria-hidden='true' /></button>
      </div>
      <OrganizationSwitcher />
      <AppNavigation onNavigate={closeNavigation} />
      <div className='appSidebar__footer'>
        <span>Velakron workspace</span>
        <small>Organization access is enforced</small>
      </div>
    </aside>

    {navigationOpen && <button className='appLayout__backdrop' type='button' aria-label='Close navigation' onClick={closeNavigation} />}

    <div className='appLayout__workspace'>
      <header className='appTopbar'>
        <button className='appTopbar__menu' type='button' aria-label='Open navigation' onClick={() => setNavigationOpen(true)}>
          <Menu aria-hidden='true' />
        </button>
        <div className='appTopbar__actions'>
          <LinkWrap className='appIdentity' href='/account'>
            <UserAvatar user={user} fallback={<UserRound aria-hidden='true' />} size={36} />
            <span><strong>{user?.full_name || user?.email || 'Account'}</strong><small>{roleLabels[membership?.role] || 'Account holder'}</small></span>
          </LinkWrap>
        </div>
      </header>
      <main id='app-main-content' className='appMain'><AppAccessBoundary><AppBreadcrumbs />{children}</AppAccessBoundary></main>
    </div>
  </div>
}

export default AppLayout
