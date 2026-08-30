import { AlertTriangle, Box, Check, CheckCircle2, ChevronRight, ClipboardCheck, CircleDot, Clock3, Download, Edit3, FileBox, FileText, FileUp, Info, MessageSquareText, PackageCheck, Plus, RefreshCw, ShieldAlert, Truck } from 'lucide-react'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getFeatureEnabled, getHasPermission } from '../../store/slices/appContext'
import { resolveFileTransferTarget } from '../../store/fileTransfer'
import { isViewableModel } from '../../store/modelFiles'
import {
  acknowledgePartRequirement,
  acknowledgePartRevision,
  applyPartCollaborationAction,
  archivePartCollaboration,
  createPartCollaboration,
  createVisualAnchor,
  loadPart,
  loadPartCollaboration,
  loadPartCollaborationItem,
  loadPartRevision,
  partSelectors,
  postPartCollaborationMessage,
  promotePartCollaboration,
  requestCollaborationAttachmentDownload,
  requestPartAssetDownload,
  requestPartAssetView,
  requestPartReviewChanges,
  startPartReview,
  updatePartCollaboration,
  uploadPartCollaborationAttachment,
} from '../../store/slices/entities/parts'
import { resultError } from '../auth/utils'
import { Button } from '../design-system'
import FormMessage from '../auth/FormMessage'
import InspectionPlanPanel from './InspectionPlanPanel'
import InspectionQualityPanel from './InspectionQualityPanel'
import ItarAccessDialog from './ItarAccessDialog'
import PartAssetViewer from './PartAssetViewer'
import PartCaseDrawer from './PartCaseDrawer'
import { buildModelCaseMarkers, modelCaseMarkersForAsset } from './partCaseMarkers'
import ResponsiveDrawer from './ResponsiveDrawer'
import StatusBadge from './StatusBadge'
import { formatDate, formatDateTime, formatLabel, statusTone } from './formatters'
import { inspectionSelectors, loadInspectionPlan, loadInspectionRuns } from '../../store/slices/entities/inspection'

const TABS = [
  ['overview', 'Overview', Box],
  ['details', 'Production details', Truck],
  ['model', '3D model', FileBox],
  ['drawing', 'Drawing', FileText],
  ['requirements', 'Requirements', Check],
  ['inspection', 'Inspection', ClipboardCheck],
  ['cases', 'Cases & messages', MessageSquareText],
  ['files', 'Files', FileUp],
]

const idOf = value => String(value?.id || value?._id || value || '')
const revisionIdOf = value => idOf(value?.part_revision || value)
const shareIdOf = value => idOf(value)
const attachmentName = asset => asset?.attachment?.display_filename || asset?.attachment?.original_filename || asset?.label || 'Technical file'
const updateAge = value => {
  if (!value) return 'No supplier update yet'
  const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000))
  if (hours < 1) return 'Less than an hour ago'
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

const ProductionFacts = ({ record, onEdit }) => <section className='partWorkspacePanel productionPartDetails'>
  <header><div><p className='technicalLabel'>Production commitment</p><h2>Production details</h2><p>Commercial and delivery context for this exact production record.</p></div>{onEdit && <Button variant='secondary' onClick={onEdit}><Edit3 aria-hidden='true' /> Edit details</Button>}</header>
  <dl className='appDetailList productionPartDetails__list'>
    <div><dt>OEM customer</dt><dd>{record.oem_organization?.name}</dd></div>
    <div><dt>Supplier</dt><dd>{record.supplier_organization?.name || 'Not assigned'}</dd></div>
    <div><dt>PO reference</dt><dd>{record.po_number || 'Not provided'}{record.po_line_number ? ` / line ${record.po_line_number}` : ''}</dd></div>
    <div><dt>Drawing revision</dt><dd>{record.drawing_revision || 'Not provided'}</dd></div>
    <div><dt>Quantity</dt><dd>{record.quantity || 'Not provided'} {record.unit === 'other' ? record.unit_other : formatLabel(record.unit)}</dd></div>
    <div><dt>Required arrival</dt><dd>{formatDate(record.required_delivery_date)}</dd></div>
    <div><dt>Expected ship</dt><dd>{formatDate(record.expected_ship_date)}</dd></div>
    <div><dt>Projected arrival</dt><dd>{formatDate(record.projected_arrival_date)}</dd></div>
    <div><dt>Last supplier update</dt><dd>{updateAge(record.last_supplier_update_at)}</dd></div>
    <div><dt>Primary machine</dt><dd>{record.current_machine ? `${record.current_machine.shop_identifier} — ${record.current_machine.manufacturer} ${record.current_machine.model}` : 'Not assigned'}</dd></div>
    <div><dt>First article</dt><dd>{record.first_article_required ? 'Required' : 'Not required'}</dd></div>
    <div><dt>Export control</dt><dd>{record.export_control === 'itar' ? 'ITAR controlled' : 'Not marked ITAR'}</dd></div>
  </dl>
</section>

