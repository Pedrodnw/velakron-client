import Image from 'next/image'
import { getDemoAvatar } from '../content/demoAvatars'

const UserAvatar = ({ user, className = '', fallback = null, size = 48 }) => {
  const source = getDemoAvatar(user)
  const classes = ['userAvatar', source ? 'userAvatar--image' : '', className]
    .filter(Boolean)
    .join(' ')

  return <span className={classes} aria-hidden='true'>
    {source
      ? <Image src={source} alt='' width={size} height={size} sizes={`${size}px`} />
      : (user?.initials || fallback)}
  </span>
}

export default UserAvatar
