import { AlertTriangle, CalendarDays, CheckCircle2, Database, KeyRound, Mail, Pencil, Play, Plus, RefreshCw, Settings2, Unplug } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import { AppPageHeader, AppSkeleton, EmptyState, ErrorState, StatusBadge, Tabs } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmImportPanel from '../../../components/app/crm/CrmImportPanel'
import CrmPanelHeader from '../../../components/app/crm/CrmPanelHeader'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, formatDateTime } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const initialTemplate = { name: '', category: 'follow_up', subject: '', text_body: '' }
const initialAutomation = {
  name: '', description: '', trigger: 'follow_up_due', mode: 'draft_only', action_type: 'reminder',
  template: '', provider_connection: '', owner_id: '', task_importance: 'medium',
  stale_days: 14, minimum_priority: 0, organization_type: '', organization_status: '', onboarding_type: '',
  offset_minutes: 0, timezone: 'America/New_York', allowed_weekdays: [1, 2, 3, 4, 5],
  send_window_start: '08:00', send_window_end: '18:00',
  max_per_day: 25, minimum_gap_hours: 72, stop_on_reply: true, stop_when_completed: true, skip_do_not_contact: true,
}
const automationFormFromRule = rule => ({
  ...initialAutomation,
  name: rule.name || '', description: rule.description || '', trigger: rule.trigger,
  mode: rule.mode, action_type: rule.action?.type || 'reminder',
  template: rule.action?.template?.id || rule.action?.template?._id || rule.action?.template || '',
  provider_connection: rule.action?.provider_connection?.id || rule.action?.provider_connection?._id || rule.action?.provider_connection || '',
  owner_id: rule.action?.owner?.id || rule.action?.owner?._id || rule.action?.owner || '',
  task_importance: rule.action?.task_importance || 'medium',
  stale_days: rule.conditions?.stale_days || 14,
  minimum_priority: rule.conditions?.minimum_priority || 0,
  organization_type: rule.conditions?.organization_types?.[0] || '',
  organization_status: rule.conditions?.organization_statuses?.[0] || '',
  onboarding_type: rule.conditions?.onboarding_types?.[0] || '',
  offset_minutes: rule.timing?.offset_minutes || 0,
  timezone: rule.timing?.timezone || 'America/New_York',
  allowed_weekdays: rule.timing?.allowed_weekdays || [],
  send_window_start: rule.timing?.send_window_start || '08:00',
  send_window_end: rule.timing?.send_window_end || '18:00',
  max_per_day: rule.guardrails?.max_per_day || 25,
  minimum_gap_hours: rule.guardrails?.minimum_gap_hours || 72,
  stop_on_reply: rule.guardrails?.stop_on_reply !== false,
  stop_when_completed: rule.guardrails?.stop_when_completed !== false,
  skip_do_not_contact: rule.guardrails?.skip_do_not_contact !== false,
})