export const ProductionPartThumbnail = ({ partId, revisionId, exportControl = 'none' }) => {
  const dispatch = useDispatch()
  const revisionDetail = useSelector(partSelectors.getRevisionDetail(revisionId))
  const [source, setSource] = useState('')
  const [failed, setFailed] = useState(false)
  const thumbnail = (revisionDetail?.assets || []).find(asset => asset.role === 'thumbnail' && asset.is_primary)
    || (revisionDetail?.assets || []).find(asset => asset.role === 'thumbnail')

  useEffect(() => {
    if (!partId || !revisionId || revisionDetail || exportControl === 'itar') return
    dispatch(loadPartRevision(partId, revisionId))
  }, [dispatch, exportControl, partId, revisionDetail, revisionId])
  useEffect(() => {
    const assetId = idOf(thumbnail)
    if (!partId || !revisionId || !assetId || exportControl === 'itar') return
    let cancelled = false
    let objectUrl = ''
    setFailed(false)
    dispatch(requestPartAssetView(partId, revisionId, assetId, {})).then(result => {
      if (cancelled) return
      if (!result?.ok) setFailed(true)
      else {
        const target = result.payload.data.view.target
        if (/^https?:\/\//i.test(String(target || ''))) setSource(target)
        else fetch(resolveFileTransferTarget(target), { credentials: 'include' })
          .then(response => {
            if (!response.ok) throw new Error('Thumbnail could not be opened')
            return response.blob()
          })
          .then(blob => {
            if (cancelled) return
            objectUrl = window.URL.createObjectURL(blob)
            setSource(objectUrl)
          })
          .catch(() => { if (!cancelled) setFailed(true) })
      }
    })
    return () => {
      cancelled = true
      if (objectUrl) window.URL.revokeObjectURL(objectUrl)
    }
  }, [dispatch, exportControl, partId, revisionId, thumbnail])

  return <div className={`productionPartThumbnail${source && !failed ? ' has-image' : ''}`} aria-label={source && !failed ? 'Isometric part thumbnail' : 'Part thumbnail placeholder'}>
    {source && !failed ? <img src={source} alt='' /> : exportControl === 'itar' ? <ShieldAlert aria-hidden='true' /> : <Box aria-hidden='true' />}
  </div>
}

const ProductionPartWorkspace = ({ record, organization, onEditDetails }) => {
  const router = useRouter()
  const dispatch = useDispatch()
  const partId = idOf(record.part)
  const revisionId = idOf(record.part_revision)
  const inspectionPlanId = idOf(record.inspection_plan)
  const inspectionEnabled = useSelector(getFeatureEnabled('inspection'))
  const canCreateCase = useSelector(getHasPermission('part.collaboration.create'))
  const partDetail = useSelector(partSelectors.getDetailById(partId))
  const revisionDetail = useSelector(partSelectors.getRevisionDetail(revisionId))
  const cases = useSelector(partSelectors.getCollaborationByPart(partId))
  const inspectionPlan = useSelector(inspectionSelectors.getPlan(revisionId))
  const inspectionRuns = useSelector(inspectionSelectors.getRuns(record.id))
  const mutating = useSelector(partSelectors.getMutating)
  const upload = useSelector(partSelectors.getUpload)
  const [tab, setTab] = useState('overview')
  const [caseScope, setCaseScope] = useState('production')
  const [viewer, setViewer] = useState({ asset: null, source: '', loading: false })
  const [caseVisual, setCaseVisual] = useState({ asset: null, source: '', loading: false, error: '', protected: false })
  const [selectedAnchorId, setSelectedAnchorId] = useState('')
  const [pendingAnchor, setPendingAnchor] = useState(null)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [caseDrawer, setCaseDrawer] = useState({ open: false, mode: 'create', id: '' })
  const [feedback, setFeedback] = useState(null)
  const [caseFeedback, setCaseFeedback] = useState(null)
  const [itarRequest, setItarRequest] = useState(null)
  const [itarPending, setItarPending] = useState(false)
  const [reviewChangesOpen, setReviewChangesOpen] = useState(false)
  const autoOpenedAssetRef = useRef('')
  const caseVisualRequestRef = useRef('')
  const caseDetail = useSelector(partSelectors.getCollaborationDetail(caseDrawer.id))
  const defaultProductionRecordIds = useMemo(() => [String(record.id)], [record.id])
  const tabs = useMemo(() => TABS.filter(([key]) => key !== 'inspection' || inspectionEnabled), [inspectionEnabled])

  const revision = revisionDetail?.revision
  const assets = revisionDetail?.assets || []
  const anchors = revisionDetail?.anchors || []
  const requirements = revisionDetail?.requirements || []
  const productionRecords = useMemo(() => [record], [record])
  const shares = useMemo(() => organization?.type === 'supplier'
    ? [revisionDetail?.part?.workspace_share || partDetail?.part?.workspace_share].filter(Boolean)
    : (partDetail?.shares || []).filter(share => idOf(share.supplier_organization) === idOf(record.supplier_organization)), [organization?.type, partDetail, record.supplier_organization, revisionDetail])
  const activeShares = useMemo(() => shares.filter(share => share.state === 'active'), [shares])
  const currentShare = activeShares.find(share => {
    const currentId = idOf(share.current_shared_revision)
    const visible = (share.visible_revisions || []).map(idOf)
    return currentId === revisionId || visible.includes(revisionId)
  }) || activeShares[0] || null
  const currentShareId = shareIdOf(currentShare)
  const relatedCompanyName = organization?.type === 'supplier' ? currentShare?.oem_organization?.name : currentShare?.supplier_organization?.name
  const viewAssets = useMemo(() => ({ model: assets.filter(isViewableModel), drawing: assets.filter(asset => asset.role === 'drawing') }), [assets])
  const selectedVisualAssets = viewAssets[tab] || []
  const revisionCases = useMemo(() => cases.filter(item => revisionIdOf(item) === revisionId && (!currentShareId || idOf(item.share) === currentShareId)), [cases, currentShareId, revisionId])
  const modelCaseMarkers = useMemo(() => buildModelCaseMarkers(anchors, revisionCases), [anchors, revisionCases])
  const viewerCaseMarkers = useMemo(() => modelCaseMarkersForAsset(modelCaseMarkers, viewer.asset), [modelCaseMarkers, viewer.asset])
  const productionCases = useMemo(() => revisionCases.filter(item => (item.production_records || []).some(value => idOf(value) === String(record.id))), [record.id, revisionCases])
  const visibleCases = caseScope === 'production' ? productionCases : revisionCases
  const openCases = visibleCases.filter(item => item.state !== 'closed')
  const myCases = openCases.filter(item => item.current_actor_side === organization?.type)
  const requestedRequirements = requirements.filter(item => item.acknowledgement_requested)
  const acknowledgedIds = new Set((revisionDetail?.review?.requirement_acknowledgements || []).map(item => idOf(item.requirement)))
  const unacknowledged = requestedRequirements.filter(item => !acknowledgedIds.has(idOf(item)))
  const requirementsNeedingAction = organization?.type === 'supplier' ? unacknowledged : []
  const activeInspectionRuns = inspectionRuns.filter(item => !['accepted', 'cancelled'].includes(item.state))
  const inspectionRunsNeedingAction = activeInspectionRuns.filter(item => item.current_actor_side === organization?.type)
  const inspectionRunsWaitingOnPartner = activeInspectionRuns.filter(item => item.current_actor_side !== 'none' && item.current_actor_side !== organization?.type)
  const casesWaitingOnPartner = openCases.filter(item => item.current_actor_side !== 'none' && item.current_actor_side !== organization?.type)
  const supplierReviewOpen = organization?.type === 'supplier' && revisionDetail?.review && revisionDetail.review.state !== 'acknowledged'
  const supplierReviewWaiting = organization?.type === 'oem' && revisionDetail?.review && revisionDetail.review.state !== 'acknowledged'
  const myActionCount = myCases.length + requirementsNeedingAction.length + inspectionRunsNeedingAction.length + (supplierReviewOpen && !requirementsNeedingAction.length ? 1 : 0)
  const partnerActionCount = casesWaitingOnPartner.length + inspectionRunsWaitingOnPartner.length + (organization?.type === 'oem' ? unacknowledged.length + (supplierReviewWaiting && !unacknowledged.length ? 1 : 0) : 0)

  const refresh = useCallback(async () => {
    if (!partId || !revisionId) return
    await Promise.all([
      dispatch(loadPart(partId)),
      dispatch(loadPartRevision(partId, revisionId)),
      dispatch(loadPartCollaboration(partId, { revision_id: revisionId, ...(currentShareId ? { share_id: currentShareId } : {}) })),
    ])
  }, [currentShareId, dispatch, partId, revisionId])

  useEffect(() => {
    if (!partId || !revisionId) return
    Promise.all([
      dispatch(loadPart(partId)),
      dispatch(loadPartRevision(partId, revisionId)),
    ])
  }, [dispatch, partId, revisionId])
  useEffect(() => {
    if (!partId || !revisionId) return
    dispatch(loadPartCollaboration(partId, { revision_id: revisionId, ...(currentShareId ? { share_id: currentShareId } : {}) }))
  }, [currentShareId, dispatch, partId, revisionId])
  useEffect(() => {
    if (!inspectionEnabled) return
    if (partId && revisionId) dispatch(loadInspectionPlan(partId, revisionId))
    if (record.id && inspectionPlanId) dispatch(loadInspectionRuns(record.id))
  }, [dispatch, inspectionEnabled, inspectionPlanId, partId, record.id, revisionId])
  useEffect(() => {
    const requested = String(router.query.part_tab || '')
    if (tabs.some(([key]) => key === requested)) setTab(requested)
  }, [router.query.part_tab, tabs])
  useEffect(() => {
    const collaborationId = String(router.query.collaboration || '')
    if (!collaborationId || caseDrawer.open) return
    setTab('cases')
    setCaseDrawer({ open: true, mode: 'detail', id: collaborationId })
  }, [caseDrawer.open, router.query.collaboration])
  useEffect(() => {
    if (!caseDrawer.open || caseDrawer.mode !== 'detail' || !caseDrawer.id) return
    dispatch(loadPartCollaborationItem(caseDrawer.id))
  }, [caseDrawer, dispatch])

  const selectTab = key => {
    setFeedback(null)
    setTab(key)
    const query = { ...router.query, part_tab: key }
    if (key !== 'cases') delete query.collaboration
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
  }
  const openAsset = useCallback(async (asset, attestation = null) => {
    if (revision?.export_control === 'itar' && !attestation) {
      setItarRequest({ asset, purpose: 'view' })
      return null
    }
    setViewer({ asset, source: '', loading: true })
    const result = await dispatch(requestPartAssetView(partId, revisionId, idOf(asset), attestation || {}))
    if (!result?.ok) {
      setViewer({ asset: null, source: '', loading: false })
      setFeedback({ type: 'error', message: resultError(result, 'The protected file could not be opened.') })
      return result
    }
    setViewer({ asset, source: result.payload.data.view.target, loading: false })
    setItarRequest(null)
    return result
  }, [dispatch, partId, revision?.export_control, revisionId])
  useEffect(() => {
    if (!['model', 'drawing'].includes(tab)) return
    const viewerAssetId = idOf(viewer.asset)
    if (selectedVisualAssets.some(asset => idOf(asset) === viewerAssetId)) return
    if (!selectedVisualAssets.length) {
      setViewer({ asset: null, source: '', loading: false })
      return
    }
    const primary = selectedVisualAssets.find(asset => asset.is_primary)
      || selectedVisualAssets.find(asset => asset.role === (tab === 'model' ? 'primary_model' : 'drawing'))
      || selectedVisualAssets[0]
    const key = `${revisionId}:${tab}:${idOf(primary)}`
    if (autoOpenedAssetRef.current === key) return
    autoOpenedAssetRef.current = key
    openAsset(primary)
  }, [openAsset, revisionId, selectedVisualAssets, tab, viewer.asset])

  const caseVisualItem = caseDetail?.item
  const caseVisualAnchorId = idOf(caseVisualItem?.visual_anchor)
  const caseVisualAsset = caseVisualItem?.source_asset
  const caseVisualAssetId = idOf(caseVisualAsset)
  const caseVisualRevisionId = revisionIdOf(caseVisualItem)
  const caseVisualKey = [caseDrawer.id, caseVisualRevisionId, caseVisualAssetId, caseVisualAnchorId].join(':')
  useEffect(() => {
    if (!caseDrawer.open || caseDrawer.mode !== 'detail' || !caseVisualAnchorId || !caseVisualAssetId || !caseVisualRevisionId) {
      caseVisualRequestRef.current = ''
      setCaseVisual({ asset: null, source: '', loading: false, error: '', protected: false })
      return
    }
    if (caseVisualRequestRef.current === caseVisualKey) return
    caseVisualRequestRef.current = caseVisualKey
    if ((caseVisualItem?.part_revision?.export_control || 'none') === 'itar') {
      setCaseVisual({ asset: caseVisualAsset, source: '', loading: false, error: '', protected: true })
      return
    }
    let cancelled = false
    setCaseVisual({ asset: caseVisualAsset, source: '', loading: true, error: '', protected: false })
    dispatch(requestPartAssetView(partId, caseVisualRevisionId, caseVisualAssetId, {})).then(result => {
      if (cancelled) return
      setCaseVisual(result?.ok
        ? { asset: caseVisualAsset, source: result.payload.data.view.target, loading: false, error: '', protected: false }
        : { asset: caseVisualAsset, source: '', loading: false, error: resultError(result, 'The linked visual could not be displayed.'), protected: false })
    })
    return () => { cancelled = true }
  }, [caseDrawer.mode, caseDrawer.open, caseVisualAnchorId, caseVisualAsset, caseVisualAssetId, caseVisualItem?.part_revision?.export_control, caseVisualKey, caseVisualRevisionId, dispatch, partId])

  const run = async (operation, success) => {
    setFeedback(null)
    const result = await operation()
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'Velakron could not complete this action.') })
    else {
      if (success) setFeedback({ type: 'success', message: success })
      await refresh()
    }
    return result
  }
  const runCase = async (operation, success) => {
    setCaseFeedback(null)
    const result = await operation()
    if (!result?.ok) setCaseFeedback({ type: 'error', message: resultError(result, 'Velakron could not complete this collaboration action.') })
    else {
      if (success) setCaseFeedback({ type: 'success', message: success })
      await refresh()
      if (caseDrawer.id) dispatch(loadPartCollaborationItem(caseDrawer.id))
    }
    return result
  }
  const chooseVisualAnchor = anchor => {
    setPendingAnchor(anchor)
    setAnnotationMode(false)
    setCaseFeedback(null)
    setCaseDrawer({ open: true, mode: 'create', id: '' })
  }
  const focusAnchor = anchor => {
    const assetId = idOf(anchor?.source_asset)
    const asset = assets.find(candidate => idOf(candidate) === assetId)
    setSelectedAnchorId(idOf(anchor))
    if (asset) {
      selectTab(asset.role === 'drawing' ? 'drawing' : 'model')
      if (idOf(viewer.asset) !== assetId) openAsset(asset)
    }
  }
  const createCase = async form => {
    let anchorId = ''
    if (pendingAnchor) {
      const anchorResult = await dispatch(createVisualAnchor(partId, revisionId, {
        kind: pendingAnchor.anchor_kind,
        label: pendingAnchor.label,
        anchor_data: pendingAnchor.anchor_data,
        view_state: pendingAnchor.view_state,
        renderer_version: 'velakron-viewer-v1',
        source_asset_id: idOf(viewer.asset) || null,
        share_id: currentShareId || form.share_id,
      }))
      if (!anchorResult?.ok) {
        setCaseFeedback({ type: 'error', message: resultError(anchorResult, 'The visual reference could not be saved.') })
        return anchorResult
      }
      anchorId = idOf(anchorResult.payload.data.anchor)
    }
    const result = await dispatch(createPartCollaboration({
      ...form,
      share_id: currentShareId || form.share_id,
      revision_id: revisionId,
      production_record_ids: [String(record.id)],
      visual_anchor_id: anchorId || null,
      source_asset_id: pendingAnchor ? idOf(viewer.asset) || null : null,
    }))
    if (!result?.ok) {
      setCaseFeedback({ type: 'error', message: resultError(result, 'The collaboration case could not be created.') })
      return result
    }
    const collaborationId = idOf(result.payload.data.item)
    setPendingAnchor(null)
    setAnnotationMode(false)
    setTab('cases')
    setCaseDrawer({ open: true, mode: 'detail', id: collaborationId })
    await router.replace({ pathname: router.pathname, query: { ...router.query, part_tab: 'cases', collaboration: collaborationId } }, undefined, { shallow: true })
    await refresh()
    return result
  }
  const openCase = item => {
    const collaborationId = idOf(item)
    setCaseFeedback(null)
    setCaseDrawer({ open: true, mode: 'detail', id: collaborationId })
    router.replace({ pathname: router.pathname, query: { ...router.query, part_tab: 'cases', collaboration: collaborationId } }, undefined, { shallow: true })
  }
  const closeCase = async () => {
    const query = { ...router.query, part_tab: 'cases' }
    delete query.collaboration
    await router.replace({ pathname: router.pathname, query }, undefined, { shallow: true })
    setCaseDrawer({ open: false, mode: 'create', id: '' })
    setPendingAnchor(null)
    setAnnotationMode(false)
  }
  const downloadAsset = async (asset, attestation = null) => {
    if (revision?.export_control === 'itar' && !attestation) {
      setItarRequest({ asset, purpose: 'download' })
      return null
    }
    const result = await dispatch(requestPartAssetDownload(partId, revisionId, idOf(asset), attestation || {}))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The protected file could not be downloaded.') })
    else setItarRequest(null)
    return result
  }
  const downloadCaseAttachment = async (file, attestation = null) => {
    if ((revision?.export_control === 'itar' || file?.export_control === 'itar') && !attestation) {
      setItarRequest({ asset: file, purpose: 'download', collaborationAttachment: true })
      return null
    }
    const result = await dispatch(requestCollaborationAttachmentDownload(caseDrawer.id, idOf(file), attestation || {}))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The protected evidence could not be downloaded.') })
    else setItarRequest(null)
    return result
  }

  if (!partId || !revisionId) return <section className='appPanel productionPartWorkspaceFallback'>
    <header className='appPanel__header'><div><p className='technicalLabel'>Production record</p><h2>Production details</h2></div><Info aria-hidden='true' /></header>
    <p>This older production record is not linked to a controlled Part Workspace revision. Its production workflow remains available, and an OEM can create a controlled part definition for future records.</p>
    <ProductionFacts record={record} onEdit={onEditDetails} />
  </section>
  if (!revisionDetail?.revision) return <section className='appPanel productionPartWorkspaceLoading'><RefreshCw className='spin' aria-hidden='true' /><div><strong>Loading part collaboration</strong><p>Opening the controlled revision linked to this production record.</p></div></section>

  const partnerName = relatedCompanyName || (organization?.type === 'supplier' ? 'the OEM' : 'the supplier')
  const responsibilityTitle = myActionCount
    ? `${myActionCount} technical action${myActionCount === 1 ? ' needs' : 's need'} your company`
    : partnerActionCount
      ? `Waiting on ${partnerName}`
      : 'Technical record is up to date'
  const responsibilityDescription = myActionCount
    ? 'Review the complete queue below. Each action remains tied to this production and released revision.'
    : partnerActionCount
      ? `${partnerActionCount} open item${partnerActionCount === 1 ? ' is' : 's are'} currently owned by ${partnerName}. You can still review the technical record and conversation.`
      : 'No open cases, acknowledgements, or inspection decisions are waiting on either company.'
  const requirementTabCount = organization?.type === 'supplier'
    ? requirementsNeedingAction.length + (supplierReviewOpen && !requirementsNeedingAction.length ? 1 : 0)
    : unacknowledged.length
  const tabCount = key => key === 'cases' ? openCases.length : key === 'requirements' ? requirementTabCount : key === 'inspection' ? activeInspectionRuns.length : 0
  const inspectionCheckpointCount = inspectionPlan?.characteristics?.length || 0
  return <>
    <section className='partWorkspaceShell productionPartWorkspace'>
      <header className={`partNextStep${myActionCount ? ' partNextStep--warning' : partnerActionCount ? ' partNextStep--info' : ''}`}>
        <span className='partNextStep__icon'>{myActionCount ? <AlertTriangle aria-hidden='true' /> : partnerActionCount ? <Clock3 aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}</span>
        <div><p className='technicalLabel'>Part collaboration status</p><h2>{responsibilityTitle}</h2><p>{responsibilityDescription}</p>{(myActionCount || partnerActionCount) > 0 && <div className='partNextStep__queue' aria-label='Open technical work'>{openCases.length > 0 && <button type='button' onClick={() => selectTab('cases')}><MessageSquareText aria-hidden='true' /> {openCases.length} case{openCases.length === 1 ? '' : 's'} <span>{myCases.length ? `${myCases.length} yours` : `with ${partnerName}`}</span></button>}{(unacknowledged.length > 0 || supplierReviewOpen) && <button type='button' onClick={() => selectTab('requirements')}><Check aria-hidden='true' /> {unacknowledged.length || 1} acknowledgement{(unacknowledged.length || 1) === 1 ? '' : 's'} <span>{organization?.type === 'supplier' ? 'for your company' : `with ${partnerName}`}</span></button>}{activeInspectionRuns.length > 0 && <button type='button' onClick={() => selectTab('inspection')}><ClipboardCheck aria-hidden='true' /> {activeInspectionRuns.length} inspection stage{activeInspectionRuns.length === 1 ? '' : 's'} <span>{inspectionRunsNeedingAction.length ? `${inspectionRunsNeedingAction.length} yours` : `with ${partnerName}`}</span></button>}</div>}</div>
        {myActionCount > 0 && <div className='partNextStep__action'><Button variant='secondary' onClick={() => selectTab(myCases.length ? 'cases' : requirementsNeedingAction.length || supplierReviewOpen ? 'requirements' : 'inspection')}>Open next action</Button></div>}
      </header>
      <nav className='partWorkspaceTabs productionPartWorkspace__tabs' role='tablist' aria-label='Production part collaboration views'>{tabs.map(([key, label, Icon]) => { const count = tabCount(key); return <button type='button' role='tab' aria-selected={tab === key} key={key} className={tab === key ? 'is-active' : ''} onClick={() => selectTab(key)}><Icon aria-hidden='true' /> {label}{count > 0 && <span>{count}</span>}</button> })}</nav>
      {feedback && <div className='productionPartWorkspace__feedback'><FormMessage type={feedback.type}>{feedback.message}</FormMessage></div>}

      {tab === 'overview' && <section className='partOverview productionPartWorkspace__overview'>
        <article className='partWorkspacePanel partOverview__definition'><header><div><p className='technicalLabel'>Controlled definition</p><h2>Revision {revision.revision}</h2><p>{revision.engineering_note || 'The production record and technical definition are tied together at this exact released revision.'}</p></div></header><dl className='partOverviewFacts'><div><dt>Material</dt><dd>{revision.material || 'Not specified'}</dd></div><div><dt>Finish / coating</dt><dd>{revision.finish || 'Not specified'}</dd></div><div><dt>Process</dt><dd>{revision.process_summary || 'Not specified'}</dd></div><div><dt>Classification</dt><dd>{revision.export_control === 'itar' ? 'ITAR controlled' : 'Standard controlled data'}</dd></div><div><dt>Files</dt><dd>{assets.length}</dd></div><div><dt>Requirements</dt><dd>{requirements.length}</dd></div></dl></article>
        <article className='partWorkspacePanel partOverview__package'><header><div><p className='technicalLabel'>Released package</p><h2>Technical readiness</h2><p>Open the exact source you need without searching across the record.</p></div></header><div className='partPackageNavigator'><button type='button' onClick={() => selectTab('model')}><FileBox aria-hidden='true' /><span><strong>{viewAssets.model.length} model{viewAssets.model.length === 1 ? '' : 's'}</strong><small>{viewAssets.model.length ? 'Primary opens automatically' : 'No viewable model'}</small></span><ChevronRight aria-hidden='true' /></button><button type='button' onClick={() => selectTab('drawing')}><FileText aria-hidden='true' /><span><strong>{viewAssets.drawing.length} drawing{viewAssets.drawing.length === 1 ? '' : 's'}</strong><small>{viewAssets.drawing.length ? 'Primary opens automatically' : 'No drawing released'}</small></span><ChevronRight aria-hidden='true' /></button><button type='button' onClick={() => selectTab('requirements')}><Check aria-hidden='true' /><span><strong>{requirements.length} requirement{requirements.length === 1 ? '' : 's'}</strong><small>{unacknowledged.length ? `${unacknowledged.length} awaiting acknowledgement` : 'Acknowledgements current'}</small></span><ChevronRight aria-hidden='true' /></button>{inspectionEnabled && <button type='button' onClick={() => selectTab('inspection')}><ClipboardCheck aria-hidden='true' /><span><strong>{inspectionCheckpointCount} checkpoint{inspectionCheckpointCount === 1 ? '' : 's'}</strong><small>{activeInspectionRuns.length ? `${activeInspectionRuns.length} active inspection stages` : 'No active inspection stages'}</small></span><ChevronRight aria-hidden='true' /></button>}</div><div className='partOverviewActions'><Button variant='secondary' onClick={() => selectTab('cases')}>Open collaboration</Button>{organization?.type === 'oem' && <Button href={`/app/parts/${partId}?revision=${revisionId}`} variant='secondary'>Configure part workspace</Button>}</div></article>
      </section>}

      {tab === 'details' && <ProductionFacts record={record} onEdit={onEditDetails} />}

      {['model', 'drawing'].includes(tab) && <div className='partVisualWorkspace'>
        <aside className='partAssetRail'><header><p className='technicalLabel'>{tab === 'model' ? 'Model files' : 'Drawing files'}</p><span>{selectedVisualAssets.length}</span></header>{selectedVisualAssets.length ? selectedVisualAssets.map(asset => <button type='button' key={idOf(asset)} className={idOf(viewer.asset) === idOf(asset) ? 'is-active' : ''} onClick={() => openAsset(asset)}><span><strong>{attachmentName(asset)}</strong><small>{formatLabel(asset.role)}{asset.is_primary ? ' · Primary' : ''}</small></span><ChevronRight aria-hidden='true' /></button>) : <div className='partAssetRail__empty'><FileBox aria-hidden='true' /><p>No {tab === 'model' ? 'viewable models' : 'drawings'} on this revision.</p></div>}<footer><button type='button' onClick={() => selectTab('files')}>View every file</button></footer></aside>
        <main className='partViewerStage'><div className='partViewerStage__toolbar'><div><p className='technicalLabel'>Production technical review</p><strong>{viewer.asset ? attachmentName(viewer.asset) : `Open a ${tab}`}</strong></div>{viewer.asset && <div><Button variant={annotationMode ? 'primary' : 'secondary'} onClick={() => setAnnotationMode(value => !value)}><CircleDot aria-hidden='true' /> {annotationMode ? 'Cancel selection' : tab === 'drawing' ? 'Mark drawing area' : 'Select model feature'}</Button><Button variant='secondary' onClick={() => downloadAsset(viewer.asset)}><Download aria-hidden='true' /> Download</Button></div>}</div>{annotationMode && <div className='partViewerSelectionGuide' role='status'><CircleDot aria-hidden='true' /><div><strong>{tab === 'drawing' ? 'Mark the exact drawing context' : 'Select the exact model feature'}</strong><span>{tab === 'drawing' ? 'Click a point or drag a rectangle around the dimension, note, or feature. Velakron will attach the sheet and view to the new case.' : 'Rotate to the relevant area, then click the visible surface. Velakron will preserve the camera and feature reference.'}</span></div><button type='button' onClick={() => setAnnotationMode(false)}>Cancel</button></div>}<PartAssetViewer asset={viewer.asset} source={viewer.source} loading={viewer.loading} annotationMode={annotationMode} anchors={anchors.filter(anchor => !anchor.source_asset || idOf(anchor.source_asset) === idOf(viewer.asset))} caseMarkers={viewerCaseMarkers} selectedAnchorId={selectedAnchorId} onSelect={chooseVisualAnchor} onOpenCase={openCase} /></main>
        <aside className='partContextRail'><section><p className='technicalLabel'>Production snapshot</p><dl><div><dt>Revision</dt><dd>{revision.revision}</dd></div><div><dt>Quantity</dt><dd>{record.quantity} {record.unit === 'other' ? record.unit_other : formatLabel(record.unit)}</dd></div><div><dt>Required arrival</dt><dd>{formatDate(record.required_delivery_date)}</dd></div><div><dt>{organization?.type === 'supplier' ? 'OEM customer' : 'Supplier'}</dt><dd>{relatedCompanyName || 'Not assigned'}</dd></div></dl></section><section><p className='technicalLabel'>Visual references</p>{anchors.length ? <ul>{anchors.map(anchor => <li key={idOf(anchor)}><button type='button' onClick={() => focusAnchor(anchor)} aria-current={selectedAnchorId === idOf(anchor) ? 'true' : undefined}>{anchor.label || formatLabel(anchor.kind)}</button></li>)}</ul> : <p>No anchored cases yet.</p>}</section></aside>
      </div>}

      {tab === 'requirements' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Released requirements</p><h2>Revision {revision.revision} requirements</h2><p>These requirements belong to the immutable revision used by this production record.</p></div></header>{requestedRequirements.length > 0 && <div className='partRequirementProgress'><div><p className='technicalLabel'>{organization?.type === 'supplier' ? 'Your acknowledgement progress' : `${partnerName} acknowledgement progress`}</p><strong>{acknowledgedIds.size} of {requestedRequirements.length} requested requirements acknowledged</strong></div><progress max={requestedRequirements.length} value={Math.min(acknowledgedIds.size, requestedRequirements.length)} aria-label={`${acknowledgedIds.size} of ${requestedRequirements.length} requested requirements acknowledged`} /></div>}{requirements.length ? <div className='partRequirementList'>{requirements.map((item, index) => { const acknowledged = acknowledgedIds.has(idOf(item)); return <article key={idOf(item)}><span className='partRequirementList__index'>{String(index + 1).padStart(2, '0')}</span><div><div className='partRequirementList__title'><StatusBadge tone='info'>{formatLabel(item.type)}</StatusBadge><h3>{item.title}</h3>{item.acknowledgement_requested && <StatusBadge tone={acknowledged ? 'success' : 'warning'}>{acknowledged ? 'Acknowledged' : 'Acknowledgement requested'}</StatusBadge>}</div><p>{item.body}</p>{item.source_reference && <small>Source: {item.source_reference}</small>}</div>{organization?.type === 'supplier' && item.acknowledgement_requested && <div className='partRequirementList__actions'><Button variant='secondary' disabled={acknowledged || mutating} onClick={() => run(() => dispatch(acknowledgePartRequirement(revisionDetail.review.id, idOf(item))), 'Requirement acknowledged.')}>{acknowledged ? 'Acknowledged' : 'Acknowledge requirement'}</Button></div>}</article>})}</div> : <div className='partWorkspaceEmpty'><Check aria-hidden='true' /><h3>No structured requirements</h3><p>The released files remain the controlled technical definition.</p></div>}
        {revisionDetail.review && <div className='partReviewPanel'><div><p className='technicalLabel'>{organization?.type === 'supplier' ? 'Complete technical package review' : 'Supplier technical package review'}</p><h3>{organization?.type === 'supplier' ? `Step ${revisionDetail.review.state === 'not_started' ? '1' : unacknowledged.length ? '2' : revisionDetail.review.state === 'acknowledged' ? 'Complete' : '3'} · ${formatLabel(revisionDetail.review.state)}` : formatLabel(revisionDetail.review.state)}</h3><p>{organization?.type === 'supplier' ? 'Start the review, acknowledge every specifically requested requirement, then acknowledge the complete released package. Production acceptance remains a separate commitment.' : `${partnerName} has acknowledged ${acknowledgedIds.size} of ${requestedRequirements.length} requested requirements. Revision acknowledgement confirms review of the complete released package.`}</p>{organization?.type === 'supplier' && revisionDetail.review.state !== 'acknowledged' && <ol className='partReviewSteps'><li className={revisionDetail.review.state !== 'not_started' ? 'is-complete' : 'is-current'}><span>1</span>Start technical review</li><li className={unacknowledged.length === 0 ? 'is-complete' : revisionDetail.review.state !== 'not_started' ? 'is-current' : ''}><span>2</span>Acknowledge requested requirements</li><li className={revisionDetail.review.state === 'acknowledged' ? 'is-complete' : revisionDetail.review.state !== 'not_started' && unacknowledged.length === 0 ? 'is-current' : ''}><span>3</span>Acknowledge released package</li></ol>}</div>{organization?.type === 'supplier' && <div>{revisionDetail.review.state === 'not_started' && <Button onClick={() => run(() => dispatch(startPartReview(revisionDetail.review.id)), 'Technical review started.')}>Start technical review</Button>}{['not_started', 'in_review', 'changes_requested'].includes(revisionDetail.review.state) && <Button variant='secondary' onClick={() => setReviewChangesOpen(true)}>Request changes</Button>}{['in_review', 'changes_requested'].includes(revisionDetail.review.state) && <Button disabled={unacknowledged.length > 0 || mutating} onClick={() => run(() => dispatch(acknowledgePartRevision(revisionDetail.review.id)), 'Released package acknowledged.')}>Acknowledge released package</Button>}</div>}</div>}
      </section>}

      {inspectionEnabled && tab === 'inspection' && <div className='productionInspectionWorkspace'><InspectionPlanPanel partId={partId} revisionId={revisionId} revision={revision} organizationType={organization?.type} readOnly configureHref={organization?.type === 'oem' ? `/app/parts/${partId}?revision=${revisionId}&tab=inspection` : ''} onOpenAnchor={focusAnchor} /><InspectionQualityPanel production={record} organizationType={organization?.type} embedded /></div>}

      {tab === 'cases' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Production technical record</p><h2>Cases and messages</h2><p>Questions, decisions, evidence, and visual references stay tied to this production and released revision.</p></div>{canCreateCase && currentShare && <Button onClick={() => setCaseDrawer({ open: true, mode: 'create', id: '' })}><Plus aria-hidden='true' /> New case</Button>}</header><div className='productionCaseScope'><button type='button' className={caseScope === 'production' ? 'is-active' : ''} onClick={() => setCaseScope('production')}>This production <span>{productionCases.length}</span></button><button type='button' className={caseScope === 'revision' ? 'is-active' : ''} onClick={() => setCaseScope('revision')}>All revision {revision.revision} cases <span>{revisionCases.length}</span></button></div>{visibleCases.length ? <div className='partCaseList'>{visibleCases.map(item => { const mine = item.current_actor_side === organization?.type; const linkedToProduction = (item.production_records || []).some(value => idOf(value) === String(record.id)); return <button type='button' key={idOf(item)} onClick={() => openCase(item)}><div><span className='technicalLabel'>{formatLabel(item.type)} · Revision {item.part_revision?.revision || revision.revision}</span><strong>{item.title}</strong><small>{item.visual_anchor ? 'Visual reference attached' : linkedToProduction ? 'Linked to this production' : 'Revision-level'} · Updated {formatDateTime(item.last_activity_at)}</small><span className={`partCaseList__owner${mine ? ' is-mine' : ''}`}>{item.current_actor_side === 'none' ? 'No next action' : mine ? 'Your company owns the next step' : `Waiting on ${relatedCompanyName || 'the other company'}`}</span></div><div><StatusBadge tone={statusTone(item.state)}>{formatLabel(item.state)}</StatusBadge><StatusBadge tone={item.priority === 'high' ? 'danger' : item.priority === 'normal' ? 'warning' : 'neutral'}>{formatLabel(item.priority)}</StatusBadge><ChevronRight aria-hidden='true' /></div></button>})}</div> : <div className='partWorkspaceEmpty'><MessageSquareText aria-hidden='true' /><h3>{caseScope === 'production' ? 'No cases linked to this production' : 'No cases on this revision'}</h3><p>Create a case from this production, or switch scope to review broader revision history.</p></div>}</section>}

      {tab === 'files' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Released technical package</p><h2>Files for revision {revision.revision}</h2><p>File authoring remains in the OEM Part Workspace. Both companies can view the released package here.</p></div></header>{assets.length ? <div className='partFileList'>{assets.map(asset => <article key={idOf(asset)}><FileBox aria-hidden='true' /><div><strong>{attachmentName(asset)}</strong><span>{formatLabel(asset.role)} · {((asset.attachment?.byte_size || 0) / 1024).toFixed(1)} KB</span>{asset.attachment?.state !== 'available' && <StatusBadge tone='warning'>{formatLabel(asset.attachment?.state)}</StatusBadge>}</div><div>{(isViewableModel(asset) || asset.role === 'drawing') && <Button variant='secondary' onClick={() => { selectTab(asset.role === 'drawing' ? 'drawing' : 'model'); openAsset(asset) }}>View</Button>}<Button variant='secondary' onClick={() => downloadAsset(asset)}><Download aria-hidden='true' /> Download</Button></div></article>)}</div> : <div className='partWorkspaceEmpty'><FileUp aria-hidden='true' /><h3>No files on this released revision</h3></div>}</section>}
    </section>

    <PartCaseDrawer open={caseDrawer.open} mode={caseDrawer.mode} itemDetail={caseDetail} shares={currentShare ? [currentShare] : []} productionRecords={productionRecords} defaultProductionRecordIds={defaultProductionRecordIds} lockProductionContext selectedAnchor={pendingAnchor} sourceAsset={viewer.asset} linkedVisual={caseVisual} itarControlled={revision.export_control === 'itar'} pending={mutating} upload={upload} feedback={caseFeedback} organizationType={organization?.type} relatedCompanyName={relatedCompanyName} onClose={closeCase} onRequestAnchor={() => { closeCase(); setAnnotationMode(true); selectTab(viewer.asset?.role === 'drawing' ? 'drawing' : 'model'); setFeedback({ type: 'info', message: `${viewer.asset?.role === 'drawing' ? 'Drawing selection' : 'Model feature selection'} is active. Capture the exact technical context for the new case.` }) }} onOpenAnchor={focusAnchor} onCreate={createCase} onMessage={body => runCase(() => dispatch(postPartCollaborationMessage(caseDrawer.id, body)), 'Reply added.')} onUpdate={payload => runCase(() => dispatch(updatePartCollaboration(caseDrawer.id, payload)), 'Responsibility updated.')} onAction={(action, note) => runCase(() => dispatch(applyPartCollaborationAction(caseDrawer.id, { action, note, version: caseDetail.item.version })), 'Workflow decision recorded.')} onUpload={(file, itar) => runCase(() => dispatch(uploadPartCollaborationAttachment(caseDrawer.id, { file, itar: revision.export_control === 'itar' ? itar : {} })), 'Evidence attached.')} onDownloadAttachment={downloadCaseAttachment} onArchive={item => { const reason = window.prompt('Why is this closed case being archived?'); if (!reason) return null; return runCase(() => dispatch(archivePartCollaboration(idOf(item), { reason, version: item.version })), 'Closed case archived.').then(result => { if (result?.ok) closeCase(); return result }) }} onPromote={payload => runCase(() => dispatch(promotePartCollaboration(caseDrawer.id, { ...payload, production_record_id: String(record.id) })), 'Case promoted to production attention.')} />
    <ResponsiveDrawer open={reviewChangesOpen} title='Request revision changes' onClose={() => setReviewChangesOpen(false)}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); const note = event.currentTarget.elements.note.value; run(() => dispatch(requestPartReviewChanges(revisionDetail.review.id, note)), 'Change request sent to the OEM.').then(result => { if (result?.ok) setReviewChangesOpen(false) }) }}><label className='textAreaField' htmlFor='production-review-note'><span>Requested change</span><textarea id='production-review-note' name='note' required minLength={3} /></label><footer><Button variant='secondary' onClick={() => setReviewChangesOpen(false)}>Cancel</Button><Button type='submit' disabled={mutating}>Send request</Button></footer></form></ResponsiveDrawer>
    <ItarAccessDialog file={itarRequest?.asset?.attachment || itarRequest?.asset} purpose={itarRequest?.purpose} open={Boolean(itarRequest)} pending={itarPending} feedback={feedback?.type === 'error' ? feedback : null} onClose={() => setItarRequest(null)} onConfirm={async attestation => { setItarPending(true); const result = itarRequest.collaborationAttachment ? await downloadCaseAttachment(itarRequest.asset, attestation) : itarRequest.purpose === 'view' ? await openAsset(itarRequest.asset, attestation) : await downloadAsset(itarRequest.asset, attestation); setItarPending(false); return result }} />
  </>
}

export default ProductionPartWorkspace
