import { describe, expect, it } from 'vitest'
import { PerspectiveCamera, Vector3 } from 'three'
import { modelFitDistance } from '../components/app/modelFraming'

describe('whole-model framing', () => {
  it.each([0.4, 0.65, 1, 1.8])('keeps all bounding-box corners visible at aspect %s', aspect => {
    for (const size of [new Vector3(140, 70, 15), new Vector3(20, 20, 180), new Vector3(80, 80, 80)]) {
      const camera = new PerspectiveCamera(45, aspect, 0.001, 100000)
      camera.position.copy(new Vector3(1, -1, 0.72).normalize().multiplyScalar(modelFitDistance(size, camera.fov, aspect)))
      camera.lookAt(0, 0, 0)
      camera.updateMatrixWorld()
      for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
        const projected = new Vector3(x * size.x / 2, y * size.y / 2, z * size.z / 2).project(camera)
        expect(Math.abs(projected.x)).toBeLessThan(1)
        expect(Math.abs(projected.y)).toBeLessThan(1)
        expect(projected.z).toBeGreaterThan(-1)
        expect(projected.z).toBeLessThan(1)
      }
    }
  })
})