const CrmSettings = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [tab, setTab] = useState('connections')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [connections, setConnections] = useState([])
  const [connectionMeta, setConnectionMeta] = useState({})
  const [templates, setTemplates] = useState([])
  const [automations, setAutomations] = useState([])
  const [automationMeta, setAutomationMeta] = useState({})
  const [owners, setOwners] = useState([])
  const [duplicates, setDuplicates] = useState(null)
  const [archives, setArchives] = useState({ organizations: [], contacts: [] })
  const [retention, setRetention] = useState(null)
  const [templateOpen, setTemplateOpen] = useState(false)
  const [automationOpen, setAutomationOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState(null)
  const [templateForm, setTemplateForm] = useState(initialTemplate)
  const [automationForm, setAutomationForm] = useState(initialAutomation)
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const loadSequence = useRef(0)

  const load = useCallback(async () => {
    const sequence = ++loadSequence.current
    setLoading(true); setError('')
    const [connectionResult, templateResult, automationResult, duplicateResult, archiveResult, retentionResult, ownerResult] = await Promise.all([
      dispatch(crmRequest({ url: '/google/connections', requestKey: 'crm-settings-connections' })),
      dispatch(crmRequest({ url: '/email-templates', requestKey: 'crm-settings-templates' })),
      dispatch(crmRequest({ url: '/automations', requestKey: 'crm-settings-automations' })),
      dispatch(crmRequest({ url: '/duplicates', requestKey: 'crm-settings-duplicates' })),
      dispatch(crmRequest({ url: '/archives', requestKey: 'crm-settings-archives' })),
      dispatch(crmRequest({ url: '/retention/preview', requestKey: 'crm-settings-retention' })),
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-settings-owners' })),
    ])
    if (sequence !== loadSequence.current) return
    setLoading(false)
    if (!connectionResult?.ok) return setError(crmErrorMessage(connectionResult))
    setConnections(connectionResult.payload.data.connections || []); setConnectionMeta(connectionResult.payload.data)
    if (templateResult?.ok) setTemplates(templateResult.payload.data.templates || [])
    if (automationResult?.ok) { setAutomations(automationResult.payload.data.rules || []); setAutomationMeta(automationResult.payload.data) }
    if (duplicateResult?.ok) setDuplicates(duplicateResult.payload.data)
    if (archiveResult?.ok) setArchives(archiveResult.payload.data)
    if (retentionResult?.ok) setRetention(retentionResult.payload.data)
    if (ownerResult?.ok) setOwners(ownerResult.payload.data.owners || [])
  }, [dispatch])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.section === 'data') setTab('data')
    if (router.query.google === 'connected') setFeedback({ type: 'success', message: 'Google account connected. Gmail and Calendar permissions are ready.' })
    if (router.query.google === 'error') setFeedback({ type: 'error', message: `Google could not be connected (${router.query.code || 'unknown error'}). Try again and approve all requested permissions.` })
  }, [router.isReady, router.query.code, router.query.google, router.query.section])
  const connect = async scope => {
    setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({ url: '/google/connect', method: 'post', data: { connection_scope: scope, return_to: '/app/crm/settings' }, requestKey: `crm-google-connect-${scope}` }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Google authorization could not begin.') })
    window.location.assign(result.payload.data.authorization_url)
  }
  const refresh = async connection => {
    setSaving(true)
    const result = await dispatch(crmRequest({ url: `/google/connections/${connection.id}/refresh`, method: 'post', data: {}, requestKey: `crm-google-refresh-${connection.id}` }))
    setSaving(false)
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'Reconnect this Google account.') })
    else { setFeedback({ type: 'success', message: `${connection.account_email} refreshed.` }); load() }
  }
  const disconnect = async connection => {
    if (!window.confirm(`Disconnect ${connection.account_email} from the CRM? Scheduled messages that use it will stop.`)) return
    const result = await dispatch(crmRequest({ url: `/google/connections/${connection.id}`, method: 'delete', data: {}, requestKey: `crm-google-disconnect-${connection.id}` }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result) })
    else { setFeedback({ type: 'success', message: `${connection.account_email} disconnected.` }); load() }
  }
  const createTemplate = async event => {
    event.preventDefault(); setSaving(true)
    const result = await dispatch(crmRequest({ url: '/email-templates', method: 'post', data: templateForm, requestKey: 'crm-template-create' }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Template could not be created.') })
    setTemplateOpen(false); setTemplateForm(initialTemplate); setFeedback({ type: 'success', message: 'Email template created.' }); load()
  }
  const openNewAutomation = () => {
    setEditingAutomation(null)
    setAutomationForm(initialAutomation)
    setAutomationOpen(true)
  }
  const openAutomation = rule => {
    setEditingAutomation(rule)
    setAutomationForm(automationFormFromRule(rule))
    setAutomationOpen(true)
  }
  const closeAutomation = () => {
    if (saving) return
    setAutomationOpen(false)
    setEditingAutomation(null)
    setAutomationForm(initialAutomation)
  }
  const saveAutomation = async event => {
    event.preventDefault(); setSaving(true)
    const data = {
      name: automationForm.name, description: automationForm.description, trigger: automationForm.trigger,
      mode: automationForm.mode,
      ...(!editingAutomation ? { enabled: false } : { version: editingAutomation.version }),
      conditions: {
        stale_days: Number(automationForm.stale_days),
        minimum_priority: Number(automationForm.minimum_priority) || 0,
        organization_types: automationForm.organization_type ? [automationForm.organization_type] : [],
        organization_statuses: automationForm.organization_status ? [automationForm.organization_status] : [],
        onboarding_types: automationForm.onboarding_type ? [automationForm.onboarding_type] : [],
        owner_ids: automationForm.owner_id ? [automationForm.owner_id] : [],
      },
      timing: {
        offset_minutes: Number(automationForm.offset_minutes) || 0,
        timezone: automationForm.timezone,
        allowed_weekdays: automationForm.allowed_weekdays,
        send_window_start: automationForm.send_window_start,
        send_window_end: automationForm.send_window_end,
      },
      action: {
        type: automationForm.action_type,
        template: automationForm.template || undefined,
        provider_connection: automationForm.provider_connection || undefined,
        owner: automationForm.owner_id || undefined,
        task_importance: automationForm.task_importance,
      },
      guardrails: {
        max_per_day: Number(automationForm.max_per_day),
        minimum_gap_hours: Number(automationForm.minimum_gap_hours),
        stop_on_reply: automationForm.stop_on_reply,
        stop_when_completed: automationForm.stop_when_completed,
        skip_do_not_contact: automationForm.skip_do_not_contact,
      },
    }
    const result = await dispatch(crmRequest({
      url: editingAutomation ? `/automations/${editingAutomation.id}` : '/automations',
      method: editingAutomation ? 'patch' : 'post',
      requestKey: editingAutomation ? `crm-automation-edit-${editingAutomation.id}` : 'crm-automation-create',
      data,
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Automation could not be saved.') })
    const edited = Boolean(editingAutomation)
    closeAutomation()
    setFeedback({ type: 'success', message: edited ? 'Automation settings updated.' : 'Automation created disabled. Preview and explicitly enable it when ready.' })
    load()
  }
  const toggleAutomation = async rule => {
    const result = await dispatch(crmRequest({ url: `/automations/${rule.id}`, method: 'patch', requestKey: `crm-automation-toggle-${rule.id}`, data: { enabled: !rule.enabled, version: rule.version } }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result) })
    else { setFeedback({ type: 'success', message: `${rule.name} ${rule.enabled ? 'disabled' : 'enabled'}.` }); load() }
  }
  const preview = async rule => {
    const result = await dispatch(crmRequest({ url: `/automations/${rule.id}/preview`, method: 'post', data: {}, requestKey: `crm-automation-preview-${rule.id}` }))
    const previewResult = result?.payload?.data?.preview
    setFeedback(result?.ok ? {
      type: previewResult.outside_allowed_schedule ? 'warning' : 'success',
      message: previewResult.outside_allowed_schedule
        ? 'This rule is outside its allowed days or sending window. No records were changed.'
        : `Preview: ${previewResult.matched} records currently match. No records were changed.`,
    } : { type: 'error', message: crmErrorMessage(result) })
  }
  const mergeDuplicate = async (group, entity) => {
    const [survivorId, duplicateId] = group.ids || []
    if (!survivorId || !duplicateId) return
    const names = (group.names || []).slice(0, 2).join(' and ')
    if (!window.confirm(`Merge ${names || 'these records'}? The first record will remain and the second will be archived. Relationship history will be preserved.`)) return
    setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: `/merge/${entity}`, method: 'post', requestKey: `crm-merge-${entity}-${duplicateId}`,
      data: { survivor_id: survivorId, duplicate_id: duplicateId, reason: 'Founder confirmed duplicate from CRM data-quality review' },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The duplicate records could not be merged.') })
    setFeedback({ type: 'success', message: 'Duplicate merged. Related history now points to the surviving record.' })
    load()
  }
  const restore = async (record, entity) => {
    if (!window.confirm(`Restore ${record.name || `${record.first_name} ${record.last_name}`} to the active CRM?`)) return
    setSaving(true)
    const result = await dispatch(crmRequest({ url: `/${entity}/${record.id}/restore`, method: 'post', data: { reason: 'Restored by a founder from CRM administration.' }, requestKey: `crm-restore-${entity}-${record.id}` }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The archived record could not be restored.') })
    setFeedback({ type: 'success', message: 'Archived CRM record restored.' }); load()
  }
  const toggleWeekday = day => setAutomationForm(value => ({
    ...value,
    allowed_weekdays: value.allowed_weekdays.includes(day)
      ? value.allowed_weekdays.filter(item => item !== day)
      : [...value.allowed_weekdays, day].sort(),
  }))

  if (loading && !connections.length) return <section className='appPanel'><AppSkeleton lines={12} /></section>
  if (error) return <ErrorState title='CRM settings could not be loaded' description={error} onRetry={load} />
  const duplicateCount = ['organization_names', 'organization_domains', 'contact_emails'].reduce((sum, key) => sum + (duplicates?.[key]?.length || 0), 0)
  return <>
    <Seo title='CRM settings' description='Velakron CRM connections, automations, templates, and data tools.' path='/app/crm/settings' noIndex />
    <AppPageHeader eyebrow='Founder controls' title='CRM settings' description='Google connections, shared mailbox and calendar, founder-controlled automation, email templates, and data administration.' />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <div className='crmRecordTabs'><Tabs items={[{ key: 'connections', label: 'Google connections' }, { key: 'templates', label: 'Email templates', count: templates.length }, { key: 'automations', label: 'Automations', count: automations.length }, { key: 'data', label: 'Data tools', count: duplicateCount }]} activeKey={tab} onChange={setTab} /></div>
    {tab === 'connections' && <div className='crmSettingsGrid'>
      <section className='appPanel'><CrmPanelHeader eyebrow='Your account' title='Founder Gmail & Calendar' detail='Email is sent from your own Gmail account. Your calendar is available for individual meeting invitations.' actions={<Button onClick={() => connect('individual')} disabled={saving}><KeyRound aria-hidden='true' /> Connect or update</Button>} />
        {connections.filter(item => item.connection_scope === 'individual' && item.manageable_by_current_founder).length ? <div className='crmConnectionList'>{connections.filter(item => item.connection_scope === 'individual' && item.manageable_by_current_founder).map(connection => <article key={connection.id}><span className={`crmConnectionIcon${connection.warning || connection.refresh_recommended ? ' is-warning' : ''}`}>{connection.warning || connection.refresh_recommended ? <AlertTriangle aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}</span><div><strong>{connection.account_email}</strong><span>{connection.capabilities.gmail_send ? 'Gmail send' : 'No Gmail send'} · {connection.capabilities.calendar_events ? 'Calendar' : 'No Calendar'}</span><small>{connection.warning ? 'Reconnect required' : connection.refresh_recommended ? 'Access token expired; refresh it now' : `Verified ${formatDateTime(connection.last_verified_at)}`}</small></div><Button variant='secondary' onClick={() => refresh(connection)}><RefreshCw aria-hidden='true' /> Refresh</Button><button type='button' onClick={() => disconnect(connection)} aria-label={`Disconnect ${connection.account_email}`}><Unplug aria-hidden='true' /></button></article>)}</div> : <EmptyState compact title='Founder Google account not connected' description='Connect your Velakron Gmail account to send CRM email and use your calendar.' />}
      </section>
      <section className='appPanel'><CrmPanelHeader eyebrow='Company shared connection' title={connectionMeta.shared_mailbox || 'app@velakron.com'} detail='Used for inbound mail matching and the shared CRM calendar. This should be a dedicated Workspace mailbox before Gmail read access is granted.' actions={<Button onClick={() => connect('shared')} disabled={saving}><Mail aria-hidden='true' /> Connect shared account</Button>} />
        {connections.filter(item => item.connection_scope === 'shared').length ? <div className='crmConnectionList'>{connections.filter(item => item.connection_scope === 'shared').map(connection => <article key={connection.id}><span className={`crmConnectionIcon${connection.warning ? ' is-warning' : ''}`}>{connection.warning ? <AlertTriangle aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}</span><div><strong>{connection.account_email}</strong><span>{connection.capabilities.gmail_read ? 'Gmail read' : 'No Gmail read'} · {connection.capabilities.calendar_events ? 'Shared calendar' : 'No calendar'}</span><small>{connection.warning ? 'Reconnect required' : 'Shared connection ready'}</small></div><Button variant='secondary' onClick={() => refresh(connection)}><RefreshCw aria-hidden='true' /> Refresh</Button><button type='button' onClick={() => disconnect(connection)}><Unplug aria-hidden='true' /></button></article>)}</div> : <EmptyState compact title='Shared account not connected' description='Connect app@velakron.com only after it exists as a dedicated Workspace mailbox.' />}
      </section>
      <section className='appPanel crmSpanTwo'><div className='crmRetentionNote'><Database aria-hidden='true' /><div><strong>Recommended retention policy applied</strong><p>Active CRM records are retained while needed; inactive prospects, emails, and files receive a 3-year review; relationship history and audit records are retained for 7 years; legal holds always override deletion. Cleanup begins with dry-run reports.</p></div></div></section>
    </div>}
    {tab === 'templates' && <section className='appPanel'><CrmPanelHeader title='Reusable email templates' detail='Variables such as {{contact.first_name}} and {{organization.name}} are filled when automation creates a draft.' actions={<Button onClick={() => setTemplateOpen(true)}><Plus aria-hidden='true' /> New template</Button>} />{templates.length ? <div className='crmCardGrid'>{templates.map(template => <article className='crmRecordCard' key={template.id}><header><StatusBadge tone={template.active ? 'success' : 'neutral'}>{template.active ? 'Active' : 'Inactive'}</StatusBadge><small>{template.category}</small></header><h3>{template.name}</h3><strong>{template.subject}</strong><p>{template.text_body}</p><small>Used {template.usage_count} times</small></article>)}</div> : <EmptyState compact title='No templates yet' description='Create templates for discovery, proposals, onboarding, and follow-ups.' />}</section>}
    {tab === 'automations' && <section className='appPanel'><CrmPanelHeader title='Founder-controlled automation' detail='Every rule controls when it runs, its conditions, whether it creates drafts, requires approval, sends automatically, or is disabled.' actions={<Button onClick={openNewAutomation}><Plus aria-hidden='true' /> New automation</Button>} />{(!automationMeta.scheduler_enabled || !automationMeta.automatic_email_enabled) && <FormMessage type='warning'>{!automationMeta.scheduler_enabled ? 'The server-wide CRM scheduler is currently off. Enabled rules remain saved but will not run on a timer.' : 'Automatic email delivery is globally off. Automatic email rules will create approval-required drafts until it is enabled.'}</FormMessage>}{automations.length ? <div className='crmAutomationList'>{automations.map(rule => <article key={rule.id}><span className={`crmConnectionIcon${rule.enabled ? '' : ' is-muted'}`}><Settings2 aria-hidden='true' /></span><div><header><strong>{rule.name}</strong><StatusBadge tone={rule.enabled ? 'success' : 'neutral'}>{rule.enabled ? 'Enabled' : 'Disabled'}</StatusBadge><StatusBadge tone={rule.mode === 'automatic' ? 'warning' : 'info'}>{rule.mode.replaceAll('_', ' ')}</StatusBadge></header><p>{rule.description || `${rule.trigger.replaceAll('_', ' ')} → ${rule.action.type}`}</p><small>Maximum {rule.guardrails.max_per_day}/day · {rule.guardrails.minimum_gap_hours}h minimum gap · {rule.timing?.send_window_start || '08:00'}–{rule.timing?.send_window_end || '18:00'} · stop on reply {rule.guardrails.stop_on_reply ? 'on' : 'off'}</small></div><Button variant='secondary' onClick={() => openAutomation(rule)}><Pencil aria-hidden='true' /> Edit</Button><Button variant='secondary' onClick={() => preview(rule)}><Play aria-hidden='true' /> Preview</Button><Button variant={rule.enabled ? 'secondary' : 'primary'} onClick={() => toggleAutomation(rule)}>{rule.enabled ? 'Disable' : 'Enable'}</Button></article>)}</div> : <EmptyState compact title='No automations configured' description='All automatic behavior remains off until a founder creates and enables a rule.' />}</section>}
    {tab === 'data' && <div className='crmSettingsGrid'>
      <section className='appPanel'><CrmPanelHeader title='Duplicate review' detail='Possible duplicates are never merged automatically. A founder must confirm every merge.' /><dl className='appDetailList'><div><dt>Matching organization names</dt><dd>{duplicates?.organization_names?.length || 0}</dd></div><div><dt>Matching organization domains</dt><dd>{duplicates?.organization_domains?.length || 0}</dd></div><div><dt>Matching contact emails</dt><dd>{duplicates?.contact_emails?.length || 0}</dd></div></dl>
        {duplicateCount > 0 && <div className='crmDuplicateList'>
          {[...(duplicates?.organization_names || []).map(group => ({ group, label: 'Same organization name', entity: 'organizations' })), ...(duplicates?.organization_domains || []).map(group => ({ group, label: 'Same organization domain', entity: 'organizations' })), ...(duplicates?.contact_emails || []).map(group => ({ group, label: 'Same contact email', entity: 'contacts' }))].map(({ group, label, entity }, index) => <article key={`${entity}-${String(group._id?.value || group._id)}-${index}`}><div><small>{label}</small><strong>{group.names?.join(' · ') || String(group._id?.value || group._id)}</strong><span>{group.count} matching records</span></div><Button variant='secondary' onClick={() => mergeDuplicate(group, entity)} disabled={saving}>Review & merge first pair</Button></article>)}
        </div>}
      </section>
      <section className='appPanel'><CrmPanelHeader title='Import & export' detail='CSV imports are checked row by row before anything is written.' /><CrmImportPanel onImported={load} /><div className='crmDataActions'><Button variant='secondary' href={`${process.env.NEXT_PUBLIC_API_URL}/crm/exports/organizations.csv`}>Export organizations CSV</Button><Button variant='secondary' href={`${process.env.NEXT_PUBLIC_API_URL}/crm/exports/contacts.csv`}>Export contacts CSV</Button></div></section>
      <section className='appPanel crmSpanTwo'><CrmPanelHeader title='Archived records' detail='Founders may restore records while retaining their complete audit history.' />{archives.organizations.length || archives.contacts.length ? <div className='crmArchiveList'>{archives.organizations.map(item => <article key={`organization-${item.id}`}><div><strong>{item.name}</strong><span>{item.type.toUpperCase()} organization · {formatDateTime(item.archived_at)}</span><small>{item.archive_reason}</small></div><Button variant='secondary' onClick={() => restore(item, 'organizations')}>Restore</Button></article>)}{archives.contacts.map(item => <article key={`contact-${item.id}`}><div><strong>{item.first_name} {item.last_name}</strong><span>Contact · {item.organization?.name || 'Archived organization'} · {formatDateTime(item.archived_at)}</span><small>{item.archive_reason}</small></div><Button variant='secondary' onClick={() => restore(item, 'contacts')}>Restore</Button></article>)}</div> : <EmptyState compact title='No archived CRM records' description='Archived organizations and contacts will appear here for founder restoration.' />}</section>
      <section className='appPanel crmSpanTwo'><CrmPanelHeader title='Retention review preview' detail='Read-only report. No record is deleted automatically.' /><div className='crmRetentionNote'><Database aria-hidden='true' /><div><strong>{(retention?.candidates?.organizations || 0) + (retention?.candidates?.emails || 0) + (retention?.candidates?.attachments || 0)} records currently qualify for founder review</strong><p>{retention?.candidates?.organizations || 0} inactive organizations · {retention?.candidates?.emails || 0} email messages · {retention?.candidates?.attachments || 0} files. Legal holds and active relationship exceptions must be reviewed before any future cleanup action.</p></div></div></section>
    </div>}
    <CrmModal open={templateOpen} title='Create email template' onClose={() => !saving && setTemplateOpen(false)} actions={<><Button variant='secondary' onClick={() => setTemplateOpen(false)}>Cancel</Button><Button type='submit' form='crm-template-form' disabled={saving}>Create template</Button></>}><form id='crm-template-form' onSubmit={createTemplate}><FieldGrid><Field label='Name'><input required value={templateForm.name} onChange={event => setTemplateForm(value => ({ ...value, name: event.target.value }))} /></Field><Field label='Category'><input value={templateForm.category} onChange={event => setTemplateForm(value => ({ ...value, category: event.target.value }))} /></Field><Field label='Subject' wide><input required value={templateForm.subject} onChange={event => setTemplateForm(value => ({ ...value, subject: event.target.value }))} /></Field><Field label='Message' wide><textarea required rows={10} value={templateForm.text_body} onChange={event => setTemplateForm(value => ({ ...value, text_body: event.target.value }))} /></Field></FieldGrid></form></CrmModal>
    <CrmModal open={automationOpen} title={editingAutomation ? 'Edit automation' : 'Create automation'} description={editingAutomation ? 'Change the trigger, conditions, schedule, action, and safety controls.' : 'New automations are always created disabled.'} onClose={closeAutomation} actions={<><Button variant='secondary' onClick={closeAutomation}>Cancel</Button><Button type='submit' form='crm-automation-form' disabled={saving}>{editingAutomation ? 'Save changes' : 'Create disabled automation'}</Button></>}><form id='crm-automation-form' onSubmit={saveAutomation}><FieldGrid>
      <Field label='Name' wide><input required value={automationForm.name} onChange={event => setAutomationForm(value => ({ ...value, name: event.target.value }))} /></Field><Field label='Description' wide><textarea rows={3} value={automationForm.description} onChange={event => setAutomationForm(value => ({ ...value, description: event.target.value }))} /></Field>
      <Field label='Trigger'><select value={automationForm.trigger} onChange={event => setAutomationForm(value => ({ ...value, trigger: event.target.value }))}>{['follow_up_due','task_due','opportunity_stale','onboarding_stalled','meeting_follow_up'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field>
      <Field label='Mode'><select value={automationForm.mode} onChange={event => setAutomationForm(value => ({ ...value, mode: event.target.value }))}><option value='draft_only'>Create draft only</option><option value='approval_required'>Require founder approval</option><option value='automatic'>Send/run automatically</option></select></Field>
      <Field label='Action'><select value={automationForm.action_type} onChange={event => setAutomationForm(value => ({ ...value, action_type: event.target.value }))}><option value='reminder'>Create founder reminder task</option><option value='task'>Create CRM task</option><option value='email'>Create/send email</option></select></Field>
      <Field label='Owner or assignee'><select required value={automationForm.owner_id} onChange={event => setAutomationForm(value => ({ ...value, owner_id: event.target.value }))}><option value=''>Choose founder</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user?.full_name || owner.user?.email}</option>)}</select></Field>
      {(automationForm.action_type === 'task' || automationForm.action_type === 'reminder') && <Field label='Task importance'><select value={automationForm.task_importance} onChange={event => setAutomationForm(value => ({ ...value, task_importance: event.target.value }))}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option></select></Field>}
      {automationForm.action_type === 'email' && <><Field label='Email template'><select required value={automationForm.template} onChange={event => setAutomationForm(value => ({ ...value, template: event.target.value }))}><option value=''>Choose template</option>{templates.filter(item => item.active).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field><Field label='Sending account'><select required value={automationForm.provider_connection} onChange={event => setAutomationForm(value => ({ ...value, provider_connection: event.target.value }))}><option value=''>Choose connected Gmail</option>{connections.filter(item => item.manageable_by_current_founder && !item.warning && item.capabilities.gmail_send).map(item => <option key={item.id} value={item.id}>{item.account_email}</option>)}</select></Field></>}
      {automationForm.trigger === 'opportunity_stale' && <Field label='Stale after days'><input type='number' min='1' max='365' value={automationForm.stale_days} onChange={event => setAutomationForm(value => ({ ...value, stale_days: event.target.value }))} /></Field>}
      {automationForm.trigger === 'opportunity_stale' && <Field label='Minimum opportunity priority'><select value={automationForm.minimum_priority} onChange={event => setAutomationForm(value => ({ ...value, minimum_priority: event.target.value }))}><option value='0'>Any priority</option>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}+</option>)}</select></Field>}
      <Field label='Organization type'><select value={automationForm.organization_type} onChange={event => setAutomationForm(value => ({ ...value, organization_type: event.target.value }))}><option value=''>OEM or supplier</option><option value='oem'>OEM only</option><option value='supplier'>Supplier only</option></select></Field>
      <Field label='Organization status'><select value={automationForm.organization_status} onChange={event => setAutomationForm(value => ({ ...value, organization_status: event.target.value }))}><option value=''>Any status</option>{['prospect','onboarding','active','inactive'].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
      {automationForm.trigger === 'onboarding_stalled' && <Field label='Onboarding type'><select value={automationForm.onboarding_type} onChange={event => setAutomationForm(value => ({ ...value, onboarding_type: event.target.value }))}><option value=''>OEM or supplier</option><option value='oem'>OEM only</option><option value='supplier'>Supplier only</option></select></Field>}
      <Field label='Timing offset (minutes)' hint='Positive values wait after the trigger; negative values run before it.'><input type='number' min='-525600' max='525600' value={automationForm.offset_minutes} onChange={event => setAutomationForm(value => ({ ...value, offset_minutes: event.target.value }))} /></Field>
      <Field label='Timezone'><input required maxLength={80} value={automationForm.timezone} onChange={event => setAutomationForm(value => ({ ...value, timezone: event.target.value }))} /></Field>
      <Field label='Allowed days' wide><div className='crmWeekdayPicker'>{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((label, day) => <label key={label}><input type='checkbox' checked={automationForm.allowed_weekdays.includes(day)} onChange={() => toggleWeekday(day)} /><span>{label}</span></label>)}</div></Field>
      <Field label='Send window starts'><input type='time' required value={automationForm.send_window_start} onChange={event => setAutomationForm(value => ({ ...value, send_window_start: event.target.value }))} /></Field>
      <Field label='Send window ends'><input type='time' required value={automationForm.send_window_end} onChange={event => setAutomationForm(value => ({ ...value, send_window_end: event.target.value }))} /></Field>
      <Field label='Maximum actions per day'><input type='number' min='1' max='500' value={automationForm.max_per_day} onChange={event => setAutomationForm(value => ({ ...value, max_per_day: event.target.value }))} /></Field>
      <Field label='Minimum hours between actions'><input type='number' min='1' max='8760' value={automationForm.minimum_gap_hours} onChange={event => setAutomationForm(value => ({ ...value, minimum_gap_hours: event.target.value }))} /></Field>
      <Field label='Reply protection' wide><span className='crmCheckbox'><input type='checkbox' checked={automationForm.stop_on_reply} onChange={event => setAutomationForm(value => ({ ...value, stop_on_reply: event.target.checked }))} /> Stop the automation when the latest message is a contact reply</span></Field>
      <Field label='Completion protection' wide><span className='crmCheckbox'><input type='checkbox' checked={automationForm.stop_when_completed} onChange={event => setAutomationForm(value => ({ ...value, stop_when_completed: event.target.checked }))} /> Stop when the related opportunity, onboarding, meeting, or task is complete</span></Field>
      <Field label='Contact protection' wide><span className='crmCheckbox'><input type='checkbox' checked={automationForm.skip_do_not_contact} onChange={event => setAutomationForm(value => ({ ...value, skip_do_not_contact: event.target.checked }))} /> Never email contacts marked do not contact</span></Field>
    </FieldGrid></form></CrmModal>
  </>
}

CrmSettings.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmSettings
