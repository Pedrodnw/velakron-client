import { useSelector } from 'react-redux'
import { getHasPermission } from '../../store/slices/appContext'

const PermissionBoundary = ({ permission, fallback = null, children }) => {
  const allowed = useSelector(getHasPermission(permission))
  return allowed ? children : fallback
}

export default PermissionBoundary
