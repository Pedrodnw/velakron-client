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

const RelationshipConfidentialityPanel = ({
  confidentiality,
  loading,
  pending,
  upload,
  feedback,
  onConfigure,
  onUploadNda,
  onUpdateNdaDates,
}) => {
  const [level, setLevel] = useState(confidentiality?.default_level || 'confidential')
  const [reason, setReason] = useState('')
  const [ndaReason, setNdaReason] = useState('')
  const [dateReason, setDateReason] = useState('')
  const [file, setFile] = useState(null)
  const [effectiveOn, setEffectiveOn] = useState(todayInput())
  const [expiresOn, setExpiresOn] = useState('')
  const document = confidentiality?.requirement?.custom_nda
  const currentEffectiveOn = inputDate(document?.effective_on)
  const currentExpiresOn = inputDate(document?.expires_on)
  const datesChanged = Boolean(document) && (
    effectiveOn !== currentEffectiveOn || expiresOn !== currentExpiresOn
  )
  const validDates = Boolean(effectiveOn && expiresOn && expiresOn > effectiveOn)
  const daysRemaining = document?.days_remaining
  const statusDetail = useMemo(() => {
    if (!document) return 'This supplier relationship does not require an NDA.'
    if (document.status === 'dates_missing') return 'Add the active dates so Velakron can monitor renewal.'
    if (document.status === 'scheduled') return `Becomes active ${formatDate(document.effective_on)}.`
    if (document.status === 'expired') return `Expired ${formatDate(document.expires_on)}.`
    if (document.status === 'renewal_due') return daysRemaining === 0
      ? 'Expires today.'
      : `Expires in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}.`
    return `Active through ${formatDate(document.expires_on)}.`
  }, [daysRemaining, document])

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
        <div><span>Supplier-wide NDA</span><strong>{ndaLabel(document?.status || 'not_required')}</strong><small>{statusDetail}</small></div>
        <StatusBadge tone={ndaTone(document?.status)}>{ndaLabel(document?.status || 'not_required')}</StatusBadge>
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
    {confidentiality.acceptance && <p className='relationshipNdaAcceptance'>Signed by {confidentiality.acceptance.legal_name}, {confidentiality.acceptance.business_title}, on {formatDateTime(confidentiality.acceptance.accepted_at)}.</p>}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>

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
