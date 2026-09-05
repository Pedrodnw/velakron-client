import {
  BadgeCheck,
  BellRing,
  Building2,
  Box,
  ClipboardCheck,
  Cog,
  Factory,
  Handshake,
  LayoutDashboard,
  ListTodo,
  BriefcaseBusiness,
  QrCode,
  CreditCard,
  MonitorPlay,
  MapPin,
  ScrollText,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import LinkWrap from '../LinkWrap'
import { getActiveOrganization, getEffectivePermissions, getFeatureEnabled } from '../../store/slices/appContext'
import { getNavigationItems } from './navigation'
import { loadPlatformActionCenter, platformSelectors } from '../../store/slices/entities/platformAdministration'
import { loadPartActionSummary, partSelectors } from '../../store/slices/entities/parts'

const icons = {
  account: UserRound,
  actions: BellRing,
  audit: ScrollText,
  certifications: BadgeCheck,
  facilities: MapPin,
  machines: Cog,
  onboarding: ClipboardCheck,
  organization: Building2,
  overview: LayoutDashboard,
  production: Factory,
  parts: Box,
  relationships: Handshake,
  team: UsersRound,
  tasks: ListTodo,
  dynamic: QrCode,
  crm: BriefcaseBusiness,
  salesDemo: MonitorPlay,
  billing: CreditCard,
}

const AppNavigation = ({ onNavigate }) => {
  const dispatch = useDispatch()
  const router = useRouter()
  const organization = useSelector(getActiveOrganization)
  const permissions = useSelector(getEffectivePermissions)
  const partWorkspacesEnabled = useSelector(getFeatureEnabled('part_workspaces'))
  const actionCenter = useSelector(platformSelectors.getActionCenter)
  const partActions = useSelector(partSelectors.getActionSummary)
  const visibleItems = getNavigationItems(organization?.type, permissions, {
    demoWorkspace: organization?.demo_workspace,
    features: { part_workspaces: partWorkspacesEnabled },
  })
  const canReviewPlatform = permissions.includes('platform.support')
  useEffect(() => {
    if (!canReviewPlatform) return undefined
    const refresh = () => dispatch(loadPlatformActionCenter())
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    const refreshOnFocus = () => { if (document.visibilityState !== 'hidden') refresh() }
    window.addEventListener('focus', refreshOnFocus)
    document.addEventListener('visibilitychange', refreshOnFocus)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', refreshOnFocus)
      document.removeEventListener('visibilitychange', refreshOnFocus)
    }
  }, [canReviewPlatform, dispatch])
  useEffect(() => {
    if (!partWorkspacesEnabled || !['oem', 'supplier'].includes(organization?.type) || !permissions.includes('part.read')) return undefined
    const refresh = () => dispatch(loadPartActionSummary())
    refresh()
    const interval = window.setInterval(refresh, 60_000)
    return () => window.clearInterval(interval)
  }, [dispatch, organization?.id, organization?.type, partWorkspacesEnabled, permissions])

  return <nav className='appNavigation' aria-label='Portal navigation'>
    <p>Workspace</p>
    {visibleItems.map(({ href, label, icon, exact }) => {
      const Icon = icons[icon]
      const active = exact ? router.pathname === href : router.pathname.startsWith(href)
      const itemHref = href === '/app/parts'
        ? partActions?.needs_action > 0
          ? '/app/parts?view=needs_action'
          : partActions?.new_revisions > 0
            ? '/app/parts?view=new_revisions'
            : href
        : href
      const partActionCount = (partActions?.needs_action || 0) + (partActions?.new_revisions || 0)
      const count = href === '/admin/action-center'
        ? actionCenter?.counts?.needs_velakron || 0
        : href === '/app/parts' ? partActionCount
          : href === '/app/production' && organization?.type === 'supplier' ? partActionCount : 0
      return <LinkWrap key={href} href={itemHref} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
        <Icon aria-hidden='true' />
        <span>{label}</span>
        {count > 0 && <strong className='appNavigation__count' aria-label={`${count} item${count === 1 ? '' : 's'} need action`}>{count > 99 ? '99+' : count}</strong>}
      </LinkWrap>
    })}
  </nav>
}

export default AppNavigation
