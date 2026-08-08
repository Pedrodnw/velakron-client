const DEMO_AVATARS = Object.freeze({
  'velakron-admin@fixture.velakron.test': '/images/demo-avatars/maya-chen.png',
  'oem-alpha-admin@fixture.velakron.test': '/images/demo-avatars/elena-park.png',
  'oem-alpha-user@fixture.velakron.test': '/images/demo-avatars/marcus-reid.png',
  'oem-beta-admin@fixture.velakron.test': '/images/demo-avatars/theo-brooks.png',
  'supplier-one-admin@fixture.velakron.test': '/images/demo-avatars/daniel-ortiz.png',
  'supplier-one-user@fixture.velakron.test': '/images/demo-avatars/priya-shah.png',
  'supplier-two-admin@fixture.velakron.test': '/images/demo-avatars/amina-yusuf.png',
})

export const getDemoAvatar = user => {
  const email = String(user?.email || '').trim().toLowerCase()
  return DEMO_AVATARS[email] || null
}

export default DEMO_AVATARS
