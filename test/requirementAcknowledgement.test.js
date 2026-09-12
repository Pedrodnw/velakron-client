import { describe, expect, it, vi } from 'vitest'
import { acknowledgePartRequirement } from '../store/slices/entities/parts'

const context = { partId: 'part', revisionId: 'revision' }
describe('Requirement acknowledgement with a missing cached review', () => {
  it('refreshes an old demo revision and acknowledges against its repaired review', async () => {
    const saved = { ok: true, payload: { data: { review: { id: 'review' } } } }
    const dispatch = vi.fn().mockResolvedValueOnce(saved).mockResolvedValueOnce(saved)
    expect(await acknowledgePartRequirement('', 'requirement', context)(dispatch)).toBe(saved)
    expect(dispatch.mock.calls.map(([action]) => action.payload.url)).toEqual([
      '/parts/part/revisions/revision', '/part-reviews/review/requirements/requirement/acknowledge',
    ])
  })
  it('uses an already loaded review without an unnecessary reload', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true })
    await acknowledgePartRequirement('existing-review', 'requirement', context)(dispatch)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch.mock.calls[0][0].payload.url).toBe('/part-reviews/existing-review/requirements/requirement/acknowledge')
  })
  it('does not send an invalid acknowledgement if the review is still unavailable', async () => {
    const dispatch = vi.fn().mockResolvedValue({ ok: true, payload: { data: { review: null } } })
    const result = await acknowledgePartRequirement('', 'requirement', context)(dispatch)
    expect(result.ok).toBe(false)
    expect(result.error.message).toContain('supplier review could not be loaded')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
  it('preserves a failed refresh error and leaves the requirement unacknowledged', async () => {
    const failed = { ok: false, error: { message: 'Network unavailable' } }
    const dispatch = vi.fn().mockResolvedValue(failed)
    expect(await acknowledgePartRequirement('', 'requirement', context)(dispatch)).toBe(failed)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})
