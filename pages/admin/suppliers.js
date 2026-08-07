import { CheckCircle2, Eye, LoaderCircle, Search, ShieldAlert, Undo2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, PermissionDenied, ResponsiveDrawer, StatusBadge } from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import { getHasPermission } from '../../store/slices/appContext'
import { loadSupplierProfileDetail, loadSupplierReviewQueue, reviewSupplierProfile, supplierProfileSelectors } from '../../store/slices/entities/supplierProfiles'

const SupplierReviews = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('supplier_profile.review'))
  const queue = useSelector(supplierProfileSelectors.getReviewQueue)
  const detail = useSelector(supplierProfileSelectors.getDetail)
  const loading = useSelector(supplierProfileSelectors.getLoading)
  const error = useSelector(supplierProfileSelectors.getError)
  const [reason, setReason] = useState('')
  const [reasonError, setReasonError] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [message, setMessage] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  if (!allowed) return <PermissionDenied description='Only Velakron supplier reviewers can access this queue.' />

  const validReason = () => {
    const value = reason.trim()
    if (value.length < 8) { setReasonError('Enter at least 8 characters explaining this review session.'); return null }
    setReasonError(''); return value
  }
  const loadQueue = event => {
    event?.preventDefault()
    const value = validReason()
    if (value) dispatch(loadSupplierReviewQueue(value))
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
    setSelectedId(null); setMessage(''); dispatch(loadSupplierReviewQueue(value))
  }

  const columns = [
    { key: 'supplier', label: 'Supplier', render: item => <div className='tablePrimary'><strong>{item.supplier_organization?.name || item.display_name}</strong><span>{item.legal_name}</span></div> },
    { key: 'state', label: 'Onboarding', render: item => <StatusBadge tone={statusTone(item.onboarding_state)}>{formatLabel(item.onboarding_state)}</StatusBadge> },
    { key: 'progress', label: 'Completion', render: item => `${item.progress?.percentage || 0}%` },
    { key: 'submitted', label: 'Submitted', render: item => item.submitted_at ? formatDate(item.submitted_at) : 'Not submitted' },
    { key: 'actions', label: '', render: item => <button className='tableAction' type='button' onClick={() => open(item.supplier_organization?.id || item.supplier_organization)}><Eye aria-hidden='true' /> Review</button> },
  ]
  const selected = detail?.organization?.id === selectedId ? detail : null

  return <>
    <Seo title='Supplier reviews' description='Audited supplier activation queue.' path='/admin/suppliers' noIndex />
    <AppPageHeader eyebrow='Platform review' title='Supplier activation' description='Review submitted company, facility, certification, and machine information before a supplier becomes visible to connected customers.' actions={<StatusBadge tone='warning'>Audited access</StatusBadge>} />
    <section className='appPanel supportReasonPanel'><form className='supportReasonForm' onSubmit={loadQueue}><label htmlFor='supplier-review-reason'>Reason for this review session</label><div><input id='supplier-review-reason' value={reason} onChange={event => setReason(event.target.value)} minLength={8} maxLength={500} placeholder='Example: Reviewing supplier onboarding ticket VK-218' required /><Button type='submit' disabled={loading}><Search aria-hidden='true' /> Load review queue</Button></div><p className={reasonError ? 'formHint formHint--error' : 'formHint'}>{reasonError || 'Every queue view, profile view, and decision is recorded with this reason.'}</p></form></section>
    {error && <ErrorState description={error.message} onRetry={loadQueue} />}
    {loading && !selectedId ? <section className='appPanel'><AppSkeleton lines={7} /></section> : <section className='appPanel appPanel--table'><DataTable caption='Supplier onboarding review queue' columns={columns} rows={queue} emptyTitle='No profiles loaded' emptyDescription='Enter a valid support reason to load the review queue.' /></section>}
    <ResponsiveDrawer open={Boolean(selectedId)} title='Review supplier profile' onClose={() => setSelectedId(null)}>
      {loading && !selected ? <AppSkeleton lines={10} /> : selected?.profile ? <div className='supplierReviewDrawer'>
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
