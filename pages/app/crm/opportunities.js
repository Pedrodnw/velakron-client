import { CalendarPlus, CircleDollarSign, Plus, Search, Target, TrendingUp } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useDispatch } from 'react-redux'
import LinkWrap from '../../../components/LinkWrap'
import { AppPageHeader, AppSkeleton, ErrorState, FilterBar, MetricCard, StatusBadge } from '../../../components/app'
import FormMessage from '../../../components/auth/FormMessage'
import CrmModal from '../../../components/app/crm/CrmModal'
import CrmFilesPanel from '../../../components/app/crm/CrmFilesPanel'
import CrmShell from '../../../components/app/crm/CrmShell'
import { Field, FieldGrid, OwnerName, formatMoney, formatShortDate } from '../../../components/app/crm/CrmFields'
import { Button } from '../../../components/design-system'
import { WidePortalPageLayout } from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import { crmErrorMessage, crmRequest } from '../../../store/crmApi'

const stages = ['lead', 'contacted', 'discovery', 'demo', 'pilot_discussion', 'proposal', 'negotiation', 'won', 'lost']
const lostReasons = ['no_budget', 'no_priority', 'timing', 'competitor', 'built_internally', 'no_response', 'product_fit', 'other']
const initialForm = { organization: '', name: '', contact: '', owner: '', priority_score: 3, priority_rationale: '', estimated_first_year_value: '', expected_close_date: '', pain_point: '', use_case: '', next_action: '', next_action_at: '', source: '' }
const meetingHref = (opportunity, contact) => {
  const params = new URLSearchParams({
    new: '1',
    organization: opportunity.organization?.id || '',
    title: `Velakron demo — ${opportunity.organization?.name || opportunity.name}`,
    purpose: opportunity.use_case || 'Personalized Velakron product demonstration.',
    duration: '30',
  })
  if (contact?.id) params.set('contact', contact.id)
  return `/app/crm/calendar?${params}`
}

