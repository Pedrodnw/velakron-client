import { describe, expect, it, vi } from 'vitest'
import { uploadProductionAttachment } from '../store/slices/entities/productionCollaboration'
import { uploadFileToIntent } from '../store/fileTransfer'

vi.mock('../store/fileTransfer', () => ({ uploadFileToIntent: vi.fn(), openDownloadTarget: vi.fn() }))

const file = { name: 'material-certificate.pdf', size: 32, type: 'application/pdf' }
const runUpload = async ({ requirement = 'requirement-a', transferError = null } = {}) => {
  uploadFileToIntent.mockReset()
  if (transferError) uploadFileToIntent.mockRejectedValueOnce(transferError)
  else uploadFileToIntent.mockResolvedValueOnce(undefined)
  const dispatch = vi.fn(async action => {
    if (typeof action === 'function') return action(dispatch)
    const url = action.payload?.url
    if (!url) return action
    if (url.endsWith('/intents')) return { ok: true, payload: { data: { attachment: { id: 'file-a' }, upload: { target: '/upload' } } } }
    if (url.endsWith('/finalize')) return { ok: true, payload: { data: { attachment: { id: 'file-a', part_requirement: requirement, state: 'available' } } } }
    return { ok: true, payload: { data: {} } }
  })
  const result = await uploadProductionAttachment('production-a', { file, category: 'document', visibility: 'shared', part_requirement: requirement, regulated_data_acknowledged: true })(dispatch)
  return { result, requests: dispatch.mock.calls.map(([action]) => action).filter(action => action.payload?.url) }
}

describe('Requirement document upload', () => {
  it('links the intent to the requirement and refreshes the production files after verification', async () => {
    const { result, requests } = await runUpload()
    expect(result.ok).toBe(true)
    expect(requests[0].payload.data.part_requirement).toBe('requirement-a')
    expect(requests[0].payload.data.visibility).toBe('shared')
    expect(requests.some(action => action.payload.url.endsWith('/file-a/finalize'))).toBe(true)
    expect(requests.some(action => action.payload.url === '/production-records/production-a/attachments')).toBe(true)
    expect(requests.some(action => action.payload.url.includes('/acknowledge'))).toBe(false)
  })
  it('keeps ordinary production uploads compatible', async () => {
    const { requests } = await runUpload({ requirement: null })
    expect(requests[0].payload.data).not.toHaveProperty('part_requirement')
  })
  it('reports transfer failures without finalizing or acknowledging the requirement', async () => {
    const { result, requests } = await runUpload({ transferError: new Error('Upload interrupted') })
    expect(result.ok).toBe(false)
    expect(result.error.message).toBe('Upload interrupted')
    expect(requests).toHaveLength(1)
  })
})
