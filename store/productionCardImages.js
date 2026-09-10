import { apiCallBegan } from './api'
import { fileTransferFetchOptions, resolveFileTransferTarget } from './fileTransfer'

export const requestProductionCardImage = descriptor => apiCallBegan({
  organizationScoped: true,
  url: `/parts/${descriptor.part_id}/revisions/${descriptor.revision_id}/assets/${descriptor.asset_id}/${descriptor.kind === 'model_preview' ? 'model-preview-view-intent' : 'view-intent'}`,
  method: 'post',
  data: {},
})

// One loader per mounted organization/session scope. It holds only image blobs,
// never CAD sources, and is disposed on context change or dashboard unmount.
export const createProductionCardImageLoader = ({ requestView, fetchImage = fetch, createUrl = blob => URL.createObjectURL(blob), revokeUrl = url => URL.revokeObjectURL(url), now = Date.now, concurrency = 4 }) => {
  const entries = new Map()
  const queue = []
  const controllers = new Set()
  let running = 0
  let disposed = false
  const drain = () => {
    while (!disposed && running < concurrency && queue.length) {
      const work = queue.shift()
      running += 1
      work().finally(() => { running -= 1; drain() })
    }
  }
  const run = async descriptor => {
    for (let attempt = 0; attempt < 2 && !disposed; attempt += 1) {
      const result = await requestView(descriptor)
      if (disposed || !result?.ok) return null
      const view = result.payload?.data?.view
      const expiresAt = Date.parse(view?.expires_at)
      if (view?.viewer_kind !== 'image' || !view?.target || !Number.isFinite(expiresAt)) return null
      if (expiresAt <= now()) continue
      const controller = new AbortController()
      controllers.add(controller)
      try {
        const response = await fetchImage(resolveFileTransferTarget(view.target), fileTransferFetchOptions(view.target, { signal: controller.signal }))
        // A signed URL can expire between issuing it and fetching the image.
        if ([401, 403].includes(response.status) && attempt === 0) continue
        if (!response.ok || !/^image\/(png|jpeg|webp)(;|$)/i.test(response.headers.get('content-type') || '')) return null
        const blob = await response.blob()
        if (disposed) return null
        return { src: createUrl(blob), expiresAt }
      } finally {
        controllers.delete(controller)
      }
    }
    return null
  }
  return {
    load(descriptor) {
      if (disposed || !descriptor?.cache_key || !['image', 'model_preview'].includes(descriptor.kind)) return Promise.resolve(null)
      const key = descriptor.cache_key
      const existing = entries.get(key)
      if (existing?.promise) return existing.promise
      if (existing && (!existing.image || existing.image.expiresAt > now() + 5_000)) return Promise.resolve(existing.image)
      if (existing?.image) revokeUrl(existing.image.src)
      let finish
      const promise = new Promise(resolve => { finish = resolve })
      const entry = { promise, finish, image: null }
      entries.set(key, entry)
      queue.push(async () => {
        let image = null
        try { image = await run(descriptor) } catch { /* Image failure must not fail the dashboard. */ }
        entry.promise = null
        entry.image = image
        finish(image)
      })
      drain()
      return promise
    },
    dispose() {
      disposed = true
      queue.length = 0
      for (const controller of controllers) controller.abort()
      for (const entry of entries.values()) {
        if (entry.image) revokeUrl(entry.image.src)
        entry.finish?.(null)
      }
      entries.clear()
    },
  }
}
