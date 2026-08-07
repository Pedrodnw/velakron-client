import { describe, expect, it } from 'vitest'
import { formatLabel, formatStorageStatus } from '../components/app/formatters'

describe('portal presentation formatters', () => {
  it('preserves business acronyms instead of title-casing raw enums', () => {
    expect(formatLabel('oem')).toBe('OEM')
    expect(formatLabel('oem_admin')).toBe('OEM administrator')
    expect(formatLabel('s3')).toBe('S3')
  })

  it('turns structured storage health into a stable user-facing status', () => {
    expect(formatStorageStatus({ provider: 's3', configured: true, verified: true, region: 'us-east-2' })).toEqual({
      label: 'S3 verified',
      tone: 'success',
      detail: 'Private storage in us-east-2',
    })
    expect(formatStorageStatus({ provider: 's3', configured: true, verified: false, region: 'us-east-2' })).toMatchObject({
      label: 'S3 awaiting verification',
      tone: 'warning',
    })
    expect(formatStorageStatus(null)).toMatchObject({ label: 'Unavailable', tone: 'danger' })
  })
})
