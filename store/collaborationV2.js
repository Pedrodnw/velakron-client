export const CONVERSATION_V2 = 'part-collaboration-v2'
export const FORMAL_V2 = 'attention-workflow-v2'
export const isFormalV2 = item => item?.workflow?.version === FORMAL_V2 || item?.workflow_version === FORMAL_V2
const keys = new Map()
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value
export const newCommandKey = () => `collaboration:${globalThis.crypto?.randomUUID?.() || `${Date.now()}:${Math.random().toString(36).slice(2)}`}`
// A retry of the same version and payload keeps its identity. Drafts stay in the
// component; no technical content or credentials are written to browser storage.
export const commandData = (aggregate, action, version, payload = {}, suppliedKey) => {
  const signature = JSON.stringify(canonical({ aggregate, action, version, payload }))
  if (!keys.has(signature)) keys.set(signature, suppliedKey || newCommandKey())
  if (keys.size > 200) keys.delete(keys.keys().next().value)
  return { ...payload, version, idempotency_key: suppliedKey || keys.get(signature) }
}
export const workflowError = result => result?.error?.code === 'VERSION_CONFLICT'
  ? 'This record changed in another session. Your draft is saved here. Review the refreshed step, then submit again.'
  : result?.error?.message === 'Network Error' || result?.error?.code === 'ERR_NETWORK'
    ? 'Connection lost. Your draft is saved here. Reconnect and try again.'
    : result?.error?.message || 'The update could not be saved. Your draft is still here.'
