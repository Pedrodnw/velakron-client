import { Check, Clock3, ExternalLink, LoaderCircle, LockKeyhole, MailPlus, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  DataTable,
  ErrorState,
  PermissionDenied,
  ResourceNotFound,
  ResponsiveDrawer,
  StatusBadge,
} from '../../components/app'
import { formatDate, formatLabel, statusTone } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import Seo from '../../components/Seo'
import FormField from '../../components/auth/FormField'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import LinkWrap from '../../components/LinkWrap'
import { getActiveOrganization, getHasPermission } from '../../store/slices/appContext'
import { loadRelationships, relationshipSelectors, updateRelationship } from '../../store/slices/entities/relationships'
import { inviteSupplier } from '../../store/slices/entities/invitations'
import {
  RELATIONSHIP_ACTIONS,
  relationshipActionFor,
  relationshipStatusLabel,
} from '../../components/app/relationshipWorkflow'

// Keep both sides of a pending relationship explicit: suppliers decide while
// OEMs see that the next action belongs to the supplier.
const relatedOrganization = (relationship, activeType) => (
  activeType === 'supplier' ? relationship.oem_organization : relationship.supplier_organization
)
const ndaTone = status => ({ active: 'success', scheduled: 'info', renewal_due: 'warning', expired: 'danger', no_expiration: 'info' }[status] || 'neutral')
const ndaLabel = status => ({ not_required: 'No NDA', no_expiration: 'No expiration', renewal_due: 'Renewal due' }[status] || formatLabel(status))

