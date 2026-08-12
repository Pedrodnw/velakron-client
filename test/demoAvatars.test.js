import { describe, expect, it } from 'vitest'
import { getDemoAvatar } from '../content/demoAvatars'

describe('synthetic demo avatars', () => {
  it('maps every presentation fixture identity to a local portrait', () => {
    const expected = {
      'velakron-admin@fixture.velakron.test': 'maya-chen.png',
      'founder-sofia@fixture.velakron.test': 'elena-park.png',
      'founder-julian@fixture.velakron.test': 'theo-brooks.png',
      'oem-alpha-admin@fixture.velakron.test': 'elena-park.png',
      'oem-alpha-user@fixture.velakron.test': 'marcus-reid.png',
      'oem-beta-admin@fixture.velakron.test': 'theo-brooks.png',
      'supplier-one-admin@fixture.velakron.test': 'daniel-ortiz.png',
      'supplier-one-user@fixture.velakron.test': 'priya-shah.png',
      'supplier-two-admin@fixture.velakron.test': 'amina-yusuf.png',
    }

    Object.entries(expected).forEach(([email, filename]) => {
      expect(getDemoAvatar({ email })).toBe(`/images/demo-avatars/${filename}`)
    })
  })

  it('does not assign a fictional portrait to an ordinary account', () => {
    expect(getDemoAvatar({ email: 'person@example.com' })).toBeNull()
    expect(getDemoAvatar(null)).toBeNull()
  })
})
