import { ArrowLeft, CalendarPlus, ClipboardCheck, Link2, MailPlus, MessageSquarePlus, Pencil, Plus, RefreshCw, Trash2, UserPlus } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, DataTable, EmptyState, ErrorState, StatusBadge, Tabs } from '../../../../components/app'
import FormMessage from '../../../../components/auth/FormMessage'
import CrmModal from '../../../../components/app/crm/CrmModal'
import CrmFilesPanel from '../../../../components/app/crm/CrmFilesPanel'
import CrmPanelHeader from '../../../../components/app/crm/CrmPanelHeader'
import CrmShell from '../../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatDateTime, formatMoney, formatShortDate } from '../../../../components/app/crm/CrmFields'
import { Button } from '../../../../components/design-system'
import { WidePortalPageLayout } from '../../../../components/app/PortalPageLayout'
import Seo from '../../../../components/Seo'
import { apiCallBegan } from '../../../../store/api'
import { crmErrorMessage, crmRequest } from '../../../../store/crmApi'

const initialContact = { first_name: '', last_name: '', email: '', phone: '', job_title: '', department: '', role: 'user', owner: '', make_primary: false, notes: '' }
const initialNote = { subject: '', summary: '', outcome: '', next_action: '', follow_up_at: '' }
const initialOrganization = { name: '', status: 'prospect', industry: '', website: '', account_owner: '', lead_source: '', next_action: '', next_action_at: '', notes: '' }
const initialRelationship = { organization: '', status: 'potential', owner: '', next_action: '', next_follow_up_at: '', notes: '' }
const initialInvitation = { first_name: '', last_name: '', email: '', access: 'admin', message: '' }
const assessmentAnswerLabels = {
  supplier_count: 'Outside suppliers',
  status_method: 'Current status method',
  chasing_frequency: 'Status chasing',
  delay_awareness: 'Delay awareness',
  operational_impact: 'Primary impact',
  role: 'Role',
  company_size: 'Company size',
  buying_timeline: 'Buying timeline',
}

