import { BellRing, CalendarClock, FileSignature, FileUp, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import ConfidentialityBadge from './ConfidentialityBadge'
import StatusBadge from './StatusBadge'
import { formatDate, formatDateTime, formatLabel } from './formatters'

const isPdf = file => Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)))
const inputDate = value => value ? String(value).slice(0, 10) : ''
const todayInput = () => new Date().toISOString().slice(0, 10)
const ndaTone = status => ({
  active: 'success',
  scheduled: 'info',
  renewal_due: 'warning',
  expired: 'danger',
  dates_missing: 'warning',
}[status] || 'neutral')
const ndaLabel = status => ({
  not_required: 'No NDA required',
  dates_missing: 'Active dates needed',
  renewal_due: 'Renewal due',
}[status] || formatLabel(status))

const RelationshipNdaSigningForm = ({ confidentiality, pending, onAcceptNda }) => {
  const [form, setForm] = useState({
    legal_name: '',
    business_title: '',
    authority_confirmed: false,
    signature_intent_confirmed: false,
    level_understood: false,
    documents_reviewed_confirmed: false,
  })
  const set = (key, value) => setForm(current => ({ ...current, [key]: value }))
  const complete = form.legal_name.trim().length > 1
    && form.business_title.trim().length > 1
    && form.authority_confirmed
    && form.signature_intent_confirmed
    && form.level_understood
    && form.documents_reviewed_confirmed

  return <form className='confidentialitySigningForm relationshipNdaSigningForm' onSubmit={event => { event.preventDefault(); onAcceptNda(form) }}>
    <header>
      <FileSignature aria-hidden='true' />
      <div><p className='technicalLabel'>Supplier administrator action</p><h3>Review and sign the NDA</h3><p>Open the current PDF above, then sign electronically for your company. Velakron retains the document version, signer identity, and time of acceptance.</p></div>
    </header>
    <div className='productionFormGrid'>
      <FormField id='relationship-nda-legal-name' label='Full legal name' value={form.legal_name} onChange={event => set('legal_name', event.target.value)} autoComplete='name' required />
      <FormField id='relationship-nda-business-title' label='Business title' value={form.business_title} onChange={event => set('business_title', event.target.value)} required />
    </div>
    <div className='confidentialityConfirmations'>
      <label><input type='checkbox' checked={form.authority_confirmed} onChange={event => set('authority_confirmed', event.target.checked)} /><span>{confidentiality.statements.authority}</span></label>
      <label><input type='checkbox' checked={form.signature_intent_confirmed} onChange={event => set('signature_intent_confirmed', event.target.checked)} /><span>{confidentiality.statements.signature_intent}</span></label>
      <label><input type='checkbox' checked={form.level_understood} onChange={event => set('level_understood', event.target.checked)} /><span>{confidentiality.statements.level_acknowledgement}</span></label>
      <label><input type='checkbox' checked={form.documents_reviewed_confirmed} onChange={event => set('documents_reviewed_confirmed', event.target.checked)} /><span>{confidentiality.statements.document_review}</span></label>
    </div>
    <Button type='submit' disabled={pending || !complete}><FileSignature aria-hidden='true' /> Sign and return NDA</Button>
  </form>
}

