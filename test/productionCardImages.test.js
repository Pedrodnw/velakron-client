import { describe, expect, it, vi } from 'vitest'
import { createProductionCardImageLoader, requestProductionCardImage } from '../store/productionCardImages'

const descriptor = { kind: 'image', part_id: 'part', revision_id: 'revision', asset_id: 'asset', cache_key: 'revision:asset:image' }
const intent = (target = 'https://private-images.example.test/preview.png', expiry = 200000) => ({ ok: true, payload: { data: { view: { target, viewer_kind: 'image', expires_at: new Date(expiry).toISOString() } } } })
const response = (status = 200, type = 'image/png') => ({ ok: status === 200, status, headers: { get: () => type }, blob: async () => new Blob(['synthetic'], { type }) })
const setup = overrides => {
  const options = { requestView: vi.fn(async () => intent()), fetchImage: vi.fn(async () => response()), createUrl: vi.fn(() => 'blob:synthetic'), revokeUrl: vi.fn(), now: () => 100000, ...overrides }
  return { ...options, loader: createProductionCardImageLoader(options) }
}
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done }); return { promise, resolve } }

describe('Image-only production card loading', () => {
  it('uses organization-scoped authorized view intents and never preview creation', () => {
    expect(requestProductionCardImage(descriptor).payload).toMatchObject({ organizationScoped: true, method: 'post', url: '/parts/part/revisions/revision/assets/asset/view-intent' })
    expect(requestProductionCardImage({ ...descriptor, kind: 'model_preview' }).payload.url).toBe('/parts/part/revisions/revision/assets/asset/model-preview-view-intent')
  })
  it('deduplicates simultaneous and repeated cards and disposes the shared blob', async () => {
    const f = setup()
    const [first, second] = await Promise.all([f.loader.load(descriptor), f.loader.load(descriptor)])
    expect(first).toEqual(second)
    expect(await f.loader.load(descriptor)).toEqual(first)
    expect(f.requestView).toHaveBeenCalledTimes(1)
    expect(f.fetchImage).toHaveBeenCalledTimes(1)
    expect(f.fetchImage.mock.calls[0][1].credentials).toBe('omit')
    f.loader.dispose()
    expect(f.revokeUrl).toHaveBeenCalledWith(first.src)
    expect(await f.loader.load(descriptor)).toBeNull()
  })
  it('bounds concurrent requests when 20 unique images become visible', async () => {
    const release = deferred()
    let active = 0
    let peak = 0
    const f = setup({ requestView: vi.fn(async () => { active += 1; peak = Math.max(peak, active); await release.promise; active -= 1; return intent() }) })
    const results = Array.from({ length: 20 }, (_, index) => f.loader.load({ ...descriptor, cache_key: `image-${index}` }))
    expect(f.requestView).toHaveBeenCalledTimes(4)
    release.resolve()
    await Promise.all(results)
    expect(peak).toBe(4)
    expect(f.requestView).toHaveBeenCalledTimes(20)
    f.loader.dispose()
  })
  it('reacquires an expired signed URL once, then stops on repeated failure', async () => {
    const f = setup({ fetchImage: vi.fn().mockResolvedValueOnce(response(403)).mockResolvedValueOnce(response()) })
    expect(await f.loader.load(descriptor)).not.toBeNull()
    expect(f.requestView).toHaveBeenCalledTimes(2)
    f.loader.dispose()
    const denied = setup({ fetchImage: vi.fn(async () => response(403)) })
    expect(await denied.loader.load(descriptor)).toBeNull()
    expect(await denied.loader.load(descriptor)).toBeNull()
    expect(denied.requestView).toHaveBeenCalledTimes(2)
  })
  it('refreshes cached images at expiry and uses credentials only for the application route', async () => {
    let now = 100000
    const f = setup({ now: () => now, requestView: vi.fn(async () => intent('/parts/part/image', now + 10000)) })
    await f.loader.load(descriptor)
    expect(f.fetchImage.mock.calls[0][1].credentials).toBe('include')
    now = 111000
    await f.loader.load(descriptor)
    expect(f.requestView).toHaveBeenCalledTimes(2)
    expect(f.revokeUrl).toHaveBeenCalledTimes(1)
    f.loader.dispose()
  })
  it('does not fetch CAD, store failed images, or turn image denial into a dashboard error', async () => {
    const cases = [
      { requestView: async () => ({ ok: false, error: { code: 'NOT_FOUND' } }) },
      { requestView: async () => ({ ok: true, payload: { data: { view: { ...intent().payload.data.view, viewer_kind: '3d_model' } } } }) },
      { fetchImage: async () => response(200, 'text/html') },
      { fetchImage: async () => { throw new Error('offline') } },
    ]
    for (const overrides of cases) {
      const f = setup(overrides)
      expect(await f.loader.load(descriptor)).toBeNull()
      expect(f.createUrl).not.toHaveBeenCalled()
      f.loader.dispose()
    }
  })
  it('ignores late image access and resolves queued work when the organization changes', async () => {
    const gate = deferred()
    const f = setup({ concurrency: 1, requestView: vi.fn(() => gate.promise) })
    const first = f.loader.load(descriptor)
    const second = f.loader.load({ ...descriptor, cache_key: 'second' })
    f.loader.dispose()
    expect(await first).toBeNull()
    expect(await second).toBeNull()
    gate.resolve(intent())
    await gate.promise
    expect(f.fetchImage).not.toHaveBeenCalled()
    expect(f.requestView).toHaveBeenCalledTimes(1)
  })
  it('aborts an image transfer when its session scope is disposed', async () => {
    const started = deferred()
    const f = setup({ fetchImage: vi.fn((_url, options) => { started.resolve(options.signal); return new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new Error('aborted')))) }) })
    const result = f.loader.load(descriptor)
    const signal = await started.promise
    f.loader.dispose()
    expect(signal.aborted).toBe(true)
    expect(await result).toBeNull()
    expect(f.createUrl).not.toHaveBeenCalled()
  })
})
