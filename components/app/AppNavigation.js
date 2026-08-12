import {
  BadgeCheck,
  Building2,
  ClipboardCheck,
  Cog,
  Factory,
  Handshake,
  LayoutDashboard,
  ListTodo,
  ContactRound,
  QrCode,
  MapPin,
  ScrollText,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useSelector } from 'react-redux'
import LinkWrap from '../LinkWrap'
import { getActiveOrganization, getEffectivePermissions } from '../../store/slices/appContext'
import { getNavigationItems } from './navigation'

const icons = {
  account: UserRound,
  audit: ScrollText,
  certifications: BadgeCheck,
  facilities: MapPin,
  machines: Cog,
  onboarding: ClipboardCheck,
  organization: Building2,
  overview: LayoutDashboard,
  production: Factory,
  relationships: Handshake,
  team: UsersRound,
  tasks: ListTodo,
  leads: ContactRound,
  dynamic: QrCode,
}

const AppNavigation = ({ onNavigate }) => {
  const router = useRouter()
  const organization = useSelector(getActiveOrganization)
  const permissions = useSelector(getEffectivePermissions)
  const visibleItems = getNavigationItems(organization?.type, permissions, {
    demoWorkspace: organization?.demo_workspace,
  })

  return <nav className='appNavigation' aria-label='Portal navigation'>
    <p>Workspace</p>
    {visibleItems.map(({ href, label, icon, exact }) => {
      const Icon = icons[icon]
      const active = exact ? router.pathname === href : router.pathname.startsWith(href)
      return <LinkWrap key={href} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined} onClick={onNavigate}>
        <Icon aria-hidden='true' />
        <span>{label}</span>
      </LinkWrap>
    })}
  </nav>
}

export default AppNavigation
