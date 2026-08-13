import { ArrowLeft, Camera, Cog, Download, LoaderCircle, MapPin, Ruler, Trash2 } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, ConfirmationDialog, EmptyState, ErrorState, PermissionDenied, StatusBadge } from '../../../components/app'
import { formatLabel, statusTone } from '../../../components/app/formatters'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import { getAuthUser } from '../../../store/slices/auth'
import { getActiveOrganization, getHasPermission } from '../../../store/slices/appContext'
import { downloadMachinePhoto, loadMachine, machineSelectors, removeMachinePhoto, uploadMachinePhoto } from '../../../store/slices/entities/machines'

const MachineDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const user = useSelector(getAuthUser)
  const allowed = useSelector(getHasPermission('machine.read'))
  const canManage = useSelector(getHasPermission('machine.manage'))
  const machine = useSelector(state => router.query.id ? machineSelectors.getEntityById(router.query.id)(state) : null)
  const loading = useSelector(machineSelectors.getEntityLoading)
  const error = useSelector(machineSelectors.getEntityError)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)

  useEffect(() => { if (allowed && router.isReady) dispatch(loadMachine(router.query.id)) }, [allowed, dispatch, router.isReady, router.query.id])
  if (!allowed || organization?.type !== 'supplier') return <PermissionDenied />
  if (loading && !machine) return <section className='appPanel'><AppSkeleton lines={9} /></section>
  if (!machine) return <ErrorState title='Machine not found' description={error?.message || 'This machine is not available in your company workspace.'} />

  const preparePhoto = async event => {
    const file = event.target.files?.[0]
    if (!file) return
    setPending(true); setFeedback(null)
    const result = await dispatch(uploadMachinePhoto(machine.id, file))
    setPending(false); event.target.value = ''
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not upload this photo.') })
    const available = result?.payload?.data?.attachment?.state === 'available'
    setFeedback({ type: 'success', message: available ? 'Photo uploaded and format verified. It is ready to download; malware scanning is not enabled in the prototype.' : 'Photo uploaded. Its security check is pending.' })
    dispatch(loadMachine(machine.id))
  }
  const downloadPhoto = async photo => {
    const result = await dispatch(downloadMachinePhoto(machine.id, photo.id))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'We could not download this photo.') })
  }
  const removePhoto = async () => {
    if (!removeTarget) return
    setPending(true); setFeedback(null)
    const result = await dispatch(removeMachinePhoto(machine.id, removeTarget.id))
    setPending(false)
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'We could not remove this photo.') })
    else setFeedback({ type: 'success', message: 'Photo removed from the machine gallery.' })
    setRemoveTarget(null)
  }

  return <>
    <Seo title={`${machine.manufacturer} ${machine.model}`} description='Machine detail.' path={`/app/machines/${machine.id}`} noIndex />
    <Button href='/app/machines' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Machine inventory</Button>
    <AppPageHeader eyebrow={machine.shop_identifier} title={`${machine.manufacturer} ${machine.model}`} description={machine.shared_description || 'No customer-facing description has been added.'} actions={<StatusBadge tone={statusTone(machine.status)}>{formatLabel(machine.status)}</StatusBadge>} />
    {error && <ErrorState description={error.message} />}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <div className='machineDetailGrid'>
      <section className='appPanel machinePhotoPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Equipment photos</p><h2>Machine gallery</h2></div>{canManage && <label className='vk-button vk-button--secondary photoPicker'>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <Camera aria-hidden='true' />} Add photo<input type='file' accept='image/jpeg,image/png,image/webp' onChange={preparePhoto} disabled={pending} /></label>}</header>
        {machine.photo_attachments?.length ? <div className='attachmentPlaceholders'>{machine.photo_attachments.map(photo => {
          const ownPhoto = String(photo.created_by?.id || photo.created_by || '') === String(user?.id || user?._id || '')
          return <div key={photo.id}><Camera aria-hidden='true' /><strong>{photo.display_filename || photo.original_filename}</strong><span>{photo.state === 'available' ? (photo.scan_status === 'unavailable' ? 'Format verified · prototype malware scan not enabled' : 'Security check complete') : `Security status: ${formatLabel(photo.state)}`}</span><div className='attachmentPlaceholderActions'>{photo.state === 'available' && <button type='button' className='tableAction' onClick={() => downloadPhoto(photo)}><Download aria-hidden='true' /> Download</button>}{(ownPhoto || canManage) && <button type='button' className='tableAction tableAction--danger' onClick={() => setRemoveTarget(photo)}><Trash2 aria-hidden='true' /> Remove</button>}</div></div>
        })}</div> : <EmptyState compact icon={Camera} title='No photos yet' description='Photos are optional. Prototype uploads are format-verified before download; malware scanning is not enabled, so do not upload regulated data.' />}
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Machine facts</p><h2>Specifications</h2></div><Cog aria-hidden='true' /></header>
        <dl className='appDetailList'>
          <div><dt>Type</dt><dd>{formatLabel(machine.machine_type_key)}</dd></div>
          <div><dt>Facility</dt><dd>{machine.facility?.name || 'Unavailable'}</dd></div>
          <div><dt>Year</dt><dd>{machine.year || 'Not provided'}</dd></div>
          <div><dt>Controller</dt><dd>{formatLabel(machine.controller_key) || 'Not provided'}</dd></div>
          <div><dt>Axes</dt><dd>{machine.axes || 'Not provided'}</dd></div>
          <div><dt>Work envelope</dt><dd>{machine.work_envelope || 'Not provided'}</dd></div>
        </dl>
      </section>
      <section className='appPanel capabilityPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Shared capabilities</p><h2>Processes and materials</h2></div><Ruler aria-hidden='true' /></header>
        <div className='capabilityGroups'><div><strong>Processes</strong><p>{machine.process_keys?.map(formatLabel).join(', ') || 'Not provided'}</p></div><div><strong>Materials</strong><p>{machine.material_keys?.map(formatLabel).join(', ') || 'Not provided'}</p></div><div><strong>Inspection</strong><p>{machine.inspection_capability_keys?.map(formatLabel).join(', ') || 'Not provided'}</p></div></div>
      </section>
      <section className='appPanel'>
        <header className='appPanel__header'><div><p className='technicalLabel'>Supplier-only</p><h2>Internal notes</h2></div><MapPin aria-hidden='true' /></header>
        <p>{machine.internal_notes || 'No internal notes.'}</p>
      </section>
    </div>
    <ConfirmationDialog open={Boolean(removeTarget)} title='Remove this machine photo?' description='It will disappear from the machine gallery. Its upload and removal remain recorded in the audit history.' confirmLabel='Remove photo' onConfirm={removePhoto} onClose={() => setRemoveTarget(null)} danger confirmDisabled={pending} />
  </>
}

MachineDetail.getLayout = PortalPageLayout
export default MachineDetail
