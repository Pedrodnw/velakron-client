import dynamic from 'next/dynamic'
import { Crosshair, FileText, Focus, LoaderCircle, MousePointer2, RotateCw, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { resolveFileTransferTarget } from '../../store/fileTransfer'
import { drawingAnchorStyle, normalizedDrawingPoint } from '../../store/drawingViewer'

const ModelViewer = dynamic(() => import('./ModelViewer'), { ssr: false })
const PdfDrawingViewer = dynamic(() => import('./PdfDrawingViewer'), {
  ssr: false,
  loading: () => <div className='partViewerEmpty'><LoaderCircle className='spin' aria-hidden='true' /><strong>Preparing drawing tools</strong></div>,
})

const extensionFor = file => String(file?.display_filename || file?.original_filename || '').split('.').pop().toLowerCase()

const ImageDrawingViewer = ({ file, source, annotationMode, anchors, selectedAnchorId, selectedAnchor, onSelect }) => {
  const frameRef = useRef(null)
  const [origin, setOrigin] = useState(null)
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [localSource, setLocalSource] = useState('')
  const [sourceState, setSourceState] = useState({ loading: true, error: '' })
  useEffect(() => {
    if (!source) return
    const controller = new AbortController()
    let objectUrl = ''
    setLocalSource('')
    setSourceState({ loading: true, error: '' })
    fetch(resolveFileTransferTarget(source), { credentials: /^https?:\/\//i.test(String(source || '')) ? 'omit' : 'include', signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error(response.status === 403 ? 'The protected drawing access grant expired or was refused.' : 'Velakron could not securely load this drawing.')
        objectUrl = URL.createObjectURL(await response.blob())
        setLocalSource(objectUrl)
        setSourceState({ loading: false, error: '' })
      })
      .catch(error => {
        if (error.name === 'AbortError') return
        setSourceState({ loading: false, error: error.message || 'The drawing could not be displayed.' })
      })
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  useEffect(() => {
    const state = selectedAnchor?.view_state || {}
    if (!selectedAnchor) return
    setZoom(Math.min(3, Math.max(0.5, Number(state.zoom || 1))))
    setRotation([0, 90, 180, 270].includes(Number(state.rotation)) ? Number(state.rotation) : 0)
  }, [selectedAnchor])

  useEffect(() => {
    if (annotationMode && rotation !== 0) setRotation(0)
  }, [annotationMode, rotation])
  if (sourceState.loading) return <div className='partViewerEmpty'><LoaderCircle className='spin' aria-hidden='true' /><strong>Opening protected drawing</strong></div>
  if (sourceState.error) return <div className='partViewerEmpty'><FileText aria-hidden='true' /><strong>Unable to display this drawing</strong><span>{sourceState.error}</span></div>
  const normalizedPoint = event => {
    return normalizedDrawingPoint(event, frameRef.current.getBoundingClientRect())
  }
  const select = event => {
    if (!annotationMode || !origin || !onSelect) return
    const end = normalizedPoint(event)
    const width = Math.abs(end.x - origin.x)
    const height = Math.abs(end.y - origin.y)
    const isRegion = width > 0.012 || height > 0.012
    onSelect({
      anchor_kind: isRegion ? 'drawing_region' : 'drawing_point',
      label: isRegion ? 'Drawing region' : 'Drawing point',
      anchor_data: isRegion
        ? { page: 1, x: Math.min(origin.x, end.x), y: Math.min(origin.y, end.y), width, height }
        : { page: 1, x: end.x, y: end.y },
      view_state: { page: 1, zoom, rotation, fit_mode: 'custom' },
    })
    setOrigin(null)
  }
  return <section className='partDrawingSurface'>
    <div className='partDrawingToolbar' aria-label='Drawing controls'>
      <button type='button' aria-label='Zoom drawing in' onClick={() => setZoom(value => Math.min(3, Number((value + 0.2).toFixed(1))))}><ZoomIn aria-hidden='true' /></button>
      <button type='button' aria-label='Zoom drawing out' onClick={() => setZoom(value => Math.max(0.5, Number((value - 0.2).toFixed(1))))}><ZoomOut aria-hidden='true' /></button>
      <button type='button' onClick={() => { setZoom(1); setRotation(0) }}><Focus aria-hidden='true' /> Fit</button>
      <button type='button' onClick={() => setRotation(value => (value + 90) % 360)} disabled={annotationMode}><RotateCw aria-hidden='true' /> Rotate</button>
    </div>
    <div
    className={`partDrawingViewer${annotationMode ? ' is-annotating' : ''}`}
    ref={frameRef}
    onPointerDown={event => annotationMode && setOrigin(normalizedPoint(event))}
    onPointerUp={select}
  >
    <img src={localSource} alt={file?.display_filename || file?.original_filename || 'Technical drawing'} style={{ transform: `scale(${zoom}) rotate(${rotation}deg)` }} />
    <div className='partDrawingViewer__anchors' aria-hidden='true'>
      {anchors.filter(anchor => ['drawing_point', 'drawing_region'].includes(anchor.anchor_kind || anchor.kind) && Number(anchor.anchor_data?.page || 1) === 1).map((anchor, index) => {
        const selected = String(anchor.id || anchor._id) === String(selectedAnchorId)
        const kind = anchor.anchor_kind || anchor.kind
        return <span
          key={anchor.id || anchor._id}
          className={`partDrawingAnchor partDrawingAnchor--${kind}${selected ? ' is-selected' : ''}`}
          style={drawingAnchorStyle(anchor, rotation)}
        ><b>{index + 1}</b></span>
      })}
    </div>
    {annotationMode && <p className='partDrawingViewer__instruction'><Crosshair aria-hidden='true' /> Click a point or drag across a region to anchor the case.</p>}
    </div>
  </section>
}

const DrawingViewer = props => extensionFor(props.file) === 'pdf'
  ? <PdfDrawingViewer {...props} />
  : <ImageDrawingViewer {...props} />

const PartAssetViewer = ({ asset, source, loading, annotationMode = false, anchors = [], caseMarkers = [], selectedAnchorId = '', onSelect, onOpenCase }) => {
  const file = asset?.attachment || asset
  const extension = useMemo(() => extensionFor(file), [file])
  const selectedAnchor = anchors.find(anchor => String(anchor.id || anchor._id) === String(selectedAnchorId)) || null
  if (loading) return <div className='partViewerEmpty'><LoaderCircle className='spin' aria-hidden='true' /><strong>Opening protected file</strong></div>
  if (!asset || !source) return <div className='partViewerEmpty'><FileText aria-hidden='true' /><strong>Select a viewable file</strong><span>Models and drawings remain private until you explicitly open them.</span></div>
  if (['step', 'stp', 'stl'].includes(extension)) return <ModelViewer file={file} source={source} annotationMode={annotationMode} anchors={anchors} caseMarkers={caseMarkers} selectedAnchorId={selectedAnchorId} selectedAnchor={selectedAnchor} onSelect={onSelect} onOpenCase={onOpenCase} />
  if (['pdf', 'png', 'jpg', 'jpeg', 'webp'].includes(extension)) return <DrawingViewer file={file} source={source} annotationMode={annotationMode} anchors={anchors} selectedAnchorId={selectedAnchorId} selectedAnchor={selectedAnchor} onSelect={onSelect} />
  return <div className='partViewerEmpty'><MousePointer2 aria-hidden='true' /><strong>Preview unavailable</strong><span>Download this file to inspect it in its native application.</span></div>
}

export default PartAssetViewer