const OrganizationDetail = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, data: null, error: '' })
  const [tab, setTab] = useState('overview')
  const [owners, setOwners] = useState([])
  const [modal, setModal] = useState('')
  const [contactForm, setContactForm] = useState(initialContact)
  const [noteForm, setNoteForm] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [organizationForm, setOrganizationForm] = useState(initialOrganization)
  const [relationshipForm, setRelationshipForm] = useState(initialRelationship)
  const [relationshipCandidates, setRelationshipCandidates] = useState([])
  const [invitationForm, setInvitationForm] = useState(initialInvitation)

  const load = useCallback(async () => {
    if (!router.isReady || !router.query.id) return
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: `/organizations/${router.query.id}`, requestKey: `crm-organization-${router.query.id}` }))
    setState(result?.ok ? { loading: false, data: result.payload.data, error: '' } : { loading: false, data: null, error: crmErrorMessage(result) })
  }, [dispatch, router.isReady, router.query.id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    dispatch(crmRequest({ url: '/owners', requestKey: 'crm-detail-owners' })).then(result => result?.ok && setOwners(result.payload.data.owners || []))
  }, [dispatch])
  useEffect(() => {
    const organization = state.data?.organization
    if (!organization) return
    setOrganizationForm({ name: organization.name, status: organization.status, industry: organization.industry || '', website: organization.website || '', account_owner: organization.account_owner?.id || '', lead_source: organization.lead_source || '', next_action: organization.next_action?.summary || '', next_action_at: organization.next_action?.due_at ? new Date(new Date(organization.next_action.due_at).getTime() - new Date(organization.next_action.due_at).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '', notes: organization.notes || '' })
    dispatch(crmRequest({ url: '/organizations', params: { type: organization.type === 'oem' ? 'supplier' : 'oem', page_size: 100, sort: 'name' }, requestKey: `crm-relationship-candidates-${organization.type}` })).then(result => result?.ok && setRelationshipCandidates(result.payload.data.organizations || []))
  }, [dispatch, state.data?.organization])

  if (state.loading && !state.data) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (state.error || !state.data) return <ErrorState title='Organization could not be loaded' description={state.error || 'This organization is unavailable.'} onRetry={load} />
  const { organization, contacts = [], opportunities = [], onboardings = [], interactions = [], meetings = [], tasks = [], links = [], visibility_assessments: visibilityAssessments = [] } = state.data

  const addContact = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: '/contacts', method: 'post', requestKey: 'crm-contact-create',
      data: {
        organization: organization.id, first_name: contactForm.first_name, last_name: contactForm.last_name,
        email: contactForm.email, phone: contactForm.phone, job_title: contactForm.job_title,
        department: contactForm.department, contact_roles: [contactForm.role], owner: contactForm.owner || null,
        make_primary: contactForm.make_primary, notes: contactForm.notes,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The contact could not be added.') })
    setModal(''); setContactForm(initialContact); setFeedback({ type: 'success', message: 'Contact added.' }); load()
  }
  const addNote = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: '/interactions', method: 'post', requestKey: 'crm-interaction-create',
      data: {
        organization: organization.id, type: 'note', direction: 'none', subject: noteForm.subject,
        summary: noteForm.summary, outcome: noteForm.outcome, occurred_at: new Date().toISOString(),
        next_action: noteForm.next_action,
        follow_up_at: noteForm.follow_up_at ? new Date(noteForm.follow_up_at).toISOString() : null,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The note could not be recorded.') })
    setModal(''); setNoteForm(initialNote); setFeedback({ type: 'success', message: 'Activity recorded.' }); load()
  }
  const updateOrganization = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({ url: `/organizations/${organization.id}`, method: 'patch', requestKey: `crm-organization-update-${organization.id}`, data: { name: organizationForm.name, status: organizationForm.status, industry: organizationForm.industry, website: organizationForm.website, account_owner: organizationForm.account_owner || null, lead_source: organizationForm.lead_source, next_action: { summary: organizationForm.next_action, due_at: organizationForm.next_action_at ? new Date(organizationForm.next_action_at).toISOString() : null, assigned_to: organizationForm.account_owner || null, task: organization.next_action?.task?.id || organization.next_action?.task || null }, notes: organizationForm.notes, version: organization.version } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The organization could not be updated.') })
    setModal(''); setFeedback({ type: 'success', message: 'Organization updated.' }); load()
  }
  const connectOrganization = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const data = { oem_organization: organization.type === 'oem' ? organization.id : relationshipForm.organization, supplier_organization: organization.type === 'supplier' ? organization.id : relationshipForm.organization, status: relationshipForm.status, owner: relationshipForm.owner || null, next_action: relationshipForm.next_action, next_follow_up_at: relationshipForm.next_follow_up_at ? new Date(relationshipForm.next_follow_up_at).toISOString() : null, notes: relationshipForm.notes }
    const result = await dispatch(crmRequest({ url: '/links', method: 'post', data, requestKey: `crm-relationship-create-${organization.id}` }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The organization connection could not be created.') })
    setModal(''); setRelationshipForm(initialRelationship); setFeedback({ type: 'success', message: 'OEM and supplier records connected.' }); load()
  }
  const archiveOrganization = async () => {
    if (!window.confirm(`Archive ${organization.name}? Open opportunities and onboarding must be closed first. History will be retained.`)) return
    setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({ url: `/organizations/${organization.id}`, method: 'delete', data: { version: organization.version, reason: 'Archived by a founder from the CRM organization record.' }, requestKey: `crm-organization-archive-${organization.id}` }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The organization could not be archived.') })
    router.push('/app/crm/organizations')
  }
  const openInvitation = () => {
    setInvitationForm({
      ...initialInvitation,
      first_name: organization.primary_contact?.first_name || '',
      last_name: organization.primary_contact?.last_name || '',
      email: organization.primary_contact?.email || '',
    })
    setFeedback(null)
    setModal('invitation')
  }
  const sendInvitation = async event => {
    event.preventDefault()
    const platformId = organization.platform_organization?.id || organization.platform_organization?._id
    if (!platformId) return setFeedback({ type: 'error', message: 'Activate or link the platform account before sending an invitation.' })
    setSaving(true); setFeedback(null)
    const rolePrefix = organization.type === 'supplier' ? 'supplier' : 'oem'
    const result = await dispatch(apiCallBegan({
      url: `/organizations/${platformId}/invitations`, method: 'post', organizationScoped: true,
      requestKey: `founder-platform-invitation-${platformId}`,
      data: {
        first_name: invitationForm.first_name,
        last_name: invitationForm.last_name,
        email: invitationForm.email,
        role: `${rolePrefix}_${invitationForm.access}`,
        message: invitationForm.message,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The invitation could not be sent.') })
    setModal(''); setInvitationForm(initialInvitation)
    setFeedback({ type: 'success', message: `Invitation sent to ${result.payload.data.invitation.email}.` })
  }

  const contactColumns = [
    { key: 'name', label: 'Contact', render: item => <LinkWrap href={`/app/crm/contacts?contact=${item.id}`} className='tablePrimary'><strong>{item.full_name}</strong><span>{item.email || 'No email'}</span></LinkWrap> },
    { key: 'role', label: 'Role', render: item => item.contact_roles?.map(role => role.replaceAll('_', ' ')).join(', ') || 'Not set' },
    { key: 'title', label: 'Title', render: item => <div className='tablePrimary'><strong>{item.job_title || 'Not set'}</strong><span>{item.department}</span></div> },
    { key: 'owner', label: 'Owner', render: item => OwnerName({ membership: item.owner }) },
    { key: 'followup', label: 'Next follow-up', render: item => formatShortDate(item.next_follow_up_at) },
  ]

  return <>
    <Seo title={`${organization.name} · CRM`} description='Velakron CRM organization record.' path={`/app/crm/organizations/${organization.id}`} noIndex />
    <LinkWrap href='/app/crm/organizations' className='crmBackLink'><ArrowLeft aria-hidden='true' /> Organizations</LinkWrap>
    <AppPageHeader eyebrow={`${organization.type.toUpperCase()} · ${organization.status}`} title={organization.name} description={organization.industry || 'Industry not set'} actions={<><Button variant='secondary' onClick={load}><RefreshCw aria-hidden='true' /> Refresh</Button><Button variant='secondary' onClick={() => setModal('edit')}><Pencil aria-hidden='true' /> Edit</Button><Button variant='secondary' onClick={archiveOrganization} disabled={saving}><Trash2 aria-hidden='true' /> Archive</Button><Button variant='secondary' href={`/app/crm/inbox?compose=1&organization=${organization.id}`}><MailPlus aria-hidden='true' /> Email</Button><Button variant='secondary' href={`/app/crm/calendar?new=1&organization=${organization.id}`}><CalendarPlus aria-hidden='true' /> Meeting</Button><Button onClick={() => { setModal('note'); setFeedback(null) }}><MessageSquarePlus aria-hidden='true' /> Log activity</Button></>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <section className='crmRecordSummary appPanel'>
      <div><span>Status</span><StatusBadge tone={organization.status === 'active' ? 'success' : organization.status === 'onboarding' ? 'info' : 'neutral'}>{organization.status}</StatusBadge></div>
      <div><span>Primary contact</span><strong>{organization.primary_contact ? `${organization.primary_contact.first_name} ${organization.primary_contact.last_name}` : 'Not set'}</strong><small>{organization.primary_contact?.email}</small></div>
      <div><span>Velakron owner</span><strong>{OwnerName({ membership: organization.account_owner })}</strong></div>
      <div><span>Last interaction</span><strong>{formatShortDate(organization.last_interaction_at)}</strong></div>
      <div className='crmRecordSummary__next'><span>Next action</span><strong>{organization.next_action?.summary || 'No next action set'}</strong><small>{formatShortDate(organization.next_action?.due_at)} · {OwnerName({ membership: organization.next_action?.assigned_to })}</small></div>
    </section>
    <div className='crmRecordTabs'><Tabs items={[
      { key: 'overview', label: 'Overview' }, { key: 'contacts', label: 'Contacts', count: contacts.length },
      { key: 'pipeline', label: 'Opportunities', count: opportunities.length }, { key: 'onboarding', label: 'Onboarding', count: onboardings.length },
      { key: 'activity', label: 'Activity', count: interactions.length }, { key: 'tasks', label: 'Tasks', count: tasks.length },
      { key: 'files', label: 'Files' },
      { key: 'assessments', label: 'Assessments', count: visibilityAssessments.length },
      { key: 'relationships', label: 'OEM ↔ Supplier', count: links.length },
    ]} activeKey={tab} onChange={setTab} /></div>

    {tab === 'overview' && <div className='crmTwoColumn'>
      <section className='appPanel'><CrmPanelHeader eyebrow='Organization' title='Who they are' actions={organization.platform_organization && <Button variant='secondary' onClick={openInvitation}><UserPlus aria-hidden='true' /> Invite user</Button>} /><dl className='appDetailList'>
        <div><dt>Type</dt><dd>{organization.type.toUpperCase()}</dd></div><div><dt>Industry</dt><dd>{organization.industry || 'Not set'}</dd></div>
        <div><dt>Website</dt><dd>{organization.website ? <a href={organization.website} target='_blank' rel='noreferrer'>{organization.website}</a> : 'Not set'}</dd></div>
        <div><dt>Lead source</dt><dd>{organization.lead_source || 'Not set'}</dd></div><div><dt>Platform account</dt><dd>{organization.platform_organization?.name || 'Not activated'}</dd>{!organization.platform_organization && <small>Link the platform account before inviting users.</small>}</div>
      </dl></section>
      <section className='appPanel'><CrmPanelHeader eyebrow='Current work' title='Commercial position' /><dl className='appDetailList'>
        <div><dt>Open opportunities</dt><dd>{opportunities.filter(item => !['won', 'lost'].includes(item.stage)).length}</dd></div>
        <div><dt>First-year value</dt><dd>{formatMoney(opportunities.filter(item => !['won', 'lost'].includes(item.stage)).reduce((sum, item) => sum + item.estimated_first_year_value, 0))}</dd></div>
        <div><dt>Onboarding</dt><dd>{onboardings[0] ? `${onboardings[0].percent_complete}% · ${onboardings[0].stage.replaceAll('_', ' ')}` : 'Not started'}</dd></div>
        <div><dt>Open CRM tasks</dt><dd>{tasks.filter(item => !['completed', 'cancelled'].includes(item.status)).length}</dd></div>
      </dl></section>
      <section className='appPanel crmSpanTwo'><CrmPanelHeader eyebrow='Notes' title='Relationship context' /><p className='crmLongText'>{organization.notes || 'No organization notes have been added.'}</p></section>
    </div>}
    {tab === 'contacts' && <section className='appPanel appPanel--table'><div className='crmTableHeader'><div><h2>People we know</h2><p>Decision makers, champions, users, procurement, engineering, and quality contacts.</p></div><Button onClick={() => { setModal('contact'); setFeedback(null) }}><UserPlus aria-hidden='true' /> Add contact</Button></div><DataTable columns={contactColumns} rows={contacts} caption='Organization contacts' emptyTitle='No contacts yet' emptyDescription='Add the first person we know at this organization.' /></section>}
    {tab === 'pipeline' && <section className='appPanel'><CrmPanelHeader title='Sales opportunities' actions={organization.type === 'oem' && <Button href={`/app/crm/opportunities?new=1&organization=${organization.id}`}><Plus aria-hidden='true' /> New opportunity</Button>} />{organization.type !== 'oem' ? <EmptyState compact title='Supplier pipelines use onboarding' description='Sales opportunities are limited to OEMs in the first release.' /> : opportunities.length ? <div className='crmCardGrid'>{opportunities.map(item => <article className='crmRecordCard' key={item.id}><header><span className={`crmPriority crmPriority--${item.priority_score}`}>{item.priority_score}</span><StatusBadge tone={item.stage === 'won' ? 'success' : item.stage === 'lost' ? 'danger' : 'info'}>{item.stage.replaceAll('_', ' ')}</StatusBadge></header><h3>{item.name}</h3><strong>{formatMoney(item.estimated_first_year_value)}</strong><p>{item.next_action || 'No next action set'}</p><small>{formatShortDate(item.next_action_at)}</small></article>)}</div> : <EmptyState compact title='No opportunities yet' description='Create an OEM opportunity when a potential commercial engagement emerges.' />}</section>}
    {tab === 'onboarding' && <section className='appPanel'><CrmPanelHeader title='Onboarding' actions={!onboardings.length && <Button href={`/app/crm/onboarding?new=1&organization=${organization.id}`}><Plus aria-hidden='true' /> Start onboarding</Button>} />{onboardings.length ? onboardings.map(item => <article className='crmOnboardingSummary' key={item.id}><div><strong>{item.stage.replaceAll('_', ' ')}</strong><span>{item.type.toUpperCase()} onboarding</span></div><div className='crmProgress'><span style={{ width: `${item.percent_complete}%` }} /></div><b>{item.percent_complete}%</b><p>{item.next_action || 'No next action set'}</p>{item.blocker && <StatusBadge tone='danger'>Blocked: {item.blocker_detail}</StatusBadge>}</article>) : <EmptyState compact title='Onboarding not started' description='Use the generic first-release checklist and adjust it as the process becomes clearer.' />}</section>}
    {tab === 'activity' && <section className='appPanel'><CrmPanelHeader title='Full relationship history' actions={<Button onClick={() => setModal('note')}><Plus aria-hidden='true' /> Log activity</Button>} />{interactions.length ? <div className='crmTimeline'>{interactions.map(item => <article key={item.id || item._id}><span className='crmTimeline__dot' /><div><header><strong>{item.subject || item.type.replaceAll('_', ' ')}</strong><time>{formatDateTime(item.occurred_at)}</time></header><p>{item.summary}</p>{item.outcome && <small>Outcome: {item.outcome}</small>}</div></article>)}</div> : <EmptyState compact title='No history yet' description='Calls, meetings, emails, notes, tasks, and status changes will appear here.' />}</section>}
    {tab === 'tasks' && <section className='appPanel'><CrmPanelHeader title='Founder follow-up tasks' actions={<Button href={`/app/tasks?crm_organization=${organization.id}`}><Plus aria-hidden='true' /> Open task workspace</Button>} />{tasks.length ? <div className='crmStackList'>{tasks.map(item => <LinkWrap className='crmStackRow' href={`/app/tasks?task=${item.id || item._id}`} key={item.id || item._id}><span className={`crmTaskDot crmTaskDot--${item.importance}`} /><span className='crmStackRow__main'><strong>{item.title}</strong><small>{formatShortDate(item.due_at)}</small></span><StatusBadge>{item.status.replaceAll('_', ' ')}</StatusBadge></LinkWrap>)}</div> : <EmptyState compact title='No CRM tasks' description='Create a linked founder task from the task workspace.' />}</section>}
    {tab === 'files' && <section className='appPanel'><CrmPanelHeader title='Private organization files' detail='Pictures, proposals, notes, and supporting documents visible only to founders.' /><CrmFilesPanel subject='organizations' subjectId={organization.id} /></section>}
    {tab === 'assessments' && <section className='appPanel'><CrmPanelHeader eyebrow='Website qualification' title='Production Visibility Assessments' detail='Customer-facing visibility scores, internal qualification, every answer, and demo status in one place.' />{visibilityAssessments.length ? <div className='crmAssessmentRecords'>{visibilityAssessments.map(assessment => <article key={assessment.id}>
      <header><span><ClipboardCheck /><strong>{formatShortDate(assessment.captured_at)}</strong></span><StatusBadge tone={assessment.scores.lead_classification === 'high_priority' ? 'warning' : assessment.scores.lead_classification === 'qualified' ? 'info' : 'neutral'}>{assessment.scores.lead_classification.replaceAll('_', ' ')}</StatusBadge></header>
      <div className='crmAssessmentRecordScores'><div><strong>{assessment.scores.production_visibility}</strong><span>Production visibility</span></div><div><strong>{assessment.scores.lead}</strong><span>Internal lead score</span></div><div><strong>{assessment.booking.status.replaceAll('_', ' ')}</strong><span>{assessment.booking.starts_at ? formatDateTime(assessment.booking.starts_at) : 'Demo status'}</span></div></div>
      <dl>{Object.entries(assessmentAnswerLabels).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{assessment.answers[key]}</dd></div>)}</dl>
    </article>)}</div> : <EmptyState compact title='No visibility assessment' description='Completed website assessments will appear here automatically.' />}</section>}
    {tab === 'relationships' && <section className='appPanel'><CrmPanelHeader title='OEM ↔ Supplier connections' actions={<Button onClick={() => setModal('relationship')}><Link2 aria-hidden='true' /> Connect organization</Button>} />{links.length ? <div className='crmStackList'>{links.map(item => <article className='crmStackRow' key={item.id || item._id}><span className='crmStackRow__main'><strong>{item.oem_organization?.name} ↔ {item.supplier_organization?.name}</strong><small>{item.next_action || 'No next action'}</small></span><StatusBadge tone={item.status === 'active' ? 'success' : 'neutral'}>{item.status}</StatusBadge></article>)}</div> : <EmptyState compact title='No connected organizations' description='Connect this record to an OEM or supplier relationship.' />}</section>}

    <CrmModal open={modal === 'contact'} title='Add a contact' description={`Add someone at ${organization.name}.`} onClose={() => !saving && setModal('')} actions={<><Button variant='secondary' onClick={() => setModal('')}>Cancel</Button><Button type='submit' form='crm-contact-form' disabled={saving}>{saving ? 'Saving…' : 'Add contact'}</Button></>}><form id='crm-contact-form' onSubmit={addContact}><FieldGrid>
      <Field label='First name'><input required value={contactForm.first_name} onChange={event => setContactForm(value => ({ ...value, first_name: event.target.value }))} /></Field><Field label='Last name'><input required value={contactForm.last_name} onChange={event => setContactForm(value => ({ ...value, last_name: event.target.value }))} /></Field>
      <Field label='Email'><input type='email' value={contactForm.email} onChange={event => setContactForm(value => ({ ...value, email: event.target.value }))} /></Field><Field label='Phone'><input value={contactForm.phone} onChange={event => setContactForm(value => ({ ...value, phone: event.target.value }))} /></Field>
      <Field label='Job title'><input value={contactForm.job_title} onChange={event => setContactForm(value => ({ ...value, job_title: event.target.value }))} /></Field><Field label='Department'><input value={contactForm.department} onChange={event => setContactForm(value => ({ ...value, department: event.target.value }))} /></Field>
      <Field label='Contact role'><select value={contactForm.role} onChange={event => setContactForm(value => ({ ...value, role: event.target.value }))}>{['decision_maker','champion','user','procurement','engineering','quality','executive','finance','legal','other'].map(role => <option key={role} value={role}>{role.replaceAll('_', ' ')}</option>)}</select></Field>
      <Field label='Velakron owner'><select value={contactForm.owner} onChange={event => setContactForm(value => ({ ...value, owner: event.target.value }))}><option value=''>Unassigned</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field>
      <Field label='Primary contact'><span className='crmCheckbox'><input type='checkbox' checked={contactForm.make_primary} onChange={event => setContactForm(value => ({ ...value, make_primary: event.target.checked }))} /> Make this the primary organization contact</span></Field>
      <Field label='Notes' wide><textarea rows={4} value={contactForm.notes} onChange={event => setContactForm(value => ({ ...value, notes: event.target.value }))} /></Field>
    </FieldGrid></form></CrmModal>
    <CrmModal open={modal === 'note'} title='Log relationship activity' description='Add a note and optionally set the organization’s next action.' onClose={() => !saving && setModal('')} actions={<><Button variant='secondary' onClick={() => setModal('')}>Cancel</Button><Button type='submit' form='crm-note-form' disabled={saving}>{saving ? 'Saving…' : 'Record activity'}</Button></>}><form id='crm-note-form' onSubmit={addNote}><FieldGrid>
      <Field label='Subject' wide><input required maxLength={500} value={noteForm.subject} onChange={event => setNoteForm(value => ({ ...value, subject: event.target.value }))} /></Field>
      <Field label='Summary' wide><textarea required rows={4} maxLength={2000} value={noteForm.summary} onChange={event => setNoteForm(value => ({ ...value, summary: event.target.value }))} /></Field>
      <Field label='Outcome' wide><textarea rows={3} maxLength={5000} value={noteForm.outcome} onChange={event => setNoteForm(value => ({ ...value, outcome: event.target.value }))} /></Field>
      <Field label='Next action'><input maxLength={500} value={noteForm.next_action} onChange={event => setNoteForm(value => ({ ...value, next_action: event.target.value }))} /></Field><Field label='Follow-up date'><input type='datetime-local' value={noteForm.follow_up_at} onChange={event => setNoteForm(value => ({ ...value, follow_up_at: event.target.value }))} /></Field>
    </FieldGrid></form></CrmModal>
    <CrmModal open={modal === 'invitation'} title={`Invite someone to ${organization.name}`} description='The recipient will receive a secure link to create or connect their Velakron account.' onClose={() => !saving && setModal('')} actions={<><Button variant='secondary' onClick={() => setModal('')}>Cancel</Button><Button type='submit' form='crm-invitation-form' disabled={saving}>{saving ? 'Sending…' : 'Send invitation'}</Button></>}><form id='crm-invitation-form' onSubmit={sendInvitation}><FieldGrid>
      <Field label='First name'><input maxLength={80} value={invitationForm.first_name} onChange={event => setInvitationForm(value => ({ ...value, first_name: event.target.value }))} /></Field><Field label='Last name'><input maxLength={80} value={invitationForm.last_name} onChange={event => setInvitationForm(value => ({ ...value, last_name: event.target.value }))} /></Field>
      <Field label='Business email' wide><input type='email' required maxLength={320} value={invitationForm.email} onChange={event => setInvitationForm(value => ({ ...value, email: event.target.value }))} /></Field>
      <Field label='Access level' wide><select value={invitationForm.access} onChange={event => setInvitationForm(value => ({ ...value, access: event.target.value }))}><option value='admin'>Administrator</option><option value='user'>Member</option></select></Field>
      <Field label='Optional message' wide><textarea rows={4} maxLength={1000} value={invitationForm.message} onChange={event => setInvitationForm(value => ({ ...value, message: event.target.value }))} /></Field>
    </FieldGrid></form></CrmModal>
    <CrmModal open={modal === 'edit'} title='Edit organization' description='Update the internal CRM record. This does not change a linked platform tenant.' onClose={() => !saving && setModal('')} wide actions={<><Button variant='secondary' onClick={() => setModal('')}>Cancel</Button><Button type='submit' form='crm-organization-edit' disabled={saving}>Save changes</Button></>}><form id='crm-organization-edit' onSubmit={updateOrganization}><FieldGrid><Field label='Company name'><input required value={organizationForm.name} onChange={event => setOrganizationForm(value => ({ ...value, name: event.target.value }))} /></Field><Field label='Status'><select value={organizationForm.status} onChange={event => setOrganizationForm(value => ({ ...value, status: event.target.value }))}>{['prospect','onboarding','active','inactive'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field><Field label='Industry'><input value={organizationForm.industry} onChange={event => setOrganizationForm(value => ({ ...value, industry: event.target.value }))} /></Field><Field label='Website'><input type='url' value={organizationForm.website} onChange={event => setOrganizationForm(value => ({ ...value, website: event.target.value }))} /></Field><Field label='Velakron owner'><select value={organizationForm.account_owner} onChange={event => setOrganizationForm(value => ({ ...value, account_owner: event.target.value }))}><option value=''>Unassigned</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field><Field label='Lead source'><input value={organizationForm.lead_source} onChange={event => setOrganizationForm(value => ({ ...value, lead_source: event.target.value }))} /></Field><Field label='Next action'><input value={organizationForm.next_action} onChange={event => setOrganizationForm(value => ({ ...value, next_action: event.target.value }))} /></Field><Field label='Follow-up date'><input type='datetime-local' value={organizationForm.next_action_at} onChange={event => setOrganizationForm(value => ({ ...value, next_action_at: event.target.value }))} /></Field><Field label='Notes' wide><textarea rows={6} value={organizationForm.notes} onChange={event => setOrganizationForm(value => ({ ...value, notes: event.target.value }))} /></Field></FieldGrid></form></CrmModal>
    <CrmModal open={modal === 'relationship'} title={`Connect ${organization.name}`} description={`Choose a ${organization.type === 'oem' ? 'supplier' : 'OEM'} CRM record.`} onClose={() => !saving && setModal('')} actions={<><Button variant='secondary' onClick={() => setModal('')}>Cancel</Button><Button type='submit' form='crm-relationship-form' disabled={saving}>Create connection</Button></>}><form id='crm-relationship-form' onSubmit={connectOrganization}><FieldGrid><Field label={organization.type === 'oem' ? 'Supplier' : 'OEM'} wide><select required value={relationshipForm.organization} onChange={event => setRelationshipForm(value => ({ ...value, organization: event.target.value }))}><option value=''>Choose organization</option>{relationshipCandidates.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label='Status'><select value={relationshipForm.status} onChange={event => setRelationshipForm(value => ({ ...value, status: event.target.value }))}>{['potential','introduced','onboarding','active'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field><Field label='Owner'><select value={relationshipForm.owner} onChange={event => setRelationshipForm(value => ({ ...value, owner: event.target.value }))}><option value=''>Unassigned</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field><Field label='Next action'><input value={relationshipForm.next_action} onChange={event => setRelationshipForm(value => ({ ...value, next_action: event.target.value }))} /></Field><Field label='Follow-up date'><input type='datetime-local' value={relationshipForm.next_follow_up_at} onChange={event => setRelationshipForm(value => ({ ...value, next_follow_up_at: event.target.value }))} /></Field><Field label='Notes' wide><textarea rows={4} value={relationshipForm.notes} onChange={event => setRelationshipForm(value => ({ ...value, notes: event.target.value }))} /></Field></FieldGrid></form></CrmModal>
  </>
}

OrganizationDetail.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default OrganizationDetail
