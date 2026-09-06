import { Box, Focus, Layers3, LoaderCircle, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { fileTransferFetchOptions, resolveFileTransferTarget } from '../../store/fileTransfer'
import { modelExtension, modelFormatLabel } from '../../store/modelFiles'
import { captureVisualContextPreview } from './visualContextPreview'

let occtRuntimePromise = null
const modelBytesPromises = new Map()
const EMPTY_ITEMS = Object.freeze([])

const loadModelBytes = source => {
  const target = resolveFileTransferTarget(source)
  if (!modelBytesPromises.has(target)) {
    const request = fetch(target, fileTransferFetchOptions(source))
      .then(async response => {
        if (response.status === 403) {
          throw new Error('The one-time protected access grant was refused or expired. Close the viewer and confirm access again.')
        }
        if (!response.ok) throw new Error('Velakron could not securely load this model.')
        return response.arrayBuffer()
      })
      .catch(error => {
        modelBytesPromises.delete(target)
        throw error
      })
    modelBytesPromises.set(target, request)
    request.then(() => setTimeout(() => modelBytesPromises.delete(target), 10_000)).catch(() => {})
  }
  return modelBytesPromises.get(target)
}

const loadOcctRuntime = () => {
  if (!occtRuntimePromise) {
    occtRuntimePromise = import('occt-import-js')
      .then(importedModule => {
        const createOcct = importedModule.default || importedModule
        return createOcct({
          locateFile: filename => filename.endsWith('.wasm')
            ? '/vendor/occt-import-js/occt-import-js.wasm'
            : filename,
        })
      })
      .catch(error => {
        occtRuntimePromise = null
        throw error
      })
  }
  return occtRuntimePromise
}

const cadSurfaceColor = (THREE, value) => {
  const aluminum = new THREE.Color(0x929da9)
  if (!Array.isArray(value) || value.length < 3) return aluminum
  const scale = Array.isArray(value) && value.some(channel => channel > 1) ? 255 : 1
  const color = new THREE.Color(value[0] / scale, value[1] / scale, value[2] / scale)
  const hsl = {}
  color.getHSL(hsl)
  color.setHSL(hsl.h, Math.min(hsl.s, 0.5), Math.min(Math.max(hsl.l, 0.32), 0.68))
  return aluminum.lerp(color, hsl.s > 0.12 ? 0.24 : 0.06)
}

const createCadMaterial = (THREE, color) => new THREE.MeshPhysicalMaterial({
  color,
  metalness: 0.66,
  roughness: 0.34,
  clearcoat: 0.16,
  clearcoatRoughness: 0.46,
  envMapIntensity: 1.05,
  side: THREE.DoubleSide,
})

const addCadEdges = (THREE, geometry, mesh) => {
  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 34),
    new THREE.LineBasicMaterial({ color: 0x465565, transparent: true, opacity: 0.34 }),
  )
  edges.renderOrder = 2
  mesh.add(edges)
}

const createStudioShadow = (THREE, modelMaximum) => {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const context = canvas.getContext('2d')
  context.translate(128, 64)
  context.scale(1, 0.34)
  const gradient = context.createRadialGradient(0, 0, 0, 0, 0, 116)
  gradient.addColorStop(0, 'rgba(44, 62, 80, 0.48)')
  gradient.addColorStop(0.46, 'rgba(71, 85, 105, 0.22)')
  gradient.addColorStop(1, 'rgba(100, 116, 139, 0)')
  context.fillStyle = gradient
  context.fillRect(-128, -190, 256, 380)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const shadow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    color: 0x64748b,
    depthWrite: false,
    opacity: 0.42,
    transparent: true,
  }))
  shadow.scale.set(modelMaximum * 1.85, modelMaximum * 0.54, 1)
  shadow.renderOrder = -1
  return shadow
}

