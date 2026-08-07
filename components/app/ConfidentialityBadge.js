import { LockKeyhole, ShieldCheck } from 'lucide-react'

const label = level => level === 'restricted'
  ? 'Restricted — named supplier users only'
  : 'Confidential — supplier team'

const ConfidentialityBadge = ({ level = 'confidential', compact = false }) => {
  const Icon = level === 'restricted' ? LockKeyhole : ShieldCheck
  return <span className={`confidentialityBadge confidentialityBadge--${level} ${compact ? 'is-compact' : ''}`}>
    <Icon aria-hidden='true' />
    <span>{label(level)}</span>
  </span>
}

export default ConfidentialityBadge
export { label as confidentialityLabel }
