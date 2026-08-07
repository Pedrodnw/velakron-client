import { ChevronRight } from 'lucide-react'
import { useRouter } from 'next/router'
import LinkWrap from '../LinkWrap'

const routeTrails = [
  { match: '/app/production/[id]', items: [['/app/production', 'Production'], [null, 'Record']] },
  { match: '/app/production/new', items: [['/app/production', 'Production'], [null, 'New record']] },
  { match: '/app/production', items: [[null, 'Production']] },
  { match: '/app/suppliers/[id]', items: [['/app/suppliers', 'Suppliers'], [null, 'Supplier']] },
  { match: '/app/suppliers', items: [[null, 'Suppliers']] },
  { match: '/app/team', items: [[null, 'Team']] },
  { match: '/app/company', items: [[null, 'Onboarding and profile']] },
  { match: '/app/machines/[id]', items: [['/app/machines', 'Machines'], [null, 'Machine']] },
  { match: '/app/machines', items: [[null, 'Machines']] },
  { match: '/app/facilities', items: [[null, 'Facilities']] },
  { match: '/app/certifications', items: [[null, 'Certifications']] },
  { match: '/admin/organizations/[id]', items: [['/admin/organizations', 'Organizations'], [null, 'Company details']] },
  { match: '/admin/organizations', items: [[null, 'Organizations']] },
  { match: '/admin/users', items: [[null, 'Users']] },
  { match: '/admin/suppliers', items: [[null, 'Supplier reviews']] },
  { match: '/admin/relationships', items: [[null, 'Relationships']] },
  { match: '/admin', items: [[null, 'Audit and usage']] },
]

const AppBreadcrumbs = () => {
  const { pathname } = useRouter()
  if (pathname === '/app') return null
  const trail = routeTrails.find(item => item.match === pathname)
  if (!trail) return null

  const items = [['/app', 'Dashboard'], ...trail.items]
  return <nav className='appBreadcrumbs' aria-label='Breadcrumb'>
    <ol>
      {items.map(([href, label], index) => <li key={`${href || 'current'}-${label}`}>
        {index > 0 && <ChevronRight aria-hidden='true' />}
        {href ? <LinkWrap href={href}>{label}</LinkWrap> : <span aria-current='page'>{label}</span>}
      </li>)}
    </ol>
  </nav>
}

export default AppBreadcrumbs