const buildStepGroup = (THREE, result) => {
  if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length) {
    throw new Error('This STEP file did not contain displayable 3D geometry.')
  }
  const group = new THREE.Group()
  for (const [meshIndex, imported] of result.meshes.entries()) {
    const positions = imported.attributes?.position?.array
    if (!positions?.length) continue
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    if (imported.attributes?.normal?.array?.length) {
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(imported.attributes.normal.array, 3))
    } else {
      geometry.computeVertexNormals()
    }
    if (imported.index?.array?.length) geometry.setIndex(Array.from(imported.index.array))
    geometry.computeBoundingBox()
    const material = createCadMaterial(THREE, cadSurfaceColor(THREE, imported.color))
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = imported.name || 'STEP part'
    mesh.userData.velakronMeshIndex = meshIndex
    mesh.castShadow = true
    mesh.receiveShadow = true
    addCadEdges(THREE, geometry, mesh)
    group.add(mesh)
  }
  if (!group.children.length) throw new Error('This STEP file did not contain displayable surfaces.')
  return group
}

const disposeObject = object => {
  object?.traverse?.(child => {
    child.geometry?.dispose?.()
    const disposeMaterial = material => {
      material?.map?.dispose?.()
      material?.dispose?.()
    }
    if (Array.isArray(child.material)) child.material.forEach(disposeMaterial)
    else disposeMaterial(child.material)
  })
}

const humanize = value => String(value || '').replaceAll('_', ' ').replace(/\b\w/g, character => character.toUpperCase())

