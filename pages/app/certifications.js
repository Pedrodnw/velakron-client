import { Archive, BadgeCheck, Download, FileUp, LoaderCircle, Pencil, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, PermissionDenied, ResponsiveDrawer, StatusBadge } from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import { archiveCertification, certificationSelectors, createCertification, downloadCertificationDocument, loadCertifications, updateCertification, uploadCertificationDocument } from '../../store/slices/entities/certifications'
import { facilitySelectors, loadFacilities } from '../../store/slices/entities/facilities'
import { loadSupplierVocabularies, supplierProfileSelectors } from '../../store/slices/entities/supplierProfiles'

const blank = { facility_id: '', type_key: '', name: '', issuing_authority: '', reference_number: '', issued_on: '', expires_on: '' }
const dateInput = value => value ? String(value).slice(0, 10) : ''

const CertificationForm = ({ initial, facilities, types, pending, feedback, onSubmit, onFile, onDownload }) => {
  const [form, setForm] = useState(initial || blank)
  useEffect(() => setForm(initial || blank), [initial])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit(form) }}>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='certification-type'><span>Certification type</span><select id='certification-type' value={form.type_key} onChange={event => change('type_key', event.target.value)} required><option value=''>Select a type</option>{types.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    <FormField id='certification-name' label='Certificate name' value={form.name} onChange={event => change('name', event.target.value)} required />
    <FormField id='certification-issuer' label='Issuing authority' value={form.issuing_authority} onChange={event => change('issuing_authority', event.target.value)} />
    <FormField id='certification-reference' label='Certificate or registration number' value={form.reference_number} onChange={event => change('reference_number', event.target.value)} />
    <label className='selectField' htmlFor='certification-facility'><span>Facility (optional)</span><select id='certification-facility' value={form.facility_id || ''} onChange={event => change('facility_id', event.target.value)}><option value=''>Company-wide</option>{facilities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className='authForm__row'><FormField id='certification-issued' label='Issue date' type='date' value={form.issued_on || ''} onChange={event => change('issued_on', event.target.value)} /><FormField id='certification-expires' label='Expiration date' type='date' value={form.expires_on || ''} onChange={event => change('expires_on', event.target.value)} /></div>
    <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <BadgeCheck aria-hidden='true' />} Save certification</Button>
    {initial?.id && !initial.attachment && <label className='vk-button vk-button--secondary photoPicker'><FileUp aria-hidden='true' /> Upload document<input type='file' accept='application/pdf,image/jpeg,image/png,image/webp' onChange={onFile} disabled={pending} /></label>}
    {initial?.attachment && <p className='formHint'>Document: {initial.attachment.display_filename || initial.attachment.original_filename} · {formatLabel(initial.attachment.state)}</p>}
    {initial?.attachment?.state === 'available' && <Button type='button' variant='secondary' onClick={() => onDownload(initial.attachment)}><Download aria-hidden='true' /> Download document</Button>}
    {initial?.id && <p className='formHint'>Prototype documents are checked for their real file format before download. Malware scanning is not enabled in this prototype; do not upload regulated data.</p>}
  </form>
}

