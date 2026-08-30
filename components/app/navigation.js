const accountItem = { href: '/account', label: 'Account', icon: 'account' }

const itemsByOrganizationType = {
  oem: [
    { href: '/app', label: 'Overview', icon: 'overview', exact: true },
    { href: '/app/parts', label: 'Part workspaces', icon: 'parts', permission: 'part.read', feature: 'part_workspaces' },
    { href: '/app/production', label: 'Production', icon: 'production', permission: 'production_record.read' },
    { href: '/app/suppliers', label: 'Suppliers', icon: 'relationships', permission: 'relationship.read' },
    { href: '/app/team', label: 'Team', icon: 'team', permission: 'membership.read' },
  ],
  supplier: [
    { href: '/app', label: 'Overview', icon: 'overview', exact: true },
    { href: '/app/company', label: 'Onboarding & profile', icon: 'onboarding', permission: 'supplier_profile.read' },
    { href: '/app/facilities', label: 'Facilities', icon: 'facilities', permission: 'supplier_profile.read' },
    { href: '/app/production', label: 'Production', icon: 'production', permission: 'production_record.read' },
    { href: '/app/machines', label: 'Machines', icon: 'machines', permission: 'machine.read' },
    { href: '/app/certifications', label: 'Certifications', icon: 'certifications', permission: 'supplier_profile.read' },
    { href: '/app/suppliers', label: 'Customers', icon: 'relationships', permission: 'relationship.read' },
    { href: '/app/team', label: 'Team', icon: 'team', permission: 'membership.read' },
  ],
  velakron: [
    { href: '/app', label: 'Overview', icon: 'overview', exact: true },
    { href: '/admin/action-center', label: 'Action center', icon: 'actions', permission: 'platform.support' },
    { href: '/app/crm', label: 'CRM', icon: 'crm', permission: 'crm.dashboard.read' },
    { href: '/app/tasks', label: 'Tasks & priorities', icon: 'tasks', permission: 'internal_task.read' },
    { href: '/app/sales-demo', label: 'Sales Demo', icon: 'salesDemo', permission: 'sales_demo.read' },
    { href: '/app/dynamic-endpoint', label: 'Dynamic Endpoint', icon: 'dynamic', permission: 'dynamic_endpoint.manage' },
    { href: '/app/team', label: 'Internal team', icon: 'team', permission: 'membership.read' },
    { href: '/admin/organizations', label: 'Organizations', icon: 'organization', permission: 'platform.support' },
    { href: '/admin/users', label: 'Users', icon: 'team', permission: 'platform.support' },
    { href: '/admin/suppliers', label: 'Supplier reviews', icon: 'onboarding', permission: 'supplier_profile.review' },
    { href: '/admin/relationships', label: 'Relationships', icon: 'relationships', permission: 'platform.support' },
    { href: '/admin', label: 'Audit & support', icon: 'audit', permission: 'audit.read', exact: true },
  ],
}

export const getNavigationItems = (organizationType, permissions = [], options = {}) => [
  ...(itemsByOrganizationType[organizationType] || []).filter(item => (
    (!item.permission || permissions.includes(item.permission))
    && (!item.feature || options.features?.[item.feature] !== false)
  )),
  ...(options.demoWorkspace ? [] : [accountItem]),
]
