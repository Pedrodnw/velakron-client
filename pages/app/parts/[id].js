import { AlertTriangle, ArrowLeft, Box, Check, CheckCircle2, ChevronRight, CircleDot, ClipboardCheck, Clock3, Copy, Download, Eye, FileBox, FileText, FileUp, History, Info, Layers3, LoaderCircle, MessageSquareText, Pencil, Plus, RefreshCw, Send, Share2, ShieldAlert, Trash2, UsersRound } from 'lucide-react'
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
import { formatDate, formatDateTime, formatLabel, statusTone } from '../../../components/app/formatters'
import ItarAccessDialog from '../../../components/app/ItarAccessDialog'
import InspectionPlanPanel from '../../../components/app/InspectionPlanPanel'
import PartAssetViewer from '../../../components/app/PartAssetViewer'
import PartCaseDrawer from '../../../components/app/PartCaseDrawer'
import PortalPageLayout from '../../../components/app/PortalPageLayout'
import Seo from '../../../components/Seo'
import FormField from '../../../components/auth/FormField'
import FormMessage from '../../../components/auth/FormMessage'
import { resultError } from '../../../components/auth/utils'
import { Button } from '../../../components/design-system'
import { getActiveOrganization, getFeatureEnabled, getHasPermission } from '../../../store/slices/appContext'
import { isViewableModel, suggestedPartAssetRole } from '../../../store/modelFiles'
import {
  acknowledgePartRequirement,
  acknowledgePartRevision,
  addPartRequirement,
  applyPartCollaborationAction,
  archivePart,
  archivePartCollaboration,
  carryPartVisualAnchor,
  clonePartRevision,
  createPartCollaboration,
  createVisualAnchor,
  exportPartDecisionRegister,
  endPartShare,
  loadPart,
  loadPartCollaboration,
  loadPartCollaborationItem,
  loadPartHistory,
  loadPartRevision,
  partSelectors,
  postPartCollaborationMessage,
  promotePartCollaboration,
  releasePartRevision,
  requestPartAssetDownload,
  requestPartAssetView,
  requestCollaborationAttachmentDownload,
  requestPartReviewChanges,
  removePartRequirement,
  sharePart,
  startPartReview,
  updatePartRevision,
  updatePartRequirement,
  updatePartShare,
  updatePartCollaboration,
  uploadPartAsset,
  uploadPartCollaborationAttachment,
  validatePartRevision,
  withdrawPartRevision,
} from '../../../store/slices/entities/parts'
import { loadRelationships, relationshipSelectors } from '../../../store/slices/entities/relationships'

const TABS = [
  ['overview', 'Overview', Box],
  ['model', '3D model', FileBox],
  ['drawing', 'Drawing', FileText],
  ['requirements', 'Requirements', Check],
  ['inspection', 'Inspection', ClipboardCheck],
  ['cases', 'Cases & messages', MessageSquareText],
  ['files', 'Files', FileUp],
  ['history', 'History', History],
]