const CrmOpportunities = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const [state, setState] = useState({ loading: true, rows: [], pipeline: {}, error: '' })
  const [filters, setFilters] = useState({ search: '', owner_id: '', priority: '', sort: 'priority' })
  const [owners, setOwners] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [contacts, setContacts] = useState([])
  const [form, setForm] = useState(initialForm)
  const [createOpen, setCreateOpen] = useState(false)
  const [closing, setClosing] = useState(null)
  const [lostReason, setLostReason] = useState('timing')
  const [stageReason, setStageReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [detail, setDetail] = useState(null)
  const detailContact = detail?.opportunity?.contacts?.find(item => item.primary)?.contact
    || detail?.opportunity?.contacts?.[0]?.contact

  const load = useCallback(async (next = filters) => {
    setState(value => ({ ...value, loading: true, error: '' }))
    const result = await dispatch(crmRequest({ url: '/opportunities', params: { ...next, page_size: 100 }, requestKey: 'crm-opportunities' }))
    setState(result?.ok ? { loading: false, rows: result.payload.data.opportunities || [], pipeline: result.payload.data.pipeline || {}, error: '' } : { loading: false, rows: [], pipeline: {}, error: crmErrorMessage(result) })
  }, [dispatch, filters])
  useEffect(() => { load(filters) }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    Promise.all([
      dispatch(crmRequest({ url: '/owners', requestKey: 'crm-opportunity-owners' })),
      dispatch(crmRequest({ url: '/organizations', params: { type: 'oem', page_size: 100, sort: 'name' }, requestKey: 'crm-opportunity-organizations' })),
    ]).then(([ownerResult, organizationResult]) => {
      if (ownerResult?.ok) setOwners(ownerResult.payload.data.owners || [])
      if (organizationResult?.ok) setOrganizations(organizationResult.payload.data.organizations || [])
    })
  }, [dispatch])
  useEffect(() => {
    if (!router.isReady) return
    if (router.query.new === '1') setCreateOpen(true)
    if (router.query.organization) setForm(value => ({ ...value, organization: String(router.query.organization) }))
  }, [router.isReady, router.query.new, router.query.organization])
  useEffect(() => {
    if (!form.organization) { setContacts([]); return }
    dispatch(crmRequest({ url: `/organizations/${form.organization}`, requestKey: `crm-opportunity-org-${form.organization}` })).then(result => {
      if (result?.ok) setContacts(result.payload.data.contacts || [])
    })
  }, [dispatch, form.organization])

  const byStage = useMemo(() => Object.fromEntries(stages.map(stage => [stage, state.rows.filter(item => item.stage === stage)])), [state.rows])
  const save = async event => {
    event.preventDefault(); setSaving(true); setFeedback(null)
    const result = await dispatch(crmRequest({
      url: '/opportunities', method: 'post', requestKey: 'crm-opportunity-create',
      data: {
        organization: form.organization, name: form.name, owner: form.owner,
        contacts: form.contact ? [{ contact: form.contact, role: 'decision_maker', primary: true }] : [],
        priority_score: Number(form.priority_score), priority_rationale: form.priority_rationale,
        estimated_first_year_value: Number(form.estimated_first_year_value || 0),
        expected_close_date: form.expected_close_date ? new Date(form.expected_close_date).toISOString() : null,
        pain_point: form.pain_point, use_case: form.use_case, next_action: form.next_action,
        next_action_owner: form.owner, next_action_at: form.next_action_at ? new Date(form.next_action_at).toISOString() : null,
        source: form.source,
      },
    }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The opportunity could not be created.') })
    setCreateOpen(false); setForm(initialForm); setFeedback({ type: 'success', message: 'Opportunity added to the pipeline.' }); load()
  }
  const move = async (item, stage) => {
    if (stage === 'lost') { setClosing(item); setLostReason('timing'); setStageReason(''); return }
    const result = await dispatch(crmRequest({ url: `/opportunities/${item.id}`, method: 'patch', requestKey: `crm-opportunity-stage-${item.id}`, data: { stage, stage_reason: `Moved to ${stage.replaceAll('_', ' ')}.`, version: item.version } }))
    if (!result?.ok) setFeedback({ type: 'error', message: crmErrorMessage(result, 'The stage could not be changed.') })
    else { setFeedback({ type: 'success', message: `${item.name} moved to ${stage.replaceAll('_', ' ')}.` }); load() }
  }
  const closeLost = async event => {
    event.preventDefault(); setSaving(true)
    const result = await dispatch(crmRequest({ url: `/opportunities/${closing.id}`, method: 'patch', requestKey: `crm-opportunity-lost-${closing.id}`, data: { stage: 'lost', lost_reason: lostReason, lost_reason_detail: stageReason, stage_reason: stageReason || `Closed as lost: ${lostReason.replaceAll('_', ' ')}`, version: closing.version } }))
    setSaving(false)
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'The opportunity could not be closed.') })
    setClosing(null); setFeedback({ type: 'success', message: 'Opportunity closed as lost.' }); load()
  }
  const openDetail = async item => {
    const result = await dispatch(crmRequest({ url: `/opportunities/${item.id}`, requestKey: `crm-opportunity-detail-${item.id}` }))
    if (!result?.ok) return setFeedback({ type: 'error', message: crmErrorMessage(result, 'Opportunity details could not be loaded.') })
    setDetail(result.payload.data)
  }

  return <>
    <Seo title='CRM opportunities' description='Velakron OEM sales pipeline.' path='/app/crm/opportunities' noIndex />
    <AppPageHeader eyebrow='OEM sales pipeline' title='Opportunities' description='Expected first-year value, the current sales stage, founder ownership, and a deliberate 1–5 focus score.' actions={<Button onClick={() => { setCreateOpen(true); setFeedback(null) }}><Plus aria-hidden='true' /> New opportunity</Button>} />
    <section className='metricGrid crmMetricGrid'>
      <MetricCard label='Active opportunities' value={state.rows.filter(item => !['won', 'lost'].includes(item.stage)).length} detail='OEM opportunities in motion' icon={Target} />
      <MetricCard label='Expected first-year value' value={formatMoney(state.pipeline.unweighted)} detail='Unweighted open pipeline' icon={CircleDollarSign} />
      <MetricCard label='Weighted forecast' value={formatMoney(state.pipeline.weighted)} detail='Adjusted by close probability' icon={TrendingUp} />
      <MetricCard label='High priority' value={state.rows.filter(item => item.priority_score >= 4 && !['won', 'lost'].includes(item.stage)).length} detail='Priority score 4 or 5' icon={Target} tone='warning' />
    </section>
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    <FilterBar onSubmit={event => { event.preventDefault(); load(filters) }} actions={<Button type='submit'><Search aria-hidden='true' /> Apply</Button>}>
      <label><span>Search</span><input value={filters.search} onChange={event => setFilters(value => ({ ...value, search: event.target.value }))} placeholder='Opportunity, pain point, source' /></label>
      <label><span>Owner</span><select value={filters.owner_id} onChange={event => setFilters(value => ({ ...value, owner_id: event.target.value }))}><option value=''>Any founder</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></label>
      <label><span>Priority</span><select value={filters.priority} onChange={event => setFilters(value => ({ ...value, priority: event.target.value }))}><option value=''>All priorities</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value}</option>)}</select></label>
    </FilterBar>
    {state.error && <ErrorState title='Pipeline could not be loaded' description={state.error} onRetry={() => load()} />}
    {state.loading && !state.rows.length ? <section className='appPanel'><AppSkeleton lines={10} /></section> : <div className='crmPipeline'>{stages.map(stage => <section className='crmPipelineColumn' key={stage}>
      <header><div><h2>{stage.replaceAll('_', ' ')}</h2><span>{byStage[stage].length}</span></div><strong>{formatMoney(byStage[stage].reduce((sum, item) => sum + item.estimated_first_year_value, 0))}</strong></header>
      <div>{byStage[stage].map(item => <article className='crmOpportunityCard' key={item.id}>
        <header><span className={`crmPriority crmPriority--${item.priority_score}`}>{item.priority_score}</span><small>{formatShortDate(item.expected_close_date)}</small></header>
        <button className='crmCardTitle' type='button' onClick={() => openDetail(item)}><h3>{item.name}</h3></button><LinkWrap href={`/app/crm/organizations/${item.organization?.id}`}>{item.organization?.name}</LinkWrap>
        <strong>{formatMoney(item.estimated_first_year_value)}</strong><p>{item.next_action || 'No next action set'}</p><small>{OwnerName({ membership: item.owner })}</small>
        <label><span>Move stage</span><select value={item.stage} onChange={event => move(item, event.target.value)}>{stages.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label>
      </article>)}</div>
    </section>)}</div>}
    <CrmModal open={createOpen} title='Create OEM opportunity' description='Use expected first-year value and a manual focus score. Scores 4–5 require a rationale.' onClose={() => !saving && setCreateOpen(false)} wide actions={<><Button variant='secondary' onClick={() => setCreateOpen(false)}>Cancel</Button><Button type='submit' form='crm-opportunity-form' disabled={saving}>{saving ? 'Saving…' : 'Create opportunity'}</Button></>}>
      <form id='crm-opportunity-form' onSubmit={save}><FieldGrid>
        <Field label='OEM organization'><select required value={form.organization} onChange={event => setForm(value => ({ ...value, organization: event.target.value, contact: '' }))}><option value=''>Choose OEM</option>{organizations.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>
        <Field label='Opportunity name'><input required minLength={2} maxLength={180} value={form.name} onChange={event => setForm(value => ({ ...value, name: event.target.value }))} /></Field>
        <Field label='Primary contact'><select value={form.contact} onChange={event => setForm(value => ({ ...value, contact: event.target.value }))}><option value=''>No primary contact</option>{contacts.map(item => <option key={item.id} value={item.id}>{item.full_name}</option>)}</select></Field>
        <Field label='Opportunity owner'><select required value={form.owner} onChange={event => setForm(value => ({ ...value, owner: event.target.value }))}><option value=''>Choose founder</option>{owners.map(owner => <option key={owner.id} value={owner.id}>{owner.user.full_name}</option>)}</select></Field>
        <Field label='Priority score'><select value={form.priority_score} onChange={event => setForm(value => ({ ...value, priority_score: Number(event.target.value) }))}>{[1,2,3,4,5].map(value => <option key={value} value={value}>{value}</option>)}</select></Field>
        <Field label='Priority rationale' hint='Required for scores 4 and 5'><input required={form.priority_score >= 4} maxLength={1000} value={form.priority_rationale} onChange={event => setForm(value => ({ ...value, priority_rationale: event.target.value }))} /></Field>
        <Field label='Expected first-year value'><input type='number' min='0' step='1' value={form.estimated_first_year_value} onChange={event => setForm(value => ({ ...value, estimated_first_year_value: event.target.value }))} /></Field>
        <Field label='Expected close date'><input type='date' value={form.expected_close_date} onChange={event => setForm(value => ({ ...value, expected_close_date: event.target.value }))} /></Field>
        <Field label='Pain point' wide><textarea rows={3} value={form.pain_point} onChange={event => setForm(value => ({ ...value, pain_point: event.target.value }))} /></Field>
        <Field label='Use case' wide><textarea rows={3} value={form.use_case} onChange={event => setForm(value => ({ ...value, use_case: event.target.value }))} /></Field>
        <Field label='Next action'><input maxLength={500} value={form.next_action} onChange={event => setForm(value => ({ ...value, next_action: event.target.value }))} /></Field>
        <Field label='Next action date'><input type='datetime-local' value={form.next_action_at} onChange={event => setForm(value => ({ ...value, next_action_at: event.target.value }))} /></Field>
        <Field label='Lead source'><input maxLength={120} value={form.source} onChange={event => setForm(value => ({ ...value, source: event.target.value }))} /></Field>
      </FieldGrid></form>
    </CrmModal>
    <CrmModal open={Boolean(closing)} title='Close opportunity as lost' description='Record a structured reason so the founders can learn from the pipeline.' onClose={() => !saving && setClosing(null)} actions={<><Button variant='secondary' onClick={() => setClosing(null)}>Cancel</Button><Button type='submit' form='crm-lost-form' disabled={saving}>Close as lost</Button></>}><form id='crm-lost-form' onSubmit={closeLost}><FieldGrid><Field label='Lost reason'><select value={lostReason} onChange={event => setLostReason(event.target.value)}>{lostReasons.map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></Field><Field label='Details' wide><textarea rows={4} maxLength={1000} value={stageReason} onChange={event => setStageReason(event.target.value)} /></Field></FieldGrid></form></CrmModal>
    <CrmModal
      open={Boolean(detail)}
      title={detail?.opportunity?.name || 'Opportunity'}
      description={detail?.opportunity ? `${detail.opportunity.organization?.name} · ${detail.opportunity.stage.replaceAll('_', ' ')}` : ''}
      onClose={() => setDetail(null)}
      wide
      actions={detail?.opportunity && <Button href={meetingHref(detail.opportunity, detailContact)}><CalendarPlus aria-hidden='true' /> Schedule meeting</Button>}
    >
      {detail?.opportunity && <div className='crmOpportunityDetail'><section className='crmRecordSummary crmRecordSummary--compact'><div><span>Priority</span><strong>{detail.opportunity.priority_score} / 5</strong><small>{detail.opportunity.priority_rationale}</small></div><div><span>First-year value</span><strong>{formatMoney(detail.opportunity.estimated_first_year_value)}</strong></div><div><span>Expected close</span><strong>{formatShortDate(detail.opportunity.expected_close_date)}</strong></div><div><span>Owner</span><strong>{OwnerName({ membership: detail.opportunity.owner })}</strong></div><div className='crmRecordSummary__next'><span>Next action</span><strong>{detail.opportunity.next_action || 'Not set'}</strong><small>{formatShortDate(detail.opportunity.next_action_at)}</small></div></section><section><h3>Pain point and use case</h3><p>{detail.opportunity.pain_point || 'No pain point recorded.'}</p><p>{detail.opportunity.use_case || 'No use case recorded.'}</p></section><section><h3>Recent activity</h3>{detail.interactions?.length ? <div className='crmTimeline'>{detail.interactions.slice(0, 10).map(item => <article key={item.id || item._id}><span className='crmTimeline__dot' /><div><header><strong>{item.subject || item.type.replaceAll('_', ' ')}</strong><time>{formatShortDate(item.occurred_at)}</time></header><p>{item.summary}</p></div></article>)}</div> : <p>No opportunity activity yet.</p>}</section><section><h3>Private opportunity files</h3><CrmFilesPanel subject='opportunities' subjectId={detail.opportunity.id} /></section></div>}
    </CrmModal>
  </>
}

CrmOpportunities.getLayout = page => WidePortalPageLayout(<CrmShell>{page}</CrmShell>)
export default CrmOpportunities
