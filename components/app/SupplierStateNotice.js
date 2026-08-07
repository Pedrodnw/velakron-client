import { AlertTriangle, CircleCheck, Clock3 } from 'lucide-react'
import { formatLabel } from './formatters'

const content = {
  ready_for_review: [Clock3, 'Submitted for Velakron review', 'Your information is locked into the review queue. You can still correct it before a reviewer finishes.'],
  changes_requested: [AlertTriangle, 'Velakron requested changes', 'Review the message below, update the affected information, attest again, and resubmit.'],
  active: [CircleCheck, 'Shared supplier profile is active', 'Connected OEM customers can view this profile. Saved edits update the shared version immediately.'],
  suspended: [AlertTriangle, 'Supplier profile suspended', 'This profile is not visible to customers. Contact Velakron support for next steps.'],
}

const SupplierStateNotice = ({ profile }) => {
  const item = content[profile?.onboarding_state]
  if (!item) return null
  const [Icon, title, description] = item
  return <div className={`supplierStateNotice supplierStateNotice--${profile.onboarding_state}`}>
    <Icon aria-hidden='true' />
    <div><strong>{title}</strong><p>{description}</p>{profile.changes_requested_message && <blockquote>{profile.changes_requested_message}</blockquote>}{profile.suspension_reason && <blockquote>{profile.suspension_reason}</blockquote>}</div>
    <span>{formatLabel(profile.onboarding_state)}</span>
  </div>
}

export default SupplierStateNotice
