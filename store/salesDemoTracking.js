export const salesDemoRouteMap = pathname => {
  if (pathname === '/app') return { route_key: 'overview', journey_step: 'overview' }
  if (pathname.startsWith('/app/production/')) return { route_key: 'production_detail', journey_step: 'production_detail' }
  if (pathname.startsWith('/app/production')) return { route_key: 'production_portfolio', journey_step: 'production_portfolio' }
  if (pathname.startsWith('/app/suppliers/')) return { route_key: 'relationship_detail', journey_step: 'relationship_network' }
  if (pathname.startsWith('/app/suppliers')) return { route_key: 'relationships', journey_step: 'relationship_network' }
  if (pathname.startsWith('/app/company')) return { route_key: 'supplier_profile', journey_step: 'supplier_profile' }
  if (pathname.startsWith('/app/facilities')) return { route_key: 'facilities', journey_step: 'facilities' }
  if (pathname.startsWith('/app/machines')) return { route_key: 'machines', journey_step: 'machines' }
  if (pathname.startsWith('/app/certifications')) return { route_key: 'certifications', journey_step: 'certifications' }
  if (pathname.startsWith('/app/team')) return { route_key: 'team', journey_step: 'team' }
  return { route_key: 'overview', journey_step: 'overview' }
}

export const salesDemoActionKey = (method, path) => {
  const verb = String(method || 'update').toLowerCase()
  const resource = String(path || '')
  if (resource.includes('production')) return `production.${verb}`
  if (resource.includes('relationship') || resource.includes('supplier')) return `relationship.${verb}`
  if (resource.includes('facilit')) return `facility.${verb}`
  if (resource.includes('machine')) return `machine.${verb}`
  if (resource.includes('certification')) return `certification.${verb}`
  if (resource.includes('membership') || resource.includes('team')) return `team.${verb}`
  return `workspace.${verb}`
}
