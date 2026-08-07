import { Archive, Cog, LoaderCircle, Pencil, Plus, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ChoiceGrid, DataTable, ErrorState, PermissionDenied, ResponsiveDrawer, StatusBadge } from '../../components/app'
import { formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import { facilitySelectors, loadFacilities } from '../../store/slices/entities/facilities'
import { archiveMachine, createMachine, loadMachines, machineSelectors, reactivateMachine, updateMachine } from '../../store/slices/entities/machines'
import { loadCurrentSupplierProfile, loadSupplierVocabularies, supplierProfileSelectors } from '../../store/slices/entities/supplierProfiles'

const blank = {
  facility_id: '', manufacturer: '', model: '', machine_type_key: '', machine_type_other: '', shop_identifier: '',
  year: '', controller_key: '', controller_other: '', shared_description: '', internal_notes: '', status: 'active',
  process_keys: [], material_keys: [], axes: '', work_envelope: '', automation_summary: '', inspection_capability_keys: [],
}

const MachineForm = ({ initial, facilities, vocabularies, pending, feedback, onSubmit }) => {
  const [form, setForm] = useState(initial || blank)
  useEffect(() => setForm(initial || blank), [initial])
  const change = (key, value) => setForm(current => ({ ...current, [key]: value }))
  return <form className='drawerForm machineForm' onSubmit={event => { event.preventDefault(); onSubmit(form) }}>
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <label className='selectField' htmlFor='machine-facility'><span>Facility</span><select id='machine-facility' value={form.facility_id} onChange={event => change('facility_id', event.target.value)} required><option value=''>Select a facility</option>{facilities.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <div className='authForm__row'><FormField id='machine-manufacturer' label='Manufacturer' value={form.manufacturer} onChange={event => change('manufacturer', event.target.value)} required /><FormField id='machine-model' label='Model' value={form.model} onChange={event => change('model', event.target.value)} required /></div>
    <label className='selectField' htmlFor='machine-type'><span>Machine type</span><select id='machine-type' value={form.machine_type_key} onChange={event => change('machine_type_key', event.target.value)} required><option value=''>Select a type</option>{(vocabularies.machine_types || []).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
    {form.machine_type_key === 'other' && <FormField id='machine-type-other' label='Other machine type' value={form.machine_type_other} onChange={event => change('machine_type_other', event.target.value)} />}
    <div className='authForm__row'><FormField id='machine-shop-id' label='Shop identifier' value={form.shop_identifier} onChange={event => change('shop_identifier', event.target.value)} required /><FormField id='machine-year' label='Year (optional)' type='number' min='1900' max={new Date().getFullYear() + 1} value={form.year ?? ''} onChange={event => change('year', event.target.value)} /></div>
    <div className='authForm__row'><label className='selectField' htmlFor='machine-controller'><span>Controller</span><select id='machine-controller' value={form.controller_key} onChange={event => change('controller_key', event.target.value)}><option value=''>Not provided</option>{(vocabularies.controllers || []).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label><FormField id='machine-axes' label='Number of axes' type='number' min='1' max='20' value={form.axes ?? ''} onChange={event => change('axes', event.target.value)} /></div>
    <ChoiceGrid legend='Processes performed' options={vocabularies.processes} values={form.process_keys} onChange={value => change('process_keys', value)} />
    <ChoiceGrid legend='Materials commonly run' options={vocabularies.materials} values={form.material_keys} onChange={value => change('material_keys', value)} />
    <ChoiceGrid legend='Inspection capabilities' options={vocabularies.inspection_capabilities} values={form.inspection_capability_keys} onChange={value => change('inspection_capability_keys', value)} />
    <FormField id='machine-envelope' label='Work envelope' value={form.work_envelope} onChange={event => change('work_envelope', event.target.value)} hint='Example: 40 × 20 × 25 in' />
    <label className='textAreaField' htmlFor='machine-description'><span>Customer-facing description</span><textarea id='machine-description' value={form.shared_description} onChange={event => change('shared_description', event.target.value)} maxLength={3000} /></label>
    <label className='textAreaField' htmlFor='machine-notes'><span>Internal supplier notes</span><textarea id='machine-notes' value={form.internal_notes || ''} onChange={event => change('internal_notes', event.target.value)} maxLength={3000} /><small>Never shared with OEM customers.</small></label>
    <Button type='submit' disabled={pending}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Cog aria-hidden='true' />} Save machine</Button>
  </form>
}

const Machines = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('machine.read'))
  const canManage = useSelector(getHasPermission('machine.manage'))
  const machines = useSelector(machineSelectors.getEntities)
  const loading = useSelector(machineSelectors.getEntityLoading)
  const error = useSelector(machineSelectors.getEntityError)
  const facilities = useSelector(facilitySelectors.getEntities)
  const vocabularies = useSelector(supplierProfileSelectors.getVocabularies)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('current')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)

  useEffect(() => {
    if (!allowed || organization?.type !== 'supplier') return
    dispatch(loadMachines({ status, limit: 100 }))
    dispatch(loadFacilities())
    dispatch(loadSupplierVocabularies())
  }, [allowed, dispatch, organization?.id, organization?.type, status])
  if (!allowed || organization?.type !== 'supplier') return <PermissionDenied />
  if (loading && !machines.length) return <section className='appPanel'><AppSkeleton lines={8} /></section>

  const initial = selected?.id ? {
    ...blank, ...selected,
    facility_id: selected.facility?.id || selected.facility || '',
    year: selected.year ?? '', axes: selected.axes ?? '',
  } : blank

  const save = async form => {
    setPending(true); setFeedback(null)
    const payload = { ...form, year: form.year === '' ? null : Number(form.year), axes: form.axes === '' ? null : Number(form.axes) }
    ;['id', '_id', 'facility', 'supplier_organization', 'created_at', 'updated_at', 'archived_at', 'archived_by', 'archive_reason', 'photo_attachments', 'normalized_shop_identifier'].forEach(key => delete payload[key])
    const result = await dispatch(selected?.id ? updateMachine(selected.id, { ...payload, version: selected.version }) : createMachine(payload))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not save this machine.') })
    setSelected(null); dispatch(loadMachines({ status, limit: 100 })); dispatch(loadCurrentSupplierProfile())
  }

  const changeArchiveState = async machine => {
    setPending(true)
    const result = await dispatch(machine.status === 'archived'
      ? reactivateMachine(machine.id, machine.version)
      : archiveMachine(machine.id, { version: machine.version, reason: 'Machine removed from current supplier inventory' }))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not update this machine.') })
    setSelected(null); dispatch(loadMachines({ status, limit: 100 })); dispatch(loadCurrentSupplierProfile())
  }

  const columns = [
    { key: 'machine', label: 'Machine', render: item => <div className='tablePrimary'><strong>{item.manufacturer} {item.model}</strong><span>{item.shop_identifier}</span></div> },
    { key: 'type', label: 'Type', render: item => formatLabel(item.machine_type_key) },
    { key: 'facility', label: 'Facility', render: item => item.facility?.name || 'Unavailable' },
    { key: 'status', label: 'Status', render: item => <StatusBadge tone={statusTone(item.status)}>{formatLabel(item.status)}</StatusBadge> },
    { key: 'actions', label: '', render: item => canManage && <div className='tableActions'><Button href={`/app/machines/${item.id}`} variant='secondary' className='tableAction'>View</Button>{item.status !== 'archived' && <button className='tableAction' type='button' onClick={() => { setSelected(item); setFeedback(null) }}><Pencil aria-hidden='true' /> Edit</button>}{item.status === 'archived' && <button className='tableAction' type='button' onClick={() => changeArchiveState(item)}><RotateCcw aria-hidden='true' /> Restore</button>}</div> },
  ]

  return <>
    <Seo title='Machines' description='Supplier machine inventory.' path='/app/machines' noIndex />
    <AppPageHeader eyebrow='Equipment inventory' title='Machines' description='Maintain the current equipment OEM customers can evaluate when they work with your company.' actions={canManage && <Button onClick={() => { setSelected({}); setFeedback(null) }} disabled={!facilities.length}><Plus aria-hidden='true' /> Add machine</Button>} />
    {!facilities.length && <div className='supplierStateNotice'><Building2Fallback /><div><strong>Add a facility first</strong><p>Every machine belongs to one of your manufacturing facilities.</p></div><Button href='/app/facilities' variant='secondary'>Go to facilities</Button></div>}
    <div className='listToolbar'><label className='selectField' htmlFor='machine-status'><span>Show</span><select id='machine-status' value={status} onChange={event => setStatus(event.target.value)}><option value='current'>Current machines</option><option value='active'>Active only</option><option value='inactive'>Inactive</option><option value='archived'>Archived</option><option value='all'>All machines</option></select></label><StatusBadge tone='info'>{machines.length} machine{machines.length === 1 ? '' : 's'}</StatusBadge></div>
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadMachines({ status, limit: 100 }))} />}
    <section className='appPanel appPanel--table'><DataTable caption='Supplier machines' columns={columns} rows={machines} emptyTitle='No machines in this view' emptyDescription='Add a machine or change the status filter.' /></section>
    <ResponsiveDrawer open={selected !== null} title={selected?.id ? 'Edit machine' : 'Add machine'} onClose={() => setSelected(null)}>
      <MachineForm key={selected?.id || 'new'} initial={initial} facilities={facilities} vocabularies={vocabularies} pending={pending} feedback={feedback} onSubmit={save} />
      {selected?.id && <Button className='drawerDanger' variant='secondary' onClick={() => changeArchiveState(selected)} disabled={pending}>{selected.status === 'archived' ? <><RotateCcw aria-hidden='true' /> Restore machine</> : <><Archive aria-hidden='true' /> Archive machine</>}</Button>}
    </ResponsiveDrawer>
  </>
}

const Building2Fallback = () => <Cog aria-hidden='true' />
Machines.getLayout = PortalPageLayout
export default Machines
