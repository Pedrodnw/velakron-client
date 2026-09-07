import { describe, expect, it, vi } from 'vitest'
import { registerModelViewer, requestModelViewer } from '../components/app/modelViewerLease'

describe('model viewer lease', () => {
  it('keeps one viewer active, prioritizes full viewers, and supports explicit switching', () => {
    const thumbnail = vi.fn()
    const firstFull = vi.fn()
    const secondFull = vi.fn()
    const releaseThumbnail = registerModelViewer({ id: 'thumbnail', compact: true, onChange: thumbnail })
    const releaseFirst = registerModelViewer({ id: 'full-a', compact: false, onChange: firstFull })
    const releaseSecond = registerModelViewer({ id: 'full-b', compact: false, onChange: secondFull })

    expect(thumbnail).toHaveBeenLastCalledWith(false)
    expect(firstFull).toHaveBeenLastCalledWith(false)
    expect(secondFull).toHaveBeenLastCalledWith(true)

    requestModelViewer('full-a')
    expect(firstFull).toHaveBeenLastCalledWith(true)
    expect(secondFull).toHaveBeenLastCalledWith(false)

    releaseFirst()
    expect(secondFull).toHaveBeenLastCalledWith(true)
    releaseSecond()
    expect(thumbnail).toHaveBeenLastCalledWith(true)
    releaseThumbnail()
  })
})
