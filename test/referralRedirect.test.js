import { describe, expect, it } from 'vitest'
import { getServerSideProps } from '../pages/r/[code]'

describe('Sales Partner flyer redirect', () => {
  it('preserves an opaque referral code when forwarding to the demo request form', async () => {
    const code = 'sp_0123456789abcdefghijklmn'
    await expect(getServerSideProps({ params: { code } })).resolves.toEqual({
      redirect: {
        destination: `/request-demo?ref=${code}`,
        permanent: false,
      },
    })
  })

  it('returns not found for malformed codes', async () => {
    await expect(getServerSideProps({ params: { code: '../account' } })).resolves.toEqual({ notFound: true })
  })
})
