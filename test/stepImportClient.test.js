import { afterEach, describe, expect, it, vi } from 'vitest'
import { importStepInDisposableWorker } from '../components/app/stepImportClient'

const originalWorker = globalThis.Worker
const originalWindow = globalThis.window

afterEach(() => {
  globalThis.Worker = originalWorker
  globalThis.window = originalWindow
})

describe('disposable STEP importer', () => {
  it('transfers the source buffer and terminates the worker after success', async () => {
    const result = { success: true, meshes: [], stats: {} }
    let instance
    class WorkerStub {
      constructor() { instance = this; this.listeners = {} }
      addEventListener(name, callback) { this.listeners[name] = callback }
      postMessage(message, transfer) {
        this.message = message
        this.transfer = transfer
        queueMicrotask(() => this.listeners.message({ data: { ok: true, result } }))
      }
      terminate = vi.fn()
    }
    globalThis.Worker = WorkerStub
    globalThis.window = { setTimeout, clearTimeout }
    const bytes = new ArrayBuffer(16)

    await expect(importStepInDisposableWorker({ bytes, parameters: {} })).resolves.toBe(result)
    expect(instance.transfer).toEqual([bytes])
    expect(instance.terminate).toHaveBeenCalledOnce()
  })

  it('terminates immediately when conversion is aborted', async () => {
    let instance
    class WorkerStub {
      constructor() { instance = this; this.listeners = {} }
      addEventListener(name, callback) { this.listeners[name] = callback }
      postMessage() {}
      terminate = vi.fn()
    }
    globalThis.Worker = WorkerStub
    globalThis.window = { setTimeout, clearTimeout }
    const controller = new AbortController()
    const pending = importStepInDisposableWorker({ bytes: new ArrayBuffer(8), parameters: {}, signal: controller.signal })
    controller.abort()

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' })
    expect(instance.terminate).toHaveBeenCalledOnce()
  })
})
