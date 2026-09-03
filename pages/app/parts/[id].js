import { AlertTriangle, ArrowLeft, Box, Check, CheckCircle2, ChevronRight, CircleDot, ClipboardCheck, Copy, Download, FileBox, FileText, FileUp, Info, Layers3, LoaderCircle, MoreHorizontal, Pencil, Plus, Send, ShieldAlert, Trash2 } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  ErrorState,
  PermissionDenied,
  ResourceNotFound,
  ResponsiveDrawer,
  StatusBadge,
} from '../../../components/app'
import { formatDate, formatLabel, statusTone } from '../../../components/app/formatters'
import ItarAccessDialog from '../../../components/app/ItarAccessDialog'
import InspectionPlanPanel from '../../../components/app/InspectionPlanPanel'
import PartAssetViewer from '../../../components/app/PartAssetViewer'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import FormField from '../../../components/auth/FormField'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import { getActiveOrganization, getFeatureEnabled, getHasPermission } from '../../../store/slices/appContext'
import { isViewableModel, suggestedPartAssetRole } from '../../../store/modelFiles'
import {
  addPartRequirement,
  archivePart,
  clonePartRevision,
  createVisualAnchor,
  exportPartDecisionRegister,
  loadPart,
  loadPartRevision,
  partSelectors,
  releasePartRevision,
  requestPartAssetDownload,
  requestPartAssetView,
  removePartRequirement,
  updatePartRevision,
  updatePartRequirement,
  uploadPartAsset,
  validatePartRevision,
  withdrawPartRevision,
} from '../../../store/slices/entities/parts'

const TABS = [
  ['overview', 'Overview', Box],
  ['model', '3D model', FileBox],
  ['drawing', 'Drawing', FileText],
  ['requirements', 'Requirements', Check],
  ['inspection', 'Inspection', ClipboardCheck],
  ['files', 'Files', FileUp],
]

const attachmentName = asset => asset?.attachment?.display_filename || asset?.attachment?.original_filename || asset?.label || 'Technical file'
const revisionIdOf = revision => String(revision?.id || revision?._id || '')
const collaborationIdOf = value => String(value?.id || value?._id || value || '')
const emptyAssetUpload = { role: '', label: '', file: null, is_primary: false, authorized: false, suggestion: null }

