import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { getAuthInitialized, getAuthStatus, loadSession } from '../../store/slices/auth'

const AuthBootstrap = () => {
  const dispatch = useDispatch()
  const initialized = useSelector(getAuthInitialized)
  const status = useSelector(getAuthStatus)

  useEffect(() => {
    if (!initialized && status !== 'loading') dispatch(loadSession())
  }, [dispatch, initialized, status])

  return null
}

export default AuthBootstrap
