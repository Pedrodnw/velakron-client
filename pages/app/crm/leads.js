import { Activity, Building2, CalendarClock, Clock3, Factory, Mail, MessageSquarePlus, Search, Trash2, UserRound, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import {
  AppPageHeader,
  AppSkeleton,
  ConfirmationDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FilterBar,
  MetricCard,
  Pagination,
  PermissionDenied,
  StatusBadge,
} from '../../../components/app'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatShortDate } from '../../../components/app/crm/CrmFields'
import { formatDateTime, formatLabel } from '../../../components/app/formatters'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import { Button } from '../../../components/design-system'
import FormMessage from '../../../components/auth/FormMessage'
import Seo from '../../../components/Seo'
import { getHasPermission } from '../../../store/slices/appContext'
import {
  createTradeShowLeadNote,
  deleteTradeShowLead,
  loadTradeShowLeadDetail,
  loadTradeShowLeads,
  tradeShowLeadSelectors,
} from '../../../store/slices/entities/tradeShowLeads'

const initialNote = {
  type: 'phone_call',
  direction: 'outbound',
  subject: '',
  summary: '',
  outcome: '',
  occurred_at: '',
  next_action: '',
  follow_up_at: '',
}

const localDateTime = value => {
  const date = value ? new Date(value) : new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

const authorName = actor => [actor?.first_name, actor?.last_name].filter(Boolean).join(' ') || actor?.email || 'Velakron team'

const TradeShowLeads = () => {
  const dispatch = useDispatch()
  const allowed = useSelector(getHasPermission('trade_show_lead.read'))
  const leads = useSelector(tradeShowLeadSelectors.getItems)
  const counts = useSelector(tradeShowLeadSelectors.getCounts)
  const capabilities = useSelector(tradeShowLeadSelectors.getCapabilities)
  const pagination = useSelector(tradeShowLeadSelectors.getPagination)
  const loading = useSelector(tradeShowLeadSelectors.getLoading)
  const error = useSelector(tradeShowLeadSelectors.getError)
  const [filters, setFilters] = useState({ search: '', experience: '', page: 1 })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailFeedback, setDetailFeedback] = useState(null)
  const [noteOpen, setNoteOpen] = useState(false)
  const [noteForm, setNoteForm] = useState(initialNote)
  const [noteSaving, setNoteSaving] = useState(false)

  const load = (page = filters.page) => {
    const next = { ...filters, page }
    setFilters(next)
    dispatch(loadTradeShowLeads({ ...next, page_size: 50 }))
  }

  useEffect(() => {
    if (allowed) dispatch(loadTradeShowLeads({ page: 1, page_size: 50 }))
  }, [allowed, dispatch])

  if (!allowed) return <PermissionDenied description='Sales Demo acquisition is available only to Velakron founders.' />

  const confirmDelete = async () => {
    setDeleting(true)
    setFeedback(null)
    const result = await dispatch(deleteTradeShowLead(deleteTarget.id))
    setDeleting(false)
    if (!result?.ok) {
      setFeedback({ type: 'error', message: result?.error?.message || 'The lead could not be deleted.' })
      return
    }
    setDeleteTarget(null)
    setFeedback({ type: 'success', message: 'Lead deleted and its temporary demo access was closed. Its CRM relationship history was retained.' })
    load(leads.length === 1 && filters.page > 1 ? filters.page - 1 : filters.page)
  }

  const openLead = async lead => {
    setDetail({ lead, crm: null, capabilities: capabilities || {} })
    setDetailLoading(true)
    setDetailFeedback(null)
    setNoteOpen(false)
    const result = await dispatch(loadTradeShowLeadDetail(lead.id))
    setDetailLoading(false)
    if (!result?.ok) {
      setDetailFeedback({ type: 'error', message: result?.error?.message || 'The lead details could not be loaded.' })
      return
    }
    setDetail(result.payload.data)
  }

  const closeLead = () => {
    if (noteSaving) return
    setDetail(null)
    setDetailFeedback(null)
    setNoteOpen(false)
  }

  const beginNote = () => {
    setNoteForm({
      ...initialNote,
      subject: `Conversation with ${detail?.lead?.full_name || 'Sales Demo lead'}`,
      occurred_at: localDateTime(),
    })
    setDetailFeedback(null)
    setNoteOpen(true)
  }

  const saveNote = async event => {
    event.preventDefault()
    setNoteSaving(true)
    setDetailFeedback(null)
    const result = await dispatch(createTradeShowLeadNote(detail.lead.id, {
      ...noteForm,
      occurred_at: new Date(noteForm.occurred_at).toISOString(),
      follow_up_at: noteForm.follow_up_at ? new Date(noteForm.follow_up_at).toISOString() : null,
    }))
    setNoteSaving(false)
    if (!result?.ok) {
      setDetailFeedback({ type: 'error', message: result?.error?.message || 'The conversation note could not be saved.' })
      return
    }
    setDetail(result.payload.data)
    setNoteOpen(false)
    setDetailFeedback({ type: 'success', message: 'Conversation saved to this contact’s CRM history.' })
    load(filters.page)
  }

  const columns = [
    { key: 'name', label: 'Guest', render: item => <button className='crmTableLink' type='button' onClick={() => openLead(item)}><span className='crmAvatar'>{item.full_name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span><span className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email}</span></span></button> },
    { key: 'company', label: 'Company', render: item => item.company_name },
    { key: 'experience', label: 'Experience', render: item => <StatusBadge tone={item.experience === 'oem' ? 'info' : 'success'}>{formatLabel(item.experience)}</StatusBadge> },
    { key: 'submitted', label: 'Submitted', render: item => formatDateTime(item.created_at) },
    { key: 'crm', label: 'CRM record', render: item => item.crm_conversion_status === 'converted' && item.crm_organization
      ? <div className='tablePrimary'><LinkWrap href={`/app/crm/organizations/${item.crm_organization}`}>Open organization</LinkWrap><span>{item.crm_opportunity ? 'OEM opportunity created' : 'Supplier prospect created'}</span></div>
      : <StatusBadge tone='warning'>{item.crm_conversion_status === 'needs_review' ? 'Needs review' : 'Conversion pending'}</StatusBadge> },
    { key: 'demo', label: 'Demo access', render: item => <div className='tablePrimary'><StatusBadge tone={item.demo_active ? 'success' : 'neutral'}>{item.demo_active ? 'Active' : 'Expired'}</StatusBadge><span>{item.demo_active ? `Until ${formatDateTime(item.demo_expires_at)}` : 'Lead retained; demo closed'}</span></div> },
    ...(capabilities?.can_delete ? [{ key: 'actions', label: '', render: item => <Button variant='secondary' className='tableAction tableAction--danger' onClick={() => { setDeleteTarget(item); setFeedback(null) }}><Trash2 aria-hidden='true' /> Delete</Button> }] : []),
  ]

  return <>
    <Seo title='CRM Sales Demo leads' description='Velakron Sales Demo lead acquisition and CRM conversion.' path='/app/crm/leads' noIndex />
    <AppPageHeader
      eyebrow='Sales Demo acquisition'
      title='Sales Demo leads'
      description='Every public Sales Demo submission is converted automatically into the appropriate CRM organization, contact, and—when the guest selects OEM—sales opportunity.'
      actions={<Button href='/app/sales-demo?tab=campaigns'>Manage links & QR</Button>}
    />
    <section className='metricGrid metricGrid--priority' aria-label='IMTS lead totals'>
      <MetricCard label='Total guests' value={counts?.total ?? '—'} detail='Captured through Sales Demo links' icon={UsersRound} />
      <MetricCard label='OEM views' value={counts?.oem ?? '—'} detail='Guests added to the OEM pipeline' icon={Building2} />
      <MetricCard label='Supplier views' value={counts?.supplier ?? '—'} detail='Guests added as supplier prospects' icon={Factory} />
      <MetricCard label='Active demos' value={counts?.active_demos ?? '—'} detail='Temporary workspaces still available' icon={Clock3} />
    </section>
    <FilterBar onSubmit={event => { event.preventDefault(); load(1) }} actions={<Button type='submit' disabled={loading}><Search aria-hidden='true' /> Search</Button>}>
      <label><span>Search leads</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Name, company, or email' maxLength={160} /></label>
      <label><span>Experience</span><select value={filters.experience} onChange={event => setFilters(value => ({ ...value, experience: event.target.value }))}><option value=''>Both experiences</option><option value='oem'>OEM</option><option value='supplier'>Supplier</option></select></label>
    </FilterBar>
    {error && <ErrorState title='Sales Demo leads could not be loaded' description={error.message} onRetry={() => load()} />}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    <section className='appPanel appPanel--table'>
      {loading && !leads.length
        ? <AppSkeleton lines={8} />
        : <DataTable columns={columns} rows={leads} caption='Sales Demo guest leads' emptyTitle='No Sales Demo leads yet' emptyDescription='New link and QR submissions will appear here and enter the CRM automatically.' />}
    </section>
    <Pagination meta={pagination} onPageChange={load} label='Sales Demo lead pages' />
    <CrmModal
      open={Boolean(detail)}
      title={detail?.lead?.full_name || 'Sales Demo contact'}
      description={detail?.lead ? `${detail.lead.company_name} · ${formatLabel(detail.lead.experience)} experience` : ''}
      onClose={closeLead}
      wide
      actions={detail?.lead && <>
        {detail.crm?.contact && <Button variant='secondary' href={`/app/crm/contacts?contact=${detail.crm.contact.id}`}><UserRound aria-hidden='true' /> Open CRM contact</Button>}
        <Button onClick={beginNote} disabled={detailLoading || noteSaving || !detail.capabilities?.can_add_note}><MessageSquarePlus aria-hidden='true' /> Add conversation note</Button>
      </>}
    >
      {detailLoading
        ? <AppSkeleton lines={10} />
        : detail?.lead && <div className='crmLeadDetail'>
          <FormMessage type={detailFeedback?.type}>{detailFeedback?.message}</FormMessage>
          <section className='crmLeadIdentity'>
            <span className='crmLeadIdentity__avatar'>{detail.lead.full_name?.split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
            <div><p className='technicalLabel'>Sales Demo contact</p><h3>{detail.lead.full_name}</h3><p>{detail.crm?.contact?.job_title || 'Title not recorded'} at {detail.lead.company_name}</p></div>
            <a href={`mailto:${detail.lead.email}`}><Mail aria-hidden='true' /> {detail.lead.email}</a>
          </section>
          <section className='crmRecordSummary crmRecordSummary--compact crmLeadSummary'>
            <div><span>Company</span><strong>{detail.crm?.organization?.name || detail.lead.company_name}</strong><small>{detail.crm?.organization?.industry || 'Industry not recorded'}</small></div>
            <div><span>Experience viewed</span><strong>{formatLabel(detail.lead.experience)}</strong><small>{detail.lead.source === 'sales_demo' ? 'Sales Demo campaign' : 'IMTS capture'}</small></div>
            <div><span>Submitted</span><strong>{formatDateTime(detail.lead.created_at)}</strong><small>{detail.lead.demo_active ? `Demo active until ${formatDateTime(detail.lead.demo_expires_at)}` : 'Demo access closed'}</small></div>
            <div><span>CRM connection</span><strong>{detail.crm?.contact ? 'Connected' : 'Needs review'}</strong><small>{detail.crm?.contact ? 'History is shared with the CRM contact' : 'The first note will retry CRM connection'}</small></div>
            <div><span>Phone</span><strong>{detail.crm?.contact?.phone || 'Not recorded'}</strong><small>{detail.crm?.contact?.preferred_channel ? `Prefers ${formatLabel(detail.crm.contact.preferred_channel)}` : 'Preferred channel not set'}</small></div>
            <div><span>Velakron owner</span><strong>{detail.crm?.contact ? OwnerName({ membership: detail.crm.contact.owner }) : 'Unassigned'}</strong><small>{detail.crm?.contact?.next_follow_up_at ? `Follow up ${formatShortDate(detail.crm.contact.next_follow_up_at)}` : 'No follow-up scheduled'}</small></div>
          </section>

          {!detail.crm?.contact && <section className='crmLeadConnectionNotice'>
            <Activity aria-hidden='true' />
            <div><strong>This older lead is not connected to its CRM contact yet</strong><p>You can still add a conversation note. Velakron will create or reconnect the matching company and contact, then keep every future interaction in one history.</p></div>
          </section>}

          {noteOpen && <form className='crmLeadNoteComposer' onSubmit={saveNote}>
            <header><div><p className='technicalLabel'>New relationship activity</p><h3>Add conversation note</h3><p>Record what was discussed and what should happen next.</p></div><button type='button' onClick={() => setNoteOpen(false)} disabled={noteSaving}>Cancel</button></header>
            <FieldGrid>
              <Field label='Conversation type'><select value={noteForm.type} onChange={event => setNoteForm(value => ({ ...value, type: event.target.value }))}><option value='phone_call'>Phone call</option><option value='meeting'>Meeting</option><option value='demo'>Demo</option><option value='note'>Internal note</option></select></Field>
              <Field label='Direction'><select value={noteForm.direction} onChange={event => setNoteForm(value => ({ ...value, direction: event.target.value }))}><option value='outbound'>Velakron contacted them</option><option value='inbound'>They contacted Velakron</option><option value='none'>Internal note</option></select></Field>
              <Field label='When it happened'><input required type='datetime-local' value={noteForm.occurred_at} onChange={event => setNoteForm(value => ({ ...value, occurred_at: event.target.value }))} /></Field>
              <Field label='Subject'><input required maxLength={500} value={noteForm.subject} onChange={event => setNoteForm(value => ({ ...value, subject: event.target.value }))} /></Field>
              <Field label='Conversation notes' wide><textarea required rows={5} maxLength={2000} value={noteForm.summary} onChange={event => setNoteForm(value => ({ ...value, summary: event.target.value }))} placeholder='What did you learn, what matters to the prospect, and what did you discuss?' /></Field>
              <Field label='Outcome' wide><textarea rows={3} maxLength={5000} value={noteForm.outcome} onChange={event => setNoteForm(value => ({ ...value, outcome: event.target.value }))} placeholder='Optional decision, reaction, or result' /></Field>
              <Field label='Next action'><input maxLength={500} value={noteForm.next_action} onChange={event => setNoteForm(value => ({ ...value, next_action: event.target.value }))} placeholder='Optional follow-up action' /></Field>
              <Field label='Follow-up date'><input type='datetime-local' value={noteForm.follow_up_at} onChange={event => setNoteForm(value => ({ ...value, follow_up_at: event.target.value }))} /></Field>
            </FieldGrid>
            <footer><Button variant='secondary' type='button' onClick={() => setNoteOpen(false)} disabled={noteSaving}>Cancel</Button><Button type='submit' disabled={noteSaving}>{noteSaving ? 'Saving…' : 'Save conversation'}</Button></footer>
          </form>}

          {detail.crm?.contact?.notes && <section className='crmLeadRelationshipNotes'><p className='technicalLabel'>Contact notes</p><p>{detail.crm.contact.notes}</p></section>}

          <section className='crmLeadHistory'>
            <header><div><p className='technicalLabel'>Complete contact history</p><h3>Communication & notes</h3></div><StatusBadge tone='info'>{detail.crm?.interactions?.length || 0} records</StatusBadge></header>
            {detail.crm?.interactions?.length
              ? <div className='crmTimeline crmTimeline--full'>{detail.crm.interactions.map(item => <article key={item.id || item._id}><span className='crmTimeline__dot'><Activity aria-hidden='true' /></span><div><header><span><StatusBadge tone={item.direction === 'inbound' ? 'success' : item.direction === 'outbound' ? 'info' : 'neutral'}>{formatLabel(item.type)}</StatusBadge><strong>{item.subject || 'Activity recorded'}</strong></span><time>{formatDateTime(item.occurred_at)}</time></header><p>{item.summary}</p>{item.outcome && <small><b>Outcome:</b> {item.outcome}</small>}{item.next_action && <small><b>Next:</b> {item.next_action}{item.follow_up_at ? ` · ${formatShortDate(item.follow_up_at)}` : ''}</small>}<small>Recorded by {authorName(item.created_by)}</small></div></article>)}</div>
              : <EmptyState compact title='No communication recorded yet' description='Add the first conversation note to begin this contact’s CRM history.' />}
          </section>

          {detail.crm && <section className='crmLeadRelated'>
            <article><Building2 aria-hidden='true' /><span><small>CRM organization</small><strong>{detail.crm.organization?.name || detail.lead.company_name}</strong><LinkWrap href={`/app/crm/organizations/${detail.crm.organization?.id}`}>Open organization</LinkWrap></span></article>
            <article><CalendarClock aria-hidden='true' /><span><small>Meetings</small><strong>{detail.crm.meetings?.length || 0} recorded</strong><span>{detail.crm.meetings?.[0] ? `Latest ${formatShortDate(detail.crm.meetings[0].starts_at)}` : 'No meetings yet'}</span></span></article>
            <article><Clock3 aria-hidden='true' /><span><small>Open tasks</small><strong>{detail.crm.tasks?.filter(item => !['completed', 'cancelled'].includes(item.status)).length || 0}</strong><span>{detail.crm.opportunity ? `${detail.crm.opportunity.name} · ${formatLabel(detail.crm.opportunity.stage)}` : 'No opportunity linked'}</span></span></article>
          </section>}
        </div>}
    </CrmModal>
    <ConfirmationDialog
      open={Boolean(deleteTarget)}
      title={`Delete ${deleteTarget?.full_name || 'this lead'}?`}
      description={`This permanently removes the captured lead for ${deleteTarget?.company_name || 'this company'} and immediately closes its temporary demo access. The converted CRM relationship history is retained. This cannot be undone.`}
      confirmLabel={deleting ? 'Deleting…' : 'Delete lead'}
      confirmDisabled={deleting}
      onClose={() => !deleting && setDeleteTarget(null)}
      onConfirm={confirmDelete}
      danger
    />
  </>
}

TradeShowLeads.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default TradeShowLeads
