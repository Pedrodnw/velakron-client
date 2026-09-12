import { Building2, ExternalLink, Factory, MonitorPlay, Share2, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../design-system'
import FormMessage from '../../auth/FormMessage'
import CrmModal from '../crm/CrmModal'

const idOf = value => String(value?.id || value?._id || value || '')

const templateMeta = template => {
  const payload = template?.draft_version?.payload || template?.published_version?.payload || {}
  return payload.presentation || {}
}

const SalesDemoLauncher = ({ open, templates, initialTemplateId = '', working, error = '', onClose, onLaunch, onShare }) => {
  const errorRef = useRef(null)
  const published = useMemo(() => templates.filter(item => item.published_version), [templates])
  const [step, setStep] = useState(1)
  const [purpose, setPurpose] = useState('practice')
  const [templateId, setTemplateId] = useState('')
  const [experience, setExperience] = useState('oem')
  const [label, setLabel] = useState('')
  const [prospectName, setProspectName] = useState('')
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    if (open && error) errorRef.current?.scrollIntoView({ block: 'nearest' })
  }, [open, error])

  useEffect(() => {
    if (!open) return
    setStep(1)
    setPurpose('practice')
    const initial = published.find(item => idOf(item) === initialTemplateId) || published[0]
    setTemplateId(idOf(initial))
    setExperience(initial?.supported_experiences?.[0] || 'oem')
    setLabel('')
    setProspectName('')
    setCompanyName('')
  }, [initialTemplateId, open, published])

  const selected = published.find(item => idOf(item) === templateId) || published[0]
  const supported = selected?.supported_experiences || ['oem', 'supplier']
  useEffect(() => {
    if (!supported.includes(experience)) setExperience(supported[0] || 'oem')
  }, [experience, supported])

  const submit = () => {
    if (purpose === 'share') return onShare(selected)
    return onLaunch({
      experience,
      purpose,
      display_label: label,
      prospect_name: prospectName,
      company_name: companyName,
      template_version_id: idOf(selected?.published_version),
    })
  }

  const title = purpose === 'share' ? 'Prepare a shared demo link' : purpose === 'presenter_led' ? 'Start a presenter-led demo' : 'Start a practice demo'
  return <CrmModal
    open={open}
    wide
    title='Start a demo'
    description='Choose the purpose, story, and guest role. Velakron prepares an isolated synthetic workspace.'
    onClose={() => !working && onClose()}
    actions={<>
      {step > 1 && <Button variant='secondary' onClick={() => setStep(value => value - 1)} disabled={working}>Back</Button>}
      {step < 4
        ? <Button onClick={() => setStep(value => value + 1)} disabled={!published.length}>Continue</Button>
        : <Button onClick={submit} disabled={working || !selected}>{purpose === 'share' ? <Share2 aria-hidden='true' /> : <ExternalLink aria-hidden='true' />}{working ? 'Preparing…' : purpose === 'share' ? 'Continue to link setup' : 'Launch in new tab'}</Button>}
    </>}
  >
    <div className='salesDemoLauncher'>
      <div className='salesDemoLauncher__progress' aria-label={`Step ${step} of 4`}><span style={{ width: `${step * 25}%` }} /><small>Step {step} of 4</small></div>
      {step === 1 && <section><p className='technicalLabel'>What would you like to do?</p><div className='salesDemoChoiceGrid'>
        <button type='button' className={purpose === 'practice' ? 'is-selected' : ''} onClick={() => setPurpose('practice')}><MonitorPlay aria-hidden='true' /><strong>Practice privately</strong><span>Rehearse without creating a prospect or CRM activity.</span></button>
        <button type='button' className={purpose === 'presenter_led' ? 'is-selected' : ''} onClick={() => setPurpose('presenter_led')}><Sparkles aria-hidden='true' /><strong>Present live</strong><span>Open a controlled guest workspace for a live conversation.</span></button>
        <button type='button' className={purpose === 'share' ? 'is-selected' : ''} onClick={() => setPurpose('share')}><Share2 aria-hidden='true' /><strong>Share for later</strong><span>Create a reusable link or QR code for self-guided exploration.</span></button>
      </div></section>}
      {step === 2 && <section><p className='technicalLabel'>Choose a sales story</p><div className='salesDemoLauncherTemplates'>
        {published.map(template => { const meta = templateMeta(template); return <button type='button' className={idOf(template) === idOf(selected) ? 'is-selected' : ''} onClick={() => setTemplateId(idOf(template))} key={idOf(template)}><span><strong>{template.name}</strong><small>{template.description || 'Reusable synthetic demo story'}</small></span><span className='salesDemoTemplateMeta'><b>{meta.duration_minutes || 20} min</b><b>{meta.persona || 'Cross-functional'}</b></span></button> })}
      </div></section>}
      {step === 3 && <section><p className='technicalLabel'>Choose the guest role</p><div className='salesDemoChoiceGrid salesDemoChoiceGrid--roles'>
        {supported.includes('oem') && <button type='button' className={experience === 'oem' ? 'is-selected' : ''} onClick={() => setExperience('oem')}><Building2 aria-hidden='true' /><strong>OEM workspace</strong><span>Production visibility, sourcing, approvals, and receiving quality.</span></button>}
        {supported.includes('supplier') && <button type='button' className={experience === 'supplier' ? 'is-selected' : ''} onClick={() => setExperience('supplier')}><Factory aria-hidden='true' /><strong>Supplier workspace</strong><span>Assignments, production updates, collaboration, and inspection.</span></button>}
      </div>{purpose === 'share' && <p className='salesDemoLauncher__hint'>You can let visitors choose their role during link setup.</p>}</section>}
      {step === 4 && <section className='salesDemoLauncherReview'><p className='technicalLabel'>Review and launch</p><div><span><small>Purpose</small><strong>{purpose === 'presenter_led' ? 'Presenter-led demo' : purpose === 'share' ? 'Shared demo link' : 'Private practice'}</strong></span><span><small>Template</small><strong>{selected?.name}</strong></span><span><small>Guest role</small><strong>{experience === 'oem' ? 'OEM' : 'Supplier'}</strong></span></div>{purpose !== 'share' && <div className='salesDemoLauncherPersonalize'><label><span>Label this demo <small>Optional</small></span><input value={label} maxLength={180} onChange={event => setLabel(event.target.value)} placeholder={purpose === 'practice' ? 'Example: Monday rehearsal' : 'Example: Acme discovery call'} /><small>This helps you recognize it later.</small></label><label><span>Prospect name <small>Optional</small></span><input value={prospectName} maxLength={160} onChange={event => setProspectName(event.target.value)} placeholder='Example: Jamie Rivera' /></label><label><span>Prospect company <small>Optional</small></span><input value={companyName} maxLength={180} onChange={event => setCompanyName(event.target.value)} placeholder='Example: Acme Aerospace' /></label></div>}<aside><strong>What happens next</strong><p>{purpose === 'share' ? 'You will choose link details, expiration, and whether the link follows future template versions.' : `A new isolated ${experience.toUpperCase()} workspace opens in another tab. It will be clearly marked as a private Sales Demo.`}</p></aside></section>}
      {error && <div ref={errorRef}><FormMessage type='error'>{error}</FormMessage></div>}
    </div>
  </CrmModal>
}

export default SalesDemoLauncher
