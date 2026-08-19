import { ArrowLeft, BadgeCheck, Building2, CalendarDays, Cog, ExternalLink, FileSignature, Link2Off, Mail, MapPin, Phone } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ConfirmationDialog, DataTable, EmptyState, ErrorState, PermissionDenied, RelationshipConfidentialityPanel, StatusBadge } from '../../../components/app'
import { formatDate, formatLabel, statusTone } from '../../../components/app/formatters'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { Button } from '../../../components/design-system'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { loadSupplierProfileDetail, supplierProfileSelectors } from '../../../store/slices/entities/supplierProfiles'
import { loadRelationships, relationshipSelectors, updateRelationship } from '../../../store/slices/entities/relationships'
import {
  acceptRelationshipNda,
  confidentialitySelectors,
  configureRelationshipConfidentiality,
  loadRelationshipConfidentiality,
  updateRelationshipNdaDates,
  uploadRelationshipNda,
} from '../../../store/slices/entities/confidentiality'

const tags = values => values?.length ? <div className='tagList'>{values.map(value => <span key={value}>{formatLabel(value)}</span>)}</div> : <p>Not provided</p>
const addressLine = address => [
  address?.line_1,
  address?.line_2,
  [address?.city, address?.region, address?.postal_code].filter(Boolean).join(', '),
  address?.country_code,
].filter(Boolean)
const relationshipAge = value => {
  if (!value) return 'Not established yet'
  const start = new Date(value)
  if (Number.isNaN(start.valueOf())) return 'Not available'
  const days = Math.max(0, Math.floor((Date.now() - start.getTime()) / 86_400_000))
  if (days < 30) {
    const displayedDays = Math.max(days, 1)
    return `${displayedDays} day${displayedDays === 1 ? '' : 's'}`
  }
  const months = Math.max(1, Math.floor(days / 30.4375))
  if (months < 12) return `${months} month${months === 1 ? '' : 's'}`
  const years = Math.floor(months / 12)
  const remainingMonths = months % 12
  return `${years} year${years === 1 ? '' : 's'}${remainingMonths ? `, ${remainingMonths} month${remainingMonths === 1 ? '' : 's'}` : ''}`
}

const SupplierProfileDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const canReadProfiles = useSelector(getHasPermission('supplier_profile.read'))
  const canReadRelationships = useSelector(getHasPermission('relationship.read'))
  const canManageRelationship = useSelector(getHasPermission('relationship.manage'))
  const supplierView = organization?.type === 'supplier'
  const allowed = supplierView ? canReadRelationships : canReadProfiles
  const detail = useSelector(supplierProfileSelectors.getDetail)
  const loading = useSelector(supplierProfileSelectors.getLoading)
  const error = useSelector(supplierProfileSelectors.getError)
  const relationships = useSelector(relationshipSelectors.getEntities)
  const relationshipsLoading = useSelector(relationshipSelectors.getEntityLoading)
  const relationshipsError = useSelector(relationshipSelectors.getEntityError)
  const relationship = useMemo(() => relationships.find(item => (
    supplierView
      ? !['ended', 'declined'].includes(item.status) && String(item.oem_organization?.id || item.oem_organization) === String(router.query.id)
      : item.status === 'active' && String(item.supplier_organization?.id || item.supplier_organization) === String(router.query.id)
  )), [relationships, router.query.id, supplierView])
  const confidentialityEntry = useSelector(state => relationship?.id ? confidentialitySelectors.getRelationship(relationship.id)(state) : null)
  const [feedback, setFeedback] = useState(null)
  const [endDialogOpen, setEndDialogOpen] = useState(false)
  const [endReason, setEndReason] = useState('')
  const [relationshipPending, setRelationshipPending] = useState(false)

  useEffect(() => { if (allowed && !supplierView && router.isReady) dispatch(loadSupplierProfileDetail(router.query.id)) }, [allowed, dispatch, router.isReady, router.query.id, supplierView])
  useEffect(() => { if (allowed && organization?.id) dispatch(loadRelationships(organization.id)) }, [allowed, dispatch, organization?.id])
  useEffect(() => { if (relationship?.id) dispatch(loadRelationshipConfidentiality(relationship.id)) }, [dispatch, relationship?.id])
  if (!allowed || !['oem', 'supplier'].includes(organization?.type)) return <PermissionDenied />
  const runConfidentiality = async (action, successMessage) => {
    setFeedback(null)
    const result = await action()
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The relationship confidentiality settings could not be saved.') })
      return false
    }
    setFeedback({ type: 'success', message: successMessage })
    if (relationship?.id) await dispatch(loadRelationshipConfidentiality(relationship.id))
    return true
  }
  const confidentialityPanel = relationship && <RelationshipConfidentialityPanel
    confidentiality={confidentialityEntry?.data}
    loading={confidentialityEntry?.loading}
    pending={confidentialityEntry?.mutating}
    upload={confidentialityEntry?.upload}
    feedback={confidentialityEntry?.error ? { type: 'error', message: confidentialityEntry.error.message } : feedback}
    onConfigure={payload => runConfidentiality(() => dispatch(configureRelationshipConfidentiality(relationship.id, payload)), 'Relationship confidentiality default saved.')}
    onUploadNda={payload => runConfidentiality(() => dispatch(uploadRelationshipNda(relationship.id, payload)), 'Supplier NDA uploaded. Current production access now requires a new signature.')}
    onUpdateNdaDates={payload => runConfidentiality(() => dispatch(updateRelationshipNdaDates(relationship.id, payload)), 'Supplier NDA dates updated. Current production access now requires a new signature.')}
    onAcceptNda={payload => runConfidentiality(() => dispatch(acceptRelationshipNda(relationship.id, payload)), 'NDA signed and returned to the customer. The OEM has been notified.')}
  />
  const endRelationship = async () => {
    if (!relationship) return
    setRelationshipPending(true)
    setFeedback(null)
    const result = await dispatch(updateRelationship(relationship.id, {
      status: 'ended',
      reason: endReason.trim(),
      version: relationship.version,
    }))
    setRelationshipPending(false)
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The customer relationship could not be ended.') })
      return
    }
    setEndDialogOpen(false)
    await dispatch(loadRelationships(organization.id))
    await router.push('/app/suppliers')
  }

  if (supplierView) {
    if (relationshipsLoading && !relationship) return <section className='appPanel'><AppSkeleton lines={8} /></section>
    if (!relationship) return <ErrorState title='Customer relationship unavailable' description={relationshipsError?.message || 'This customer is no longer in your active relationship list.'} action={<Button href='/app/suppliers' variant='secondary'><ArrowLeft aria-hidden='true' /> Return to customers</Button>} />
    const customer = relationship.oem_organization || {}
    const address = addressLine(customer.primary_address)
    const contact = customer.primary_contact || {}
    const establishedAt = relationship.accepted_at || relationship.created_at
    return <>
      <Seo title={customer.name || 'Customer'} description='Customer company and relationship details.' path={`/app/suppliers/${router.query.id}`} noIndex />
      <Button href='/app/suppliers' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Customers</Button>
      <AppPageHeader
        eyebrow='Customer relationship'
        title={customer.name || 'Customer'}
        description='Company contacts, relationship history, and the current supplier-wide NDA in one place.'
        actions={<div className='customerRelationshipHeaderActions'><StatusBadge tone={statusTone(relationship.status)}>{formatLabel(relationship.status)}</StatusBadge>{canManageRelationship && relationship.status === 'active' && <Button variant='secondary' onClick={() => { setEndReason(''); setEndDialogOpen(true) }}><Link2Off aria-hidden='true' /> End relationship</Button>}</div>}
      />
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
      <section className='customerRelationshipSummary'>
        <article className='appPanel'><CalendarDays aria-hidden='true' /><span>Relationship established</span><strong>{formatDate(establishedAt)}</strong><small>{relationshipAge(establishedAt)} working together</small></article>
        <article className='appPanel'><FileSignature aria-hidden='true' /><span>Supplier-wide NDA</span><strong>{relationship.nda?.status === 'not_required' ? 'Not required' : formatLabel(relationship.nda?.status)}</strong><small>{relationship.nda?.expires_on ? `Through ${formatDate(relationship.nda.expires_on)}` : 'No active agreement dates'}</small></article>
        <article className='appPanel'><Building2 aria-hidden='true' /><span>Customer supplier code</span><strong>{relationship.oem_supplier_code || 'Not assigned'}</strong><small>Provided by the OEM for this relationship</small></article>
      </section>
      <div className='appDashboardGrid customerCompanyGrid'>
        <section className='appPanel'>
          <header className='appPanel__header'><div><p className='technicalLabel'>Company information</p><h2>Primary office</h2></div><MapPin aria-hidden='true' /></header>
          {address.length ? <address className='customerAddress'>{address.map(line => <span key={line}>{line}</span>)}</address> : <p className='customerMissingValue'>The customer has not provided a primary address.</p>}
          {customer.website && <a className='customerExternalLink' href={customer.website} target='_blank' rel='noreferrer'><ExternalLink aria-hidden='true' /> Visit company website</a>}
        </section>
        <section className='appPanel'>
          <header className='appPanel__header'><div><p className='technicalLabel'>Primary contact</p><h2>{contact.name || 'Contact not provided'}</h2></div><Mail aria-hidden='true' /></header>
          <dl className='appDetailList'>
            <div><dt>Email</dt><dd>{contact.email ? <a href={`mailto:${contact.email}`}><Mail aria-hidden='true' /> {contact.email}</a> : '—'}</dd></div>
            <div><dt>Phone</dt><dd>{contact.phone ? <a href={`tel:${contact.phone}`}><Phone aria-hidden='true' /> {contact.phone}</a> : '—'}</dd></div>
            <div><dt>Relationship status</dt><dd><StatusBadge tone={statusTone(relationship.status)}>{formatLabel(relationship.status)}</StatusBadge></dd></div>
          </dl>
        </section>
      </div>
      {confidentialityPanel}
      <ConfirmationDialog
        open={endDialogOpen}
        title={`End the relationship with ${customer.name || 'this customer'}?`}
        description='The customer will be removed from your active Customers list. Related production access will be revoked immediately, while relationship and production history remain in the audit record.'
        confirmLabel={relationshipPending ? 'Ending…' : 'End relationship'}
        danger
        confirmDisabled={relationshipPending || endReason.trim().length < 8}
        onClose={() => { if (!relationshipPending) setEndDialogOpen(false) }}
        onConfirm={endRelationship}
      >
        <label className='textAreaField' htmlFor='end-customer-relationship-reason'><span>Reason for ending the relationship</span><textarea id='end-customer-relationship-reason' value={endReason} onChange={event => setEndReason(event.target.value)} minLength={8} maxLength={500} required /><small>This reason is retained in the relationship audit history.</small></label>
      </ConfirmationDialog>
    </>
  }
  if (loading && (!detail?.organization || detail.organization.id !== router.query.id) && !relationship) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  if (error || !detail?.profile) {
    const supplierName = relationship?.supplier_organization?.name || 'Supplier relationship'
    return <>
      <Seo title={supplierName} description='Supplier relationship and NDA management.' path={`/app/suppliers/${router.query.id}`} noIndex />
      <Button href='/app/suppliers' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Suppliers</Button>
      <AppPageHeader eyebrow='Connected supplier' title={supplierName} description='Manage supplier-wide NDA dates and confidentiality even before the capability profile is available.' actions={relationship && <StatusBadge tone='success'>Active relationship</StatusBadge>} />
      {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
      {confidentialityPanel}
      <ErrorState title='Supplier profile unavailable' description={error?.message || 'This supplier has not activated a customer-facing profile yet.'} />
    </>
  }
  const { profile, facilities = [], certifications = [], machines = [] } = detail

  const machineColumns = [
    { key: 'machine', label: 'Machine', render: item => <div className='tablePrimary'><strong>{item.manufacturer} {item.model}</strong><span>{item.shop_identifier}</span></div> },
    { key: 'type', label: 'Type', render: item => formatLabel(item.machine_type_key) },
    { key: 'facility', label: 'Facility', render: item => item.facility?.name || 'Unavailable' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
  ]

  return <>
    <Seo title={profile.display_name} description='Connected supplier capability profile.' path={`/app/suppliers/${router.query.id}`} noIndex />
    <Button href='/app/suppliers' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Suppliers</Button>
    <AppPageHeader eyebrow='Connected supplier' title={profile.display_name} description={profile.business_description} actions={<StatusBadge tone='success'>Active supplier</StatusBadge>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {confidentialityPanel}
    <section className='supplierPublicSummary'>
      <article className='appPanel'><Building2 aria-hidden='true' /><strong>Processes</strong>{tags(profile.process_keys)}</article>
      <article className='appPanel'><Cog aria-hidden='true' /><strong>Materials</strong>{tags(profile.material_keys)}</article>
      <article className='appPanel'><BadgeCheck aria-hidden='true' /><strong>Quality capabilities</strong>{tags(profile.quality_capability_keys)}</article>
    </section>
    <div className='appDashboardGrid supplierContactGrid'>
      <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Shared company contact</p><h2>{profile.shared_contact?.name || 'Contact not provided'}</h2></div><Mail aria-hidden='true' /></header><dl className='appDetailList'><div><dt>Role</dt><dd>{profile.shared_contact?.title || '—'}</dd></div><div><dt>Email</dt><dd>{profile.shared_contact?.email || '—'}</dd></div><div><dt>Phone</dt><dd>{profile.shared_contact?.phone || '—'}</dd></div><div><dt>Website</dt><dd>{profile.website ? <a href={profile.website} target='_blank' rel='noreferrer'>{profile.website}</a> : '—'}</dd></div></dl></section>
      <section className='appPanel'><header className='appPanel__header'><div><p className='technicalLabel'>Manufacturing footprint</p><h2>{facilities.length} facilit{facilities.length === 1 ? 'y' : 'ies'}</h2></div><MapPin aria-hidden='true' /></header>{facilities.map(item => <div className='facilitySummary' key={item.id}><strong>{item.name}</strong><span>{[item.address?.city, item.address?.region, item.address?.country_code].filter(Boolean).join(', ') || 'Location not provided'}</span>{item.is_primary && <StatusBadge tone='info'>Primary</StatusBadge>}</div>)}</section>
    </div>
    <section className='appPanel appPanel--table supplierMachineTable'><header className='appPanel__header'><div><p className='technicalLabel'>Current equipment</p><h2>Machine inventory</h2></div><StatusBadge tone='info'>{machines.length} machine{machines.length === 1 ? '' : 's'}</StatusBadge></header><DataTable caption={`${profile.display_name} machines`} columns={machineColumns} rows={machines} emptyTitle='No current machines' emptyDescription='The supplier has not shared current equipment.' /></section>
    <section className='appPanel certificationSummary'><header className='appPanel__header'><div><p className='technicalLabel'>Quality credentials</p><h2>Certifications</h2></div><BadgeCheck aria-hidden='true' /></header>{certifications.length ? certifications.map(item => <div key={item.id}><strong>{item.name}</strong><span>{item.expires_on ? `Expires ${formatDate(item.expires_on)}` : 'No expiration provided'}</span><StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge></div>) : <EmptyState compact title='No certifications shared' description='Certifications are optional in the MVP supplier profile.' />}</section>
  </>
}

SupplierProfileDetail.getLayout = PortalPageLayout
export default SupplierProfileDetail
