import { ArrowLeft, BadgeCheck, Building2, Cog, Mail, MapPin } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useMemo, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, EmptyState, ErrorState, PermissionDenied, RelationshipConfidentialityPanel, StatusBadge } from '../../../components/app'
import { formatDate, formatLabel, statusTone } from '../../../components/app/formatters'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { Button } from '../../../components/design-system'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { loadSupplierProfileDetail, supplierProfileSelectors } from '../../../store/slices/entities/supplierProfiles'
import { loadRelationships, relationshipSelectors } from '../../../store/slices/entities/relationships'
import {
  confidentialitySelectors,
  configureRelationshipConfidentiality,
  loadRelationshipConfidentiality,
  updateRelationshipNdaDates,
  uploadRelationshipNda,
} from '../../../store/slices/entities/confidentiality'

const tags = values => values?.length ? <div className='tagList'>{values.map(value => <span key={value}>{formatLabel(value)}</span>)}</div> : <p>Not provided</p>

const SupplierProfileDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('supplier_profile.read'))
  const detail = useSelector(supplierProfileSelectors.getDetail)
  const loading = useSelector(supplierProfileSelectors.getLoading)
  const error = useSelector(supplierProfileSelectors.getError)
  const relationships = useSelector(relationshipSelectors.getEntities)
  const relationship = useMemo(() => relationships.find(item => (
    item.status === 'active' && String(item.supplier_organization?.id || item.supplier_organization) === String(router.query.id)
  )), [relationships, router.query.id])
  const confidentialityEntry = useSelector(state => relationship?.id ? confidentialitySelectors.getRelationship(relationship.id)(state) : null)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { if (allowed && router.isReady) dispatch(loadSupplierProfileDetail(router.query.id)) }, [allowed, dispatch, router.isReady, router.query.id])
  useEffect(() => { if (allowed && organization?.id) dispatch(loadRelationships(organization.id)) }, [allowed, dispatch, organization?.id])
  useEffect(() => { if (relationship?.id) dispatch(loadRelationshipConfidentiality(relationship.id)) }, [dispatch, relationship?.id])
  if (!allowed || organization?.type !== 'oem') return <PermissionDenied />
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
  />
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
