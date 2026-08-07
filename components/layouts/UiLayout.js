import { useDispatch, useSelector } from 'react-redux'
import { getMobileNavigationOpen, mobileNavigationClosed } from '../../store/slices/ui'

const UiLayout = () => {
  const dispatch = useDispatch()
  const mobileOpen = useSelector(getMobileNavigationOpen)

  if (!mobileOpen) return null

  return <button
    className='uiLayout__backdrop'
    type='button'
    aria-label='Close navigation'
    onClick={() => dispatch(mobileNavigationClosed())}
  />
}

export default UiLayout
