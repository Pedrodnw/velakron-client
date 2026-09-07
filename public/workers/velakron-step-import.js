/* global occtimportjs */

importScripts('/vendor/occt-import-js/occt-import-js.js')

const wasmUrl = new URL('/vendor/occt-import-js/occt-import-js.wasm', self.location.origin).href
const MAX_DISPLAY_TRIANGLES = 2_500_000
const MAX_DISPLAY_VERTICES = 5_000_000

const copyFloat32 = values => values?.length ? Float32Array.from(values) : null
const copyUint32 = values => values?.length ? Uint32Array.from(values) : null

self.onmessage = async event => {
  try {
    const startedAt = performance.now()
    const runtime = await occtimportjs({
      locateFile: filename => filename.endsWith('.wasm') ? wasmUrl : filename,
    })
    const imported = runtime.ReadStepFile(new Uint8Array(event.data.bytes), event.data.parameters)
    if (!imported?.success || !Array.isArray(imported.meshes) || !imported.meshes.length) {
      throw new Error('This STEP file did not contain displayable 3D geometry.')
    }

    const transfer = []
    let vertexCount = 0
    let triangleCount = 0
    const meshes = []
    for (const source of imported.meshes) {
      const positions = copyFloat32(source.attributes?.position?.array)
      if (!positions?.length) continue
      const normals = copyFloat32(source.attributes?.normal?.array)
      const indices = copyUint32(source.index?.array)
      vertexCount += positions.length / 3
      triangleCount += indices?.length ? indices.length / 3 : positions.length / 9
      transfer.push(positions.buffer)
      if (normals) transfer.push(normals.buffer)
      if (indices) transfer.push(indices.buffer)
      meshes.push({
        name: String(source.name || 'STEP part'),
        color: source.color ? Array.from(source.color).slice(0, 4) : null,
        positions,
        normals,
        indices,
      })
    }
    if (!meshes.length) throw new Error('This STEP file did not contain displayable surfaces.')
    if (triangleCount > MAX_DISPLAY_TRIANGLES || vertexCount > MAX_DISPLAY_VERTICES) {
      throw new Error('This model is too detailed for a stable browser preview. Upload a simplified STEP or STL visualization while keeping the original file in the technical record.')
    }

    self.postMessage({
      ok: true,
      result: {
        success: true,
        meshes,
        stats: {
          meshCount: meshes.length,
          vertexCount: Math.round(vertexCount),
          triangleCount: Math.round(triangleCount),
          conversionMs: Math.round(performance.now() - startedAt),
        },
      },
    }, transfer)
  } catch (error) {
    self.postMessage({ ok: false, error: error?.message || 'The STEP model could not be converted.' })
  } finally {
    self.close()
  }
}
