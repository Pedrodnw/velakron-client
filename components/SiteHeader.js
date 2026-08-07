import { LogIn, LogOut, Menu, UserRound, X } from 'lucide-react'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/router'
import LinkWrap from './LinkWrap'
import { Button, VelakronLogo } from './design-system'
import { navigation } from '../content/site'
import {
  getAuthInitialized,
  getAuthUser,
  logoutAccount,
} from '../store/slices/auth'
import {
  getMobileNavigationOpen,
  mobileNavigationClosed,
  mobileNavigationToggled,
} from '../store/slices/ui'

const SiteHeader = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const mobileOpen = useSelector(getMobileNavigationOpen)
  const authInitialized = useSelector(getAuthInitialized)
  const user = useSelector(getAuthUser)
  const currentPath = String(router.asPath || '/').split(/[?#]/)[0]

  useEffect(() => {
    dispatch(mobileNavigationClosed())
  }, [router.asPath, dispatch])

  const logout = async () => {
    const result = await dispatch(logoutAccount())
    if (result?.ok) router.push('/')
  }

  return <header className='siteHeader'>
    <div className='siteHeader__inner max'>
      <LinkWrap className='siteHeader__brand' href='/' aria-label='Velakron home'>
        <VelakronLogo priority />
      </LinkWrap>

      <nav className='siteHeader__desktopNav' aria-label='Primary navigation'>
        {navigation.map(item => (
          <LinkWrap
            className={currentPath === item.href ? 'active' : ''}
            href={item.href}
            key={item.href}
          >
            {item.label}
          </LinkWrap>
        ))}
      </nav>

      <div className='siteHeader__actions'>
        {authInitialized && (user
          ? <LinkWrap className={currentPath === '/account' ? 'siteHeader__authLink active' : 'siteHeader__authLink'} href='/account'>
            <span>{user.initials}</span>
            <em>{user.first_name}</em>
          </LinkWrap>
          : <LinkWrap className='siteHeader__authLink' href='/login'>
            <LogIn aria-hidden='true' />
            <em>Log in</em>
          </LinkWrap>)}
        <Button className='siteHeader__quote' href='/rfq'>Request A Quote</Button>
      </div>

      <button
        className='siteHeader__menuButton'
        type='button'
        aria-label={mobileOpen ? 'Close navigation' : 'Open navigation'}
        aria-expanded={mobileOpen}
        onClick={() => dispatch(mobileNavigationToggled())}
      >
        {mobileOpen ? <X aria-hidden='true' /> : <Menu aria-hidden='true' />}
      </button>
    </div>

    <nav className={`siteHeader__mobileNav ${mobileOpen ? 'isOpen' : ''}`} aria-label='Mobile navigation'>
      {navigation.map(item => <LinkWrap href={item.href} key={item.href}>{item.label}</LinkWrap>)}
      {authInitialized && <div className='siteHeader__mobileAccount'>
        {user ? <>
          <LinkWrap href='/account'><UserRound aria-hidden='true' /> My Account</LinkWrap>
          <button type='button' onClick={logout}><LogOut aria-hidden='true' /> Log Out</button>
        </> : <>
          <LinkWrap href='/login'><LogIn aria-hidden='true' /> Log In</LinkWrap>
          <LinkWrap href='/register'><UserRound aria-hidden='true' /> Create Account</LinkWrap>
        </>}
      </div>}
      <Button href='/rfq'>Request A Quote</Button>
    </nav>
  </header>
}

export default SiteHeader
