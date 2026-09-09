import QRCode from 'qrcode'
import { Archive, Copy, CopyPlus, ExternalLink, Eye, Link2, PencilLine, Plus, QrCode } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch } from 'react-redux'
import { Button } from '../../design-system'
import FormMessage from '../../auth/FormMessage'
import StatusBadge from '../StatusBadge'
import { formatDateTime, formatLabel } from '../formatters'
import CrmModal from '../crm/CrmModal'
import { salesDemoRequest, salesDemoTelemetry } from '../../../store/slices/entities/salesDemos'

const idOf = value => String(value?.id || value?._id || value || '')
const slugify = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90)
const emptyForm = templateId => ({ name: '', slug: '', template_id: templateId, fixed_experience: '', version_policy: 'latest', source: 'sales_demo', medium: 'link', campaign: '', expires_at: '' })

const CampaignCard = ({ campaign, templates, working, onEdit, onDuplicate, onArchive, onToggle, onActivity, onPreview }) => {
  const [svg, setSvg] = useState('')
  const [png, setPng] = useState('')
  const url = typeof window === 'undefined' ? `/sales-demo/${campaign.slug}` : `${window.location.origin}/sales-demo/${campaign.slug}`
  useEffect(() => {
    QRCode.toString(url, { type: 'svg', margin: 1, width: 320, errorCorrectionLevel: 'H' }).then(setSvg).catch(() => setSvg(''))
    QRCode.toDataURL(url, { type: 'image/png', margin: 2, width: 1600, errorCorrectionLevel: 'H' }).then(setPng).catch(() => setPng(''))
  }, [url])
  const template = templates.find(item => idOf(item) === idOf(campaign.template)) || campaign.template
  const sessions = campaign.counts?.sessions || 0
  const contacts = campaign.counts?.contacts || 0
  const completion = sessions ? Math.round(((campaign.counts?.completed || 0) / sessions) * 100) : 0
  const download = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : ''
  return <article className='salesDemoCampaignCard salesDemoCampaignCard--managed'>
    <div className='salesDemoCampaignCard__qr' dangerouslySetInnerHTML={{ __html: svg }} />
    <div className='salesDemoCampaignCard__body'>
      <header><div><strong>{campaign.name}</strong><small>{template?.name || 'Demo template'} · {campaign.fixed_experience ? `${formatLabel(campaign.fixed_experience)} only` : 'Guest chooses role'}</small></div><StatusBadge tone={campaign.status === 'active' ? 'success' : 'neutral'}>{formatLabel(campaign.status)}</StatusBadge></header>
      <div className='salesDemoCampaignStats'><span><strong>{sessions}</strong><small>Visits</small></span><span><strong>{contacts}</strong><small>Contacts</small></span><span><strong>{campaign.counts?.active || 0}</strong><small>Live now</small></span><span><strong>{completion}%</strong><small>Completed</small></span></div>
      <dl><div><dt>Public address</dt><dd>/sales-demo/{campaign.slug}</dd></div><div><dt>Template updates</dt><dd>{campaign.version_policy === 'pinned' ? `Pinned to version ${campaign.pinned_template_version?.version_number || '—'}` : 'Follow latest published version'}</dd></div><div><dt>Expiration</dt><dd>{campaign.expires_at ? formatDateTime(campaign.expires_at) : 'No expiration'}</dd></div><div><dt>Owner</dt><dd>{[campaign.created_by?.first_name, campaign.created_by?.last_name].filter(Boolean).join(' ') || campaign.created_by?.email || 'Velakron founder'}</dd></div><div><dt>Last used</dt><dd>{campaign.counts?.last_used_at ? formatDateTime(campaign.counts.last_used_at) : 'Not used yet'}</dd></div><div><dt>Role mix</dt><dd>{campaign.counts?.oem || 0} OEM · {campaign.counts?.supplier || 0} Supplier</dd></div></dl>
      <div className='salesDemoCampaignCard__actions'><Button variant='secondary' onClick={() => onPreview(campaign)}><Eye aria-hidden='true' /> Preview setup page</Button><Button variant='secondary' onClick={() => navigator.clipboard.writeText(url)}><Copy aria-hidden='true' /> Copy link</Button><Button variant='secondary' onClick={() => onActivity(campaign)}>View activity</Button><Button variant='secondary' onClick={() => onEdit(campaign)}><PencilLine aria-hidden='true' /> Edit</Button><Button variant='secondary' onClick={() => onDuplicate(campaign)}><CopyPlus aria-hidden='true' /> Duplicate</Button>{download && <a className='vk-button vk-button--secondary' href={download} download={`velakron-sales-demo-${campaign.slug}.svg`}><QrCode aria-hidden='true' /> QR SVG</a>}{png && <a className='vk-button vk-button--secondary' href={png} download={`velakron-sales-demo-${campaign.slug}.png`}><QrCode aria-hidden='true' /> QR PNG</a>}</div>
      <footer><small>Previewing the setup page does not create a prospect, CRM record, or demo session. Opening the copied public link as a visitor and submitting contact information does.</small><div><Button variant='secondary' disabled={working} onClick={() => onToggle(campaign)}>{campaign.status === 'active' ? 'Pause new visits' : 'Reactivate link'}</Button><button type='button' className='salesDemoCampaignCard__archive' onClick={() => onArchive(campaign)} aria-label={`Archive ${campaign.name}`}><Archive aria-hidden='true' /></button></div></footer>
    </div>
  </article>
}

