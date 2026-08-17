import { CheckCircle2, Eye, LoaderCircle, RefreshCw, ShieldAlert, Undo2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, PermissionDenied, ResponsiveDrawer, StatusBadge } from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getHasPermission } from '../../store/slices/appContext'
import { loadSupplierProfileDetail, reviewSupplierProfile, supplierProfileSelectors } from '../../store/slices/entities/supplierProfiles'
import { loadPlatformActionCenter, platformSelectors } from '../../store/slices/entities/platformAdministration'

const SupplierReviews = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('supplier_profile.review'))
  const actionCenter = useSelector(platformSelectors.getActionCenter)
  const queueLoading = useSelector(platformSelectors.getActionCenterLoading)
  const queueError = useSelector(platformSelectors.getActionCenterError)
  const detail = useSelector(supplierProfileSelectors.getDetail)
  const detailLoading = useSelector(supplierProfileSelectors.getLoading)
  const error = useSelector(supplierProfileSelectors.getError)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const queue = (actionCenter?.needs_velakron || []).filter(item => item.kind === 'supplier_profile_review')
  useEffect(() => { if (allowed) dispatch(loadPlatformActionCenter()) }, [allowed, dispatch])
  if (!allowed) return <PermissionDenied description='Only Velakron supplier reviewers can access this queue.' />

  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining this review session.'); return null }
    setReasonError(''); return value
  }
  const open = async id => {
    const value = validReason()
    if (!value) return
    setSelectedId(id); setFeedback(null); setMessage('')
    await dispatch(loadSupplierProfileDetail(id, value))
  }
  const review = async action => {
    const value = validReason()
    if (!value || !detail?.profile) return
    setPending(true); setFeedback(null)
    const result = await dispatch(reviewSupplierProfile(selectedId, { action, message, version: detail.profile.version }, value))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not complete this review action.') })
    setSelectedId(null); setMessage(''); dispatch(loadPlatformActionCenter())
  }

  const columns = [
    { key: 'supplier', label: 'Supplier', render: item => <div className='tablePrimary'><strong>{item.title}</strong><span>{formatLabel(item.organization?.type)}</span></div> },
    { key: 'state', label: 'Next owner', render: () => <StatusBadge tone='warning'>Velakron review</StatusBadge> },
    { key: 'priority', label: 'Priority', render: item => <StatusBadge tone={item.priority === 'high' ? 'danger' : item.priority === 'medium' ? 'warning' : 'info'}>{formatLabel(item.priority)}</StatusBadge> },
    { key: 'submitted', label: 'Submitted', render: item => item.waiting_since ? formatDate(item.waiting_since) : 'Recently' },
    { key: 'actions', label: '', render: item => <button className='tableAction' type='button' onClick={() => open(item.organization?.id)}><Eye aria-hidden='true' /> Review</button> },
  ]
  const selected = detail?.organization?.id === selectedId ? detail : null

  return <>
    <Seo title='Supplier reviews' description='Audited supplier activation queue.' path='/admin/suppliers' noIndex />
    <AppPageHeader eyebrow='Platform review' title='Supplier activation' description='Submitted suppliers appear automatically. A reason is required only when opening the company profile and making a decision.' actions={<Button variant='secondary' onClick={() => dispatch(loadPlatformActionCenter())} disabled={queueLoading}><RefreshCw className={queueLoading ? 'spin' : ''} aria-hidden='true' /> Refresh</Button>} />
    <section className='appPanel supportReasonPanel'><label htmlFor='supplier-review-reason'>Reason for opening a supplier review</label><input id='supplier-review-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Reviewing supplier onboarding ticket VK-218' required /><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'The queue is visible automatically. This reason is recorded when you open customer data or make a decision.'}</p></section>
    {router.query.organization && <p className='deepLinkNotice'>The requested supplier is highlighted by this review link. Enter a review reason, then open it from the queue.</p>}
    {queueError && <ErrorState description={queueError.message} onRetry={() => dispatch(loadPlatformActionCenter())} />}
    {error && <ErrorState description={error.message} onRetry={() => selectedId && open(selectedId)} />}
    {queueLoading && !actionCenter ? <section className='appPanel'><AppSkeleton lines={7} /></section> : <section className='appPanel appPanel--table'><DataTable caption='Supplier onboarding review queue' columns={columns} rows={queue} emptyTitle='No supplier profiles need review' emptyDescription='Submitted supplier profiles will appear here automatically.' /></section>}
    <ResponsiveDrawer open={Boolean(selectedId)} title='Review supplier profile' onClose={() => setSelectedId(null)}>
      {detailLoading && !selected ? <AppSkeleton lines={10} /> : selected?.profile ? <div className='supplierReviewDrawer'>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <header><h3>{selected.profile.display_name}</h3><StatusBadge tone={statusTone(selected.profile.onboarding_state)}>{formatLabel(selected.profile.onboarding_state)}</StatusBadge></header>
        <p>{selected.profile.business_description || 'No business description.'}</p>
        <dl className='appDetailList'><div><dt>Legal name</dt><dd>{selected.profile.legal_name}</dd></div><div><dt>Contact</dt><dd>{selected.profile.shared_contact?.name}<br />{selected.profile.shared_contact?.email}</dd></div><div><dt>Facilities</dt><dd>{selected.facilities?.length || 0}</dd></div><div><dt>Machines</dt><dd>{selected.machines?.length || 0}</dd></div><div><dt>Certifications</dt><dd>{selected.certifications?.length || 0}</dd></div></dl>
        <div className='reviewInventory'>{selected.machines?.map(machine => <article key={machine.id}><strong>{machine.manufacturer} {machine.model}</strong><span>{formatLabel(machine.machine_type_key)} · {machine.shop_identifier}</span></article>)}</div>
        <label className='textAreaField' htmlFor='supplier-review-message'><span>Decision message</span><textarea id='supplier-review-message' value={message} onChange={event => setMessage(event.target.value)} maxLength={2000} /><small>Required when requesting changes or suspending access.</small></label>
        <div className='reviewActions'><Button variant='secondary' onClick={() => review('request_changes')} disabled={pending || message.trim().length < 4}><Undo2 aria-hidden='true' /> Request changes</Button><Button className='vk-button--danger' onClick={() => review('suspend')} disabled={pending || message.trim().length < 4}><ShieldAlert aria-hidden='true' /> Suspend</Button><Button onClick={() => review('activate')} disabled={pending || selected.profile.onboarding_state !== 'ready_for_review'}>{pending ? <LoaderCircle className='spin' aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />} Activate supplier</Button></div>
      </div> : <ErrorState title='Profile unavailable' description='This profile could not be loaded for review.' />}
    </ResponsiveDrawer>
  </>
}

SupplierReviews.getLayout = PortalPageLayout
export default SupplierReviews
