import { ChevronLeft, ChevronRight, Crosshair, FileWarning, Focus, LoaderCircle, Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen, RotateCw, ScanLine, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { resolveFileTransferTarget } from '../../store/fileTransfer'
import { clampDrawingPage, drawingAnchorStyle, drawingFitScale, normalizedDrawingPoint } from '../../store/drawingViewer'

const PDF_WORKER_URL = '/vendor/pdfjs-dist/pdf.worker.min.mjs'
const PDF_CMAP_URL = '/vendor/pdfjs-dist/cmaps/'
const PDF_STANDARD_FONT_URL = '/vendor/pdfjs-dist/standard_fonts/'
const MIN_SCALE = 0.2
const MAX_SCALE = 5
let pdfModulePromise

const loadPdfModule = () => {
  if (!pdfModulePromise) {
    pdfModulePromise = import('pdfjs-dist/build/pdf.mjs').then(async module => {
      module.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL
      if (['localhost', '127.0.0.1'].includes(window.location.hostname)) {
        globalThis.pdfjsWorker = await import('pdfjs-dist/build/pdf.worker.mjs')
      }
      return module
    })
  }
  return pdfModulePromise
}

const PdfPageThumbnail = ({ pdfDocument, pageNumber, label, active, onOpen }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current) return undefined
    let cancelled = false
    let renderTask
    pdfDocument.getPage(pageNumber).then(page => {
      if (cancelled || !canvasRef.current) return
      const base = page.getViewport({ scale: 1 })
      const viewport = page.getViewport({ scale: 118 / Math.max(1, base.width) })
      const canvas = canvasRef.current
      const context = canvas.getContext('2d', { alpha: false })
      canvas.width = Math.max(1, Math.floor(viewport.width))
      canvas.height = Math.max(1, Math.floor(viewport.height))
      renderTask = page.render({ canvasContext: context, viewport })
      return renderTask.promise
    }).catch(error => {
      if (error?.name !== 'RenderingCancelledException') console.warn('Drawing thumbnail could not render', error)
    })
    return () => {
      cancelled = true
      renderTask?.cancel()
    }
  }, [pdfDocument, pageNumber])

  return <button type='button' className={active ? 'is-active' : ''} onClick={onOpen} aria-current={active ? 'page' : undefined} aria-label={`Open ${label}`}>
    <span><canvas ref={canvasRef} aria-hidden='true' /></span>
    <strong>{label}</strong>
  </button>
}

