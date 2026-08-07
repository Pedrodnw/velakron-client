import { Check, Circle } from 'lucide-react'
import { formatLabel } from './formatters'
import StatusBadge from './StatusBadge'

const labels = {
  company_basics: 'Company basics',
  primary_contact: 'Primary contact',
  facilities: 'Primary facility',
  capabilities: 'Capabilities',
  machines: 'Machine inventory',
  attestation: 'Accuracy attestation',
}

const OnboardingProgress = ({ profile, progress, onSelect }) => {
  const completion = profile?.section_completion || {}
  const active = profile?.onboarding_state === 'active'
  return <section className='onboardingProgress appPanel'>
    <header className='appPanel__header'>
      <div><p className='technicalLabel'>{active ? 'Shared supplier profile' : 'Supplier onboarding'}</p><h2>{active ? 'Requirements complete' : `${progress?.percentage || 0}% complete`}</h2></div>
      <StatusBadge tone={progress?.ready ? 'success' : 'info'}>{formatLabel(profile?.onboarding_state || 'not_started')}</StatusBadge>
    </header>
    <div className='progressTrack' aria-label={`${progress?.percentage || 0}% complete`}><span style={{ width: `${progress?.percentage || 0}%` }} /></div>
    <ol>{Object.entries(labels).map(([key, label]) => <li key={key} className={completion[key] ? 'is-complete' : ''}>
      {completion[key] ? <Check aria-hidden='true' /> : <Circle aria-hidden='true' />}
      <button type='button' onClick={() => onSelect?.(key)}>{label}</button>
    </li>)}</ol>
    <p>{active ? 'You are editing the profile connected OEM customers can see. Saved changes update the shared profile immediately.' : 'Certifications are optional for MVP onboarding and can be maintained separately.'}</p>
  </section>
}

export default OnboardingProgress
