import UserAvatar from '../UserAvatar'

const userName = user => [user?.first_name, user?.last_name]
  .filter(Boolean)
  .join(' ') || user?.email || 'User'

const UserTableIdentity = ({ user, name }) => <div className='userTableIdentity'>
  <UserAvatar user={user} className='userTableIdentity__avatar' size={36} />
  <div className='tablePrimary'>
    <strong>{name || userName(user)}</strong>
    <span>{user?.email}</span>
  </div>
</div>

export default UserTableIdentity