const Suppliers = () => {
  const dispatch = useDispatch()
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('relationship.read'))
  const canInvite = useSelector(getHasPermission('relationship.invite'))
  const canManage = useSelector(getHasPermission('relationship.manage'))
  const relationships = useSelector(relationshipSelectors.getEntities)
  const loading = useSelector(relationshipSelectors.getEntityLoading)
  const error = useSelector(relationshipSelectors.getEntityError)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [form, setForm] = useState({ supplier_name: '', first_name: '', last_name: '', email: '', message: '' })

  useEffect(() => {
    if (allowed && organization?.id) dispatch(loadRelationships(organization.id))
  }, [allowed, dispatch, organization?.id])

  if (!allowed) return <PermissionDenied />
  if (loading && !relationships.length) return <section className='appPanel'><AppSkeleton lines={6} /></section>
  if (error?.code === 'NOT_FOUND') return <ResourceNotFound />

  const pendingRelationships = relationships.filter(item => item.status === 'pending_supplier')
  const visibleRelationships = organization.type === 'supplier'
    ? relationships.filter(item => !['ended', 'declined'].includes(item.status))
    : relationships

  const columns = [
    { key: 'organization', label: organization.type === 'supplier' ? 'OEM' : 'Supplier', render: item => {
      const related = relatedOrganization(item, organization.type)
      const identity = <><strong>{related?.name || 'Unavailable'}</strong><span>{formatLabel(related?.type)}</span></>
      return organization.type === 'supplier' && related?.id
        ? <LinkWrap className='tablePrimary tablePrimaryLink' href={`/app/suppliers/${related.id}`}>{identity}</LinkWrap>
        : <div className='tablePrimary'>{identity}</div>
    } },
    { key: 'status', label: 'Relationship', render: item => <StatusBadge tone={statusTone(item.status)}>{relationshipStatusLabel({ organizationType: organization.type, status: item.status }) || formatLabel(item.status)}</StatusBadge> },
    { key: 'oem_supplier_code', label: 'Supplier code', render: item => item.oem_supplier_code || '—' },
    { key: 'nda', label: 'Optional NDA', render: item => <div className='tablePrimary'><StatusBadge tone={ndaTone(item.nda?.status)}>{ndaLabel(item.nda?.status || 'not_required')}</StatusBadge><span>{item.nda?.expires_on ? `Through ${formatDate(item.nda.expires_on)}` : 'Does not control access'}</span></div> },
    { key: 'updated_at', label: 'Updated', render: item => formatDate(item.updated_at) },
    { key: 'actions', label: '', render: item => {
      const related = relatedOrganization(item, organization.type)
      if (organization.type === 'oem' && item.status === 'active') return <Button href={`/app/suppliers/${related?.id}`} variant='secondary' className='tableAction'>Manage <ExternalLink aria-hidden='true' /></Button>
      if (organization.type === 'supplier' && related?.id && item.status !== 'pending_supplier') return <Button href={`/app/suppliers/${related.id}`} variant='secondary' className='tableAction'>View customer <ExternalLink aria-hidden='true' /></Button>
      const action = relationshipActionFor({ organizationType: organization.type, status: item.status, canManage })
      if (action === RELATIONSHIP_ACTIONS.SUPPLIER_DECISION) return <div className='tableActions'><button className='tableAction' type='button' disabled={pending} onClick={() => decideRelationship(item, 'active')}><Check aria-hidden='true' /> Accept</button><button className='tableAction tableAction--danger' type='button' disabled={pending} onClick={() => decideRelationship(item, 'declined')}><X aria-hidden='true' /> Decline</button></div>
      if (action === RELATIONSHIP_ACTIONS.SUPPLIER_ADMIN_REQUIRED) return <span className='relationshipActionHint'><LockKeyhole aria-hidden='true' /> Supplier administrator required</span>
      if (action === RELATIONSHIP_ACTIONS.WAITING_FOR_SUPPLIER) return <span className='relationshipActionHint'><Clock3 aria-hidden='true' /> Waiting for supplier response</span>
      return null
    } },
  ]

  const decideRelationship = async (relationship, status) => {
    setPending(true)
    setFeedback(null)
    const result = await dispatch(updateRelationship(relationship.id, {
      status,
      reason: status === 'declined' ? 'Supplier declined the customer relationship invitation' : '',
      version: relationship.version,
    }))
    setPending(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: resultError(result, 'We could not update this customer relationship.') })
    setFeedback({
      type: 'success',
      message: status === 'active'
        ? 'Customer relationship accepted. The OEM can see your profile after Velakron approves it.'
        : 'Customer relationship declined.',
    })
    dispatch(loadRelationships(organization.id))
  }

  const submit = async event => {
    event.preventDefault()
    setPending(true)
    setFeedback(null)
    const result = await dispatch(inviteSupplier(organization.id, form))
    setPending(false)
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'We could not create the supplier invitation.') })
      return
    }
    setFeedback({ type: 'success', message: 'Supplier invitation created. Velakron approval is still required.' })
    setForm({ supplier_name: '', first_name: '', last_name: '', email: '', message: '' })
    dispatch(loadRelationships(organization.id))
  }

  return <>
    <Seo title='Suppliers' description='OEM and supplier relationships.' path='/app/suppliers' noIndex />
    <AppPageHeader
      eyebrow='Supply network'
      title={organization.type === 'supplier' ? 'Customers' : 'Suppliers'}
      description={organization.type === 'supplier' ? 'Accept customer invitations and review any optional relationship NDA.' : 'Invite suppliers, store optional relationship NDAs, and open active company capability profiles.'}
      actions={<>{canInvite && organization.type === 'oem' && <Button onClick={() => setDrawerOpen(true)}><MailPlus aria-hidden='true' /> Invite Supplier</Button>}<StatusBadge tone='info'>{visibleRelationships.length} relationship{visibleRelationships.length === 1 ? '' : 's'}</StatusBadge></>}
    />
    {pendingRelationships.length > 0 && <section className='relationshipWorkflowNotice' aria-live='polite'>
      <span className='relationshipWorkflowNotice__icon'>{organization.type === 'supplier' ? <Check aria-hidden='true' /> : <Clock3 aria-hidden='true' />}</span>
      <div>
        <strong>{organization.type === 'supplier' ? `${pendingRelationships.length} customer invitation${pendingRelationships.length === 1 ? ' needs' : 's need'} a response` : `${pendingRelationships.length} supplier invitation${pendingRelationships.length === 1 ? '' : 's'} awaiting a response`}</strong>
        <p>{organization.type === 'supplier'
          ? canManage
            ? 'Accept or decline each invitation from the controls in the table below.'
            : 'A supplier administrator must accept or decline these customer invitations.'
          : 'The supplier has been invited. No OEM action is required until the supplier responds.'}</p>
      </div>
    </section>}
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {error && <ErrorState description={error.message} onRetry={() => dispatch(loadRelationships(organization.id))} />}
    <section className='appPanel appPanel--table'>
      <DataTable
        caption={`Relationships for ${organization.name}`}
        columns={columns}
        rows={visibleRelationships}
        emptyTitle='No relationships yet'
        emptyDescription={organization.type === 'supplier' ? 'Active customer relationships and new invitations will appear here.' : 'Supplier relationships will appear here after they are created through an authorized workflow.'}
      />
    </section>
    <ResponsiveDrawer open={drawerOpen} title='Invite a supplier company' onClose={() => setDrawerOpen(false)}>
      <form className='drawerForm' onSubmit={submit}>
        <p>This creates a pending supplier workspace and relationship. Velakron must review the supplier before its workspace opens.</p>
        <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
        <FormField id='supplier-company-name' label='Supplier company name' name='supplier_name' value={form.supplier_name} onChange={event => setForm(current => ({ ...current, supplier_name: event.target.value }))} required />
        <div className='authForm__row'><FormField id='supplier-first-name' label='Contact first name' name='first_name' value={form.first_name} onChange={event => setForm(current => ({ ...current, first_name: event.target.value }))} /><FormField id='supplier-last-name' label='Contact last name' name='last_name' value={form.last_name} onChange={event => setForm(current => ({ ...current, last_name: event.target.value }))} /></div>
        <FormField id='supplier-email' label='Contact email' name='email' type='email' value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} required />
        <label className='textAreaField' htmlFor='supplier-message'><span>Optional message</span><textarea id='supplier-message' value={form.message} onChange={event => setForm(current => ({ ...current, message: event.target.value }))} maxLength={1000} /></label>
        <Button type='submit' disabled={pending}>{pending ? <><LoaderCircle className='spin' aria-hidden='true' /> Sending…</> : <><MailPlus aria-hidden='true' /> Send Supplier Invitation</>}</Button>
      </form>
    </ResponsiveDrawer>
  </>
}

Suppliers.getLayout = PortalPageLayout

export default Suppliers