const RelationshipConfidentialityPanel = ({
  confidentiality,
  loading,
  pending,
  upload,
  feedback,
  onConfigure,
  onUploadNda,
  onUpdateNdaDates,
  onAcceptNda,
}) => {
  const [level, setLevel] = useState(confidentiality?.default_level || 'confidential')
  const [reason, setReason] = useState('')
  const [ndaReason, setNdaReason] = useState('')
  const [dateReason, setDateReason] = useState('')
  const [file, setFile] = useState(null)
  const [effectiveOn, setEffectiveOn] = useState(todayInput())
  const [expiresOn, setExpiresOn] = useState('')
  const document = confidentiality?.requirement?.custom_nda
  const nda = document || (confidentiality?.has_nda ? confidentiality.nda : null)
  const currentEffectiveOn = inputDate(document?.effective_on)
  const currentExpiresOn = inputDate(document?.expires_on)
  const datesChanged = Boolean(document) && (
    effectiveOn !== currentEffectiveOn || expiresOn !== currentExpiresOn
  )
  const validDates = Boolean(effectiveOn && expiresOn && expiresOn > effectiveOn)
  const daysRemaining = nda?.days_remaining
  const statusDetail = useMemo(() => {
    if (!nda) return 'This supplier relationship does not require an NDA.'
    if (nda.status === 'dates_missing') return 'Add the active dates so Velakron can monitor renewal.'
    if (nda.status === 'scheduled') return `Becomes active ${formatDate(nda.effective_on)}.`
    if (nda.status === 'expired') return `Expired ${formatDate(nda.expires_on)}.`
    if (nda.status === 'renewal_due') return daysRemaining === 0
      ? 'Expires today.'
      : `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
    return `Active through ${formatDate(nda.expires_on)}.`
  }, [daysRemaining, nda])

  useEffect(() => setLevel(confidentiality?.default_level || 'confidential'), [confidentiality?.default_level])
  useEffect(() => {
    setEffectiveOn(currentEffectiveOn || todayInput())
    setExpiresOn(currentExpiresOn)
    setDateReason('')
  }, [currentEffectiveOn, currentExpiresOn])
  useEffect(() => { if (upload?.state === 'complete') setFile(null) }, [upload?.state])

  if (loading && !confidentiality) return <section className='appPanel'><p>Loading supplier confidentiality…</p></section>
  if (!confidentiality) return null

  return <section className='appPanel relationshipConfidentialityPanel'>
    <header className='appPanel__header'>
      <div><p className='technicalLabel'>Supplier agreement</p><h2>NDA & confidentiality</h2><p>One NDA covers the full OEM–supplier relationship. Production records keep their own confidentiality level and Restricted user roster.</p></div>
      <ShieldCheck aria-hidden='true' />
    </header>

    <div className='relationshipNdaOverview'>
      <article className='relationshipNdaStatus'>
        <CalendarClock aria-hidden='true' />
        <div><span>Supplier-wide NDA</span><strong>{ndaLabel(nda?.status || 'not_required')}</strong><small>{statusDetail}</small></div>
        <StatusBadge tone={ndaTone(nda?.status)}>{ndaLabel(nda?.status || 'not_required')}</StatusBadge>
      </article>
      <article className='relationshipNdaReminderPolicy'>
        <BellRing aria-hidden='true' />
        <div><span>Automatic renewal reminders</span><strong>Both companies are notified</strong><small>Active OEM and supplier administrators receive reminders 60, 30, and 7 days before expiration, plus an expiration notice.</small></div>
      </article>
    </div>

    {document && <article className='confidentialityDocument'>
      <FileSignature aria-hidden='true' />
      <div><strong>{document.original_filename}</strong><span>Supplier NDA · version {confidentiality.requirement.version_number} · {formatDate(document.effective_on)}–{formatDate(document.expires_on)} · SHA-256 {document.sha256?.slice(0, 12)}…</span></div>
      <a className='vk-button vk-button--secondary' href={`${process.env.NEXT_PUBLIC_API_URL || ''}${document.content_path}`} target='_blank' rel='noreferrer'>Open NDA PDF</a>
    </article>}
    {confidentiality.has_nda && !confidentiality.can_view_nda && <p className='relationshipNdaRestricted'>The NDA status and renewal dates are visible here. A supplier administrator can open and sign the agreement.</p>}
    {confidentiality.acceptance && <p className='relationshipNdaAcceptance'>Signed by {confidentiality.acceptance.legal_name}, {confidentiality.acceptance.business_title}, on {formatDateTime(confidentiality.acceptance.accepted_at)}.</p>}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>

    {confidentiality.can_sign && onAcceptNda && <RelationshipNdaSigningForm confidentiality={confidentiality} pending={pending} onAcceptNda={onAcceptNda} />}

    <div className='relationshipConfidentialitySections'>
      {confidentiality.can_configure && <form className='relationshipConfidentialityControls' onSubmit={event => { event.preventDefault(); onConfigure({ default_level: level, reason }) }}>
        <div><p className='technicalLabel'>Production default</p><h3>Confidentiality for new work</h3><p>Every new production assignment inherits this default.</p></div>
        <label className='selectField' htmlFor='relationship-confidentiality-default'><span>Default level</span><select id='relationship-confidentiality-default' value={level} onChange={event => setLevel(event.target.value)}><option value='confidential'>Confidential — supplier team</option><option value='restricted'>Restricted — named supplier users only</option></select></label>
        <FormField id='relationship-confidentiality-reason' label='Reason for changing the default' value={reason} onChange={event => setReason(event.target.value)} />
        <Button type='submit' disabled={pending || level === confidentiality.default_level}><ShieldCheck aria-hidden='true' /> Save relationship default</Button>
        <ConfidentialityBadge level={confidentiality.default_level} />
      </form>}

      {document && confidentiality.can_upload_nda && <form className='relationshipNdaDateForm' onSubmit={event => { event.preventDefault(); onUpdateNdaDates({ effective_on: effectiveOn, expires_on: expiresOn, reason: dateReason }) }}>
        <div><p className='technicalLabel'>Active dates</p><h3>Renewal schedule</h3><p>Changing these dates creates a new audited version and requires the supplier to accept again.</p></div>
        <div className='relationshipNdaDateFields'>
          <FormField id='relationship-nda-effective-date' type='date' label='Effective date' value={effectiveOn} onChange={event => setEffectiveOn(event.target.value)} required />
          <FormField id='relationship-nda-expiration-date' type='date' label='Expiration date' value={expiresOn} min={effectiveOn} onChange={event => setExpiresOn(event.target.value)} required />
        </div>
        <FormField id='relationship-nda-date-reason' label='Reason for changing the dates' value={dateReason} onChange={event => setDateReason(event.target.value)} required hint='Included in the NDA audit history.' />
        <Button type='submit' disabled={pending || !datesChanged || !validDates || dateReason.trim().length < 8}><CalendarClock aria-hidden='true' /> Update active dates</Button>
      </form>}

      {confidentiality.can_upload_nda && <form className='relationshipNdaUploader' onSubmit={event => { event.preventDefault(); if (file) onUploadNda({ file, reason: ndaReason, effective_on: effectiveOn, expires_on: expiresOn }) }}>
      <div><p className='technicalLabel'>{document ? 'New agreement version' : 'Optional agreement'}</p><h3>{document ? 'Replace supplier NDA' : 'Post a supplier-wide NDA'}</h3><p>PDF only, up to 25 MB. The active dates are required so both companies can plan renewal.</p></div>
      <div className='relationshipNdaDateFields'>
        <FormField id='relationship-nda-upload-effective' type='date' label='Effective date' value={effectiveOn} onChange={event => setEffectiveOn(event.target.value)} required />
        <FormField id='relationship-nda-upload-expiration' type='date' label='Expiration date' value={expiresOn} min={effectiveOn} onChange={event => setExpiresOn(event.target.value)} required />
      </div>
      <label className='fileUploader__drop' htmlFor='relationship-nda-upload'><FileUp aria-hidden='true' /><span><strong>{file ? file.name : 'Choose NDA PDF'}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'The document is retained as immutable agreement evidence.'}</small></span><input id='relationship-nda-upload' type='file' accept='application/pdf,.pdf' onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      {file && <FormField id='relationship-nda-reason' label={document ? 'Reason for replacing the NDA' : 'NDA version note'} value={ndaReason} onChange={event => setNdaReason(event.target.value)} required={Boolean(document)} hint={document ? 'Required because the current signed evidence remains immutable.' : 'Optional for the first version.'} />}
      {file && <Button type='submit' disabled={pending || !isPdf(file) || !validDates || (document && ndaReason.trim().length < 8)}><FileUp aria-hidden='true' /> {document ? 'Upload replacement NDA' : 'Post supplier NDA'}</Button>}
      {upload && <div className='uploadProgress'><span style={{ width: `${upload.progress || 0}%` }} /><small>{formatLabel(upload.state)} {upload.progress || 0}%</small></div>}
      </form>}
    </div>

    <div className='regulatedDataNotice'><ShieldAlert aria-hidden='true' /><p><strong>Regulated data is not supported.</strong> {confidentiality.regulated_data_notice}</p></div>
  </section>
}

export default RelationshipConfidentialityPanel
