import { CalendarPlus, MailPlus, Pencil, Search, Trash2, UserRound } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, DataTable, ErrorState, FilterBar, Pagination, StatusBadge } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatDateTime, formatShortDate } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const CrmContacts = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], meta: null, error: '' })
  const [filters, setFilters] = useState({ search: '', follow_up: '', page: 1 })
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [owners, setOwners] = useState([])
  const [editOpen, setEditOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', job_title: '', department: '', email: '', phone: '', owner: '', contact_role: 'user', status: 'active', next_follow_up_at: '', notes: '' })

  const load = useCallback(async (next = filters) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/contacts', params: { ...next, page_size: 30 }, requestKey: 'crm-contacts' }))
    setState(result?.ok ? { loading: false, rows: result.payload.data.contacts || [], meta: result.payload.meta, error: '' } : { loading: false, rows: [], meta: null, error: crmErrorMessage(result) })
  }, [dispatch, filters])
  const open = useCallback(async id => {
    setDetailLoading(true)
    const result = await dispatch(crmRequest({ url: `/contacts/${id}`, requestKey: `crm-contact-${id}` }))
    setDetailLoading(false)
    if (result?.ok) setDetail(result.payload.data)
  }, [dispatch])
  useEffect(() => { load(filters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { dispatch(crmRequest({ url: '/owners', requestKey: 'crm-contact-owners' })).then(result => result?.ok && setOwners(result.payload.data.owners || [])) }, [dispatch])
  useEffect(() => {
    if (router.isReady && router.query.contact) open(router.query.contact)
  }, [open, router.isReady, router.query.contact])
  const submit = event => { event.preventDefault(); const next = { ...filters, page: 1 }; setFilters(next); load(next) }
  const columns = [
    { key: 'name', label: 'Contact', render: item => <button className='crmTableLink' type='button' onClick={() => { open(item.id); router.replace({ pathname: router.pathname, query: { ...router.query, contact: item.id } }, undefined, { shallow: true }) }}><span className='crmAvatar'>{item.first_name?.[0]}{item.last_name?.[0]}</span><span className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email || 'No email'}</span></span></button> },
    { key: 'organization', label: 'Organization', render: item => <LinkWrap href={`/app/crm/organizations/${item.organization?.id || item.organization?._id}`}>{item.organization?.name}</LinkWrap> },
    { key: 'title', label: 'Title / department', render: item => <div className='tablePrimary'><strong>{item.job_title || 'Not set'}</strong><span>{item.department}</span></div> },
    { key: 'role', label: 'Relationship role', render: item => item.contact_roles?.map(role => role.replaceAll('_', ' ')).join(', ') || 'Not set' },
    { key: 'owner', label: 'Velakron owner', render: item => OwnerName({ membership: item.owner }) },
    { key: 'last', label: 'Last interaction', render: item => formatShortDate(item.last_interaction_at) },
    { key: 'next', label: 'Next follow-up', render: item => <StatusBadge tone={item.next_follow_up_at && new Date(item.next_follow_up_at) < new Date() ? 'danger' : 'neutral'}>{formatShortDate(item.next_follow_up_at)}</StatusBadge> },
  ]
  const close = () => {
    setDetail(null)
    const query = { ...router.query }; delete query.contact
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
  }
  const beginEdit = () => {
    const contact = detail.contact
    setForm({ first_name: contact.first_name, last_name: contact.last_name, job_title: contact.job_title || '', department: contact.department || '', email: contact.email || '', phone: contact.phone || '', owner: contact.owner?.id || '', contact_role: contact.contact_roles?.[0] || 'user', status: contact.status || 'active', next_follow_up_at: contact.next_follow_up_at ? new Date(new Date(contact.next_follow_up_at).getTime() - new Date(contact.next_follow_up_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', notes: contact.notes || '' })
    setEditOpen(true); setFeedback(null)
  }
  const save = async event => {
    event.preventDefault(); setSaving(true)
    const contact = detail.contact
    const result = await dispatch(crmRequest({ url: `/contacts/${contact.id}`, method: 'patch', requestKey: `crm-contact-update-${contact.id}`, data: { first_name: form.first_name, last_name: form.last_name, job_title: form.job_title, department: form.department, email: form.email, phone: form.phone, owner: form.owner || null, contact_roles: [form.contact_role], status: form.status, next_follow_up_at: form.next_follow_up_at ? new Date(form.next_follow_up_at).toISOString() : null, notes: form.notes, version: contact.version } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The contact could not be updated.') })
    setEditOpen(false); setFeedback({ type: 'success', message: 'Contact updated.' }); await open(contact.id); load(filters)
  }
  const archive = async () => {
    const contact = detail.contact
    if (!window.confirm(`Archive ${contact.full_name}? The relationship history will be retained.`)) return
    setSaving(true)
    const result = await dispatch(crmRequest({ url: `/contacts/${contact.id}`, method: 'delete', requestKey: `crm-contact-archive-${contact.id}`, data: { version: contact.version, reason: 'Archived by a founder from the CRM contact directory.' } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The contact could not be archived.') })
    close(); setFeedback({ type: 'success', message: 'Contact archived; relationship history was retained.' }); load(filters)
  }
  return <>
    <Seo title='CRM contacts' description='Velakron relationship contacts.' path='/app/crm/contacts' noIndex />
    <AppPageHeader eyebrow='Relationship directory' title='Contacts' description='Every person we know, what role they play, the relationship owner, and when we should follow up.' />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <FilterBar onSubmit={submit} actions={<Button type='submit'><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search contacts</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name, email, title, department' /></label>
      <label><span>Follow-up</span><select value={filters.follow_up} onChange={event => setFilters(value => ({ ...value, follow_up: event.target.value }))}><option value=''>Any timing</option><option value='overdue'>Overdue</option></select></label>
    </FilterBar>
    {state.error && <ErrorState title='Contacts could not be loaded' description={state.error} onRetry={() => load()} />}
    <section className='appPanel appPanel--table'>{state.loading && !state.rows.length ? <AppSkeleton lines={9} /> : <DataTable columns={columns} rows={state.rows} caption='CRM contacts' emptyTitle='No contacts match' emptyDescription='Contacts are created from an organization record.' />}</section>
    <Pagination meta={state.meta} onPageChange={page => { const next = { ...filters, page }; setFilters(next); load(next) }} label='Contact pages' />
    <CrmModal open={Boolean(detail) || detailLoading} title={detail?.contact?.full_name || 'Loading contact…'} description={detail?.contact ? `${detail.contact.job_title || 'Role not set'} at ${detail.contact.organization?.name}` : ''} onClose={close} wide actions={detail?.contact && <><Button variant='secondary' onClick={archive} disabled={saving}><Trash2 aria-hidden='true' /> Archive</Button><Button variant='secondary' onClick={beginEdit}><Pencil aria-hidden='true' /> Edit</Button><Button variant='secondary' href={`/app/crm/calendar?new=1&organization=${detail.contact.organization?.id}&contact=${detail.contact.id}`}><CalendarPlus aria-hidden='true' /> Schedule meeting</Button><Button href={`/app/crm/inbox?compose=1&organization=${detail.contact.organization?.id}&contact=${detail.contact.id}`}><MailPlus aria-hidden='true' /> Email contact</Button></>}>
      {detailLoading && !detail ? <AppSkeleton lines={8} /> : detail && <div className='crmContactDetail'>
        <section className='crmRecordSummary crmRecordSummary--compact'>
          <div><span>Organization</span><strong>{detail.contact.organization?.name}</strong></div><div><span>Email</span><strong>{detail.contact.email || 'Not set'}</strong></div>
          <div><span>Phone</span><strong>{detail.contact.phone || 'Not set'}</strong></div><div><span>Owner</span><strong>{OwnerName({ membership: detail.contact.owner })}</strong></div>
          <div><span>Last interaction</span><strong>{formatShortDate(detail.contact.last_interaction_at)}</strong></div><div><span>Next follow-up</span><strong>{formatShortDate(detail.contact.next_follow_up_at)}</strong></div>
        </section>
        {detail.contact.do_not_contact && <div className='crmWarning'><UserRound aria-hidden='true' /><span><strong>Do not contact</strong>{detail.contact.do_not_contact_reason}</span></div>}
        <section><h3>Notes</h3><p className='crmLongText'>{detail.contact.notes || 'No contact notes.'}</p></section>
        <section><h3>Recent activity</h3>{detail.interactions?.length ? <div className='crmTimeline'>{detail.interactions.slice(0, 10).map(item => <article key={item.id || item._id}><span className='crmTimeline__dot' /><div><header><strong>{item.subject || item.type.replaceAll('_', ' ')}</strong><time>{formatDateTime(item.occurred_at)}</time></header><p>{item.summary}</p></div></article>)}</div> : <p>No activity yet.</p>}</section>
      </div>}
    </CrmModal>
    <CrmModal open={editOpen} title='Edit contact' onClose={() => !saving && setEditOpen(false)} wide actions={<><Button variant='secondary' onClick={() => setEditOpen(false)}>Cancel</Button><Button type='submit' form='crm-contact-edit' disabled={saving}>Save contact</Button></>}><form id='crm-contact-edit' onSubmit={save}><FieldGrid><Field label='First name'><input required value={form.first_name} onChange={event => setForm(value => ({ ...value, first_name: event.target.value }))} /></Field><Field label='Last name'><input required value={form.last_name} onChange={event => setForm(value => ({ ...value, last_name: event.target.value }))} /></Field><Field label='Email'><input type='email' value={form.email} onChange={event => setForm(value => ({ ...value, email: event.target.value }))} /></Field><Field label='Phone'><input value={form.phone} onChange={event => setForm(value => ({ ...value, phone: event.target.value }))} /></Field><Field label='Job title'><input value={form.job_title} onChange={event => setForm(value => ({ ...value, job_title: event.target.value }))} /></Field><Field label='Department'><input value={form.department} onChange={event => setForm(value => ({ ...value, department: event.target.value }))} /></Field><Field label='Relationship role'><select value={form.contact_role} onChange={event => setForm(value => ({ ...value, contact_role: event.target.value }))}>{['decision_maker','champion','user','procurement','engineering','quality','executive','finance','legal','other'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field><Field label='Status'><select value={form.status} onChange={event => setForm(value => ({ ...value, status: event.target.value }))}>{['active','departed','unknown'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field><Field label='Velakron owner'><select value={form.owner} onChange={event => setForm(value => ({ ...value, owner: event.target.value }))}><option value=''>Unassigned</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field><Field label='Next follow-up'><input type='datetime-local' value={form.next_follow_up_at} onChange={event => setForm(value => ({ ...value, next_follow_up_at: event.target.value }))} /></Field><Field label='Notes' wide><textarea rows={6} value={form.notes} onChange={event => setForm(value => ({ ...value, notes: event.target.value }))} /></Field></FieldGrid></form></CrmModal>
  </>
}

CrmContacts.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmContacts
