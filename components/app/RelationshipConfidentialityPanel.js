import { FileSignature, FileUp, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import FormField from '../auth/FormField'
import FormMessage from '../auth/FormMessage'
import { Button } from '../design-system'
import ConfidentialityBadge from './ConfidentialityBadge'
import { formatDateTime, formatLabel } from './formatters'

const isPdf = file => Boolean(file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name)))

const RelationshipConfidentialityPanel = ({ confidentiality, loading, pending, upload, feedback, onConfigure, onUploadNda }) => {
  const [level, setLevel] = useState(confidentiality?.default_level || 'confidential')
  const [reason, setReason] = useState('')
  const [ndaReason, setNdaReason] = useState('')
  const [file, setFile] = useState(null)
  useEffect(() => setLevel(confidentiality?.default_level || 'confidential'), [confidentiality?.default_level])
  useEffect(() => { if (upload?.state === 'complete') setFile(null) }, [upload?.state])
  if (loading && !confidentiality) return <section className='appPanel'><p>Loading relationship confidentiality…</p></section>
  if (!confidentiality) return null
  const document = confidentiality.requirement?.custom_nda
  return <section className='appPanel relationshipConfidentialityPanel'>
    <header className='appPanel__header'><div><p className='technicalLabel'>Relationship confidentiality</p><h2>Default for new production work</h2></div><ShieldCheck aria-hidden='true' /></header>
    <p>New assignments to this supplier inherit this level. Each production record keeps its own explicit, versioned requirement.</p>
    <ConfidentialityBadge level={confidentiality.default_level} />
    {document && <article className='confidentialityDocument'><FileSignature aria-hidden='true' /><div><strong>{document.original_filename}</strong><span>Relationship NDA · version {confidentiality.requirement.version_number} · SHA-256 {document.sha256?.slice(0, 12)}…</span></div><a className='vk-button vk-button--secondary' href={`${process.env.NEXT_PUBLIC_API_URL || ''}${document.content_path}`} target='_blank' rel='noreferrer'>Open relationship NDA PDF</a></article>}
    {confidentiality.acceptance && <p className='relationshipNdaAcceptance'>Signed by {confidentiality.acceptance.legal_name}, {confidentiality.acceptance.business_title}, on {formatDateTime(confidentiality.acceptance.accepted_at)}.</p>}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {confidentiality.can_configure && <form className='relationshipConfidentialityControls' onSubmit={event => { event.preventDefault(); onConfigure({ default_level: level, reason }) }}>
      <label className='selectField' htmlFor='relationship-confidentiality-default'><span>Default level</span><select id='relationship-confidentiality-default' value={level} onChange={event => setLevel(event.target.value)}><option value='confidential'>Confidential — supplier team</option><option value='restricted'>Restricted — named supplier users only</option></select></label>
      <FormField id='relationship-confidentiality-reason' label='Reason for changing the default' value={reason} onChange={event => setReason(event.target.value)} />
      <Button type='submit' disabled={pending || level === confidentiality.default_level}><ShieldCheck aria-hidden='true' /> Save relationship default</Button>
    </form>}
    {confidentiality.can_upload_nda && <form className='relationshipNdaUploader' onSubmit={event => { event.preventDefault(); if (file) onUploadNda({ file, reason: ndaReason }) }}>
      <label className='fileUploader__drop' htmlFor='relationship-nda-upload'><FileUp aria-hidden='true' /><span><strong>{document ? 'Replace relationship NDA' : 'Add an optional relationship NDA'}</strong><small>PDF only, up to 25 MB. A replacement creates a new immutable version.</small></span><input id='relationship-nda-upload' type='file' accept='application/pdf,.pdf' onChange={event => setFile(event.target.files?.[0] || null)} /></label>
      {file && <><p className='fileUploader__selection'>{file.name} · {(file.size / 1024).toFixed(1)} KB</p><FormField id='relationship-nda-reason' label={document ? 'Reason for replacing the NDA' : 'NDA version note'} value={ndaReason} onChange={event => setNdaReason(event.target.value)} required={Boolean(document)} hint={document ? 'Required because the current signed evidence remains immutable.' : 'Optional for the first version.'} /><Button type='submit' disabled={pending || !isPdf(file) || (document && ndaReason.trim().length < 8)}><FileUp aria-hidden='true' /> Upload NDA version</Button></>}
      {upload && <div className='uploadProgress'><span style={{ width: `${upload.progress || 0}%` }} /><small>{formatLabel(upload.state)} {upload.progress || 0}%</small></div>}
    </form>}
    <div className='regulatedDataNotice'><ShieldAlert aria-hidden='true' /><p><strong>Regulated data is not supported.</strong> {confidentiality.regulated_data_notice}</p></div>
  </section>
}

export default RelationshipConfidentialityPanel