const Certifications = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('supplier_profile.read'))
  const canManage = useSelector(getHasPermission('supplier_profile.manage'))
  const certifications = useSelector(certificationSelectors.getEntities)
  const loading = useSelector(certificationSelectors.getEntityLoading)
  const error = useSelector(certificationSelectors.getEntityError)
  const facilities = useSelector(facilitySelectors.getEntities)
  const vocabularies = useSelector(supplierProfileSelectors.getVocabularies)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('current')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!allowed || organization?.type !== 'supplier') return
    dispatch(loadCertifications({ status, limit: 100 })); dispatch(loadFacilities()); dispatch(loadSupplierVocabularies())
  }, [allowed, dispatch, organization?.id, organization?.type, status])
  if (!allowed || organization?.type !== 'supplier') return <PermissionDenied />
  if (loading && !certifications.length) return <section className='appPanel'><AppSkeleton lines={7} /></section>

  const initial = selected?.id ? { ...blank, ...selected, facility_id: selected.facility?.id || selected.facility || '', issued_on: dateInput(selected.issued_on), expires_on: dateInput(selected.expires_on) } : blank
  const save = async form => {
    setPending(true); setFeedback(null)
    const payload = { ...form, issued_on: form.issued_on || null, expires_on: form.expires_on || null }
    ;['id', '_id', 'facility', 'supplier_organization', 'attachment', 'status', 'created_at', 'updated_at'].forEach(key => delete payload[key])
    const result = await dispatch(selected?.id ? updateCertification(selected.id, { ...payload, version: selected.version }) : createCertification(payload))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not save this certification.') })
    setSelected(null); dispatch(loadCertifications({ status, limit: 100 }))
  }
  const archive = async item => {
    setPending(true)
    const result = await dispatch(archiveCertification(item.id, { version: item.version, reason: 'Certification removed from the current supplier profile' }))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not archive this certification.') })
    setSelected(null); dispatch(loadCertifications({ status, limit: 100 }))
  }
  const prepareFile = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setPending(true); setFeedback(null)
    const result = await dispatch(uploadCertificationDocument(selected.id, file))
    setPending(false); event.target.value = ''
    const available = result?.payload?.data?.attachment?.state === 'available'
    setFeedback(result?.ok
      ? { type: 'success', message: available ? 'Document uploaded and format verified. It is ready to download; malware scanning is not enabled in the prototype.' : 'Document uploaded. Its security check is pending.' }
      : { type: 'error', message: resultError(result, 'We could not upload this document.') })
    if (result?.ok) dispatch(loadCertifications({ status, limit: 100 }))
  }
  const downloadFile = async attachment => {
    const result = await dispatch(downloadCertificationDocument(selected.id, attachment.id))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'We could not download this document.') })
  }

  const columns = [
    { key: 'name', label: 'Certification', render: item => <div className='tablePrimary'><strong>{item.name}</strong><span>{formatLabel(item.type_key)}</span></div> },
    { key: 'scope', label: 'Scope', render: item => item.facility?.name || 'Company-wide' },
    { key: 'expires', label: 'Expires', render: item => item.expires_on ? formatDate(item.expires_on) : 'No expiration' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'actions', label: '', render: item => canManage && item.status !== 'archived' && <button className='tableAction' type='button' onClick={() => { setSelected(item); setFeedback(null) }}><Pencil aria-hidden='true' /> Edit</button> },
  ]

  return <>
    <Seo title='Certifications' description='Supplier certifications.' path='/app/certifications' noIndex />
    <AppPageHeader eyebrow='Quality credentials' title='Certifications' description='Certifications are optional for onboarding, but they help connected customers understand your quality and regulatory qualifications.' actions={canManage && <Button onClick={() => { setSelected({}); setFeedback(null) }}><Plus aria-hidden='true' /> Add certification</Button>} />
    <div className='listToolbar'><label className='selectField' htmlFor='certification-status'><span>Show</span><select id='certification-status' value={status} onChange={event => setStatus(event.target.value)}><option value='current'>Current</option><option value='active'>Active</option><option value='expiring'>Expiring soon</option><option value='expired'>Expired</option><option value='archived'>Archived</option><option value='all'>All</option></select></label><StatusBadge tone='info'>{certifications.length} records</StatusBadge></div>
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadCertifications({ status, limit: 100 }))} />}
    <section className='appPanel appPanel--table'><DataTable caption='Supplier certifications' columns={columns} rows={certifications} emptyTitle='No certifications in this view' emptyDescription='Add optional quality or regulatory credentials whenever they are available.' /></section>
    <ResponsiveDrawer open={selected !== null} title={selected?.id ? 'Edit certification' : 'Add certification'} onClose={() => setSelected(null)}>
      <CertificationForm key={selected?.id || 'new'} initial={initial} facilities={facilities} types={vocabularies.certification_types || []} pending={pending} feedback={feedback} onSubmit={save} onFile={prepareFile} onDownload={downloadFile} />
      {selected?.id && <Button className='drawerDanger' variant='secondary' onClick={() => archive(selected)} disabled={pending}><Archive aria-hidden='true' /> Archive certification</Button>}
    </ResponsiveDrawer>
  </>
}

Certifications.getLayout = PortalPageLayout
export default Certifications