const ModelViewer = ({
  file,
  source,
  annotationMode = false,
  anchors = EMPTY_ITEMS,
  caseMarkers = EMPTY_ITEMS,
  selectedAnchorId = '',
  selectedAnchor = null,
  onSelect,
  onOpenCase,
  onPreviewReady,
  compact = false,
}) => {
  const mountRef = useRef(null)
  const fitRef = useRef(() => {})
  const zoomRef = useRef(() => {})
  const onSelectRef = useRef(onSelect)
  const onOpenCaseRef = useRef(onOpenCase)
  const onPreviewReadyRef = useRef(onPreviewReady)
  const selectedAnchorRef = useRef(selectedAnchor)
  const capturedReferenceRef = useRef('')
  const annotationModeRef = useRef(annotationMode)
  const markerSyncRef = useRef(() => {})
  const restoreViewRef = useRef(() => {})
  const captureReferenceRef = useRef(() => {})
  const orientationRef = useRef(() => {})
  const transparencyRef = useRef(() => {})
  const guidanceId = useId()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')
  const [transparent, setTransparent] = useState(false)
  const [selectionFeedback, setSelectionFeedback] = useState('')
  const [hoveredMarker, setHoveredMarker] = useState(null)
  const [projectedMarkers, setProjectedMarkers] = useState([])

  useEffect(() => { onSelectRef.current = onSelect }, [onSelect])
  useEffect(() => { onOpenCaseRef.current = onOpenCase }, [onOpenCase])
  useEffect(() => { onPreviewReadyRef.current = onPreviewReady }, [onPreviewReady])
  useEffect(() => {
    annotationModeRef.current = annotationMode
    setSelectionFeedback(annotationMode ? 'Click once on a visible model surface. Dragging changes the view without selecting.' : '')
  }, [annotationMode])
  useEffect(() => {
    markerSyncRef.current(anchors, caseMarkers, selectedAnchorId)
  }, [anchors, caseMarkers, selectedAnchorId])
  useEffect(() => {
    selectedAnchorRef.current = selectedAnchor
    if (!selectedAnchor) return
    restoreViewRef.current(selectedAnchor.view_state || {})
    window.requestAnimationFrame(() => captureReferenceRef.current(selectedAnchor))
  }, [selectedAnchor])

  useEffect(() => {
    let stopped = false
    let animationFrame = null
    let resizeObserver = null
    let renderer = null
    let controls = null
    let model = null
    let studioShadow = null
    let environmentRenderTarget = null
    let keyboardMove = null
    let pointerDown = null
    let pointerUp = null
    let projectCaseMarkers = () => {}

    const start = async () => {
      setStatus('loading')
      setError('')
      setHoveredMarker(null)
      setProjectedMarkers([])
      try {
        const extension = modelExtension(file?.display_filename || file?.original_filename)
        const parserPromise = extension === 'stl'
          ? import('three/addons/loaders/STLLoader.js')
          : loadOcctRuntime()
        const [THREE, { OrbitControls }, { RoomEnvironment }, parser, bytes] = await Promise.all([
          import('three'),
          import('three/addons/controls/OrbitControls.js'),
          import('three/addons/environments/RoomEnvironment.js'),
          parserPromise,
          loadModelBytes(source),
        ])
        if (stopped || !mountRef.current) return

        const scene = new THREE.Scene()
        const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000000)
        camera.up.set(0, 0, 1)
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: compact || Boolean(onPreviewReadyRef.current) })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, compact ? 1.5 : 2))
        renderer.setClearColor(0xffffff, 0)
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 0.94
        renderer.shadowMap.enabled = false
        mountRef.current.replaceChildren(renderer.domElement)
        renderer.domElement.setAttribute('aria-label', compact ? `${modelFormatLabel(file)} isometric preview` : `Interactive ${modelFormatLabel(file)} viewer`)
        if (!compact) renderer.domElement.setAttribute('aria-describedby', guidanceId)
        renderer.domElement.setAttribute('role', compact ? 'img' : 'application')
        renderer.domElement.tabIndex = compact ? -1 : 0

        controls = new OrbitControls(camera, renderer.domElement)
        controls.enabled = !compact
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.screenSpacePanning = true

        const pmremGenerator = new THREE.PMREMGenerator(renderer)
        const environmentScene = new RoomEnvironment()
        environmentRenderTarget = pmremGenerator.fromScene(environmentScene, 0.04)
        scene.environment = environmentRenderTarget.texture
        environmentScene.dispose()
        pmremGenerator.dispose()

        scene.add(new THREE.HemisphereLight(0xf9fcff, 0x8d9baa, 0.82))
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.25)
        scene.add(keyLight)
        scene.add(keyLight.target)
        const fillLight = new THREE.DirectionalLight(0xcfe3fb, 0.82)
        scene.add(fillLight)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.92)
        scene.add(rimLight)

        if (extension === 'stl') {
          const geometry = new parser.STLLoader().parse(bytes)
          geometry.computeVertexNormals()
          model = new THREE.Mesh(geometry, createCadMaterial(THREE, new THREE.Color(0x929da9)))
          model.userData.velakronMeshIndex = 0
          model.castShadow = true
          model.receiveShadow = true
          addCadEdges(THREE, geometry, model)
        } else {
          const result = parser.ReadStepFile(new Uint8Array(bytes), {
            linearUnit: 'millimeter',
            linearDeflectionType: 'bounding_box_ratio',
            linearDeflection: 0.001,
            angularDeflection: 0.5,
          })
          model = buildStepGroup(THREE, result)
        }
        if (stopped) { disposeObject(model); return }
        scene.add(model)

        const modelBox = new THREE.Box3().setFromObject(model)
        const modelSize = modelBox.getSize(new THREE.Vector3())
        const modelMinimum = modelBox.min.clone()
        const modelCenter = modelBox.getCenter(new THREE.Vector3())
        const modelMaximum = Math.max(modelSize.x, modelSize.y, modelSize.z, 0.001)

        keyLight.position.copy(modelCenter).add(new THREE.Vector3(modelMaximum * 1.8, -modelMaximum * 2.1, modelMaximum * 3.2))
        keyLight.target.position.copy(modelCenter)
        fillLight.position.copy(modelCenter).add(new THREE.Vector3(-modelMaximum * 2.4, modelMaximum * 1.8, modelMaximum * 1.3))
        rimLight.position.copy(modelCenter).add(new THREE.Vector3(-modelMaximum * 1.6, -modelMaximum * 2.2, modelMaximum * 2.1))

        studioShadow = createStudioShadow(THREE, modelMaximum)
        scene.add(studioShadow)
        const positionStudioShadow = () => {
          const viewDirection = controls.target.clone().sub(camera.position).normalize()
          const screenDown = new THREE.Vector3(0, -1, 0).applyQuaternion(camera.quaternion).normalize()
          studioShadow.position.copy(modelCenter)
            .addScaledVector(screenDown, modelMaximum * 0.62)
            .addScaledVector(viewDirection, modelMaximum * 0.42)
        }
        let activeCaseMarkers = caseMarkers
        projectCaseMarkers = () => {
          if (!renderer || !camera) return
          const next = activeCaseMarkers.map(caseMarker => {
            const point = new THREE.Vector3(...caseMarker.anchor.anchor_data.point).project(camera)
            return {
              ...caseMarker,
              x: ((point.x + 1) / 2) * 100,
              y: ((1 - point.y) / 2) * 100,
              visible: point.z >= -1 && point.z <= 1 && point.x >= -1.08 && point.x <= 1.08 && point.y >= -1.08 && point.y <= 1.08,
            }
          })
          setProjectedMarkers(next)
        }
        markerSyncRef.current = (_nextAnchors = [], nextCaseMarkers = [], selectedId = '') => {
          setHoveredMarker(null)
          activeCaseMarkers = nextCaseMarkers.map(caseMarker => ({
            ...caseMarker,
            selected: String(caseMarker.anchorId) === String(selectedId),
          }))
          projectCaseMarkers()
        }
        markerSyncRef.current(anchors, caseMarkers, selectedAnchorId)

        const fit = () => {
          const box = new THREE.Box3().setFromObject(model)
          if (box.isEmpty()) return
          const center = box.getCenter(new THREE.Vector3())
          const size = box.getSize(new THREE.Vector3())
          const maximum = Math.max(size.x, size.y, size.z, 0.001)
          const distance = (maximum / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)))) * 1.22
          camera.near = Math.max(distance / 1000, 0.001)
          camera.far = Math.max(distance * 1000, 1000)
          const viewDirection = new THREE.Vector3(1, -1, 0.72).normalize().multiplyScalar(distance)
          camera.position.copy(center).add(viewDirection)
          camera.lookAt(center)
          camera.updateProjectionMatrix()
          controls.target.copy(center)
          controls.update()
          projectCaseMarkers()
        }
        restoreViewRef.current = state => {
          if (!Array.isArray(state?.camera_position) || !Array.isArray(state?.camera_target)) return
          camera.position.fromArray(state.camera_position)
          controls.target.fromArray(state.camera_target)
          if (Array.isArray(state.camera_up)) camera.up.fromArray(state.camera_up)
          camera.lookAt(controls.target)
          camera.updateProjectionMatrix()
          controls.update()
          projectCaseMarkers()
        }
        captureReferenceRef.current = anchor => {
          const anchorId = String(anchor?.id || anchor?._id || '')
          const point = anchor?.anchor_data?.point
          if (!onPreviewReadyRef.current || !anchorId || !Array.isArray(point) || point.length < 3) return
          const captureKey = `${source}:${anchorId}`
          if (capturedReferenceRef.current === captureKey) return
          positionStudioShadow()
          renderer.render(scene, camera)
          const projectedPoint = new THREE.Vector3(...point).project(camera)
          const preview = captureVisualContextPreview(renderer.domElement, {
            kind: 'point',
            x: (projectedPoint.x + 1) / 2,
            y: (1 - projectedPoint.y) / 2,
          })
          if (!preview) return
          capturedReferenceRef.current = captureKey
          onPreviewReadyRef.current(preview)
        }
        orientationRef.current = orientation => {
          const center = modelBox.getCenter(new THREE.Vector3())
          const size = Math.max(modelSize.x, modelSize.y, modelSize.z, 0.001)
          const distance = size * 2.2
          const direction = orientation === 'front'
            ? new THREE.Vector3(0, -1, 0)
            : orientation === 'top'
              ? new THREE.Vector3(0, 0, 1)
              : new THREE.Vector3(1, -1, 0.72).normalize()
          camera.position.copy(center).add(direction.multiplyScalar(distance))
          camera.up.set(0, 0, 1)
          if (orientation === 'top') camera.up.set(0, 1, 0)
          controls.target.copy(center)
          camera.lookAt(center)
          controls.update()
          projectCaseMarkers()
        }
        transparencyRef.current = enabled => {
          model.traverse(child => {
            if (!child.isMesh) return
            const materials = Array.isArray(child.material) ? child.material : [child.material]
            materials.forEach(material => {
              material.transparent = enabled
              material.opacity = enabled ? 0.42 : 1
              material.depthWrite = !enabled
              material.needsUpdate = true
            })
          })
        }
        keyboardMove = event => {
          if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', '+', '=', '-', '_', 'Home'].includes(event.key)) return
          event.preventDefault()
          if (event.key === 'Home') return fitRef.current()
          if (event.key === '+' || event.key === '=') return zoomRef.current(0.82)
          if (event.key === '-' || event.key === '_') return zoomRef.current(1.2)
          const offset = camera.position.clone().sub(controls.target)
          if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
            offset.applyAxisAngle(camera.up, event.key === 'ArrowLeft' ? 0.1 : -0.1)
          } else {
            const right = new THREE.Vector3().crossVectors(offset, camera.up).normalize()
            offset.applyAxisAngle(right, event.key === 'ArrowUp' ? -0.08 : 0.08)
          }
          camera.position.copy(controls.target).add(offset)
          camera.lookAt(controls.target)
          controls.update()
        }
        if (!compact) renderer.domElement.addEventListener('keydown', keyboardMove)

        const raycaster = new THREE.Raycaster()
        const pointer = new THREE.Vector2()
        const updatePointer = event => {
          const bounds = renderer.domElement.getBoundingClientRect()
          pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1
          pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1
          raycaster.setFromCamera(pointer, camera)
        }
        let pointerOrigin = null
        pointerDown = event => {
          pointerOrigin = { x: event.clientX, y: event.clientY }
        }
        pointerUp = event => {
          if (!pointerOrigin) return
          const moved = Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y)
          pointerOrigin = null
          if (moved > 6) {
            if (annotationModeRef.current) setSelectionFeedback('View adjusted. Now click once on the exact surface you want to reference.')
            return
          }
          if (!annotationModeRef.current) return
          if (!onSelectRef.current) return
          updatePointer(event)
          const hit = raycaster.intersectObject(model, true).find(candidate => candidate.object?.isMesh)
          if (!hit) {
            setSelectionFeedback('No model surface was found at that point. Try Fit model, rotate the part, then click directly on visible geometry.')
            return
          }
          const normal = hit.face?.normal?.clone?.() || new THREE.Vector3(0, 0, 1)
          normal.transformDirection(hit.object.matrixWorld)
          renderer.render(scene, camera)
          const projectedPoint = hit.point.clone().project(camera)
          const visualPreview = captureVisualContextPreview(renderer.domElement, {
            kind: 'point',
            x: (projectedPoint.x + 1) / 2,
            y: (1 - projectedPoint.y) / 2,
          })
          setSelectionFeedback('Surface captured. Opening the case form with this visual context.')
          onSelectRef.current({
            anchor_kind: 'model_face',
            label: hit.object.name || 'Model feature',
            anchor_data: {
              persistent_id: `mesh:${hit.object.userData.velakronMeshIndex ?? 0}:face:${hit.faceIndex ?? 0}`,
              mesh_index: hit.object.userData.velakronMeshIndex ?? 0,
              face_index: hit.faceIndex ?? 0,
              point: hit.point.toArray(),
              normal: normal.toArray(),
              bounding_box_point: [
                modelSize.x ? (hit.point.x - modelMinimum.x) / modelSize.x : 0.5,
                modelSize.y ? (hit.point.y - modelMinimum.y) / modelSize.y : 0.5,
                modelSize.z ? (hit.point.z - modelMinimum.z) / modelSize.z : 0.5,
              ],
            },
            view_state: {
              camera_position: camera.position.toArray(),
              camera_target: controls.target.toArray(),
              camera_up: camera.up.toArray(),
              section_planes: [],
            },
            visual_preview: visualPreview,
          })
        }
        if (!compact) {
          renderer.domElement.addEventListener('pointerdown', pointerDown)
          renderer.domElement.addEventListener('pointerup', pointerUp)
          controls.addEventListener('change', projectCaseMarkers)
        }
        fitRef.current = fit
        zoomRef.current = factor => {
          const offset = camera.position.clone().sub(controls.target).multiplyScalar(factor)
          camera.position.copy(controls.target).add(offset)
          controls.update()
        }
        const resize = () => {
          if (!mountRef.current || !renderer) return
          const width = Math.max(mountRef.current.clientWidth, 1)
          const height = Math.max(mountRef.current.clientHeight, 1)
          renderer.setSize(width, height, false)
          camera.aspect = width / height
          camera.updateProjectionMatrix()
          projectCaseMarkers()
        }
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(mountRef.current)
        resize()
        fit()
        if (selectedAnchorRef.current) restoreViewRef.current(selectedAnchorRef.current.view_state || {})

        const render = () => {
          if (stopped) return
          controls.update()
          positionStudioShadow()
          renderer.render(scene, camera)
          if (!compact) animationFrame = requestAnimationFrame(render)
        }
        render()
        if (!compact && selectedAnchorRef.current && onPreviewReadyRef.current) {
          animationFrame = requestAnimationFrame(() => captureReferenceRef.current(selectedAnchorRef.current))
        }
        if (compact && onPreviewReadyRef.current) {
          animationFrame = requestAnimationFrame(() => {
            if (stopped || !renderer?.domElement) return
            positionStudioShadow()
            renderer.render(scene, camera)
            const { width, height } = renderer.domElement
            renderer.domElement.toBlob(blob => {
              if (!stopped && blob?.size) onPreviewReadyRef.current?.({ blob, width, height })
            }, 'image/png')
          })
        }
        setStatus('ready')
      } catch (viewerError) {
        if (!stopped) {
          setError(viewerError?.message || 'This model could not be displayed.')
          setStatus('error')
        }
      }
    }

    start()
    return () => {
      stopped = true
      fitRef.current = () => {}
      zoomRef.current = () => {}
      markerSyncRef.current = () => {}
      restoreViewRef.current = () => {}
      captureReferenceRef.current = () => {}
      orientationRef.current = () => {}
      transparencyRef.current = () => {}
      if (animationFrame) cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      if (keyboardMove) renderer?.domElement?.removeEventListener('keydown', keyboardMove)
      if (pointerDown) renderer?.domElement?.removeEventListener('pointerdown', pointerDown)
      if (pointerUp) renderer?.domElement?.removeEventListener('pointerup', pointerUp)
      controls?.removeEventListener('change', projectCaseMarkers)
      controls?.dispose()
      disposeObject(model)
      disposeObject(studioShadow)
      environmentRenderTarget?.dispose?.()
      renderer?.dispose()
      renderer?.domElement?.remove()
    }
  }, [compact, file, guidanceId, source])

  if (compact) return <div className='modelViewer modelViewer--thumbnail'>
    <div className='modelViewer__viewport'>
      <div className='modelViewer__canvas' ref={mountRef} />
      {status === 'loading' && <div className='modelViewer__state' aria-label='Preparing part thumbnail'><LoaderCircle className='spin' aria-hidden='true' /></div>}
      {status === 'error' && <div className='modelViewer__state modelViewer__state--error' aria-label={error || 'Part thumbnail unavailable'}><Box aria-hidden='true' /></div>}
    </div>
  </div>

  return <section className='modelViewer'>
    <div className='modelViewer__toolbar'>
      <p id={guidanceId}><MousePointer2 aria-hidden='true' /> {annotationMode ? 'Click a model surface to anchor the new case · drag to rotate · scroll or pinch to zoom' : 'Drag or use arrow keys to rotate · scroll, pinch, or +/− to zoom · right-drag to move'}</p>
      <div>
        <button type='button' aria-label='Zoom in' onClick={() => zoomRef.current(0.78)} disabled={status !== 'ready'}><ZoomIn aria-hidden='true' /></button>
        <button type='button' aria-label='Zoom out' onClick={() => zoomRef.current(1.28)} disabled={status !== 'ready'}><ZoomOut aria-hidden='true' /></button>
        <button type='button' onClick={() => fitRef.current()} disabled={status !== 'ready'}><Focus aria-hidden='true' /> Fit model</button>
        <button type='button' onClick={() => orientationRef.current('front')} disabled={status !== 'ready'}>Front</button>
        <button type='button' onClick={() => orientationRef.current('top')} disabled={status !== 'ready'}>Top</button>
        <button type='button' onClick={() => orientationRef.current('iso')} disabled={status !== 'ready'}>Iso</button>
        <button type='button' aria-pressed={transparent} onClick={() => setTransparent(value => { transparencyRef.current(!value); return !value })} disabled={status !== 'ready'}><Layers3 aria-hidden='true' /> Transparency</button>
      </div>
    </div>
    <div className={`modelViewer__viewport${annotationMode ? ' modelViewer__viewport--annotating' : ''}`}>
      <div className='modelViewer__canvas' ref={mountRef} />
      {projectedMarkers.length > 0 && <nav className='modelViewer__markers' aria-label='Cases anchored in this 3D model'>
        {projectedMarkers.filter(marker => marker.visible).map(marker => <button
          type='button'
          key={marker.id}
          className={marker.selected ? 'is-selected' : ''}
          style={{ left: `${marker.x}%`, top: `${marker.y}%`, '--case-color': marker.presentation?.color, '--cluster-offset': `${(marker.clusterIndex - ((marker.clusterSize - 1) / 2)) * 38}px` }}
          onMouseEnter={() => setHoveredMarker(marker)}
          onMouseLeave={() => setHoveredMarker(null)}
          onFocus={() => setHoveredMarker(marker)}
          onBlur={event => { if (!event.currentTarget.matches(':hover')) setHoveredMarker(null) }}
          onClick={() => onOpenCaseRef.current?.(marker.caseItem)}
          aria-label={`Open case ${marker.caseNumber}: ${marker.caseItem?.title}`}
        >{marker.caseNumber}</button>)}
      </nav>}
      {hoveredMarker && <aside
        className='modelViewer__casePreview'
        style={{ '--case-color': hoveredMarker.presentation?.color, '--case-soft': hoveredMarker.presentation?.soft, '--case-border': hoveredMarker.presentation?.border }}
        aria-live='polite'
      >
        <div className='modelViewer__caseNumber'>{hoveredMarker.caseNumber}</div>
        <div>
          <p>{hoveredMarker.presentation?.label || 'Technical case'} · Case {hoveredMarker.caseNumber}</p>
          <strong>{hoveredMarker.caseItem?.title}</strong>
          <span>{humanize(hoveredMarker.caseItem?.state)} · {humanize(hoveredMarker.caseItem?.priority)} priority</span>
        </div>
        <small>Click the numbered marker to open the full case.</small>
      </aside>}
      {status === 'loading' && <div className='modelViewer__state'><LoaderCircle className='spin' aria-hidden='true' /><strong>Preparing the 3D model</strong><span>STEP files can take a moment to convert in your browser.</span></div>}
      {status === 'error' && <div className='modelViewer__state modelViewer__state--error'><strong>Unable to display this model</strong><span>{error}</span></div>}
    </div>
    {annotationMode && selectionFeedback && <p className='partModelSelectionFeedback' role='status'><MousePointer2 aria-hidden='true' /> {selectionFeedback}</p>}
    <div className='modelViewer__notice'><p><strong>Visualization only.</strong> Use this view to understand geometry and orientation—not for dimensional inspection, DFM review, tolerance verification, or manufacturing approval.</p><p>Rendered privately in this browser. The source file is not made public or sent to another visualization service.</p></div>
  </section>
}

export default ModelViewer