const attachmentName = asset => asset?.attachment?.display_filename || asset?.attachment?.original_filename || asset?.label || 'Technical file'
const relatedOrganization = (relationship, activeType) => {
  const organization = activeType === 'supplier' ? relationship?.oem_organization : relationship?.supplier_organization
  return organization && !organization.id && organization._id ? { ...organization, id: organization._id } : organization
}
const revisionIdOf = revision => String(revision?.id || revision?._id || '')
const shareIdOf = share => String(share?.id || share?._id || '')
const caseRevisionIdOf = item => String(item?.part_revision?.id || item?.part_revision?._id || item?.part_revision || '')
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
  const canCreateCase = useSelector(getHasPermission('part.collaboration.create'))
  const relationships = useSelector(relationshipSelectors.getEntities)
  const detail = useSelector(partSelectors.getDetailById(id))
  const loading = useSelector(partSelectors.getDetailLoading)
  const mutating = useSelector(partSelectors.getMutating)
  const upload = useSelector(partSelectors.getUpload)
  const error = useSelector(partSelectors.getError)
  const cases = useSelector(partSelectors.getCollaborationByPart(id))
  const history = useSelector(partSelectors.getHistoryByPart(id))
  const [revisionId, setRevisionId] = useState('')
  const revisionDetail = useSelector(partSelectors.getRevisionDetail(revisionId))
  const [tab, setTab] = useState('overview')
  const [viewer, setViewer] = useState({ asset: null, source: '', loading: false })
  const [caseVisual, setCaseVisual] = useState({ asset: null, source: '', loading: false, error: '', protected: false })
  const autoOpenedAssetRef = useRef('')
  const caseVisualRequestRef = useRef('')
  const [selectedAnchorId, setSelectedAnchorId] = useState('')
  const [pendingAnchor, setPendingAnchor] = useState(null)
  const [inspectionAnchor, setInspectionAnchor] = useState(null)
  const [inspectionAnchorRequest, setInspectionAnchorRequest] = useState(false)
  const [annotationMode, setAnnotationMode] = useState(false)
  const [caseDrawer, setCaseDrawer] = useState({ open: false, mode: 'create', id: '' })
  const caseDetail = useSelector(partSelectors.getCollaborationDetail(caseDrawer.id))
  const [drawer, setDrawer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [caseFeedback, setCaseFeedback] = useState(null)
  const [itarRequest, setItarRequest] = useState(null)
  const [itarPending, setItarPending] = useState(false)
  const [requirement, setRequirement] = useState({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false, version: 0 })
  const [requirementEditId, setRequirementEditId] = useState('')
  const [assetUpload, setAssetUpload] = useState(emptyAssetUpload)
  const [revisionForm, setRevisionForm] = useState({ revision: '', material: '', finish: '', process_summary: '', engineering_note: '', export_control: 'none' })
  const [cloneLabel, setCloneLabel] = useState('')
  const [shareForm, setShareForm] = useState({ relationship_id: '', revision_id: '' })
  const [carryRequest, setCarryRequest] = useState(null)
  const [carryForm, setCarryForm] = useState({ target_revision_id: '', reason: '' })
  const [caseFilters, setCaseFilters] = useState({ search: '', type: 'all', state: 'active', responsibility: 'all', scope: 'revision' })
  const [releaseValidation, setReleaseValidation] = useState({ loading: false, valid: false, errors: [], warnings: [] })
  const [releaseConfirmed, setReleaseConfirmed] = useState(false)
  const tabs = useMemo(() => TABS.filter(([key]) => key !== 'inspection' || inspectionEnabled), [inspectionEnabled])

  const refresh = useCallback(async () => {
    if (!id) return
    const result = await dispatch(loadPart(id))
    dispatch(loadPartCollaboration(id))
    dispatch(loadPartHistory(id))
    return result
  }, [dispatch, id])

  useEffect(() => { if (allowed && id && organization?.id) refresh() }, [allowed, id, organization?.id, refresh])
  useEffect(() => { if (allowed && organization?.type === 'oem' && organization?.id) dispatch(loadRelationships(organization.id)) }, [allowed, dispatch, organization?.id, organization?.type])
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
    setPendingAnchor(null)
    setInspectionAnchor(null)
    setInspectionAnchorRequest(false)
    setSelectedAnchorId('')
    setFeedback(null)
    setCaseFeedback(null)
  }, [dispatch, id, revisionId])
  useEffect(() => {
    const revision = revisionDetail?.revision
    if (!revision) return
    setRevisionForm({ revision: revision.revision || '', material: revision.material || '', finish: revision.finish || '', process_summary: revision.process_summary || '', engineering_note: revision.engineering_note || '', export_control: revision.export_control || 'none' })
    setShareForm(current => ({ ...current, revision_id: revisionId }))
  }, [revisionDetail?.revision, revisionId])
  useEffect(() => {
    if (!caseDrawer.open || caseDrawer.mode !== 'detail' || !caseDrawer.id) return
    dispatch(loadPartCollaborationItem(caseDrawer.id))
  }, [caseDrawer, dispatch])
  useEffect(() => {
    const collaborationId = String(router.query.collaboration || '')
    if (!collaborationId || caseDrawer.open) return
    setTab('cases')
    setCaseDrawer({ open: true, mode: 'detail', id: collaborationId })
  }, [caseDrawer.open, router.query.collaboration])
  useEffect(() => {
    const requestedTab = String(router.query.tab || '')
    if (tabs.some(([key]) => key === requestedTab)) setTab(requestedTab)
  }, [router.query.tab, tabs])

  const revisions = detail?.revisions || []
  const revision = revisionDetail?.revision
  const assets = revisionDetail?.assets || []
  const anchors = revisionDetail?.anchors || []
  const productionRecords = revisionDetail?.production_records || []
  const shares = useMemo(() => organization?.type === 'supplier'
    ? [revisionDetail?.part?.workspace_share || detail?.part?.workspace_share].filter(Boolean)
    : (detail?.shares || []), [detail, organization?.type, revisionDetail])
  const activeShares = shares.filter(share => share.state === 'active')
  const currentShare = activeShares.find(share => shareIdOf(share) === shareForm.relationship_id) || activeShares[0] || null
  const viewAssets = useMemo(() => ({
    model: assets.filter(isViewableModel),
    drawing: assets.filter(asset => asset.role === 'drawing'),
  }), [assets])
  const selectedVisualAssets = viewAssets[tab] || []
  const allowedActions = revisionDetail?.allowed_actions || detail?.allowed_actions || {}
  const revisionCases = useMemo(() => cases.filter(item => caseRevisionIdOf(item) === revisionId), [cases, revisionId])
  const openRevisionCases = revisionCases.filter(item => item.state !== 'closed')
  const myRevisionCases = openRevisionCases.filter(item => item.current_actor_side === organization?.type)
  const requestedRequirements = (revisionDetail?.requirements || []).filter(item => item.acknowledgement_requested)
  const acknowledgedRequirementIds = new Set((revisionDetail?.review?.requirement_acknowledgements || []).map(item => String(item.requirement?.id || item.requirement?._id || item.requirement)))
  const acknowledgedRequirementCount = requestedRequirements.filter(item => acknowledgedRequirementIds.has(String(item.id || item._id))).length
  const unacknowledgedRequirementCount = requestedRequirements.length - acknowledgedRequirementCount
  const draftRevision = revisions.find(item => item.lifecycle_state === 'draft')
  const relatedCompanyNames = organization?.type === 'supplier'
    ? [currentShare?.oem_organization?.name].filter(Boolean)
    : activeShares.map(item => item.supplier_organization?.name).filter(Boolean)
  const relatedCompanyLabel = relatedCompanyNames.length ? relatedCompanyNames.join(', ') : organization?.type === 'supplier' ? 'OEM customer' : 'No Supplier has access yet'
  const visibleCases = useMemo(() => cases.filter(item => {
    if (caseFilters.scope === 'revision' && caseRevisionIdOf(item) !== revisionId) return false
    const search = caseFilters.search.trim().toLowerCase()
    if (search && !`${item.title || ''} ${item.description || ''}`.toLowerCase().includes(search)) return false
    if (caseFilters.type !== 'all' && item.type !== caseFilters.type) return false
    if (caseFilters.state === 'active' && item.state === 'closed') return false
    if (caseFilters.state !== 'all' && caseFilters.state !== 'active' && item.state !== caseFilters.state) return false
    if (caseFilters.responsibility === 'mine' && item.current_actor_side !== organization?.type) return false
    if (caseFilters.responsibility === 'other' && item.current_actor_side === organization?.type) return false
    return true
  }), [caseFilters, cases, organization?.type, revisionId])
  useEffect(() => {
    if (organization?.type !== 'supplier' || !revisionDetail?.revision) return
    const collaborationId = String(router.query.collaboration || '')
    const collaborationItem = collaborationId
      ? caseDetail?.item || cases.find(item => collaborationIdOf(item) === collaborationId)
      : null
    if (collaborationId && !collaborationItem) return
    const productionId = collaborationIdOf(collaborationItem?.production_records?.[0]) || collaborationIdOf(productionRecords[0])
    if (!productionId) {
      router.replace('/app/production')
      return
    }
    router.replace(`/app/production/${productionId}?part_tab=${collaborationId ? 'cases' : 'overview'}${collaborationId ? `&collaboration=${encodeURIComponent(collaborationId)}` : ''}`)
  }, [caseDetail?.item, cases, organization?.type, productionRecords, revisionDetail?.revision, router, router.query.collaboration])
  useEffect(() => {
    const caseRevisionId = caseRevisionIdOf(caseDetail?.item)
    if (!caseRevisionId || caseRevisionId === revisionId || !revisions.some(item => revisionIdOf(item) === caseRevisionId)) return
    setRevisionId(caseRevisionId)
  }, [caseDetail?.item, revisionId, revisions])

  const reloadRevision = async () => {
    await Promise.all([dispatch(loadPart(id)), dispatch(loadPartRevision(id, revisionId)), dispatch(loadPartCollaboration(id)), dispatch(loadPartHistory(id))])
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
  const runCase = async (operation, success) => {
    setCaseFeedback(null)
    const result = await operation()
    if (!result?.ok) {
      setCaseFeedback({ type: 'error', message: resultError(result, 'Velakron could not complete this collaboration action.') })
      return result
    }
    if (success) setCaseFeedback({ type: 'success', message: success })
    await reloadRevision()
    if (caseDrawer.id) dispatch(loadPartCollaborationItem(caseDrawer.id))
    return result
  }
  const openDrawer = name => {
    setFeedback(null)
    if (name === 'asset') setAssetUpload(emptyAssetUpload)
    setDrawer(name)
  }
  const openCreateCase = () => {
    setFeedback(null)
    setCaseFeedback(null)
    setCaseDrawer({ open: true, mode: 'create', id: '' })
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
    setPendingAnchor(null)
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

  const caseVisualItem = caseDetail?.item
  const caseVisualAnchorId = String(caseVisualItem?.visual_anchor?.id || caseVisualItem?.visual_anchor?._id || '')
  const caseVisualAsset = caseVisualItem?.source_asset
  const caseVisualAssetId = String(caseVisualAsset?.id || caseVisualAsset?._id || caseVisualAsset || '')
  const caseVisualRevisionId = caseRevisionIdOf(caseVisualItem)
  const caseVisualExportControl = caseVisualItem?.part_revision?.export_control || 'none'
  const caseVisualKey = [caseDrawer.id, caseVisualRevisionId, caseVisualAssetId, caseVisualAnchorId].join(':')
  useEffect(() => {
    if (!caseDrawer.open || caseDrawer.mode !== 'detail' || !caseVisualAnchorId || !caseVisualAssetId || !caseVisualRevisionId) {
      caseVisualRequestRef.current = ''
      setCaseVisual({ asset: null, source: '', loading: false, error: '', protected: false })
      return
    }
    if (caseVisualRequestRef.current === caseVisualKey) return
    caseVisualRequestRef.current = caseVisualKey
    if (caseVisualExportControl === 'itar') {
      setCaseVisual({ asset: caseVisualAsset, source: '', loading: false, error: '', protected: true })
      return
    }
    let cancelled = false
    setCaseVisual({ asset: caseVisualAsset, source: '', loading: true, error: '', protected: false })
    dispatch(requestPartAssetView(id, caseVisualRevisionId, caseVisualAssetId, {})).then(result => {
      if (cancelled) return
      if (!result?.ok) {
        setCaseVisual({ asset: caseVisualAsset, source: '', loading: false, error: resultError(result, 'The linked visual could not be displayed.'), protected: false })
        return
      }
      setCaseVisual({ asset: caseVisualAsset, source: result.payload.data.view.target, loading: false, error: '', protected: false })
    })
    return () => { cancelled = true }
  }, [caseDrawer.mode, caseDrawer.open, caseVisualAnchorId, caseVisualAssetId, caseVisualExportControl, caseVisualKey, caseVisualRevisionId, dispatch, id])
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

  const downloadCollaborationAttachment = async (file, attestation = null) => {
    if ((revision?.export_control === 'itar' || file?.export_control === 'itar') && !attestation) {
      setItarRequest({ asset: file, purpose: 'download', collaborationAttachment: true })
      return null
    }
    const result = await dispatch(requestCollaborationAttachmentDownload(caseDrawer.id, file.id || file._id, attestation || {}))
    if (!result?.ok) setFeedback({ type: 'error', message: resultError(result, 'The protected evidence could not be downloaded.') })
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
    if (inspectionAnchorRequest) {
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
    if (carryRequest) {
      if (!viewer.asset) {
        setFeedback({ type: 'error', message: 'Open the corresponding target revision file before placing the carried reference.' })
        return
      }
      const result = await run(() => dispatch(carryPartVisualAnchor(
        id,
        carryRequest.source_revision_id,
        carryRequest.source_anchor.id || carryRequest.source_anchor._id,
        {
          target_revision_id: revisionId,
          target_asset_id: viewer.asset.id || viewer.asset._id,
          anchor_data: anchor.anchor_data,
          view_state: anchor.view_state,
          renderer_version: 'velakron-viewer-v1',
          label: anchor.label,
          reason: carryRequest.reason,
        },
      )), 'Visual reference carried forward with an explicit audited link.', { close: false })
      if (result?.ok) {
        setCarryRequest(null)
        setAnnotationMode(false)
        setSelectedAnchorId(result.payload.data.anchor.id)
      }
      return
    }
    setPendingAnchor(anchor)
    setAnnotationMode(false)
    setFeedback(null)
    setCaseFeedback(null)
    setCaseDrawer({ open: true, mode: 'create', id: '' })
  }

  const createCase = async form => {
    let anchorId = ''
    if (pendingAnchor) {
      const anchorResult = await dispatch(createVisualAnchor(id, revisionId, {
        kind: pendingAnchor.anchor_kind,
        label: pendingAnchor.label,
        anchor_data: pendingAnchor.anchor_data,
        view_state: pendingAnchor.view_state,
        renderer_version: 'velakron-viewer-v1',
        source_asset_id: viewer.asset?.id || viewer.asset?._id || null,
        share_id: form.share_id,
      }))
      if (!anchorResult?.ok) {
        setCaseFeedback({ type: 'error', message: resultError(anchorResult, 'The visual reference could not be saved.') })
        return anchorResult
      }
      anchorId = anchorResult.payload.data.anchor.id
    }
    const result = await dispatch(createPartCollaboration({
      ...form,
      revision_id: revisionId,
      visual_anchor_id: anchorId || null,
      source_asset_id: viewer.asset?.id || viewer.asset?._id || null,
    }))
    if (!result?.ok) {
      setCaseFeedback({ type: 'error', message: resultError(result, 'The collaboration case could not be created.') })
      return result
    }
    setCaseFeedback({ type: 'success', message: 'Collaboration case created and routed to the other company.' })
    setPendingAnchor(null)
    setAnnotationMode(false)
    setCaseDrawer({ open: true, mode: 'detail', id: result.payload.data.item.id })
    await reloadRevision()
    return result
  }

  const openCase = caseItem => {
    setFeedback(null)
    setCaseFeedback(null)
    const anchor = caseItem.visual_anchor
    if (anchor) focusAnchor(anchor)
    const collaborationId = collaborationIdOf(caseItem)
    setCaseDrawer({ open: true, mode: 'detail', id: collaborationId })
    router.replace({ pathname: router.pathname, query: { ...router.query, collaboration: collaborationId } }, undefined, { shallow: true })
  }
  const closeCaseDrawer = async () => {
    if (router.query.collaboration) {
      const nextQuery = { ...router.query }
      delete nextQuery.collaboration
      await router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true })
    }
    setCaseDrawer({ open: false, mode: 'create', id: '' })
    setCaseFeedback(null)
    setAnnotationMode(false)
    setPendingAnchor(null)
  }

  if (!enabled || !allowed) return <PermissionDenied />
  if (organization?.type === 'supplier') return <section className='appPanel'><AppSkeleton lines={8} /></section>
  if (loading && !detail) return <section className='appPanel'><AppSkeleton lines={10} /></section>
  if (error?.code === 'NOT_FOUND') return <ResourceNotFound />
  if (!detail?.part) return <ErrorState description={error?.message || 'Part workspace could not be loaded.'} onRetry={refresh} />

  const part = detail.part
  const revisionShares = activeShares.filter(share => {
    const currentId = revisionIdOf(share.current_shared_revision)
    const visibleIds = (share.visible_revisions || []).map(value => String(value?.id || value?._id || value))
    return currentId === revisionId || visibleIds.includes(revisionId)
  })
  const releaseChecks = [
    { label: 'At least one verified technical file', pass: assets.length > 0 && assets.every(asset => asset.attachment?.state === 'available'), required: true },
    { label: 'Primary 3D model or drawing for visual review', pass: assets.some(asset => ['primary_model', 'drawing'].includes(asset.role)), required: false },
    { label: 'Structured requirements recorded', pass: (revisionDetail?.requirements || []).length > 0, required: false },
    { label: 'Engineering note explains this revision', pass: Boolean(revision?.engineering_note?.trim()), required: false },
    { label: revision?.export_control === 'itar' ? 'ITAR classification and protected handling enabled' : 'Standard controlled-data classification confirmed', pass: true, required: true },
  ]
  let nextStep = {
    tone: 'neutral', eyebrow: 'Workspace status', title: 'Technical record is up to date',
    description: 'No action is currently assigned to your company on this revision.', action: null,
  }
  if (revision?.lifecycle_state === 'draft') nextStep = {
    tone: 'draft', eyebrow: 'OEM next step', title: 'Complete the draft definition',
    description: `${assets.length} file${assets.length === 1 ? '' : 's'} and ${(revisionDetail?.requirements || []).length} requirement${(revisionDetail?.requirements || []).length === 1 ? '' : 's'} are recorded. Review the package before creating its immutable release.`,
    action: assets.length ? { label: 'Review release', kind: 'release' } : { label: 'Upload first file', kind: 'tab', tab: 'files' },
  }
  else if (organization.type === 'supplier' && unacknowledgedRequirementCount > 0) nextStep = {
    tone: 'warning', eyebrow: 'Supplier next step', title: `${unacknowledgedRequirementCount} requirement${unacknowledgedRequirementCount === 1 ? '' : 's'} need acknowledgement`,
    description: `You have completed ${acknowledgedRequirementCount} of ${requestedRequirements.length} requested acknowledgements for revision ${revision?.revision}.`,
    action: { label: 'Review requirements', kind: 'tab', tab: 'requirements' },
  }
  else if (organization.type === 'supplier' && revisionDetail?.review?.state === 'not_started') nextStep = {
    tone: 'info', eyebrow: 'Supplier next step', title: 'Begin revision review',
    description: `Review the files and requirements from ${relatedCompanyLabel}, then acknowledge the complete revision or request changes.`,
    action: { label: 'Start review', kind: 'start-review' },
  }
  else if (organization.type === 'supplier' && ['in_review', 'changes_requested'].includes(revisionDetail?.review?.state)) nextStep = {
    tone: 'info', eyebrow: 'Supplier next step', title: 'Complete the revision review',
    description: 'The package is in review. Record a change request or acknowledge the revision when the definition is complete.',
    action: { label: 'Open review', kind: 'tab', tab: 'requirements' },
  }
  else if (myRevisionCases.length > 0) nextStep = {
    tone: 'warning', eyebrow: 'Collaboration next step', title: `${myRevisionCases.length} case${myRevisionCases.length === 1 ? '' : 's'} assigned to your company`,
    description: `Open the selected revision's collaboration record and respond to the ${myRevisionCases.length === 1 ? 'item' : 'items'} awaiting your company.`,
    action: { label: 'Open your cases', kind: 'cases' },
  }
  else if (organization.type === 'oem' && revision?.lifecycle_state === 'released' && revisionShares.length === 0) nextStep = {
    tone: 'info', eyebrow: 'OEM next step', title: 'Share the released definition',
    description: 'This immutable revision is ready, but no active Supplier room currently has access to it.',
    action: { label: 'Share revision', kind: 'share' },
  }
  else if (openRevisionCases.length > 0) nextStep = {
    tone: 'neutral', eyebrow: 'Current responsibility', title: `Waiting on ${relatedCompanyLabel}`,
    description: `${openRevisionCases.length} open case${openRevisionCases.length === 1 ? '' : 's'} remain on revision ${revision?.revision}, but the other company owns the next step.`,
    action: { label: 'View collaboration', kind: 'tab', tab: 'cases' },
  }
  const supplierReviewNeedsAction = organization.type === 'supplier' && (
    unacknowledgedRequirementCount > 0
    || ['not_started', 'in_review', 'changes_requested'].includes(revisionDetail?.review?.state)
  )
  const overviewResponsibility = supplierReviewNeedsAction
    ? {
        title: unacknowledgedRequirementCount > 0
          ? `${unacknowledgedRequirementCount} requirement${unacknowledgedRequirementCount === 1 ? '' : 's'} need acknowledgement`
          : formatLabel(revisionDetail?.review?.state),
        description: unacknowledgedRequirementCount > 0
          ? `Your company has completed ${acknowledgedRequirementCount} of ${requestedRequirements.length} requested acknowledgements for this revision.`
          : 'Your company owns the released-package review. Acknowledge the revision or request a change when the review is complete.',
        tab: 'requirements',
        actionLabel: 'Open revision review',
      }
    : {
        title: organization.type === 'supplier' && revisionDetail?.review
          ? formatLabel(revisionDetail.review.state)
          : `${openRevisionCases.length} open cases`,
        description: myRevisionCases.length
          ? `${myRevisionCases.length} action${myRevisionCases.length === 1 ? '' : 's'} are assigned to your company.`
          : openRevisionCases.length
            ? `Waiting on ${relatedCompanyLabel} for the next collaboration step.`
            : 'No collaboration action is outstanding on this revision.',
        tab: 'cases',
        actionLabel: 'Open revision collaboration',
      }
  return <>
    <Seo title={`${part.part_number} Part Workspace`} description='Revisioned technical collaboration workspace.' path={`/app/parts/${id}`} noIndex />
    <Button href='/app/parts' variant='secondary' className='backButton'><ArrowLeft aria-hidden='true' /> Part workspaces</Button>
    <AppPageHeader eyebrow='Part workspace' title={`${part.part_number} · ${part.name}`} description={part.description || 'One controlled source of truth for technical files, requirements, visual questions, and production reuse.'} actions={<><Button variant='secondary' onClick={refresh}><RefreshCw aria-hidden='true' /> Refresh</Button>{revision && <Button variant='secondary' onClick={() => dispatch(exportPartDecisionRegister(id, revisionId))}><Download aria-hidden='true' /> Export register</Button>}{allowedActions.can_share && <Button variant='secondary' onClick={() => openDrawer('manage-workspace')}><Share2 aria-hidden='true' /> Manage access</Button>}{allowedActions.can_create_revision && revisions.length > 0 && !draftRevision && <Button variant='secondary' onClick={() => openDrawer('clone')}><Copy aria-hidden='true' /> New revision</Button>}{draftRevision && revisionId !== revisionIdOf(draftRevision) && <Button variant='secondary' onClick={() => setRevisionId(revisionIdOf(draftRevision))}><Layers3 aria-hidden='true' /> Continue draft {draftRevision.revision}</Button>}{canCreateCase && activeShares.length > 0 && <Button onClick={openCreateCase}><MessageSquareText aria-hidden='true' /> New case</Button>}</>} />
    {feedback && <FormMessage type={feedback.type}>{feedback.message}</FormMessage>}
    {revision?.export_control === 'itar' && <div className='itarRecordBanner partItarBanner'><ShieldAlert aria-hidden='true' /><div><p className='technicalLabel'>ITAR-controlled part revision</p><strong>Every model, drawing, and technical file requires a fresh access confirmation.</strong><p>Access is private, short-lived, and included in the audit record. Do not expose the screen or file to unauthorized people.</p></div></div>}
    <section className='partWorkspaceShell'>
      <header className='partWorkspaceShell__bar'>
        <div><label htmlFor='part-revision-select'>Revision</label><select id='part-revision-select' value={revisionId} onChange={event => setRevisionId(event.target.value)}>{revisions.map(item => <option key={revisionIdOf(item)} value={revisionIdOf(item)}>{item.revision} · {formatLabel(item.lifecycle_state)}</option>)}</select></div>
        <div className='partWorkspaceShell__status'>{revision && <><StatusBadge tone={statusTone(revision.lifecycle_state)}>{formatLabel(revision.lifecycle_state)}</StatusBadge>{revision.manifest_hash && <span title={revision.manifest_hash}>Manifest {revision.manifest_hash.slice(0, 10)}…</span>}{revision.released_at && <span>Released {formatDate(revision.released_at)}</span>}</>}</div>
        <div className='partWorkspaceShell__actions'>{organization.type === 'oem' && revision?.lifecycle_state === 'released' && <Button href={`/app/production/new?part_revision_id=${revisionId}`} variant='secondary'><Send aria-hidden='true' /> Use in production</Button>}{allowedActions.can_edit_revision && <Button variant='secondary' onClick={() => openDrawer('revision')}><Layers3 aria-hidden='true' /> Edit draft</Button>}{allowedActions.can_share && revision && ['released', 'superseded'].includes(revision.lifecycle_state) && <Button variant='secondary' onClick={() => openDrawer('share')}><Share2 aria-hidden='true' /> Share</Button>}{allowedActions.can_withdraw_revision && <Button variant='danger' onClick={() => { const reason = window.prompt('Why is this revision being withdrawn? Existing production records remain frozen to their historical revision.'); if (reason) run(() => dispatch(withdrawPartRevision(id, revisionId, reason, revision.version)), 'Revision withdrawn and preserved in history.', { close: false }) }}><ShieldAlert aria-hidden='true' /> Withdraw</Button>}{allowedActions.can_release_revision && <Button onClick={openReleaseReview}><ClipboardCheck aria-hidden='true' /> Review release</Button>}</div>
      </header>
      <div className='partWorkspaceContext'><div><UsersRound aria-hidden='true' /><span><small>{organization.type === 'supplier' ? 'OEM customer' : 'Revision access'}</small><strong>{relatedCompanyLabel}</strong></span></div><div><Eye aria-hidden='true' /><span><small>Selected context</small><strong>Revision {revision?.revision} · {formatLabel(revision?.lifecycle_state)}</strong></span></div><div><MessageSquareText aria-hidden='true' /><span><small>This revision</small><strong>{openRevisionCases.length} open · {myRevisionCases.length} your action</strong></span></div></div>
      <section className={`partNextStep partNextStep--${nextStep.tone}`}><span className='partNextStep__icon'>{nextStep.tone === 'warning' ? <AlertTriangle aria-hidden='true' /> : nextStep.tone === 'draft' ? <Layers3 aria-hidden='true' /> : nextStep.tone === 'info' ? <Info aria-hidden='true' /> : <CheckCircle2 aria-hidden='true' />}</span><div><p className='technicalLabel'>{nextStep.eyebrow}</p><h2>{nextStep.title}</h2><p>{nextStep.description}</p></div>{nextStep.action && <div className='partNextStep__action'>{nextStep.action.kind === 'release' && <Button onClick={openReleaseReview}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'tab' && <Button variant='secondary' onClick={() => setTab(nextStep.action.tab)}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'cases' && <Button variant='secondary' onClick={() => { setCaseFilters(current => ({ ...current, scope: 'revision', responsibility: 'mine', state: 'active' })); setTab('cases') }}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'share' && <Button onClick={() => openDrawer('share')}>{nextStep.action.label}</Button>}{nextStep.action.kind === 'start-review' && <Button onClick={() => run(() => dispatch(startPartReview(revisionDetail.review.id)), 'Revision review started.', { close: false })}>{nextStep.action.label}</Button>}</div>}</section>
      <nav className='partWorkspaceTabs' aria-label='Part workspace views'>{tabs.map(([key, label, Icon]) => <button type='button' key={key} className={tab === key ? 'is-active' : ''} onClick={() => { setFeedback(null); setTab(key) }}><Icon aria-hidden='true' /> {label}{key === 'cases' && openRevisionCases.length > 0 && <span>{openRevisionCases.length}</span>}</button>)}</nav>

      {tab === 'overview' && <section className='partOverview'>
        <article className='partWorkspacePanel partOverview__definition'><header><div><p className='technicalLabel'>Controlled definition</p><h2>Revision {revision?.revision}</h2><p>{revision?.engineering_note || 'This workspace keeps the released technical definition, discussion, and production use together.'}</p></div></header><dl className='partOverviewFacts'><div><dt>Material</dt><dd>{revision?.material || 'Not specified'}</dd></div><div><dt>Finish / coating</dt><dd>{revision?.finish || 'Not specified'}</dd></div><div><dt>Process</dt><dd>{revision?.process_summary || 'Not specified'}</dd></div><div><dt>Classification</dt><dd>{revision?.export_control === 'itar' ? 'ITAR controlled' : 'Standard controlled data'}</dd></div><div><dt>Files</dt><dd>{assets.length}</dd></div><div><dt>Requirements</dt><dd>{revisionDetail?.requirements?.length || 0}</dd></div></dl></article>
        <article className='partWorkspacePanel'><header><div><p className='technicalLabel'>Current responsibility · Revision {revision?.revision}</p><h2>{overviewResponsibility.title}</h2><p>{overviewResponsibility.description}</p></div></header><div className='partOverviewActions'><Button variant='secondary' onClick={() => setTab(overviewResponsibility.tab)}>{overviewResponsibility.actionLabel}</Button>{organization.type === 'supplier' && revisionDetail?.review?.state === 'not_started' && <Button onClick={() => run(() => dispatch(startPartReview(revisionDetail.review.id)), 'Revision review started.', { close: false })}>Start review</Button>}</div></article>
        <article className='partWorkspacePanel partOverview__wide'><header><div><p className='technicalLabel'>Production reuse</p><h2>Related production records</h2><p>Each linked commitment keeps a frozen reference to this revision and manifest.</p></div>{organization.type === 'oem' && revision?.lifecycle_state === 'released' && <Button href={`/app/production/new?part_revision_id=${revisionId}`}><Plus aria-hidden='true' /> Create production record</Button>}</header>{productionRecords.length ? <div className='partOverviewRecords'>{productionRecords.map(record => <Button key={record.id || record._id} href={`/app/production/${record.id || record._id}`} variant='secondary'><span><strong>{record.public_reference || record.po_number}</strong><small>{formatLabel(record.production_stage)} · {formatLabel(record.health_state)}</small></span><ChevronRight aria-hidden='true' /></Button>)}</div> : <div className='partWorkspaceEmpty'><Box aria-hidden='true' /><h3>No production records use this revision yet</h3><p>{organization.type === 'oem' ? 'Released definitions can be selected when an OEM creates a production commitment.' : 'Production records linked to this shared revision will appear here.'}</p></div>}</article>
      </section>}

      {['model', 'drawing'].includes(tab) && <div className='partVisualWorkspace'>
        <aside className='partAssetRail'><header><p className='technicalLabel'>{tab === 'model' ? 'Model files' : 'Drawing files'}</p><span>{selectedVisualAssets.length}</span></header>{selectedVisualAssets.length ? selectedVisualAssets.map(asset => <button type='button' key={asset.id || asset._id} className={String(viewer.asset?.id || viewer.asset?._id) === String(asset.id || asset._id) ? 'is-active' : ''} onClick={() => openAsset(asset)}><span><strong>{attachmentName(asset)}</strong><small>{formatLabel(asset.role)}{asset.is_primary ? ' · Primary' : ''}</small></span><ChevronRight aria-hidden='true' /></button>) : <div className='partAssetRail__empty'><FileBox aria-hidden='true' /><p>No {tab === 'model' ? 'viewable models' : 'drawings'} on this revision.</p></div>}<footer><button type='button' onClick={() => setTab('files')}>View every file</button></footer></aside>
        <main className='partViewerStage'><div className='partViewerStage__toolbar'><div><p className='technicalLabel'>Contextual review</p><strong>{viewer.asset ? attachmentName(viewer.asset) : `Open a ${tab}`}</strong></div>{viewer.asset && <div><Button variant={annotationMode ? 'primary' : 'secondary'} onClick={() => setAnnotationMode(value => !value)}><CircleDot aria-hidden='true' /> {annotationMode ? 'Cancel selection' : 'Select feature'}</Button><Button variant='secondary' onClick={() => downloadAsset(viewer.asset)}><Download aria-hidden='true' /> Download</Button></div>}</div><PartAssetViewer asset={viewer.asset} source={viewer.source} loading={viewer.loading} annotationMode={annotationMode} anchors={anchors.filter(anchor => !anchor.source_asset || String(anchor.source_asset) === String(viewer.asset?.id || viewer.asset?._id))} selectedAnchorId={selectedAnchorId} onSelect={chooseVisualAnchor} /></main>
        <aside className='partContextRail'><section><p className='technicalLabel'>Part snapshot</p><dl><div><dt>Revision</dt><dd>{revision?.revision}</dd></div><div><dt>Material</dt><dd>{revision?.material || 'Not specified'}</dd></div><div><dt>Finish</dt><dd>{revision?.finish || 'Not specified'}</dd></div><div><dt>Process</dt><dd>{revision?.process_summary || 'Not specified'}</dd></div></dl></section><section><p className='technicalLabel'>Visual references</p>{anchors.length ? <ul>{anchors.map(anchor => <li key={anchor.id || anchor._id}><button type='button' onClick={() => focusAnchor(anchor)} aria-current={String(selectedAnchorId) === String(anchor.id || anchor._id) ? 'true' : undefined}>{anchor.label || formatLabel(anchor.kind)}</button>{revisions.some(candidate => revisionIdOf(candidate) !== revisionId) && <button type='button' className='partContextRail__carry' onClick={() => { setCarryForm({ target_revision_id: '', reason: '' }); setCarryRequest({ source_anchor: anchor, source_revision_id: revisionId, reason: '' }); setDrawer('carry-anchor') }}>Carry</button>}</li>)}</ul> : <p>No anchored cases yet.</p>}</section></aside>
      </div>}

      {tab === 'requirements' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Structured requirements</p><h2>Revision requirements</h2><p>Requirements travel with the released manifest and remain separately searchable and acknowledgeable.</p></div>{allowedActions.can_edit_revision && <Button onClick={() => { setFeedback(null); setRequirementEditId(''); setRequirement({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false }); setDrawer('requirement') }}><Plus aria-hidden='true' /> Add requirement</Button>}</header>{revisionDetail?.requirements?.length ? <div className='partRequirementList'>{revisionDetail.requirements.map((item, index) => { const acknowledged = acknowledgedRequirementIds.has(String(item.id || item._id)); return <article key={item.id || item._id}><span className='partRequirementList__index'>{String(index + 1).padStart(2, '0')}</span><div><div className='partRequirementList__title'><StatusBadge tone='info'>{formatLabel(item.type)}</StatusBadge><h3>{item.title}</h3>{item.acknowledgement_requested && <StatusBadge tone={acknowledged ? 'success' : 'warning'}>{acknowledged ? 'Acknowledged' : organization.type === 'supplier' ? 'Your acknowledgement requested' : 'Supplier acknowledgement requested'}</StatusBadge>}</div><p>{item.body}</p>{item.source_reference && <small>Source: {item.source_reference}</small>}</div><div className='partRequirementList__actions'>{organization.type === 'supplier' && item.acknowledgement_requested && <Button variant='secondary' disabled={acknowledged || mutating} onClick={() => run(() => dispatch(acknowledgePartRequirement(revisionDetail.review.id, item.id)), 'Requirement acknowledged.', { close: false })}>{acknowledged ? <Check aria-hidden='true' /> : <Clock3 aria-hidden='true' />} {acknowledged ? 'Acknowledged' : 'Acknowledge'}</Button>}{allowedActions.can_edit_revision && <><Button variant='secondary' aria-label={`Edit ${item.title}`} onClick={() => { setFeedback(null); setRequirementEditId(item.id || item._id); setRequirement({ type: item.type, title: item.title, body: item.body, source_reference: item.source_reference || '', acknowledgement_requested: Boolean(item.acknowledgement_requested) }); setDrawer('requirement') }}><Pencil aria-hidden='true' /> Edit</Button><Button variant='danger' aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm(`Delete the draft requirement “${item.title}”?`)) run(() => dispatch(removePartRequirement(id, revisionId, item.id || item._id)), 'Draft requirement removed.', { close: false }) }}><Trash2 aria-hidden='true' /></Button></>}</div></article>})}</div> : <div className='partWorkspaceEmpty'><Check aria-hidden='true' /><h3>No structured requirements</h3><p>The technical files still remain part of the controlled revision manifest.</p></div>}
        {organization.type === 'supplier' && revisionDetail.review && <div className='partReviewPanel'><div><p className='technicalLabel'>Supplier revision review</p><h3>{formatLabel(revisionDetail.review.state)}</h3><div className='partReviewProgress'><span><b>{acknowledgedRequirementCount}</b> of <b>{requestedRequirements.length}</b> requested acknowledgements complete</span><progress max={Math.max(requestedRequirements.length, 1)} value={acknowledgedRequirementCount} aria-label={`${acknowledgedRequirementCount} of ${requestedRequirements.length} required acknowledgements complete`} /></div><p>Revision acknowledgement confirms the complete released package was reviewed. It is separate from production acceptance and never changes the OEM’s immutable release.</p>{unacknowledgedRequirementCount > 0 && <p className='partReviewPanel__warning'><AlertTriangle aria-hidden='true' /> {unacknowledgedRequirementCount} requested acknowledgement{unacknowledgedRequirementCount === 1 ? '' : 's'} remain. You can still acknowledge the revision, but the outstanding items stay visible.</p>}</div><div>{revisionDetail.review.state === 'not_started' && <Button onClick={() => run(() => dispatch(startPartReview(revisionDetail.review.id)), 'Revision review started.', { close: false })}>Start review</Button>}{['not_started', 'in_review', 'changes_requested'].includes(revisionDetail.review.state) && <><Button variant='secondary' onClick={() => openDrawer('review-changes')}>Request changes</Button><Button onClick={() => run(() => dispatch(acknowledgePartRevision(revisionDetail.review.id)), 'Revision acknowledged.', { close: false })}>Acknowledge revision</Button></>}</div></div>}
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

      {tab === 'cases' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Bilateral technical record</p><h2>Cases and messages</h2><p>Cases default to revision {revision?.revision}. Choose all revisions only when you need the broader part history.</p></div>{canCreateCase && activeShares.length > 0 && <Button onClick={openCreateCase}><Plus aria-hidden='true' /> New case</Button>}</header>{cases.length ? <><div className='partCaseFilters'><label><span>Revision scope</span><select value={caseFilters.scope} onChange={event => setCaseFilters(current => ({ ...current, scope: event.target.value }))}><option value='revision'>Revision {revision?.revision}</option><option value='all'>All part revisions</option></select></label><label><span>Search</span><input value={caseFilters.search} onChange={event => setCaseFilters(current => ({ ...current, search: event.target.value }))} placeholder='Title or description' /></label><label><span>Type</span><select value={caseFilters.type} onChange={event => setCaseFilters(current => ({ ...current, type: event.target.value }))}><option value='all'>All types</option><option value='clarification'>Clarification</option><option value='information'>Information</option><option value='manufacturability_suggestion'>Manufacturability suggestion</option><option value='deviation_request'>Deviation request</option></select></label><label><span>Status</span><select value={caseFilters.state} onChange={event => setCaseFilters(current => ({ ...current, state: event.target.value }))}><option value='active'>Open work</option><option value='all'>Every status</option><option value='closed'>Closed</option><option value='accepted'>Accepted</option><option value='rejected'>Rejected</option></select></label><label><span>Responsibility</span><select value={caseFilters.responsibility} onChange={event => setCaseFilters(current => ({ ...current, responsibility: event.target.value }))}><option value='all'>Either company</option><option value='mine'>My company</option><option value='other'>Other company</option></select></label></div>{visibleCases.length ? <div className='partCaseList'>{visibleCases.map(item => { const mine = item.current_actor_side === organization.type; const owner = item.current_actor_side === 'none' ? 'No next action' : mine ? 'Your company owns the next step' : `Waiting on ${relatedCompanyLabel}`; return <button type='button' key={item.id || item._id} onClick={() => openCase(item)}><div><span className='technicalLabel'>{formatLabel(item.type)} · Revision {item.part_revision?.revision || '?'}</span><strong>{item.title}</strong><small>{item.visual_anchor ? 'Visual reference attached' : 'Revision-level'} · Updated {formatDateTime(item.last_activity_at)}</small><span className={`partCaseList__owner${mine ? ' is-mine' : ''}`}>{owner}</span></div><div><StatusBadge tone={statusTone(item.state)}>{formatLabel(item.state)}</StatusBadge><StatusBadge tone={item.priority === 'high' ? 'danger' : item.priority === 'normal' ? 'warning' : 'neutral'}>{formatLabel(item.priority)}</StatusBadge>{item.schedule_effect !== 'none' && <StatusBadge tone='warning'>{formatLabel(item.schedule_effect)} schedule effect</StatusBadge>}{item.due_at && <span className='partCaseList__due'>Due {formatDate(item.due_at)}</span>}<ChevronRight aria-hidden='true' /></div></button> })}</div> : <div className='partWorkspaceEmpty'><MessageSquareText aria-hidden='true' /><h3>No cases match these filters</h3><p>{caseFilters.responsibility === 'mine' ? `Nothing is assigned to your company in this ${caseFilters.scope === 'revision' ? 'revision' : 'workspace'} view.` : 'Change or clear a filter to see the remaining technical record.'}</p><Button variant='secondary' onClick={() => setCaseFilters({ search: '', type: 'all', state: 'active', responsibility: 'all', scope: 'revision' })}>Show open revision cases</Button></div>}</> : <div className='partWorkspaceEmpty'><MessageSquareText aria-hidden='true' /><h3>No technical cases yet</h3><p>Create a clarification, information notice, manufacturability suggestion, or deviation request.</p></div>}</section>}

      {tab === 'files' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Controlled revision package</p><h2>Technical files</h2><p>Every released asset is frozen into the revision’s signed manifest.</p></div>{allowedActions.can_edit_revision && <Button onClick={() => openDrawer('asset')}><FileUp aria-hidden='true' /> Upload file</Button>}</header>{assets.length ? <div className='partFileList'>{assets.map(asset => <article key={asset.id || asset._id}><FileBox aria-hidden='true' /><div><strong>{attachmentName(asset)}</strong><span>{formatLabel(asset.role)} · {((asset.attachment?.byte_size || 0) / 1024).toFixed(1)} KB</span>{isViewableModel(asset) && !['primary_model', 'alternate_model'].includes(asset.role) && <StatusBadge tone='warning'>Viewable model · role needs review</StatusBadge>}{asset.attachment?.state !== 'available' && <StatusBadge tone='warning'>{formatLabel(asset.attachment?.state)}</StatusBadge>}</div><div>{(isViewableModel(asset) || asset.role === 'drawing') && <Button variant='secondary' onClick={() => { setTab(asset.role === 'drawing' ? 'drawing' : 'model'); openAsset(asset) }}>View</Button>}<Button variant='secondary' onClick={() => downloadAsset(asset)}><Download aria-hidden='true' /> Download</Button></div></article>)}</div> : <div className='partWorkspaceEmpty'><FileUp aria-hidden='true' /><h3>No files on this revision</h3><p>A technical file is required before release.</p>{allowedActions.can_edit_revision && <Button onClick={() => openDrawer('asset')}>Upload first file</Button>}</div>}</section>}

      {tab === 'history' && <section className='partWorkspacePanel'><header><div><p className='technicalLabel'>Immutable trace</p><h2>Workspace history</h2><p>Part, revision, sharing, annotation, review, and collaboration changes appear in one ordered record. Closed case discussions remain available from their history entries.</p></div></header>{history.length ? <ol className='partHistory'>{history.map(event => { const collaborationId = collaborationIdOf(event.collaboration_item); return <li key={event.id || event._id}><span><Clock3 aria-hidden='true' /></span><div className='partHistory__content'><div><strong>{formatLabel(event.event_type)}</strong><p>{event.reason || event.actor?.name || 'Recorded by Velakron'}</p><time>{formatDateTime(event.occurred_at || event.recorded_at || event.created_at)}</time></div>{collaborationId && <Button variant='secondary' onClick={() => openCase({ id: collaborationId })}><MessageSquareText aria-hidden='true' /> Open case & discussion</Button>}</div></li> })}</ol> : <div className='partWorkspaceEmpty'><History aria-hidden='true' /><h3>No history available</h3></div>}</section>}
    </section>

    <PartCaseDrawer open={caseDrawer.open} mode={caseDrawer.mode} itemDetail={caseDetail} shares={activeShares} productionRecords={productionRecords} selectedAnchor={pendingAnchor} sourceAsset={viewer.asset} linkedVisual={caseVisual} itarControlled={revision?.export_control === 'itar'} pending={mutating} upload={upload} feedback={caseFeedback} organizationType={organization.type} relatedCompanyName={relatedCompanyLabel} onClose={closeCaseDrawer} onRequestAnchor={() => { closeCaseDrawer(); setAnnotationMode(true); setFeedback({ type: 'info', message: 'Selection mode is active. Click a visible model surface, or click or drag on a drawing, to capture context for the new case.' }) }} onOpenAnchor={focusAnchor} onCreate={createCase} onMessage={body => runCase(() => dispatch(postPartCollaborationMessage(caseDrawer.id, body)), 'Message added to the conversation.')} onUpdate={payload => runCase(() => dispatch(updatePartCollaboration(caseDrawer.id, payload)), 'Responsibility updated.')} onAction={(action, note) => runCase(() => dispatch(applyPartCollaborationAction(caseDrawer.id, { action, note, version: caseDetail.item.version })), 'Workflow advanced and responsibility refreshed.')} onUpload={(file, itar) => runCase(() => dispatch(uploadPartCollaborationAttachment(caseDrawer.id, { file, itar: revision?.export_control === 'itar' ? itar : {} })), 'Evidence attached.')} onDownloadAttachment={downloadCollaborationAttachment} onArchive={item => { const reason = window.prompt('Why is this closed case being archived?'); if (!reason) return null; return runCase(() => dispatch(archivePartCollaboration(item.id || item._id, { reason, version: item.version })), 'Closed case archived.').then(result => { if (result?.ok) closeCaseDrawer(); return result }) }} onPromote={payload => runCase(() => dispatch(promotePartCollaboration(caseDrawer.id, payload)), 'Case promoted to production attention.')} />

    <ResponsiveDrawer open={drawer === 'revision'} title='Edit draft revision' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(updatePartRevision(id, revisionId, { ...revisionForm, version: revision.version })), 'Draft revision updated.') }}><FormMessage type={feedback?.type}>{feedback?.message}</FormMessage><FormField id='edit-revision' label='Revision' value={revisionForm.revision} onChange={event => setRevisionForm(current => ({ ...current, revision: event.target.value }))} required /><FormField id='edit-material' label='Material' value={revisionForm.material} onChange={event => setRevisionForm(current => ({ ...current, material: event.target.value }))} /><FormField id='edit-finish' label='Finish / coating' value={revisionForm.finish} onChange={event => setRevisionForm(current => ({ ...current, finish: event.target.value }))} /><label className='textAreaField' htmlFor='edit-process'><span>Process summary</span><textarea id='edit-process' value={revisionForm.process_summary} onChange={event => setRevisionForm(current => ({ ...current, process_summary: event.target.value }))} /></label><label className='textAreaField' htmlFor='edit-engineering-note'><span>Engineering note</span><textarea id='edit-engineering-note' value={revisionForm.engineering_note} onChange={event => setRevisionForm(current => ({ ...current, engineering_note: event.target.value }))} /></label><label className='productionCheck'><input type='checkbox' checked={revisionForm.export_control === 'itar'} onChange={event => setRevisionForm(current => ({ ...current, export_control: event.target.checked ? 'itar' : 'none' }))} /><ShieldAlert aria-hidden='true' /><span><strong>ITAR-controlled revision</strong><small>Every technical file will require protected storage and a fresh access confirmation.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>Save draft</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'requirement'} title={requirementEditId ? 'Edit revision requirement' : 'Add revision requirement'} onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(requirementEditId ? updatePartRequirement(id, revisionId, requirementEditId, requirement) : addPartRequirement(id, revisionId, requirement)), requirementEditId ? 'Requirement updated.' : 'Requirement added.').then(result => { if (result?.ok) { setRequirementEditId(''); setRequirement({ type: 'general', title: '', body: '', source_reference: '', acknowledgement_requested: false }) } }) }}><label className='selectField'><span>Requirement type</span><select value={requirement.type} onChange={event => setRequirement(current => ({ ...current, type: event.target.value }))}>{['material', 'finish', 'special_process', 'certification', 'inspection', 'packaging', 'documentation', 'general', 'other'].map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></label><FormField id='requirement-title' label='Title' value={requirement.title} onChange={event => setRequirement(current => ({ ...current, title: event.target.value }))} required /><label className='textAreaField' htmlFor='requirement-body'><span>Requirement</span><textarea id='requirement-body' value={requirement.body} onChange={event => setRequirement(current => ({ ...current, body: event.target.value }))} required /></label><FormField id='requirement-source' label='Source reference' value={requirement.source_reference} onChange={event => setRequirement(current => ({ ...current, source_reference: event.target.value }))} /><label className='productionCheck'><input type='checkbox' checked={requirement.acknowledgement_requested} onChange={event => setRequirement(current => ({ ...current, acknowledgement_requested: event.target.checked }))} /><span><strong>Request supplier acknowledgement</strong><small>The supplier records a separate acknowledgement against this exact requirement.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>{requirementEditId ? 'Save requirement' : 'Add requirement'}</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'asset'} title='Upload technical file' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); if (!assetUpload.file || !assetUpload.role) return; run(() => dispatch(uploadPartAsset(id, revisionId, { file: assetUpload.file, role: assetUpload.role, label: assetUpload.label, isPrimary: assetUpload.is_primary, itar: revision.export_control === 'itar' ? { itar_upload_authorized: assetUpload.authorized, synthetic_data_acknowledged: assetUpload.authorized } : {} })), `Technical file uploaded as ${formatLabel(assetUpload.role)} and verified.`).then(result => { if (result?.ok) setAssetUpload(emptyAssetUpload) }) }}><div className='partUploadSequence'><span className={assetUpload.file ? 'is-complete' : 'is-current'}>1 <small>Choose file</small></span><span className={assetUpload.file && assetUpload.role ? 'is-complete' : assetUpload.file ? 'is-current' : ''}>2 <small>Confirm role</small></span><span>3 <small>Upload</small></span></div><label className='fileDropField'><FileUp aria-hidden='true' /><span><strong>{assetUpload.file?.name || 'Choose technical file'}</strong><small>STEP, STP, STL, PDF, PNG, JPEG, WebP, or text</small></span><input type='file' required onChange={event => handleAssetFile(event.target.files?.[0] || null)} /></label>{assetUpload.suggestion?.message && <div className={`partUploadSuggestion partUploadSuggestion--${assetUpload.suggestion.confidence}`}><Info aria-hidden='true' /><span><strong>{assetUpload.suggestion.confidence === 'detected' ? 'File type detected' : 'File role required'}</strong><small>{assetUpload.suggestion.message}</small></span></div>}<label className='selectField'><span>File role</span><select required value={assetUpload.role} onChange={event => setAssetUpload(current => ({ ...current, role: event.target.value, is_primary: ['primary_model', 'thumbnail'].includes(event.target.value) ? true : ['drawing'].includes(event.target.value) ? current.is_primary : false }))}><option value=''>Choose file role</option>{['primary_model', 'alternate_model', 'drawing', 'thumbnail', 'specification', 'inspection_plan', 'reference', 'other'].map(value => <option key={value} value={value}>{formatLabel(value)}</option>)}</select><small>Use a transparent or white-background PNG as the isometric production thumbnail.</small></label><FormField id='asset-label' label='File label (optional)' value={assetUpload.label} onChange={event => setAssetUpload(current => ({ ...current, label: event.target.value }))} />{['primary_model', 'drawing', 'thumbnail'].includes(assetUpload.role) && <label className='productionCheck'><input type='checkbox' checked={assetUpload.is_primary} onChange={event => setAssetUpload(current => ({ ...current, is_primary: event.target.checked }))} /><span><strong>Primary {assetUpload.role === 'drawing' ? 'drawing' : assetUpload.role === 'thumbnail' ? 'thumbnail' : 'model'}</strong><small>{assetUpload.role === 'thumbnail' ? 'Show this isometric PNG beside the part number on production records.' : `Use this file by default when revision ${revision?.revision} opens.`}</small></span></label>}{revision?.export_control === 'itar' && <label className='productionCheck'><input type='checkbox' checked={assetUpload.authorized} onChange={event => setAssetUpload(current => ({ ...current, authorized: event.target.checked }))} /><ShieldAlert aria-hidden='true' /><span><strong>I am authorized to upload this ITAR-controlled data</strong><small>Local preview environments accept synthetic data only.</small></span></label>}{upload && <p className='uploadProgress'><LoaderCircle className='spin' aria-hidden='true' /> {upload.filename} · {upload.progress}%</p>}<footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating || !assetUpload.file || !assetUpload.role || (revision?.export_control === 'itar' && !assetUpload.authorized)}>Upload as {assetUpload.role ? formatLabel(assetUpload.role) : 'selected role'}</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'release'} title={`Review release · Revision ${revision?.revision || ''}`} onClose={() => setDrawer('')}><form className='partDrawerForm partReleaseReview' onSubmit={event => { event.preventDefault(); if (!releaseConfirmed || !releaseValidation.valid) return; run(() => dispatch(releasePartRevision(id, revisionId, revision.version)), 'Revision released as an immutable technical baseline.').then(result => { if (result?.ok) setReleaseConfirmed(false) }) }}><div className='partReleaseReview__intro'><ClipboardCheck aria-hidden='true' /><div><p className='technicalLabel'>Immutable release checkpoint</p><h3>Confirm the complete technical baseline</h3><p>After release, revision {revision?.revision} and its file manifest cannot be edited. Future changes require a new revision.</p></div></div>{releaseValidation.loading ? <p className='uploadProgress'><LoaderCircle className='spin' aria-hidden='true' /> Checking the revision package…</p> : <><ul className='partReleaseChecklist'>{releaseChecks.map(item => <li key={item.label} className={item.pass ? 'is-pass' : item.required ? 'is-error' : 'is-warning'}>{item.pass ? <CheckCircle2 aria-hidden='true' /> : <AlertTriangle aria-hidden='true' />}<span><strong>{item.label}</strong><small>{item.pass ? 'Ready' : item.required ? 'Required before release' : 'Recommended; release remains available'}</small></span></li>)}</ul>{releaseValidation.errors.map(item => <FormMessage key={item.code || item.message} type='error'>{item.message}</FormMessage>)}{releaseValidation.warnings.map(item => <FormMessage key={item.code || item.message} type='warning'>{item.message}</FormMessage>)}</>}<label className='productionCheck partReleaseReview__confirmation'><input type='checkbox' checked={releaseConfirmed} onChange={event => setReleaseConfirmed(event.target.checked)} /><span><strong>I reviewed revision {revision?.revision} and understand this release is immutable</strong><small>Supplier access, acknowledgements, cases, and production reuse will remain tied to this exact manifest.</small></span></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Keep editing</Button><Button type='submit' disabled={mutating || releaseValidation.loading || !releaseValidation.valid || !releaseConfirmed}><Check aria-hidden='true' /> Release revision {revision?.revision}</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'share'} title='Share released revision' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); const relationship = relationships.find(item => String(item.id || item._id) === shareForm.relationship_id); run(() => dispatch(sharePart(id, { relationship_id: shareForm.relationship_id, supplier_organization_id: relatedOrganization(relationship, 'oem')?.id, revision_id: shareForm.revision_id })), 'Revision shared with the supplier.') }}><p>Sharing grants only the selected active supplier relationship access to this released revision.</p><label className='selectField'><span>Active supplier relationship</span><select required value={shareForm.relationship_id} onChange={event => setShareForm(current => ({ ...current, relationship_id: event.target.value }))}><option value=''>Choose supplier</option>{relationships.filter(item => item.status === 'active').map(item => <option key={item.id || item._id} value={item.id || item._id}>{relatedOrganization(item, 'oem')?.name || 'Supplier'}</option>)}</select></label><label className='selectField'><span>Released revision</span><select required value={shareForm.revision_id} onChange={event => setShareForm(current => ({ ...current, revision_id: event.target.value }))}>{revisions.filter(item => ['released', 'superseded'].includes(item.lifecycle_state)).map(item => <option key={revisionIdOf(item)} value={revisionIdOf(item)}>{item.revision} · {formatLabel(item.lifecycle_state)}</option>)}</select></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}><Share2 aria-hidden='true' /> Share revision</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'manage-workspace'} title='Manage Part Workspace' onClose={() => setDrawer('')}><div className='partDrawerForm'><p>Pause or end one supplier’s room without exposing or changing another supplier’s collaboration history.</p>{shares.length ? <div className='partShareManager'>{shares.map(item => <article key={item.id || item._id}><div><strong>{item.supplier_organization?.name || 'Supplier'}</strong><span>{formatLabel(item.state)} · {item.current_shared_revision?.revision || 'No revision'}</span></div><div>{item.state !== 'ended' && <Button variant='secondary' onClick={() => run(() => dispatch(updatePartShare(id, item.id || item._id, { state: item.state === 'active' ? 'paused' : 'active', version: item.version })), item.state === 'active' ? 'Supplier access paused.' : 'Supplier access resumed.', { close: false })}>{item.state === 'active' ? 'Pause' : 'Resume'}</Button>}{item.state !== 'ended' && <Button variant='danger' onClick={() => { const reason = window.prompt('Why is this supplier workspace access ending?'); if (reason) run(() => dispatch(endPartShare(id, item.id || item._id, { reason, version: item.version })), 'Supplier workspace access ended.', { close: false }) }}>End access</Button>}</div></article>)}</div> : <p>No supplier rooms have been created.</p>}<hr /><Button variant='danger' onClick={() => { const reason = window.prompt('Why is this Part Workspace being archived?'); if (reason) run(() => dispatch(archivePart(id, reason, part.version)), 'Part Workspace archived.', { close: false }).then(result => { if (result?.ok) router.push('/app/parts') }) }}><Trash2 aria-hidden='true' /> Archive Part Workspace</Button></div></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'clone'} title='Create next revision' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); run(() => dispatch(clonePartRevision(id, revisionId, { revision: cloneLabel })), 'New draft revision created.').then(result => { const next = result?.payload?.data?.revision?.id; if (next) setRevisionId(next) }) }}><p>The new draft copies structured requirements, material, finish, process, and classification. Released files are not duplicated, and the engineering note starts blank so the new change is described deliberately.</p><FormField id='clone-revision' label='New revision label' value={cloneLabel} onChange={event => setCloneLabel(event.target.value)} required /><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>Create draft</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'review-changes'} title='Request revision changes' onClose={() => setDrawer('')}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); const note = event.currentTarget.elements.note.value; run(() => dispatch(requestPartReviewChanges(revisionDetail.review.id, note)), 'Change request sent to the OEM.') }}><label className='textAreaField' htmlFor='review-note'><span>Requested change</span><textarea id='review-note' name='note' required minLength={3} /></label><footer><Button variant='secondary' onClick={() => setDrawer('')}>Cancel</Button><Button type='submit' disabled={mutating}>Send request</Button></footer></form></ResponsiveDrawer>

    <ResponsiveDrawer open={drawer === 'carry-anchor'} title='Carry visual reference to another revision' onClose={() => { setDrawer(''); setCarryRequest(null) }}><form className='partDrawerForm' onSubmit={event => { event.preventDefault(); setCarryRequest(current => ({ ...current, reason: carryForm.reason })); setRevisionId(carryForm.target_revision_id); setViewer({ asset: null, source: '', loading: false }); setTab(['drawing_point', 'drawing_region'].includes(carryRequest?.source_anchor?.kind) ? 'drawing' : 'model'); setAnnotationMode(true); setDrawer(''); setFeedback({ type: 'info', message: 'Open the corresponding target file, then select the feature or region again. Velakron will never copy anchors silently.' }) }}><p>The original reference remains on its immutable source revision. Select the target revision, then deliberately identify the corresponding feature again.</p><label className='selectField'><span>Target revision</span><select required value={carryForm.target_revision_id} onChange={event => setCarryForm(current => ({ ...current, target_revision_id: event.target.value }))}><option value=''>Choose revision</option>{revisions.filter(candidate => revisionIdOf(candidate) !== revisionId && ['released', 'superseded'].includes(candidate.lifecycle_state)).map(candidate => <option key={revisionIdOf(candidate)} value={revisionIdOf(candidate)}>{candidate.revision} · {formatLabel(candidate.lifecycle_state)}</option>)}</select></label><label className='textAreaField' htmlFor='carry-anchor-reason'><span>Carry-forward reason</span><textarea id='carry-anchor-reason' required minLength={3} value={carryForm.reason} onChange={event => setCarryForm(current => ({ ...current, reason: event.target.value }))} /></label><footer><Button type='button' variant='secondary' onClick={() => { setDrawer(''); setCarryRequest(null) }}>Cancel</Button><Button type='submit'>Continue to target revision</Button></footer></form></ResponsiveDrawer>

    <ItarAccessDialog file={itarRequest?.asset?.attachment || itarRequest?.asset} purpose={itarRequest?.purpose} open={Boolean(itarRequest)} pending={itarPending} feedback={feedback?.type === 'error' ? feedback : null} onClose={() => setItarRequest(null)} onConfirm={async attestation => { setItarPending(true); const result = itarRequest.collaborationAttachment ? await downloadCollaborationAttachment(itarRequest.asset, attestation) : itarRequest.purpose === 'view' ? await openAsset(itarRequest.asset, attestation) : await downloadAsset(itarRequest.asset, attestation); setItarPending(false); return result }} />
  </>
}

PartWorkspace.getLayout = PortalPageLayout
export default PartWorkspace