const SalesDemoCampaignsPanel = ({ campaigns, templates, initialTemplateId = '', openRequest = 0, onRefresh, onActivity }) => {
  const dispatch = useDispatch()
  const published = useMemo(() => templates.filter(item => item.published_version), [templates])
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm(initialTemplateId || idOf(published[0])))
  const [working, setWorking] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const selectedTemplate = published.find(item => idOf(item) === form.template_id) || published[0]
  const supported = selectedTemplate?.supported_experiences || ['oem', 'supplier']
  const firstPublishedId = idOf(published[0])

  useEffect(() => {
    if (openRequest) { setForm(emptyForm(initialTemplateId || firstPublishedId)); setEditing(null); setStep(1); setOpen(true) }
  }, [firstPublishedId, initialTemplateId, openRequest])
  useEffect(() => { if (!form.template_id && published[0]) setForm(value => ({ ...value, template_id: idOf(published[0]) })) }, [form.template_id, published])
  useEffect(() => { if (form.fixed_experience && !supported.includes(form.fixed_experience)) setForm(value => ({ ...value, fixed_experience: '' })) }, [form.fixed_experience, supported])

  const beginCreate = () => { setEditing(null); setForm(emptyForm(initialTemplateId || idOf(published[0]))); setStep(1); setOpen(true) }
  const beginEdit = campaign => { setEditing(campaign); setForm({ name: campaign.name, slug: campaign.slug, template_id: idOf(campaign.template), fixed_experience: campaign.fixed_experience || '', version_policy: campaign.version_policy || 'latest', source: campaign.source || 'sales_demo', medium: campaign.medium || 'link', campaign: campaign.campaign || '', expires_at: campaign.expires_at ? new Date(campaign.expires_at).toISOString().slice(0, 16) : '' }); setStep(1); setOpen(true) }
  const beginDuplicate = campaign => { setEditing(null); setForm({ name: `${campaign.name} copy`, slug: `${campaign.slug}-copy-${Date.now().toString(36).slice(-4)}`, template_id: idOf(campaign.template), fixed_experience: campaign.fixed_experience || '', version_policy: campaign.version_policy || 'latest', source: campaign.source || 'sales_demo', medium: campaign.medium || 'link', campaign: `${campaign.campaign || campaign.name} copy`, expires_at: '' }); setStep(1); setOpen(true) }
  const set = (field, value) => setForm(current => ({ ...current, [field]: value }))

  const save = async () => {
    setWorking(true); setFeedback(null)
    const data = { ...form, fixed_experience: form.fixed_experience || null, pinned_template_version_id: form.version_policy === 'pinned' ? idOf(selectedTemplate?.published_version) : null, ...(editing ? { version: editing.version } : {}) }
    const result = await dispatch(salesDemoRequest({ url: editing ? `/campaigns/${idOf(editing)}` : '/campaigns', method: editing ? 'patch' : 'post', data, requestKey: editing ? `sales-demo-update-link-${idOf(editing)}` : 'sales-demo-create-link' }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: result?.error?.message || 'The shared demo link could not be saved.' }); return }
    if (!editing) dispatch(salesDemoTelemetry('shared_link.created'))
    setOpen(false); setFeedback({ type: 'success', message: editing ? 'Shared demo link updated.' : 'Shared demo link created. It is ready to copy or preview.' }); onRefresh()
  }
  const mutateStatus = async (campaign, status) => {
    setWorking(true); setFeedback(null)
    const result = await dispatch(salesDemoRequest({ url: `/campaigns/${idOf(campaign)}`, method: 'patch', data: { version: campaign.version, status }, requestKey: `sales-demo-link-${status}-${idOf(campaign)}` }))
    setWorking(false)
    if (!result?.ok) { setFeedback({ type: 'error', message: result?.error?.message || 'The shared demo link could not be updated.' }); return }
    setFeedback({ type: 'success', message: status === 'archived' ? 'Shared demo link archived. Existing history was retained.' : status === 'inactive' ? 'New visits are paused.' : 'Shared demo link reactivated.' }); onRefresh()
  }
  const preview = campaign => window.open(`/sales-demo/${campaign.slug}?preview=1`, '_blank', 'noopener,noreferrer')

  return <div className='salesDemoCampaigns salesDemoCampaigns--guided'>
    <header className='salesDemoSectionHeader'><div><p className='technicalLabel'>Self-guided exploration</p><h2>Shared demo links</h2><p>Share a reusable Velakron story by URL or QR code. Each real visitor gets an isolated synthetic workspace.</p></div><Button onClick={beginCreate}><Plus aria-hidden='true' /> Create shared link</Button></header>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <section className='salesDemoCampaignList'>{campaigns.map(campaign => <CampaignCard key={idOf(campaign)} campaign={campaign} templates={templates} working={working} onEdit={beginEdit} onDuplicate={beginDuplicate} onArchive={item => mutateStatus(item, 'archived')} onToggle={item => mutateStatus(item, item.status === 'active' ? 'inactive' : 'active')} onActivity={onActivity} onPreview={preview} />)}</section>
    {!campaigns.length && <div className='salesDemoLibraryEmpty'><Link2 aria-hidden='true' /><strong>No shared demo links yet.</strong><span>Create one from a published template when a prospect should explore on their own.</span><Button onClick={beginCreate}>Create shared link</Button></div>}

    <CrmModal open={open} wide title={editing ? 'Edit shared demo link' : 'Create a shared demo link'} description='Choose a template and role, name the link, then review exactly what visitors will receive.' onClose={() => !working && setOpen(false)} actions={<><Button variant='secondary' onClick={() => step > 1 ? setStep(value => value - 1) : setOpen(false)} disabled={working}>{step > 1 ? 'Back' : 'Cancel'}</Button>{step < 3 ? <Button onClick={() => setStep(value => value + 1)} disabled={!form.template_id || (step === 2 && form.name.trim().length < 2)}>Continue</Button> : <Button onClick={save} disabled={working || !form.template_id || form.name.trim().length < 2}>{editing ? 'Save changes' : 'Publish link'}</Button>}</>}>
      <div className='salesDemoLinkWizard'><div className='salesDemoLauncher__progress'><span style={{ width: `${step * 33.333}%` }} /><small>Step {step} of 3</small></div>
        {step === 1 && <section><p className='technicalLabel'>1. Choose the story</p><label><span>Demo template</span><select value={form.template_id} onChange={event => set('template_id', event.target.value)}>{published.map(item => <option value={idOf(item)} key={idOf(item)}>{item.name} · v{item.published_version.version_number}</option>)}</select></label><div className='salesDemoChoiceGrid salesDemoChoiceGrid--roles'><button type='button' className={!form.fixed_experience ? 'is-selected' : ''} onClick={() => set('fixed_experience', '')}><strong>Let the visitor choose</strong><span>Best for broad outreach and mixed audiences.</span></button>{supported.includes('oem') && <button type='button' className={form.fixed_experience === 'oem' ? 'is-selected' : ''} onClick={() => set('fixed_experience', 'oem')}><strong>OEM only</strong><span>Open directly into the OEM visibility story.</span></button>}{supported.includes('supplier') && <button type='button' className={form.fixed_experience === 'supplier' ? 'is-selected' : ''} onClick={() => set('fixed_experience', 'supplier')}><strong>Supplier only</strong><span>Open directly into the Supplier workflow.</span></button>}</div></section>}
        {step === 2 && <section><p className='technicalLabel'>2. Name and availability</p><div className='salesDemoLinkWizard__fields'><label><span>Link name</span><input autoFocus value={form.name} onChange={event => { const name = event.target.value; setForm(current => ({ ...current, name, slug: editing ? current.slug : slugify(name), campaign: current.campaign || name })) }} placeholder='Example: Aerospace quality follow-up' /></label><label><span>Public address</span><div className='salesDemoSlugInput'><span>velakron.com/sales-demo/</span><input value={form.slug} onChange={event => set('slug', slugify(event.target.value))} /></div></label><label><span>Stop accepting new visitors <small>Optional</small></span><input type='datetime-local' value={form.expires_at} onChange={event => set('expires_at', event.target.value)} /></label><label><span>Template updates</span><select value={form.version_policy} onChange={event => set('version_policy', event.target.value)}><option value='latest'>Follow future published versions</option><option value='pinned'>Keep version {selectedTemplate?.published_version?.version_number || '—'}</option></select><small>Active demos always remain pinned to the version they started with.</small></label></div><details><summary>Advanced tracking</summary><div><label><span>Source</span><input value={form.source} onChange={event => set('source', event.target.value)} /><small>Example: sales_demo</small></label><label><span>Medium</span><input value={form.medium} onChange={event => set('medium', event.target.value)} /><small>Example: email, qr, event</small></label><label><span>Attribution label</span><input value={form.campaign} onChange={event => set('campaign', event.target.value)} /><small>Example: September aerospace outreach</small></label></div></details></section>}
        {step === 3 && <section className='salesDemoLauncherReview'><p className='technicalLabel'>3. Review and publish</p><div><span><small>Template</small><strong>{selectedTemplate?.name}</strong></span><span><small>Guest role</small><strong>{form.fixed_experience ? formatLabel(form.fixed_experience) : 'Visitor chooses'}</strong></span><span><small>Public address</small><strong>/sales-demo/{form.slug}</strong></span><span><small>Version behavior</small><strong>{form.version_policy === 'latest' ? 'Follow latest' : `Pin to v${selectedTemplate?.published_version?.version_number || '—'}`}</strong></span></div><aside><strong>Safe publishing</strong><p>Creating this link does not start a session or create CRM data. A visitor is recorded only after they submit the public form and enter a demo workspace.</p></aside></section>}
      </div>
    </CrmModal>
  </div>
}

export default SalesDemoCampaignsPanel
