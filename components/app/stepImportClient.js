const STEP_WORKER_URL = '/workers/velakron-step-import.js'
const STEP_IMPORT_TIMEOUT_MS = 120_000

const abortError = () => {
  const error = new Error('STEP conversion was cancelled.')
  error.name = 'AbortError'
  return error
}

export const importStepInDisposableWorker = ({ bytes, parameters, signal }) => new Promise((resolve, reject) => {
  if (typeof Worker === 'undefined') {
    reject(new Error('This browser cannot run the protected STEP converter. Use a current version of Chrome, Edge, Safari, or Firefox.'))
    return
  }

  const worker = new Worker(STEP_WORKER_URL, { name: 'velakron-step-import' })
  let settled = false
  const finish = (callback, value) => {
    if (settled) return
    settled = true
    window.clearTimeout(timeout)
    signal?.removeEventListener('abort', cancel)
    worker.terminate()
    callback(value)
  }
  const cancel = () => finish(reject, abortError())
  const timeout = window.setTimeout(() => finish(reject, new Error('This STEP model took too long to prepare. Try a simplified model or upload an STL visualization.')), STEP_IMPORT_TIMEOUT_MS)

  worker.addEventListener('message', event => {
    if (event.data?.ok) finish(resolve, event.data.result)
    else finish(reject, new Error(event.data?.error || 'The STEP model could not be converted.'))
  }, { once: true })
  worker.addEventListener('error', () => finish(reject, new Error('The protected STEP converter stopped unexpectedly.')), { once: true })
  signal?.addEventListener('abort', cancel, { once: true })
  if (signal?.aborted) {
    cancel()
    return
  }

  worker.postMessage({ bytes, parameters }, [bytes])
})
