import { BellRing, CalendarClock, FileSignature, FileUp, ShieldCheck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import StatusBadge from './StatusBadge'
import { formatDate, formatLabel } from './formatters'

const isPdf = file => Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)))
const inputDate = value => value ? String(value).slice(0, 10) : ''
const ndaTone = status => ({
  active: 'success', scheduled: 'info', renewal_due: 'warning', expired: 'danger', no_expiration: 'info',
}[status] || 'neutral')
const ndaLabel = status => ({
  not_required: 'No NDA on file', no_expiration: 'No expiration', renewal_due: 'Renewal due',
}[status] || formatLabel(status))

const RelationshipConfidentialityPanel = ({
  confidentiality,
  loading,
  pending,
  upload,
  feedback,
  onUploadNda,
  onUpdateNdaDates,
}) => {
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
  const [effectiveOn, setEffectiveOn] = useState('')
  const [expiresOn, setExpiresOn] = useState('')
  const document = confidentiality?.requirement?.custom_nda
  const nda = document || (confidentiality?.has_nda ? confidentiality.nda : null)
  const currentEffectiveOn = inputDate(document?.effective_on)
  const currentExpiresOn = inputDate(document?.expires_on)
  const datesChanged = Boolean(document)
    && (effectiveOn !== currentEffectiveOn || expiresOn !== currentExpiresOn)
  const validDates = !effectiveOn || !expiresOn || expiresOn > effectiveOn

  const statusDetail = useMemo(() => {
    if (!nda) return 'The relationship is protected by the Platform Confidentiality Terms. A separate NDA is optional.'
    if (nda.status === 'no_expiration') return nda.effective_on
      ? `Effective ${formatDate(nda.effective_on)} with no expiration date.`
      : 'Stored without an expiration date.'
    if (nda.status === 'scheduled') return `Becomes effective ${formatDate(nda.effective_on)}.`
    if (nda.status === 'expired') return `Expired ${formatDate(nda.expires_on)}. This does not block platform access.`
    if (nda.status === 'renewal_due') return nda.days_remaining === 0
      ? 'Expires today. This does not block platform access.'
      : `Expires in ${nda.days_remaining} day${nda.days_remaining === 1 ? '' : 's'}.`
    return `Active through ${formatDate(nda.expires_on)}.`
  }, [nda])

  useEffect(() => {
    setEffectiveOn(currentEffectiveOn)
    setExpiresOn(currentExpiresOn)
  }, [currentEffectiveOn, currentExpiresOn])
  useEffect(() => { if (upload?.state === 'complete') { setFile(null); setNote('') } }, [upload?.state])

  if (loading && !confidentiality) return <section className='appPanel'><p>Loading relationship NDA…</p></section>
  if (!confidentiality) return null

  return <section className='appPanel relationshipConfidentialityPanel'>
    <header className='appPanel__header'>
      <div>
        <p className='technicalLabel'>Relationship documents</p>
        <h2>Optional NDA</h2>
        <p>Platform terms protect every shared document. Store a separately signed OEM–supplier NDA here only when the companies want additional coverage or renewal tracking.</p>
      </div>
      <ShieldCheck aria-hidden='true' />
    </header>

    <div className='relationshipNdaOverview'>
      <article className='relationshipNdaStatus'>
        <CalendarClock aria-hidden='true' />
        <div><span>Current NDA</span><strong>{ndaLabel(nda?.status || 'not_required')}</strong><small>{statusDetail}</small></div>
        <StatusBadge tone={ndaTone(nda?.status)}>{ndaLabel(nda?.status || 'not_required')}</StatusBadge>
      </article>
      <article className='relationshipNdaReminderPolicy'>
        <BellRing aria-hidden='true' />
        <div><span>Expiration reminders</span><strong>Both company admins are notified</strong><small>When an expiration date is provided, reminders are sent 60, 30, and 7 days before expiration and again when it expires.</small></div>
      </article>
    </div>

    {document && <article className='confidentialityDocument'>
      <FileSignature aria-hidden='true' />
      <div>
        <strong>{document.original_filename}</strong>
        <span>Relationship NDA · version {confidentiality.requirement.version_number}{document.effective_on ? ` · effective ${formatDate(document.effective_on)}` : ''}{document.expires_on ? ` · expires ${formatDate(document.expires_on)}` : ' · no expiration'} · SHA-256 {document.sha256?.slice(0, 12)}…</span>
      </div>
      <a className='vk-button vk-button--secondary' href={`${process.env.NEXT_PUBLIC_API_URL || ''}${document.content_path}`} target='_blank' rel='noreferrer'>Open NDA PDF</a>
    </article>}

    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>

    {confidentiality.can_manage_nda && <div className='relationshipConfidentialitySections'>
      {document && <form className='relationshipNdaDateForm' onSubmit={event => {
        event.preventDefault()
        onUpdateNdaDates({ effective_on: effectiveOn || null, expires_on: expiresOn || null, reason: note })
      }}>
        <div><p className='technicalLabel'>Optional tracking</p><h3>Effective and expiration dates</h3><p>Dates can be left blank. Changing them creates an audit version but never changes access.</p></div>
        <div className='relationshipNdaDateFields'>
          <FormField id='relationship-nda-effective-date' type='date' label='Effective date (optional)' value={effectiveOn} onChange={event => setEffectiveOn(event.target.value)} />
          <FormField id='relationship-nda-expiration-date' type='date' label='Expiration date (optional)' value={expiresOn} min={effectiveOn || undefined} onChange={event => setExpiresOn(event.target.value)} />
        </div>
        <Button type='submit' disabled={pending || !datesChanged || !validDates}><CalendarClock aria-hidden='true' /> Update dates</Button>
      </form>}

      <form className='relationshipNdaUploader' onSubmit={event => {
        event.preventDefault()
        if (file) onUploadNda({ file, reason: note, effective_on: effectiveOn || null, expires_on: expiresOn || null })
      }}>
        <div><p className='technicalLabel'>{document ? 'Replacement document' : 'Additional coverage'}</p><h3>{document ? 'Replace the NDA on file' : 'Upload a signed NDA'}</h3><p>Upload the final signed PDF, regardless of where or how it was signed. PDF only, up to 25 MB.</p></div>
        <div className='relationshipNdaDateFields'>
          <FormField id='relationship-nda-upload-effective' type='date' label='Effective date (optional)' value={effectiveOn} onChange={event => setEffectiveOn(event.target.value)} />
          <FormField id='relationship-nda-upload-expiration' type='date' label='Expiration date (optional)' value={expiresOn} min={effectiveOn || undefined} onChange={event => setExpiresOn(event.target.value)} />
        </div>
        <label className='fileUploader__drop' htmlFor='relationship-nda-upload'>
          <FileUp aria-hidden='true' />
          <span><strong>{file ? file.name : 'Choose signed NDA PDF'}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB selected` : 'The current and historical document versions are retained.'}</small></span>
          <input id='relationship-nda-upload' type='file' accept='application/pdf,.pdf' onChange={event => setFile(event.target.files?.[0] || null)} />
        </label>
        {file && <FormField id='relationship-nda-note' label='Document note (optional)' value={note} maxLength={1000} onChange={event => setNote(event.target.value)} hint='For example: Fully executed mutual NDA received by email.' />}
        {file && <Button type='submit' disabled={pending || !isPdf(file) || !validDates}><FileUp aria-hidden='true' /> {document ? 'Upload replacement' : 'Upload signed NDA'}</Button>}
        {upload && <div className='uploadProgress'><span style={{ width: `${upload.progress || 0}%` }} /><small>{formatLabel(upload.state)} {upload.progress || 0}%</small></div>}
      </form>
    </div>}
  </section>
}

export default RelationshipConfidentialityPanel