const PartWorkspace = () => {
  const router = useRouter()
  const dispatch = useDispatch()
  const id = String(router.query.id || '')
  const organization = useSelector(getActiveOrganization)
  const allowed = useSelector(getHasPermission('part.read'))
  const enabled = useSelector(getFeatureEnabled('part_workspaces'))
  const inspectionEnabled = useSelector(getFeatureEnabled('inspection'))
  const detail = useSelector(partSelectors.getDetailById(id))
  const loading = useSelector(partSelectors.getDetailLoading)
  const mutating = useSelector(partSelectors.getMutating)
  const upload = useSelector(partSelectors.getUpload)
  const error = useSelector(partSelectors.getError)
  const [revisionId, setRevisionId] = useState('')
  const revisionDetail = useSelector(partSelectors.getRevisionDetail(revisionId))
  const [tab, setTab] = useState('overview')
  const [viewer, setViewer] = useState({ asset: null, source: '', loading: false })
  const autoOpenedAssetRef = useRef('')
  const [selectedAnchorId, setSelectedAnchorId] = useState('')
  const [inspectionAnchor, setInspectionAnchor] = useState(null)
  const [inspectionAnchorRequest, setInspectionAnchorRequest] = useState(false)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [drawer, setDrawer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [itarRequest, setItarRequest] = useState(null)
  const [itarPending, setItarPending] = useState(false)
  const [requirement, setRequirement] = useState({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false, version: 0 })
  const [requirementEditId, setRequirementEditId] = useState('')
  const [assetUpload, setAssetUpload] = useState(emptyAssetUpload)
  const [revisionForm, setRevisionForm] = useState({ revision: '', material: '', finish: '', process_summary: '', engineering_note: '', export_control: 'none' })
  const [cloneLabel, setCloneLabel] = useState('')
  const [releaseValidation, setReleaseValidation] = useState({ loading: false, valid: false, errors: [], warnings: [] })
  const [releaseConfirmed, setReleaseConfirmed] = useState(false)
  const tabs = useMemo(() => TABS.filter(([key]) => key !== 'inspection' || inspectionEnabled), [inspectionEnabled])

  const refresh = useCallback(async () => {
    if (!id) return
    return dispatch(loadPart(id))
  }, [dispatch, id])

  useEffect(() => { if (allowed && id && organization?.id) refresh() }, [allowed, id, organization?.id, refresh])
  useEffect(() => {
    if (organization?.type === 'supplier') router.replace('/app/production')
  }, [organization?.type, router])
  useEffect(() => {
    if (revisionId || !detail?.revisions?.length) return
    const current = detail.part?.current_released_revision?.id || detail.part?.current_released_revision?._id
    setRevisionId(String(current || detail.revisions[0].id || detail.revisions[0]._id))
  }, [detail, revisionId])
  useEffect(() => {
    if (!revisionId || !id) return
    dispatch(loadPartRevision(id, revisionId))
    autoOpenedAssetRef.current = ''
    setViewer({ asset: null, source: '', loading: false })
    setInspectionAnchor(null)
    setInspectionAnchorRequest(false)
    setSelectedAnchorId('')
    setFeedback(null)
  }, [dispatch, id, revisionId])
  useEffect(() => {
    const revision = revisionDetail?.revision
    if (!revision) return
    setRevisionForm({ revision: revision.revision || '', material: revision.material || '', finish: revision.finish || '', process_summary: revision.process_summary || '', engineering_note: revision.engineering_note || '', export_control: revision.export_control || 'none' })
  }, [revisionDetail?.revision, revisionId])
  useEffect(() => {
    const requestedTab = String(router.query.tab || '')
    if (tabs.some(([key]) => key === requestedTab)) setTab(requestedTab)
  }, [router.query.tab, tabs])

  const revisions = detail?.revisions || []
  const revision = revisionDetail?.revision
  const assets = revisionDetail?.assets || []
  const anchors = revisionDetail?.anchors || []
  const productionRecords = revisionDetail?.production_records || []
  const viewAssets = useMemo(() => ({
    model: assets.filter(isViewableModel),
    drawing: assets.filter(asset => asset.role === 'drawing'),
  }), [assets])
  const selectedVisualAssets = viewAssets[tab] || []
  const allowedActions = revisionDetail?.allowed_actions || detail?.allowed_actions || {}
  const acknowledgedRequirementIds = new Set((revisionDetail?.review?.requirement_acknowledgements || []).map(item => String(item.requirement?.id || item.requirement?._id || item.requirement)))
  const draftRevision = revisions.find(item => item.lifecycle_state === 'draft')

  const reloadRevision = async () => {
    await Promise.all([dispatch(loadPart(id)), dispatch(loadPartRevision(id, revisionId))])
  }
  const run = async (operation, success, { close = true } = {}) => {
    setFeedback(null)
    const result = await operation()
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'Velakron could not complete this action.') })
      return result
    }
    if (success) setFeedback({ type: 'success', message: success })
    if (close) setDrawer('')
    await reloadRevision()
    return result
  }
  const openDrawer = name => {
    setFeedback(null)
    if (name === 'asset') setAssetUpload(emptyAssetUpload)
    setDrawer(name)
  }
  const openReleaseReview = async () => {
    setFeedback(null)
    setReleaseConfirmed(false)
    setReleaseValidation({ loading: true, valid: false, errors: [], warnings: [] })
    setDrawer('release')
    const result = await dispatch(validatePartRevision(id, revisionId))
    const validation = result?.payload?.data || {}
    setReleaseValidation(result?.ok
      ? { loading: false, valid: Boolean(validation.valid), errors: validation.errors || [], warnings: validation.warnings || [] }
      : { loading: false, valid: false, errors: [{ code: 'VALIDATION_FAILED', message: resultError(result, 'The release review could not be completed.') }], warnings: [] })
  }
  const handleAssetFile = file => {
    const suggestion = suggestedPartAssetRole(file)
    setAssetUpload(current => ({
      ...current,
      file: file || null,
      role: suggestion.role,
      is_primary: suggestion.isPrimary,
      suggestion,
    }))
  }

  const openAsset = useCallback(async (asset, attestation = null) => {
    if (revision?.export_control === 'itar' && !attestation) {
      setItarRequest({ asset, purpose: 'view' })
      return null
    }
    setViewer({ asset, source: '', loading: true })
    const result = await dispatch(requestPartAssetView(id, revisionId, asset.id || asset._id, attestation || {}))
    if (!result?.ok) {
      setViewer({ asset: null, source: '', loading: false })
      setFeedback({ type: 'error', message: resultError(result, 'The protected file could not be opened.') })
      return result
    }
    setViewer({ asset, source: result.payload.data.view.target, loading: false })
    setItarRequest(null)
    return result
  }, [dispatch, id, revision?.export_control, revisionId])

  useEffect(() => {
    if (!['model', 'drawing'].includes(tab)) return
    const viewerAssetId = String(viewer.asset?.id || viewer.asset?._id || '')
    if (selectedVisualAssets.some(asset => String(asset.id || asset._id) === viewerAssetId)) return
    setSelectedAnchorId('')
    setAnnotationMode(false)
    if (!selectedVisualAssets.length) {
      setViewer({ asset: null, source: '', loading: false })
      return
    }
    const primaryAsset = selectedVisualAssets.find(asset => asset.is_primary)
      || selectedVisualAssets.find(asset => asset.role === (tab === 'model' ? 'primary_model' : 'drawing'))
      || selectedVisualAssets[0]
    const key = `${revisionId}:${tab}:${primaryAsset.id || primaryAsset._id}`
    if (autoOpenedAssetRef.current === key) return
    autoOpenedAssetRef.current = key
    openAsset(primaryAsset)
  }, [openAsset, revisionId, selectedVisualAssets, tab, viewer.asset])

  const downloadAsset = async (asset, attestation = null) => {
    if (revision?.export_control === 'itar' && !attestation) {
      setItarRequest({ asset, purpose: 'download' })
      return null
    }
    const result = await dispatch(requestPartAssetDownload(id, revisionId, asset.id || asset._id, attestation || {}))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The protected file could not be downloaded.') })
    else setItarRequest(null)
    return result
  }

  const focusAnchor = anchor => {
    if (!anchor) return
    const anchorId = anchor.id || anchor._id
    const assetId = anchor.source_asset?.id || anchor.source_asset?._id || anchor.source_asset
    const asset = assets.find(candidate => String(candidate.id || candidate._id) === String(assetId))
    setSelectedAnchorId(String(anchorId || ''))
    if (asset) {
      setTab(asset.role === 'drawing' ? 'drawing' : 'model')
      if (String(viewer.asset?.id || viewer.asset?._id) !== String(assetId)) openAsset(asset)
    }
  }

  const chooseVisualAnchor = async anchor => {
    if (!inspectionAnchorRequest) return null
    const anchorResult = await dispatch(createVisualAnchor(id, revisionId, {
      kind: anchor.anchor_kind,
      label: anchor.label,
      anchor_data: anchor.anchor_data,
      view_state: anchor.view_state,
      renderer_version: 'velakron-viewer-v1',
      source_asset_id: viewer.asset?.id || viewer.asset?._id || null,
    }))
    if (!anchorResult?.ok) {
      setFeedback({ type: 'error', message: resultError(anchorResult, 'The inspection reference could not be saved.') })
      return anchorResult
    }
    setInspectionAnchor(anchorResult.payload.data.anchor)
    setInspectionAnchorRequest(false)
    setAnnotationMode(false)
    setSelectedAnchorId(anchorResult.payload.data.anchor.id)
    setTab('inspection')
    setFeedback({ type: 'success', message: 'Visual context captured. Finish the inspection checkpoint details.' })
    return anchorResult
  }

  if (!enabled || !allowed) return <PermissionDenied />
  if (organization?.type === 'supplier') return <section className='appPanel'><AppSkeleton lines={8} /></section>
  if (loading && !detail) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  if (error?.code === 'NOT_FOUND') return <ResourceNotFound />
  if (!detail?.part) return <ErrorState description={error?.message || 'Part workspace could not be loaded.'} onRetry={refresh} />

  const part = detail.part
  const releaseChecks = [
    { label: 'At least one verified technical file', pass: assets.length > 0 && assets.every(asset => asset.attachment?.state === 'available'), required: true },
    { label: 'Primary 3D model or drawing for visual review', pass: assets.some(asset => ['primary_model', 'drawing'].includes(asset.role)), required: false },
    { label: 'Structured requirements recorded', pass: (revisionDetail?.requirements || []).length > 0, required: false },
    { label: 'Engineering note explains this revision', pass: Boolean(revision?.engineering_note?.trim()), required: false },
    { label: revision?.export_control === 'itar' ? 'ITAR classification and protected handling enabled' : 'Standard controlled-data classification confirmed', pass: true, required: true },
  ]
  let nextStep = {
    tone: 'neutral', eyebrow: 'Revision status', title: 'Controlled definition is up to date',
    description: 'Use this workspace to maintain the reusable technical baseline. Supplier collaboration happens inside each production record.', action: null,
  }
  if (revision?.lifecycle_state === 'draft') nextStep = {
    tone: 'draft', eyebrow: 'OEM next step', title: 'Complete the draft definition',
    description: `${assets.length} file${assets.length === 1 ? '' : 's'} and ${(revisionDetail?.requirements || []).length} requirement${(revisionDetail?.requirements || []).length === 1 ? '' : 's'} are recorded. Review the package before creating its immutable release.`,
    action: assets.length ? { label: 'Review release', kind: 'release' } : { label: 'Upload first file', kind: 'tab', tab: 'files' },
  }
  else if (revision?.lifecycle_state === 'released') nextStep = {
    tone: 'info', eyebrow: 'Released baseline', title: 'Ready to use in production',
    description: 'Choose this revision when creating a production record. Velakron grants the assigned supplier access automatically.',
    action: { label: 'Use in production', kind: 'production' },
  }
  else if (revision?.lifecycle_state === 'withdrawn') nextStep = {
    tone: 'warning', eyebrow: 'Revision status', title: 'Withdrawn from future production use',
    description: 'Historical production records remain intact, but this revision can no longer be selected for new work.',
    action: null,
  }
  return <>
    <Seo title={`${part.part_number} Part Workspace`} description='Revisioned technical collaboration workspace.' path={`/app/parts/${id}`} noIndex />
    <Button href='/app/parts' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Part workspaces</Button>
    <AppPageHeader eyebrow='Part workspace' title={`${part.part_number} · ${part.name}`} description={part.description || 'One controlled source of truth for technical files, requirements, inspection definitions, and production reuse.'} actions={<>{revision && <Button variant='secondary' onClick={() => dispatch(exportPartDecisionRegister(id, revisionId))}><Download aria-hidden='true' /> Export register</Button>}{allowedActions.can_create_revision && revisions.length > 0 && !draftRevision && <Button variant='secondary' onClick={() => openDrawer('clone')}><Copy aria-hidden='true' /> New revision</Button>}{draftRevision && revisionId !== revisionIdOf(draftRevision) && <Button variant='secondary' onClick={() => setRevisionId(revisionIdOf(draftRevision))}><Layers3 aria-hidden='true' /> Continue draft {draftRevision.revision}</Button>}</>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {revision?.export_control === 'itar' && <div className='itarRecordBanner partItarBanner'><ShieldAlert aria-hidden='true' /><div><p className='technicalLabel'>ITAR-controlled part revision</p><strong>Every model, drawing, and technical file requires a fresh access confirmation.</strong><p>Access is private, short-lived, and included in the audit record. Do not expose the screen or file to unauthorized people.</p></div></div>}
    <section className='partWorkspaceShell'>
      <header className='partWorkspaceShell__bar'>
        <div><label htmlFor='part-revision-select'>Revision</label><select id='part-revision-select' value={revisionId} onChange={event => setRevisionId(event.target.value)}>{revisions.map(item => <option key={revisionIdOf(item)} value={revisionIdOf(item)}>{item.revision} · {formatLabel(item.lifecycle_state)}</option>)}</select></div>
        <div className='partWorkspaceShell__status'>{revision && <><StatusBadge tone={statusTone(revision.lifecycle_state)}>{formatLabel(revision.lifecycle_state)}</StatusBadge>{revision.manifest_hash && <span title={revision.manifest_hash}>Manifest {revision.manifest_hash.slice(0, 10)}…</span>}{revision.released_at && <span>Released {formatDate(revision.released_at)}</span>}</>}</div>
        <div className='partWorkspaceShell__actions'>{revision?.lifecycle_state === 'released' && <Button href={`/app/production/new?part_revision_id=${revisionId}`} variant='secondary'><Send aria-hidden='true' /> Use in production</Button>}{allowedActions.can_edit_revision && <Button variant='secondary' onClick={() => openDrawer('revision')}><Layers3 aria-hidden='true' /> Edit draft</Button>}{allowedActions.can_release_revision && <Button onClick={openReleaseReview}><ClipboardCheck aria-hidden='true' /> Review release</Button>}{(allowedActions.can_withdraw_revision || allowedActions.can_edit_part) && <details className='partWorkspaceActionsMenu'><summary><MoreHorizontal aria-hidden='true' /> More</summary><div>{allowedActions.can_withdraw_revision && <button type='button' onClick={() => { const reason = window.prompt('Why is this revision being withdrawn? Existing production records remain frozen to their historical revision.'); if (reason) run(() => dispatch(withdrawPartRevision(id, revisionId, reason, revision.version)), 'Revision withdrawn and preserved in production history.', { close: false }) }}><ShieldAlert aria-hidden='true' /><span><strong>Withdraw revision</strong><small>Prevent future use; preserve existing records</small></span></button>}{allowedActions.can_edit_part && <button type='button' onClick={() => { const reason = window.prompt('Why is this Part Workspace being archived?'); if (reason) run(() => dispatch(archivePart(id, reason, part.version)), 'Part Workspace archived.', { close: false }).then(result => { if (result?.ok) router.push('/app/parts') }) }}><Trash2 aria-hidden='true' /><span><strong>Archive workspace</strong><small>Remove this part from the active catalog</small></span></button>}</div></details>}</div>
      </header>
      <div className='partWorkspaceContext'><div><CheckCircle2 aria-hidden='true' /><span><small>Revision status</small><strong>{formatLabel(revision?.lifecycle_state)}</strong></span></div><div><FileUp aria-hidden='true' /><span><small>Controlled package</small><strong>{assets.length} file{assets.length === 1 ? '' : 's'} · {revisionDetail?.requirements?.length || 0} requirement{revisionDetail?.requirements?.length === 1 ? '' : 's'}</strong></span></div><div><Send aria-hidden='true' /><span><small>Production use</small><strong>{productionRecords.length} linked record{productionRecords.length === 1 ? '' : 's'}</strong></span></div></div>
      <section className={`partNextStep partNextStep--${nextStep.tone}`}><span className='partNextStep__icon'>{nextStep.tone === 'warning' ? <AlertTriangle aria-hidden='true' /> : nextStep.tone === 'draft' ? <Layers3 aria-hidden='true' /> : nextStep.tone === 'info' ? <Info aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}</span><div><p className='technicalLabel'>{nextStep.eyebrow}</p><h2>{nextStep.title}</h2><p>{nextStep.description}</p></div>{nextStep.action && <div className='partNextStep__action'>{nextStep.action.kind === 'release' && <Button onClick={openReleaseReview}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'tab' && <Button variant='secondary' onClick={() => setTab(nextStep.action.tab)}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'production' && <Button href={`/app/production/new?part_revision_id=${revisionId}`}>{nextStep.action.label}</Button>}</div>}</section>
      <nav className='partWorkspaceTabs' aria-label='Part workspace views'>{tabs.map(([key, label, Icon]) => <button type='button' key={key} className={tab === key ? 'is-active' : ''} onClick={() => { setFeedback(null); setTab(key) }}><Icon aria-hidden='true' /> {label}</button>)}</nav>

      {tab === 'overview' && <section className='partOverview'>
        <article className='partWorkspacePanel partOverview__definition'><header><div><p className='technicalLabel'>Controlled definition</p><h2>Revision {revision?.revision}</h2><p>{revision?.engineering_note || 'This workspace keeps the released technical definition, discussion, and production use together.'}</p></div></header><dl className='partOverviewFacts'><div><dt>Material</dt><dd>{revision?.material || 'Not specified'}</dd></div><div><dt>Finish / coating</dt><dd>{revision?.finish || 'Not specified'}</dd></div><div><dt>Process</dt><dd>{revision?.process_summary || 'Not specified'}</dd></div><div><dt>Classification</dt><dd>{revision?.export_control === 'itar' ? 'ITAR controlled' : 'Standard controlled data'}</dd></div><div><dt>Files</dt><dd>{assets.length}</dd></div><div><dt>Requirements</dt><dd>{revisionDetail?.requirements?.length || 0}</dd></div></dl></article>
        <article className='partWorkspacePanel'><header><div><p className='technicalLabel'>Revision readiness</p><h2>{revision?.lifecycle_state === 'draft' ? 'Definition in progress' : revision?.lifecycle_state === 'withdrawn' ? 'Unavailable for new work' : 'Approved technical baseline'}</h2><p>{revision?.lifecycle_state === 'draft' ? 'Complete the technical package and release it before using it in production.' : revision?.lifecycle_state === 'withdrawn' ? 'Existing production records keep their historical copy of this revision.' : 'Supplier access and collaboration begin automatically when this revision is assigned in a production record.'}</p></div></header><div className='partOverviewActions'>{revision?.lifecycle_state === 'draft' ? <Button onClick={openReleaseReview}>Review release</Button> : revision?.lifecycle_state === 'released' ? <Button href={`/app/production/new?part_revision_id=${revisionId}`}><Send aria-hidden='true' /> Use in production</Button> : revisionIdOf(part.current_released_revision) && revisionIdOf(part.current_released_revision) !== revisionId ? <Button variant='secondary' onClick={() => setRevisionId(revisionIdOf(part.current_released_revision))}>Open current release</Button> : null}</div></article>
        <article className='partWorkspacePanel partOverview__wide'><header><div><p className='technicalLabel'>Production reuse</p><h2>Related production records</h2><p>Each linked commitment keeps a frozen reference to this revision and manifest.</p></div>{organization.type === 'oem' && revision?.lifecycle_state === 'released' && <Button href={`/app/production/new?part_revision_id=${revisionId}`}><Plus aria-hidden='true' /> Create production record</Button>}</header>{productionRecords.length ? <div className='partOverviewRecords'>{productionRecords.map(record => <Button key={record.id || record._id} href={`/app/production/${record.id || record._id}`} variant='secondary'><span><strong>{record.public_reference || record.po_number}</strong><small>{formatLabel(record.production_stage)} · {formatLabel(record.health_state)}</small></span><ChevronRight aria-hidden='true' /></Button>)}</div> : <div className='partWorkspaceEmpty'><Box aria-hidden='true' /><h3>No production records use this revision yet</h3><p>{organization.type === 'oem' ? 'Released definitions can be selected when an OEM creates a production commitment.' : 'Production records linked to this shared revision will appear here.'}</p></div>}</article>
      </section>}

      {['model', 'drawing'].includes(tab) && <div className='partVisualWorkspace'>
        <aside className='partAssetRail'><header><p className='technicalLabel'>{tab === 'model' ? 'Model files' : 'Drawing files'}</p><span>{selectedVisualAssets.length}</span></header>{selectedVisualAssets.length ? selectedVisualAssets.map(asset => <button type='button' key={asset.id || asset._id} className={String(viewer.asset?.id || viewer.asset?._id) === String(asset.id || asset._id) ? 'is-active' : ''} onClick={() => openAsset(asset)}><span><strong>{attachmentName(asset)}</strong><small>{formatLabel(asset.role)}{asset.is_primary ? ' · Primary' : ''}</small></span><ChevronRight aria-hidden='true' /></button>) : <div className='partAssetRail__empty'><FileBox aria-hidden='true' /><p>No {tab === 'model' ? 'viewable models' : 'drawings'} on this revision.</p></div>}<footer><button type='button' onClick={() => setTab('files')}>View every file</button></footer></aside>
        <main className='partViewerStage'><div className='partViewerStage__toolbar'><div><p className='technicalLabel'>{inspectionAnchorRequest ? 'Inspection context selection' : 'Technical preview'}</p><strong>{viewer.asset ? attachmentName(viewer.asset) : `Open a ${tab}`}</strong></div>{viewer.asset && <div>{inspectionAnchorRequest && <Button variant={annotationMode ? 'primary' : 'secondary'} onClick={() => setAnnotationMode(value => !value)}><CircleDot aria-hidden='true' /> {annotationMode ? 'Cancel selection' : 'Select inspection point'}</Button>}<Button variant='secondary' onClick={() => downloadAsset(viewer.asset)}><Download aria-hidden='true' /> Download</Button></div>}</div><PartAssetViewer asset={viewer.asset} source={viewer.source} loading={viewer.loading} annotationMode={annotationMode} anchors={anchors.filter(anchor => String(anchor.id || anchor._id) === String(selectedAnchorId) && (!anchor.source_asset || collaborationIdOf(anchor.source_asset) === collaborationIdOf(viewer.asset)))} selectedAnchorId={selectedAnchorId} onSelect={chooseVisualAnchor} /></main>
        <aside className='partContextRail'><section><p className='technicalLabel'>Part snapshot</p><dl><div><dt>Revision</dt><dd>{revision?.revision}</dd></div><div><dt>Material</dt><dd>{revision?.material || 'Not specified'}</dd></div><div><dt>Finish</dt><dd>{revision?.finish || 'Not specified'}</dd></div><div><dt>Process</dt><dd>{revision?.process_summary || 'Not specified'}</dd></div></dl></section><section className='partContextRail__guidance'><p className='technicalLabel'>Where collaboration happens</p><p>Open a linked production record to create cases, exchange messages, and review the shared timeline with its supplier.</p>{productionRecords[0] && <Button href={`/app/production/${productionRecords[0].id || productionRecords[0]._id}`} variant='secondary'>Open production record</Button>}</section></aside>
      </div>}

      {tab === 'requirements' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Structured requirements</p><h2>Revision requirements</h2><p>Requirements travel with the released manifest and remain separately searchable and acknowledgeable.</p></div>{allowedActions.can_edit_revision && <Button onClick={() => { setFeedback(null); setRequirementEditId(''); setRequirement({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false }); setDrawer('requirement') }}><Plus aria-hidden='true' /> Add requirement</Button>}</header>{revisionDetail?.requirements?.length ? <div className='partRequirementList'>{revisionDetail.requirements.map((item, index) => { const acknowledged = acknowledgedRequirementIds.has(String(item.id || item._id)); return <article key={item.id || item._id}><span className='partRequirementList__index'>{String(index + 1).padStart(2, '0')}</span><div><div className='partRequirementList__title'><StatusBadge tone='info'>{formatLabel(item.type)}</StatusBadge><h3>{item.title}</h3>{item.acknowledgement_requested && <StatusBadge tone={acknowledged ? 'success' : 'warning'}>{acknowledged ? 'Acknowledged' : 'Supplier acknowledgement requested'}</StatusBadge>}</div><p>{item.body}</p>{item.source_reference && <small>Source: {item.source_reference}</small>}</div><div className='partRequirementList__actions'>{allowedActions.can_edit_revision && <><Button variant='secondary' aria-label={`Edit ${item.title}`} onClick={() => { setFeedback(null); setRequirementEditId(item.id || item._id); setRequirement({ type: item.type, title: item.title, body: item.body, source_reference: item.source_reference || '', acknowledgement_requested: Boolean(item.acknowledgement_requested) }); setDrawer('requirement') }}><Pencil aria-hidden='true' /> Edit</Button><Button variant='danger' aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Delete the draft requirement “${item.title}”?`)) run(() => dispatch(removePartRequirement(id, revisionId, item.id || item._id)), 'Draft requirement removed.', { close: false }) }}><Trash2 aria-hidden='true' /></Button></>}</div></article>})}</div> : <div className='partWorkspaceEmpty'><Check aria-hidden='true' /><h3>No structured requirements</h3><p>The technical files still remain part of the controlled revision manifest.</p></div>}
      </section>}

      {inspectionEnabled && tab === 'inspection' && <InspectionPlanPanel partId={id} revisionId={revisionId} revision={revision} organizationType={organization.type} selectedAnchor={inspectionAnchor} onOpenAnchor={focusAnchor} onRequestVisualContext={async () => {
        const asset = viewAssets.drawing[0] || viewAssets.model[0]
        if (!asset) { setFeedback({ type: 'error', message: 'Upload a drawing or 3D model before selecting inspection context.' }); return }
        setInspectionAnchorRequest(true)
        setTab(asset.role === 'drawing' ? 'drawing' : 'model')
        await openAsset(asset)
        setAnnotationMode(true)
        setFeedback({ type: 'info', message: 'Selection mode is active. Click a model feature or drag over the drawing area this checkpoint describes.' })
      }} />}


      {tab === 'files' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Controlled revision package</p><h2>Technical files</h2><p>Every released asset is frozen into the revision’s signed manifest.</p></div>{allowedActions.can_edit_revision && <Button onClick={() => openDrawer('asset')}><FileUp aria-hidden='true' /> Upload file</Button>}</header>{assets.length ? <div className='partFileList'>{assets.map(asset => <article key={asset.id || asset._id}><FileBox aria-hidden='true' /><div><strong>{attachmentName(asset)}</strong><span>{formatLabel(asset.role)} · {((asset.attachment?.byte_size || 0) / 1024).toFixed(1)} KB</span>{isViewableModel(asset) && !['primary_model', 'alternate_model'].includes(asset.role) && <StatusBadge tone='warning'>Viewable model · role needs review</StatusBadge>}{asset.attachment?.state !== 'available' && <StatusBadge tone='warning'>{formatLabel(asset.attachment?.state)}</StatusBadge>}</div><div>{(isViewableModel(asset) || asset.role === 'drawing') && <Button variant='secondary' onClick={() => { setTab(asset.role === 'drawing' ? 'drawing' : 'model'); openAsset(asset) }}>View</Button>}<Button variant='secondary' onClick={() => downloadAsset(asset)}><Download aria-hidden='true' /> Download</Button></div></article>)}</div> : <div className='partWorkspaceEmpty'><FileUp aria-hidden='true' /><h3>No files on this revision</h3><p>A technical file is required before release.</p>{allowedActions.can_edit_revision && <Button onClick={() => openDrawer('asset')}>Upload first file</Button>}</div>}</section>}

    </section>


    <ResponsiveDrawer open={drawer === 'revision'} title='Edit draft revision' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(updatePartRevision(id, revisionId, { ...revisionForm, version: revision.version })), 'Draft revision updated.') }}><FormMessage type={feedback?.type}>{feedback?.message}</FormMessage><FormField id='edit-revision' label='Revision' value={revisionForm.revision} onChange={event => setRevisionForm(current => ({ ...current, revision: event.target.value }))} required /><FormField id='edit-material' label='Material' value={revisionForm.material} onChange={event => setRevisionForm(current => ({ ...current, material: event.target.value }))} /><FormField id='edit-finish' label='Finish / coating' value={revisionForm.finish} onChange={event => setRevisionForm(current => ({ ...current, finish: event.target.value }))} /><label className='textAreaField' htmlFor='edit-process'><span>Process summary</span><textarea id='edit-process' value={revisionForm.process_summary} onChange={event => setRevisionForm(current => ({ ...current, process_summary: event.target.value }))} /></label><label className='textAreaField' htmlFor='edit-engineering-note'><span>Engineering note</span><textarea id='edit-engineering-note' value={revisionForm.engineering_note} onChange={event => setRevisionForm(current => ({ ...current, engineering_note: event.target.value }))} /></label><label className='productionCheck'><input type='checkbox' checked={revisionForm.export_control === 'itar'} onChange={event => setRevisionForm(current => ({ ...current, export_control: event.target.checked ? 'itar' : 'none' }))} /><ShieldAlert aria-hidden='true' /><span><strong>ITAR-controlled revision</strong><small>Every technical file will require protected storage and a fresh access confirmation.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>Save draft</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'requirement'} title={requirementEditId ? 'Edit revision requirement' : 'Add revision requirement'} onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(requirementEditId ? updatePartRequirement(id, revisionId, requirementEditId, requirement) : addPartRequirement(id, revisionId, requirement)), requirementEditId ? 'Requirement updated.' : 'Requirement added.').then(result => { if (result?.ok) { setRequirementEditId(''); setRequirement({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false }) } }) }}><label className='selectField'><span>Requirement type</span><select value={requirement.type} onChange={event => setRequirement(current => ({ ...current, type: event.target.value }))}>{['material', 'finish', 'special_process', 'certification', 'inspection', 'packaging', 'documentation', 'general', 'other'].map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></label><FormField id='requirement-title' label='Title' value={requirement.title} onChange={event => setRequirement(current => ({ ...current, title: event.target.value }))} required /><label className='textAreaField' htmlFor='requirement-body'><span>Requirement</span><textarea id='requirement-body' value={requirement.body} onChange={event => setRequirement(current => ({ ...current, body: event.target.value }))} required /></label><FormField id='requirement-source' label='Source reference' value={requirement.source_reference} onChange={event => setRequirement(current => ({ ...current, source_reference: event.target.value }))} /><label className='productionCheck'><input type='checkbox' checked={requirement.acknowledgement_requested} onChange={event => setRequirement(current => ({ ...current, acknowledgement_requested: event.target.checked }))} /><span><strong>Request supplier acknowledgement</strong><small>The supplier records a separate acknowledgement against this exact requirement.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>{requirementEditId ? 'Save requirement' : 'Add requirement'}</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'asset'} title='Upload technical file' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); if (!assetUpload.file || !assetUpload.role) return; run(() => dispatch(uploadPartAsset(id, revisionId, { file: assetUpload.file, role: assetUpload.role, label: assetUpload.label, isPrimary: assetUpload.is_primary, itar: revision.export_control === 'itar' ? { itar_upload_authorized: assetUpload.authorized, synthetic_data_acknowledged: assetUpload.authorized } : {} })), `Technical file uploaded as ${formatLabel(assetUpload.role)} and verified.`).then(result => { if (result?.ok) setAssetUpload(emptyAssetUpload) }) }}><div className='partUploadSequence'><span className={assetUpload.file ? 'is-complete' : 'is-current'}>1 <small>Choose file</small></span><span className={assetUpload.file && assetUpload.role ? 'is-complete' : assetUpload.file ? 'is-current' : ''}>2 <small>Confirm role</small></span><span>3 <small>Upload</small></span></div><label className='fileDropField'><FileUp aria-hidden='true' /><span><strong>{assetUpload.file?.name || 'Choose technical file'}</strong><small>STEP, STP, STL, PDF, PNG, JPEG, WebP, or text</small></span><input type='file' required onChange={event => handleAssetFile(event.target.files?.[0] || null)} /></label>{assetUpload.suggestion?.message && <div className={`partUploadSuggestion partUploadSuggestion--${assetUpload.suggestion.confidence}`}><Info aria-hidden='true' /><span><strong>{assetUpload.suggestion.confidence === 'detected' ? 'File type detected' : 'File role required'}</strong><small>{assetUpload.suggestion.message}</small></span></div>}<label className='selectField'><span>File role</span><select required value={assetUpload.role} onChange={event => setAssetUpload(current => ({ ...current, role: event.target.value, is_primary: ['primary_model', 'thumbnail'].includes(event.target.value) ? true : ['drawing'].includes(event.target.value) ? current.is_primary : false }))}><option value=''>Choose file role</option>{['primary_model', 'alternate_model', 'drawing', 'thumbnail', 'specification', 'inspection_plan', 'reference', 'other'].map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}</select><small>Use a transparent or white-background PNG as the isometric production thumbnail.</small></label><FormField id='asset-label' label='File label (optional)' value={assetUpload.label} onChange={event => setAssetUpload(current => ({ ...current, label: event.target.value }))} />{['primary_model', 'drawing', 'thumbnail'].includes(assetUpload.role) && <label className='productionCheck'><input type='checkbox' checked={assetUpload.is_primary} onChange={event => setAssetUpload(current => ({ ...current, is_primary: event.target.checked }))} /><span><strong>Primary {assetUpload.role === 'drawing' ? 'drawing' : assetUpload.role === 'thumbnail' ? 'thumbnail' : 'model'}</strong><small>{assetUpload.role === 'thumbnail' ? 'Show this isometric PNG beside the part number on production records.' : `Use this file by default when revision ${revision?.revision} opens.`}</small></span></label>}{revision?.export_control === 'itar' && <label className='productionCheck'><input type='checkbox' checked={assetUpload.authorized} onChange={event => setAssetUpload(current => ({ ...current, authorized: event.target.checked }))} /><ShieldAlert aria-hidden='true' /><span><strong>I am authorized to upload this ITAR-controlled data</strong><small>Local preview environments accept synthetic data only.</small></span></label>}{upload && <p className='uploadProgress'><LoaderCircle className='spin' aria-hidden='true' /> {upload.filename} · {upload.progress}%</p>}<footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating || !assetUpload.file || !assetUpload.role || (revision?.export_control === 'itar' && !assetUpload.authorized)}>Upload as {assetUpload.role ? formatLabel(assetUpload.role) : 'selected role'}</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'release'} title={`Review release · Revision ${revision?.revision || ''}`} onClose={() => setDrawer('')}><form className='partDrawerForm partReleaseReview' onSubmit={event => { event.preventDefault(); if (!releaseConfirmed || !releaseValidation.valid) return; run(() => dispatch(releasePartRevision(id, revisionId, revision.version)), 'Revision released as an immutable technical baseline.').then(result => { if (result?.ok) setReleaseConfirmed(false) }) }}><div className='partReleaseReview__intro'><ClipboardCheck aria-hidden='true' /><div><p className='technicalLabel'>Immutable release checkpoint</p><h3>Confirm the complete technical baseline</h3><p>After release, revision {revision?.revision} and its file manifest cannot be edited. Future changes require a new revision.</p></div></div>{releaseValidation.loading ? <p className='uploadProgress'><LoaderCircle className='spin' aria-hidden='true' /> Checking the revision package…</p> : <><ul className='partReleaseChecklist'>{releaseChecks.map(item => <li key={item.label} className={item.pass ? 'is-pass' : item.required ? 'is-error' : 'is-warning'}>{item.pass ? <CheckCircle2 aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}<span><strong>{item.label}</strong><small>{item.pass ? 'Ready' : item.required ? 'Required before release' : 'Recommended; release remains available'}</small></span></li>)}</ul>{releaseValidation.errors.map(item => <FormMessage key={item.code || item.message} type='error'>{item.message}</FormMessage>)}{releaseValidation.warnings.map(item => <FormMessage key={item.code || item.message} type='warning'>{item.message}</FormMessage>)}</>}<label className='productionCheck partReleaseReview__confirmation'><input type='checkbox' checked={releaseConfirmed} onChange={event => setReleaseConfirmed(event.target.checked)} /><span><strong>I reviewed revision {revision?.revision} and understand this release is immutable</strong><small>Production records will retain this exact manifest, and assigned suppliers receive access automatically.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Keep editing</Button><Button type='submit' disabled={mutating || releaseValidation.loading || !releaseValidation.valid || !releaseConfirmed}><Check aria-hidden='true' /> Release revision {revision?.revision}</Button></footer></form></ResponsiveDrawer>



    <ResponsiveDrawer open={drawer === 'clone'} title='Create next revision' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(clonePartRevision(id, revisionId, { revision: cloneLabel })), 'New draft revision created.').then(result => { const next = result?.payload?.data?.revision?.id; if (next) setRevisionId(next) }) }}><p>The new draft copies structured requirements, material, finish, process, and classification. Released files are not duplicated, and the engineering note starts blank so the new change is described deliberately.</p><FormField id='clone-revision' label='New revision label' value={cloneLabel} onChange={event => setCloneLabel(event.target.value)} required /><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>Create draft</Button></footer></form></ResponsiveDrawer>



    <ItarAccessDialog file={itarRequest?.asset?.attachment || itarRequest?.asset} purpose={itarRequest?.purpose} open={Boolean(itarRequest)} pending={itarPending} feedback={feedback?.type === 'error' ? feedback : null} onClose={() => setItarRequest(null)} onConfirm={async attestation => { setItarPending(true); const result = itarRequest.purpose === 'view' ? await openAsset(itarRequest.asset, attestation) : await downloadAsset(itarRequest.asset, attestation); setItarPending(false); return result }} />
  </>
}

PartWorkspace.getLayout = PortalPageLayout
export default PartWorkspace
