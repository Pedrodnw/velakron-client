import { Building2, LoaderCircle, MapPin, Pencil, Plus, Star } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, PermissionDenied, ResponsiveDrawer, StatusBadge } from '../../components/app'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import { archiveFacility, createFacility, facilitySelectors, loadFacilities, updateFacility } from '../../store/slices/entities/facilities'
import { loadCurrentSupplierProfile } from '../../store/slices/entities/supplierProfiles'

const blank = {
  name: '', shop_identifier: '', is_primary: false, timezone: 'America/New_York',
  address: { line_1: '', line_2: '', city: '', region: '', postal_code: '', country_code: 'US' },
  primary_contact: { name: '', title: '', email: '', phone: '' },
}

const FacilityForm = ({ initial, pending, feedback, onSubmit }) => {
  const [form, setForm] = useState(initial || blank)
  useEffect(() => setForm(initial || blank), [initial])
  const nested = (group, key, value) => setForm(current => ({ ...current, [group]: { ...current[group], [key]: value } }))
  return <form className='drawerForm' onSubmit={event => { event.preventDefault(); onSubmit(form) }}>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <FormField id='facility-name' label='Facility name' value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} required />
    <FormField id='facility-id' label='Shop identifier' value={form.shop_identifier} onChange={event => setForm(current => ({ ...current, shop_identifier: event.target.value }))} hint='An internal code, such as MIA-01. If blank, the facility name is used.' />
    <label className='checkField'><input type='checkbox' checked={form.is_primary} onChange={event => setForm(current => ({ ...current, is_primary: event.target.checked }))} /><span>Make this the primary facility</span></label>
    <FormField id='facility-address' label='Street address' value={form.address?.line_1 || ''} onChange={event => nested('address', 'line_1', event.target.value)} />
    <FormField id='facility-address-2' label='Suite or unit' value={form.address?.line_2 || ''} onChange={event => nested('address', 'line_2', event.target.value)} />
    <div className='authForm__row'><FormField id='facility-city' label='City' value={form.address?.city || ''} onChange={event => nested('address', 'city', event.target.value)} /><FormField id='facility-region' label='State / region' value={form.address?.region || ''} onChange={event => nested('address', 'region', event.target.value)} /></div>
    <div className='authForm__row'><FormField id='facility-postal' label='Postal code' value={form.address?.postal_code || ''} onChange={event => nested('address', 'postal_code', event.target.value)} /><FormField id='facility-country' label='Country code' value={form.address?.country_code || 'US'} onChange={event => nested('address', 'country_code', event.target.value.toUpperCase())} maxLength={2} /></div>
    <FormField id='facility-timezone' label='Timezone' value={form.timezone || ''} onChange={event => setForm(current => ({ ...current, timezone: event.target.value }))} />
    <h3>Facility contact</h3>
    <div className='authForm__row'><FormField id='facility-contact-name' label='Name' value={form.primary_contact?.name || ''} onChange={event => nested('primary_contact', 'name', event.target.value)} /><FormField id='facility-contact-email' label='Email' type='email' value={form.primary_contact?.email || ''} onChange={event => nested('primary_contact', 'email', event.target.value)} /></div>
    <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <MapPin aria-hidden='true' />} Save facility</Button>
  </form>
}

const Facilities = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('supplier_profile.read'))
  const canManage = useSelector(getHasPermission('supplier_profile.manage'))
  const facilities = useSelector(facilitySelectors.getEntities)
  const loading = useSelector(facilitySelectors.getEntityLoading)
  const error = useSelector(facilitySelectors.getEntityError)
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => { if (allowed && organization?.type === 'supplier') dispatch(loadFacilities()) }, [allowed, dispatch, organization?.id, organization?.type])
  if (!allowed || organization?.type !== 'supplier') return <PermissionDenied />
  if (loading && !facilities.length) return <section className='appPanel'><AppSkeleton lines={7} /></section>

  const save = async form => {
    setPending(true); setFeedback(null)
    const payload = { ...form }
    delete payload.id; delete payload._id; delete payload.status; delete payload.created_at; delete payload.updated_at; delete payload.archived_at; delete payload.archived_by; delete payload.archive_reason; delete payload.supplier_organization
    const result = await dispatch(selected?.id ? updateFacility(selected.id, { ...payload, version: selected.version }) : createFacility(payload))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not save this facility.') })
    setSelected(null); setFeedback(null); dispatch(loadFacilities()); dispatch(loadCurrentSupplierProfile())
  }

  const archive = async facility => {
    setPending(true)
    const result = await dispatch(archiveFacility(facility.id, { version: facility.version, reason: 'Facility removed from the current supplier profile' }))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'This facility could not be archived. Move its machines first.') })
    setSelected(null); dispatch(loadFacilities()); dispatch(loadCurrentSupplierProfile())
  }

  const columns = [
    { key: 'name', label: 'Facility', render: item => <div className='tablePrimary'><strong>{item.name}</strong><span>{item.shop_identifier || 'No shop code'}</span></div> },
    { key: 'location', label: 'Location', render: item => [item.address?.city, item.address?.region].filter(Boolean).join(', ') || 'Not provided' },
    { key: 'primary', label: 'Role', render: item => item.is_primary ? <StatusBadge tone='info'><Star aria-hidden='true' /> Primary</StatusBadge> : 'Additional facility' },
    { key: 'actions', label: '', render: item => canManage && <button className='tableAction' type='button' onClick={() => { setSelected(item); setFeedback(null) }}><Pencil aria-hidden='true' /> Edit</button> },
  ]

  return <>
    <Seo title='Facilities' description='Supplier facilities.' path='/app/facilities' noIndex />
    <AppPageHeader eyebrow='Supplier footprint' title='Facilities' description='Keep every manufacturing location separate and designate one primary facility for onboarding.' actions={canManage && <Button onClick={() => { setSelected({}); setFeedback(null) }}><Plus aria-hidden='true' /> Add facility</Button>} />
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadFacilities())} />}
    <section className='appPanel appPanel--table'><DataTable caption='Supplier facilities' columns={columns} rows={facilities} emptyTitle='Add your primary facility' emptyDescription='At least one primary facility is required before the supplier profile can be submitted.' /></section>
    <ResponsiveDrawer open={selected !== null} title={selected?.id ? 'Edit facility' : 'Add facility'} onClose={() => setSelected(null)}>
      <FacilityForm key={selected?.id || 'new'} initial={selected?.id ? selected : blank} pending={pending} feedback={feedback} onSubmit={save} />
      {selected?.id && canManage && !selected.is_primary && <Button className='vk-button--danger drawerDanger' onClick={() => archive(selected)} disabled={pending}>Archive facility</Button>}
    </ResponsiveDrawer>
  </>
}

Facilities.getLayout = PortalPageLayout
export default Facilities
