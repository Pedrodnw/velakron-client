const exactLabels = {
  oem: 'OEM',
  oem_admin: 'OEM administrator',
  oem_user: 'OEM member',
  api: 'API',
  s3: 'S3',
}

export const formatLabel = value => {
  const normalized = String(value || 'Not available')
  if (exactLabels[normalized.toLowerCase()]) return exactLabels[normalized.toLowerCase()]
  return normalized
    .replaceAll('_', ' ')
    .replace(/\b\w/g, character => character.toUpperCase())
}

export const formatStorageStatus = status => {
  if (!status || typeof status !== 'object') return { label: 'Unavailable', tone: 'danger', detail: 'Storage status unavailable' }
  const provider = formatLabel(status.provider)
  if (!status.configured) return { label: `${provider} not configured`, tone: 'danger', detail: 'Provider configuration is incomplete' }
  if (!status.verified) return { label: `${provider} awaiting verification`, tone: 'warning', detail: status.region ? `Configured in ${status.region}` : 'Provider has not been verified' }
  return { label: `${provider} verified`, tone: 'success', detail: status.region ? `Private storage in ${status.region}` : 'Private provider verified' }
}

export const formatRole = role => ({
  velakron_admin: 'Velakron administrator',
  founder: 'Founder',
  oem_admin: 'OEM administrator',
  oem_user: 'OEM member',
  supplier_admin: 'Supplier administrator',
  supplier_user: 'Supplier member',
}[role] || formatLabel(role))

export const formatDate = value => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export const formatDateTime = value => {
  if (!value) return 'Not available'
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return 'Not available'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export const statusTone = status => ({
  active: 'success',
  complete: 'success',
  invited: 'info',
  pending: 'warning',
  pending_supplier: 'warning',
  suspended: 'danger',
  ended: 'neutral',
  declined: 'danger',
  revoked: 'danger',
  draft: 'neutral',
  assigned: 'info',
  accepted: 'success',
  reacceptance_required: 'warning',
  material_ordered: 'info',
  material_received: 'info',
  programming: 'info',
  in_production: 'info',
  inspection: 'warning',
  ready_to_ship: 'success',
  shipped: 'success',
  delivered: 'success',
  completed: 'success',
  open: 'neutral',
  in_progress: 'info',
  blocked: 'danger',
  archived: 'neutral',
  cancelled: 'danger',
}[status] || 'neutral')
