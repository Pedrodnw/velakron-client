import { Clock3, ExternalLink, LoaderCircle, LogOut, Menu, RotateCcw, UserRound, X } from 'lucide-react'
import { useRouter } from 'next/router'
import LinkWrap from '../LinkWrap'
import { VelakronLogo } from '../design-system'
import AppNavigation from '../app/AppNavigation'
import AppBreadcrumbs from '../app/AppBreadcrumbs'
import OrganizationSwitcher from '../app/OrganizationSwitcher'
import ExperienceSwitcher from '../app/ExperienceSwitcher'
import AppAccessBoundary from '../app/AppAccessBoundary'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAuthUser, loadSession, logoutAccount } from '../../store/slices/auth'
import { getActiveMembership, getActiveOrganization } from '../../store/slices/appContext'
import UserAvatar from '../UserAvatar'
import SalesDemoSessionTracker from '../app/SalesDemoSessionTracker'
import { getSalesDemoPresenter } from '../../store/slices/appContext'
import { apiCallBegan } from '../../store/api'

const roleLabels = {
  velakron_admin: 'Velakron administrator',
  founder: 'Founder',
  oem_admin: 'Company administrator',
  oem_user: 'Company member',
  supplier_admin: 'Supplier administrator',
  supplier_user: 'Supplier member',
}

const AppLayout = ({ children, wide = false }) => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [navigationOpen, setNavigationOpen] = useState(false)
  const [finishingDemo, setFinishingDemo] = useState(false)
  const [resettingDemo, setResettingDemo] = useState(false)
  const [finishError, setFinishError] = useState('')
  const [clock, setClock] = useState(Date.now())
  const user = useSelector(getAuthUser)
  const membership = useSelector(getActiveMembership)
  const organization = useSelector(getActiveOrganization)
  const presenter = useSelector(getSalesDemoPresenter)
  const demoExpiresAt = presenter?.expires_at || organization?.demo_expires_at
  const remainingMinutes = demoExpiresAt
    ? Math.max(0, Math.ceil((new Date(demoExpiresAt).getTime() - clock) / 60_000))
    : null
  const remainingLabel = remainingMinutes === null
    ? ''
    : remainingMinutes >= 60
      ? `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m remaining`
      : `${remainingMinutes}m remaining`
  useEffect(() => {
    if (!organization?.demo_workspace) return undefined
    const timer = window.setInterval(() => setClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [organization?.demo_workspace])
  const closeNavigation = () => setNavigationOpen(false)
  const finishDemo = async () => {
    if (finishingDemo) return
    setFinishingDemo(true)
    setFinishError('')
    const result = presenter
      ? await dispatch(apiCallBegan({ url: '/sales-demos/current/end', method: 'post', data: { reason: 'Founder finished the private preview' } }))
      : await dispatch(logoutAccount())
    if (!result?.ok) {
      setFinishingDemo(false)
      setFinishError(result?.error?.message || 'The experience could not be finished. Please try again.')
      return
    }
    closeNavigation()
    if (presenter) {
      window.sessionStorage.removeItem('velakron_sales_demo_presenter')
      await dispatch(loadSession())
      window.close()
      if (!window.closed) await router.replace('/app/sales-demo')
    } else await router.replace('/imts-demo')
  }
  const resetDemo = async () => {
    if (!presenter || resettingDemo || !window.confirm('Reset this preview to its published baseline? All synthetic changes in this preview will be removed.')) return
    setResettingDemo(true)
    setFinishError('')
    const state = await dispatch(apiCallBegan({ url: '/sales-demos/current/state' }))
    const result = state?.ok
      ? await dispatch(apiCallBegan({
        url: '/sales-demos/current/reset',
        method: 'post',
        data: { expected_revision: state.payload?.data?.revision },
      }))
      : state
    if (!result?.ok) {
      setResettingDemo(false)
      setFinishError(result?.error?.message || 'The preview could not be reset. Please try again.')
      return
    }
    await router.replace('/app')
    router.reload()
  }

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
        <small>{organization?.demo_workspace ? (presenter ? 'Founder preview workspace' : 'Private Sales Demo workspace') : 'Organization access is enforced'}</small>
        {organization?.demo_workspace && <>
          {presenter && <div className='appSidebar__demoControls'>
            <button type='button' onClick={resetDemo} disabled={resettingDemo || finishingDemo}>
              {resettingDemo ? <LoaderCircle className='spin' aria-hidden='true' /> : <RotateCcw aria-hidden='true' />}
              {resettingDemo ? 'Resetting…' : 'Reset preview'}
            </button>
            <LinkWrap href='/app/sales-demo' target='_blank' rel='noopener noreferrer'>
              <ExternalLink aria-hidden='true' /> Founder controls
            </LinkWrap>
          </div>}
          <button className='appSidebar__finishDemo' type='button' onClick={finishDemo} disabled={finishingDemo}>
            {finishingDemo ? <LoaderCircle className='spin' aria-hidden='true' /> : <LogOut aria-hidden='true' />}
            {finishingDemo ? 'Finishing…' : 'Finish experience'}
          </button>
          {finishError && <small className='appSidebar__finishError' role='alert'>{finishError}</small>}
        </>}
      </div>
    </aside>

    {navigationOpen && <button className='appLayout__backdrop' type='button' aria-label='Close navigation' onClick={closeNavigation} />}

    <div className='appLayout__workspace'>
      <header className='appTopbar'>
        <button className='appTopbar__menu' type='button' aria-label='Open navigation' onClick={() => setNavigationOpen(true)}>
          <Menu aria-hidden='true' />
        </button>
        <div className='appTopbar__actions'>
          <ExperienceSwitcher />
          <LinkWrap className='appIdentity' href={organization?.demo_workspace ? '/app' : '/account'}>
            <UserAvatar user={user} fallback={<UserRound aria-hidden='true' />} size={36} priority />
            <span><strong>{user?.full_name || user?.email || 'Account'}</strong><small>{membership?.assigned_role === 'founder' ? 'Founder' : roleLabels[membership?.role] || 'Account holder'}</small></span>
          </LinkWrap>
        </div>
      </header>
      <main id='app-main-content' className={`appMain${wide ? ' appMain--wide' : ''}`}><AppAccessBoundary>
        {organization?.demo_workspace && <div className='demoWorkspaceBanner'><Clock3 aria-hidden='true' /><div><strong>{presenter ? 'Founder preview' : 'Private Sales Demo'}{remainingLabel ? ` · ${remainingLabel}` : ''}</strong><span>{presenter ? 'Synthetic customer workspace. A Velakron presenter may introduce updates while you explore; open Founder controls to switch roles.' : 'Synthetic, isolated workspace. A Velakron presenter may introduce updates while you explore, and access expires automatically.'}</span></div></div>}
        <SalesDemoSessionTracker />
        <AppBreadcrumbs />{children}
      </AppAccessBoundary></main>
    </div>
  </div>
}

export default AppLayout
