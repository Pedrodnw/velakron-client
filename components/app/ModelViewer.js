import { Focus, LoaderCircle, MousePointer2, ZoomIn, ZoomOut } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { modelExtension, modelFormatLabel } from '../../store/modelFiles'

let occtRuntimePromise = null
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

const safeColor = (THREE, value) => {
  const scale = Array.isArray(value) && value.some(channel => channel > 1) ? 255 : 1
  const color = !Array.isArray(value) || value.length < 3
    ? new THREE.Color(0x4f86c6)
    : new THREE.Color(value[0] / scale, value[1] / scale, value[2] / scale)
  const hsl = {}
  color.getHSL(hsl)
  const lightness = Math.min(Math.max(hsl.l, 0.32), 0.62)
  color.setHSL(hsl.h, Math.min(hsl.s, 0.58), lightness)
  return color
}

const buildStepGroup = (THREE, result) => {
  if (!result?.success || !Array.isArray(result.meshes) || !result.meshes.length) {
    throw new Error('This STEP file did not contain displayable 3D geometry.')
  }
  const group = new THREE.Group()
  for (const imported of result.meshes) {
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
    const material = new THREE.MeshStandardMaterial({
      color: safeColor(THREE, imported.color),
      metalness: 0.06,
      roughness: 0.62,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = imported.name || 'STEP part'
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry, 28),
      new THREE.LineBasicMaterial({ color: 0x4f5f72, transparent: true, opacity: 0.48 }),
    )
    mesh.add(edges)
    group.add(mesh)
  }
  if (!group.children.length) throw new Error('This STEP file did not contain displayable surfaces.')
  return group
}

const disposeObject = object => {
  object?.traverse?.(child => {
    child.geometry?.dispose?.()
    if (Array.isArray(child.material)) child.material.forEach(material => material.dispose?.())
    else child.material?.dispose?.()
  })
}

const ModelViewer = ({ file, source }) => {
  const mountRef = useRef(null)
  const fitRef = useRef(() => {})
  const zoomRef = useRef(() => {})
  const guidanceId = useId()
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let stopped = false
    let animationFrame = null
    let resizeObserver = null
    let renderer = null
    let controls = null
    let model = null

    const start = async () => {
      setStatus('loading')
      setError('')
      try {
        const extension = modelExtension(file?.display_filename || file?.original_filename)
        const parserPromise = extension === 'stl'
          ? import('three/addons/loaders/STLLoader.js')
          : loadOcctRuntime()
        const [THREE, { OrbitControls }, parser, response] = await Promise.all([
          import('three'),
          import('three/addons/controls/OrbitControls.js'),
          parserPromise,
          fetch(source, { credentials: 'include' }),
        ])
        if (stopped || !mountRef.current) return
        if (!response.ok) throw new Error('Velakron could not securely load this model.')
        const bytes = await response.arrayBuffer()
        if (stopped) return

        const scene = new THREE.Scene()
        scene.background = new THREE.Color(0xf7f9fc)
        const camera = new THREE.PerspectiveCamera(42, 1, 0.01, 1000000)
        camera.up.set(0, 0, 1)
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
        renderer.outputColorSpace = THREE.SRGBColorSpace
        renderer.toneMapping = THREE.ACESFilmicToneMapping
        renderer.toneMappingExposure = 1.08
        mountRef.current.replaceChildren(renderer.domElement)
        renderer.domElement.setAttribute('aria-label', `Interactive ${modelFormatLabel(file)} viewer`)
        renderer.domElement.setAttribute('aria-describedby', guidanceId)
        renderer.domElement.setAttribute('role', 'application')
        renderer.domElement.tabIndex = 0

        controls = new OrbitControls(camera, renderer.domElement)
        controls.enableDamping = true
        controls.dampingFactor = 0.08
        controls.screenSpacePanning = true

        scene.add(new THREE.HemisphereLight(0xffffff, 0xb8c3d0, 2.15))
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.35)
        keyLight.position.set(4, -5, 7)
        scene.add(keyLight)
        const fillLight = new THREE.DirectionalLight(0xc9ddf7, 1.25)
        fillLight.position.set(-5, 3, 2)
        scene.add(fillLight)
        const rimLight = new THREE.DirectionalLight(0xffffff, 0.8)
        rimLight.position.set(-2, -4, -3)
        scene.add(rimLight)

        if (extension === 'stl') {
          const geometry = new parser.STLLoader().parse(bytes)
          geometry.computeVertexNormals()
          model = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            color: 0x4f86c6,
            metalness: 0.06,
            roughness: 0.62,
            side: THREE.DoubleSide,
          }))
          model.add(new THREE.LineSegments(
            new THREE.EdgesGeometry(geometry, 28),
            new THREE.LineBasicMaterial({ color: 0x4f5f72, transparent: true, opacity: 0.48 }),
          ))
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
        }
        const keyboardMove = event => {
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
        renderer.domElement.addEventListener('keydown', keyboardMove)
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
        }
        resizeObserver = new ResizeObserver(resize)
        resizeObserver.observe(mountRef.current)
        resize()
        fit()

        const render = () => {
          if (stopped) return
          controls.update()
          renderer.render(scene, camera)
          animationFrame = requestAnimationFrame(render)
        }
        render()
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
      if (animationFrame) cancelAnimationFrame(animationFrame)
      resizeObserver?.disconnect()
      controls?.dispose()
      disposeObject(model)
      renderer?.dispose()
      renderer?.domElement?.remove()
    }
  }, [file, guidanceId, source])

  return <section className='modelViewer'>
    <div className='modelViewer__toolbar'>
      <p id={guidanceId}><MousePointer2 aria-hidden='true' /> Drag or use arrow keys to rotate · scroll, pinch, or +/− to zoom · right-drag to move</p>
      <div>
        <button type='button' aria-label='Zoom in' onClick={() => zoomRef.current(0.78)} disabled={status !== 'ready'}><ZoomIn aria-hidden='true' /></button>
        <button type='button' aria-label='Zoom out' onClick={() => zoomRef.current(1.28)} disabled={status !== 'ready'}><ZoomOut aria-hidden='true' /></button>
        <button type='button' onClick={() => fitRef.current()} disabled={status !== 'ready'}><Focus aria-hidden='true' /> Fit model</button>
      </div>
    </div>
    <div className='modelViewer__viewport'>
      <div className='modelViewer__canvas' ref={mountRef} />
      {status === 'loading' && <div className='modelViewer__state'><LoaderCircle className='spin' aria-hidden='true' /><strong>Preparing the 3D model</strong><span>STEP files can take a moment to convert in your browser.</span></div>}
      {status === 'error' && <div className='modelViewer__state modelViewer__state--error'><strong>Unable to display this model</strong><span>{error}</span></div>}
    </div>
    <div className='modelViewer__notice'><p><strong>Visualization only.</strong> Use this view to understand geometry and orientation—not for dimensional inspection, DFM review, tolerance verification, or manufacturing approval.</p><p>Rendered privately in this browser. The source file is not made public or sent to another visualization service.</p></div>
  </section>
}

export default ModelViewer
