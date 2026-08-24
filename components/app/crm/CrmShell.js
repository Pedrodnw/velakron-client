import {
  Activity,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ContactRound,
  Inbox,
  ListChecks,
  Presentation,
  QrCode,
  Search,
  Settings2,
  Target,
  UsersRound,
} from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import LinkWrap from '../../LinkWrap'
import { getHasPermission } from '../../../store/slices/appContext'
import { PermissionDenied } from '../AccessState'
import { crmRequest } from '../../../store/crmApi'

const items = [
  { href: '/app/crm', label: 'Dashboard', icon: ChartNoAxesCombined, exact: true },
  { href: '/app/crm/organizations', label: 'Organizations', icon: Building2 },
  { href: '/app/crm/contacts', label: 'Contacts', icon: ContactRound },
  { href: '/app/crm/opportunities', label: 'Opportunities', icon: Target },
  { href: '/app/crm/leads', label: 'Sales Demo leads', icon: QrCode },
  { href: '/app/crm/onboarding', label: 'Onboarding', icon: ListChecks },
  { href: '/app/crm/activity', label: 'Activity', icon: Activity },
  { href: '/app/crm/inbox', label: 'Inbox', icon: Inbox },
  { href: '/app/crm/calendar', label: 'Calendar', icon: CalendarDays },
  { href: '/app/crm/reports', label: 'Reports', icon: Presentation },
  { href: '/app/crm/settings', label: 'Settings', icon: Settings2 },
]

const CrmShell = ({ children }) => {
  const router = useRouter()
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('crm.dashboard.read'))
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  useEffect(() => {
    const search = query.trim()
    if (search.length < 2) { setResults(null); return undefined }
    const timer = window.setTimeout(async () => {
      const result = await dispatch(crmRequest({ url: '/search', params: { q: search }, requestKey: 'crm-global-search' }))
      setResults(result?.ok ? result.payload.data : { error: true })
    }, 250)
    return () => window.clearTimeout(timer)
  }, [dispatch, query])
  const choose = href => { setQuery(''); setResults(null); router.push(href) }
  if (!allowed) return <PermissionDenied description='The CRM is available only to Velakron founders.' />
  return <div className='crmWorkspace'>
    <nav className='crmSubnav' aria-label='CRM sections'>
      <div className='crmSubnav__title'><UsersRound aria-hidden='true' /><span><small>Founder workspace</small>CRM</span></div>
      <div className='crmSubnav__links'>{items.map(({ href, label, icon: Icon, exact }) => {
        const active = exact ? router.pathname === href : router.pathname.startsWith(href)
        return <LinkWrap key={href} href={href} className={active ? 'is-active' : ''} aria-current={active ? 'page' : undefined}>
          <Icon aria-hidden='true' /><span>{label}</span>
        </LinkWrap>
      })}</div>
      <div className='crmGlobalSearch'>
        <Search aria-hidden='true' /><input aria-label='Search the CRM' value={query} onChange={event => setQuery(event.target.value)} placeholder='Search CRM' />
        {results && <div className='crmGlobalSearch__results'>
          {results.error ? <p>Search is temporarily unavailable.</p> : <>
            {[...(results.organizations || []).map(item => ({ key: `org-${item.id}`, label: item.name, detail: `${item.type.toUpperCase()} · ${item.status}`, href: `/app/crm/organizations/${item.id}` })), ...(results.contacts || []).map(item => ({ key: `contact-${item.id}`, label: `${item.first_name} ${item.last_name}`, detail: `${item.organization?.name || 'No organization'} · ${item.email || 'No email'}`, href: `/app/crm/contacts?contact=${item.id}` })), ...(results.opportunities || []).map(item => ({ key: `opportunity-${item.id}`, label: item.name, detail: `${item.organization?.name || 'OEM'} · Priority ${item.priority_score}`, href: '/app/crm/opportunities' }))].map(item => <button type='button' key={item.key} onClick={() => choose(item.href)}><strong>{item.label}</strong><span>{item.detail}</span></button>)}
            {!(results.organizations?.length || results.contacts?.length || results.opportunities?.length) && <p>No CRM records match “{query.trim()}”.</p>}
          </>}
        </div>}
      </div>
    </nav>
    <div className='crmWorkspace__content'>{children}</div>
  </div>
}

export default CrmShell