const PdfDrawingViewer = ({ file, source, annotationMode, anchors = [], selectedAnchorId = '', selectedAnchor, onSelect }) => {
  const viewportRef = useRef(null)
  const sheetRef = useRef(null)
  const canvasRef = useRef(null)
  const [pdfDocument, setPdfDocument] = useState(null)
  const [pageCount, setPageCount] = useState(1)
  const [pageLabels, setPageLabels] = useState([])
  const [page, setPage] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [fitMode, setFitMode] = useState('page')
  const [customScale, setCustomScale] = useState(1)
  const [renderedScale, setRenderedScale] = useState(1)
  const [sheetSize, setSheetSize] = useState({ width: 0, height: 0 })
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [documentState, setDocumentState] = useState({ loading: true, rendering: false, error: '' })
  const [fallbackUrl, setFallbackUrl] = useState('')
  const [basicPreview, setBasicPreview] = useState(false)
  const [pageRailOpen, setPageRailOpen] = useState(false)
  const [inspectionMode, setInspectionMode] = useState(false)
  const [selectionOrigin, setSelectionOrigin] = useState(null)
  const [selectionCurrent, setSelectionCurrent] = useState(null)
  const [selectionFeedback, setSelectionFeedback] = useState('')
  const filename = file?.display_filename || file?.original_filename || 'Technical drawing'

  useEffect(() => {
    if (!source) return undefined
    const controller = new AbortController()
    let loadingTask
    let openedDocument
    let objectUrl = ''
    let disposed = false
    setPdfDocument(null)
    setFallbackUrl('')
    setDocumentState({ loading: true, rendering: false, error: '' })
    setBasicPreview(false)
    setPage(1)
    setRotation(0)
    setFitMode('page')
    setSelectionFeedback('')

    const open = async () => {
      const response = await fetch(resolveFileTransferTarget(source), {
        credentials: /^https?:\/\//i.test(String(source || '')) ? 'omit' : 'include',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(response.status === 403 ? 'The protected drawing access grant expired or was refused.' : 'Velakron could not securely load this drawing.')
      const buffer = await response.arrayBuffer()
      objectUrl = URL.createObjectURL(new Blob([buffer], { type: 'application/pdf' }))
      if (!disposed) setFallbackUrl(objectUrl)
      const pdfjs = await loadPdfModule()
      loadingTask = pdfjs.getDocument({
        data: new Uint8Array(buffer.slice(0)),
        cMapUrl: PDF_CMAP_URL,
        cMapPacked: true,
        standardFontDataUrl: PDF_STANDARD_FONT_URL,
        useSystemFonts: true,
        isEvalSupported: false,
      })
      openedDocument = await loadingTask.promise
      if (disposed) {
        await openedDocument.destroy?.()
        return
      }
      setPdfDocument(openedDocument)
      const nextPageCount = Math.max(1, openedDocument.numPages || 1)
      setPageCount(nextPageCount)
      setPageRailOpen(nextPageCount > 1)
      const labels = await openedDocument.getPageLabels().catch(() => null)
      if (!disposed) setPageLabels(labels || [])
      setDocumentState({ loading: false, rendering: true, error: '' })
    }

    open().catch(error => {
      if (error?.name === 'AbortError' || disposed) return
      setDocumentState({ loading: false, rendering: false, error: error?.message || 'The drawing could not be rendered.' })
    })
    return () => {
      disposed = true
      controller.abort()
      loadingTask?.destroy?.()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [source])

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return undefined
    const updateViewportSize = rect => {
      const width = Math.max(0, Number(rect?.width) || 0)
      const height = Math.max(0, Number(rect?.height) || 0)
      if (width < 1 || height < 1) return
      setViewportSize(current => (
        Math.abs(current.width - width) < 0.5 && Math.abs(current.height - height) < 0.5
          ? current
          : { width, height }
      ))
    }
    const measureViewport = () => updateViewportSize(viewport.getBoundingClientRect())
    measureViewport()
    const frames = []
    frames.push(window.requestAnimationFrame(() => {
      measureViewport()
      frames.push(window.requestAnimationFrame(measureViewport))
    }))
    const timers = [50, 150, 400, 1000, 2000]
      .map(delay => window.setTimeout(measureViewport, delay))
    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(entries => updateViewportSize(entries[0]?.contentRect))
    observer?.observe(viewport)
    window.addEventListener('resize', measureViewport)
    return () => {
      frames.forEach(frame => window.cancelAnimationFrame(frame))
      timers.forEach(timer => window.clearTimeout(timer))
      window.removeEventListener('resize', measureViewport)
      observer?.disconnect()
    }
  }, [documentState.loading, inspectionMode, pageRailOpen, pdfDocument])

  useEffect(() => {
    if (!selectedAnchor) return
    const state = selectedAnchor.view_state || {}
    setPage(clampDrawingPage(state.page || selectedAnchor.anchor_data?.page || 1, pageCount))
    setRotation([0, 90, 180, 270].includes(Number(state.rotation)) ? Number(state.rotation) : 0)
    if (state.fit_mode && ['page', 'width', 'custom'].includes(state.fit_mode)) {
      setFitMode(state.fit_mode)
      if (state.fit_mode === 'custom' && state.zoom) setCustomScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(state.zoom) || 1)))
    }
    else if (state.zoom) {
      setFitMode('custom')
      setCustomScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number(state.zoom) || 1)))
    }
  }, [pageCount, selectedAnchor])

  useEffect(() => {
    if (annotationMode && rotation !== 0) setRotation(0)
    setSelectionOrigin(null)
    setSelectionCurrent(null)
    setSelectionFeedback(annotationMode ? 'Click a point or drag across a drawing region.' : '')
  }, [annotationMode, rotation])

  useEffect(() => {
    if (!inspectionMode) return undefined
    const previousOverflow = window.document.body.style.overflow
    const closeOnEscape = event => event.key === 'Escape' && setInspectionMode(false)
    window.document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      window.document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', closeOnEscape)
    }
  }, [inspectionMode])

  useEffect(() => {
    if (!pdfDocument || !canvasRef.current || viewportSize.width < 1 || viewportSize.height < 1) return undefined
    let disposed = false
    let renderTask
    setDocumentState(current => ({ ...current, rendering: true, error: '' }))
    const render = async () => {
      const pdfPage = await pdfDocument.getPage(clampDrawingPage(page, pageCount))
      if (disposed || !canvasRef.current) return
      const baseViewport = pdfPage.getViewport({ scale: 1, rotation })
      const scale = fitMode === 'custom'
        ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, customScale))
        : drawingFitScale({ pageWidth: baseViewport.width, pageHeight: baseViewport.height, containerWidth: viewportSize.width, containerHeight: viewportSize.height, mode: fitMode })
      const drawingViewport = pdfPage.getViewport({ scale, rotation })
      const outputScale = Math.min(2, Math.max(1, window.devicePixelRatio || 1))
      const canvas = canvasRef.current
      const context = canvas.getContext('2d', { alpha: false })
      canvas.width = Math.max(1, Math.floor(drawingViewport.width * outputScale))
      canvas.height = Math.max(1, Math.floor(drawingViewport.height * outputScale))
      canvas.style.width = `${Math.floor(drawingViewport.width)}px`
      canvas.style.height = `${Math.floor(drawingViewport.height)}px`
      setSheetSize({ width: drawingViewport.width, height: drawingViewport.height })
      setRenderedScale(scale)
      renderTask = pdfPage.render({
        canvasContext: context,
        viewport: drawingViewport,
        transform: outputScale === 1 ? null : [outputScale, 0, 0, outputScale, 0, 0],
      })
      await renderTask.promise
      if (!disposed) setDocumentState(current => ({ ...current, loading: false, rendering: false, error: '' }))
    }
    render().catch(error => {
      if (disposed || error?.name === 'RenderingCancelledException') return
      setDocumentState(current => ({ ...current, loading: false, rendering: false, error: error?.message || 'This drawing page could not be rendered.' }))
    })
    return () => {
      disposed = true
      renderTask?.cancel()
    }
  }, [customScale, fitMode, page, pageCount, pdfDocument, rotation, viewportSize.height, viewportSize.width])

  const changePage = value => setPage(clampDrawingPage(value, pageCount))
  const zoom = direction => {
    setCustomScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, Number((renderedScale + direction * 0.2).toFixed(2)))))
    setFitMode('custom')
  }
  const normalizedPoint = event => normalizedDrawingPoint(event, sheetRef.current.getBoundingClientRect())
  const captureSelection = event => {
    if (!annotationMode || !selectionOrigin || !onSelect) return
    const end = normalizedPoint(event)
    const width = Math.abs(end.x - selectionOrigin.x)
    const height = Math.abs(end.y - selectionOrigin.y)
    const isRegion = width > 0.012 || height > 0.012
    onSelect({
      anchor_kind: isRegion ? 'drawing_region' : 'drawing_point',
      label: isRegion ? `Drawing region · ${pageLabels[page - 1] || `Sheet ${page}`}` : `Drawing point · ${pageLabels[page - 1] || `Sheet ${page}`}`,
      anchor_data: isRegion
        ? { page, x: Math.min(selectionOrigin.x, end.x), y: Math.min(selectionOrigin.y, end.y), width, height }
        : { page, x: end.x, y: end.y },
      view_state: { page, zoom: renderedScale, rotation, fit_mode: fitMode },
    })
    setSelectionOrigin(null)
    setSelectionCurrent(null)
    setSelectionFeedback('Drawing context captured. Complete the case details in the panel.')
  }
  const visibleAnchors = anchors.filter(anchor => ['drawing_point', 'drawing_region'].includes(anchor.anchor_kind || anchor.kind) && Number(anchor.anchor_data?.page || 1) === page)

  if (documentState.loading) return <div className='partViewerEmpty'><LoaderCircle className='spin' aria-hidden='true' /><strong>Opening protected drawing</strong><span>Preparing Velakron’s private drawing canvas.</span></div>
  if (basicPreview && fallbackUrl) return <section className='partPdfFallback'><header><div><FileWarning aria-hidden='true' /><span><strong>Basic browser preview</strong><small>Selection anchors are unavailable in this fallback.</small></span></div><button type='button' onClick={() => setBasicPreview(false)}>Return to Velakron viewer</button></header><iframe src={fallbackUrl} title={`${filename} basic preview`} /></section>
  if (documentState.error && !pdfDocument) return <div className='partViewerEmpty'><FileWarning aria-hidden='true' /><strong>Unable to render this drawing</strong><span>{documentState.error}</span>{fallbackUrl && <button type='button' onClick={() => setBasicPreview(true)}>Open basic preview</button>}</div>

  return <section className={`partPdfDrawing${inspectionMode ? ' is-inspecting' : ''}${annotationMode ? ' is-annotating' : ''}`} aria-label={`${filename} drawing viewer`}>
    <header className='partPdfToolbar'>
      <div className='partPdfToolbar__identity'><ScanLine aria-hidden='true' /><span><strong>{filename}</strong><small>{pageCount} sheet{pageCount === 1 ? '' : 's'} · private browser rendering</small></span></div>
      <div className='partPdfToolbar__controls'>
        <div className='partPdfControlGroup'>
          {pageCount > 1 && <button type='button' onClick={() => setPageRailOpen(value => !value)} aria-label={pageRailOpen ? 'Hide drawing sheets' : 'Show drawing sheets'}>{pageRailOpen ? <PanelLeftClose aria-hidden='true' /> : <PanelLeftOpen aria-hidden='true' />}</button>}
          <button type='button' onClick={() => changePage(page - 1)} disabled={page === 1} aria-label='Previous drawing page'><ChevronLeft aria-hidden='true' /></button>
          <label><span className='srOnly'>Drawing page</span><input aria-label='Drawing page' type='number' min='1' max={pageCount} value={page} onChange={event => changePage(event.target.value)} /><b>/ {pageCount}</b></label>
          <button type='button' onClick={() => changePage(page + 1)} disabled={page === pageCount} aria-label='Next drawing page'><ChevronRight aria-hidden='true' /></button>
        </div>
        <div className='partPdfControlGroup'>
          <button type='button' onClick={() => zoom(-1)} aria-label='Zoom drawing out'><ZoomOut aria-hidden='true' /></button>
          <button type='button' className='partPdfToolbar__scale' onClick={() => { setFitMode('custom'); setCustomScale(1) }} aria-label='Reset drawing to 100 percent'>{Math.round(renderedScale * 100)}%</button>
          <button type='button' onClick={() => zoom(1)} aria-label='Zoom drawing in'><ZoomIn aria-hidden='true' /></button>
          <button type='button' className={fitMode === 'page' ? 'is-active' : ''} onClick={() => setFitMode('page')}><Focus aria-hidden='true' /> Fit sheet</button>
          <button type='button' className={`partPdfToolbar__fitWidth${fitMode === 'width' ? ' is-active' : ''}`} onClick={() => setFitMode('width')}>Fit width</button>
          <button type='button' onClick={() => setRotation(value => (value + 90) % 360)} disabled={annotationMode}><RotateCw aria-hidden='true' /> Rotate</button>
          <button type='button' onClick={() => setInspectionMode(value => !value)}>{inspectionMode ? <Minimize2 aria-hidden='true' /> : <Maximize2 aria-hidden='true' />}{inspectionMode ? 'Exit inspect' : 'Inspect'}</button>
        </div>
      </div>
    </header>
    <div className={`partPdfWorkspace${pageRailOpen ? ' has-page-rail' : ''}`}>
      {pageRailOpen && <aside className='partPdfPageRail' aria-label='Drawing sheets'>{Array.from({ length: pageCount }, (_, index) => index + 1).map(pageNumber => <PdfPageThumbnail key={pageNumber} pdfDocument={pdfDocument} pageNumber={pageNumber} label={pageLabels[pageNumber - 1] || `Sheet ${pageNumber}`} active={pageNumber === page} onOpen={() => changePage(pageNumber)} />)}</aside>}
      <div className='partPdfViewport' ref={viewportRef}>
        {documentState.rendering && <div className='partPdfRendering' role='status'><LoaderCircle className='spin' aria-hidden='true' /> Rendering sheet</div>}
        <div
          className='partPdfSheet'
          ref={sheetRef}
          style={{ width: sheetSize.width || undefined, height: sheetSize.height || undefined }}
          onPointerDown={event => {
            if (!annotationMode) return
            event.currentTarget.setPointerCapture(event.pointerId)
            const point = normalizedPoint(event)
            setSelectionOrigin(point)
            setSelectionCurrent(point)
          }}
          onPointerMove={event => annotationMode && selectionOrigin && setSelectionCurrent(normalizedPoint(event))}
          onPointerUp={captureSelection}
          onPointerCancel={() => { setSelectionOrigin(null); setSelectionCurrent(null) }}
        >
          <canvas ref={canvasRef} aria-label={`${filename}, ${pageLabels[page - 1] || `sheet ${page}`}`} />
          <div className='partDrawingViewer__anchors' aria-hidden='true'>{visibleAnchors.map((anchor, index) => {
            const selected = String(anchor.id || anchor._id) === String(selectedAnchorId)
            const kind = anchor.anchor_kind || anchor.kind
            return <span key={anchor.id || anchor._id} className={`partDrawingAnchor partDrawingAnchor--${kind}${selected ? ' is-selected' : ''}`} style={drawingAnchorStyle(anchor, rotation)}><b>{index + 1}</b></span>
          })}{selectionOrigin && selectionCurrent && <span className='partDrawingSelection' style={{ left: `${Math.min(selectionOrigin.x, selectionCurrent.x) * 100}%`, top: `${Math.min(selectionOrigin.y, selectionCurrent.y) * 100}%`, width: `${Math.abs(selectionCurrent.x - selectionOrigin.x) * 100}%`, height: `${Math.abs(selectionCurrent.y - selectionOrigin.y) * 100}%` }} />}</div>
        </div>
        {annotationMode && <p className='partDrawingViewer__instruction'><Crosshair aria-hidden='true' /> {selectionFeedback || 'Click a point or drag across a region to anchor the case.'}</p>}
      </div>
    </div>
  </section>
}

export default PdfDrawingViewer
