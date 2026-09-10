import { Box, ShieldAlert } from 'lucide-react'
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createProductionCardImageLoader, requestProductionCardImage } from '../../store/productionCardImages'

const Images = createContext(null)

const ImageScope = ({ children }) => {
  const dispatch = useDispatch()
  const [loader, setLoader] = useState(null)
  useEffect(() => {
    const current = createProductionCardImageLoader({ requestView: descriptor => dispatch(requestProductionCardImage(descriptor)) })
    setLoader(current)
    return () => current.dispose()
  }, [dispatch])
  return <Images.Provider value={loader}>{children}</Images.Provider>
}

export const ProductionCardImages = ({ children }) => {
  const scope = useSelector(state => `${state.auth?.user?.id || state.auth?.user?._id || ''}:${state.appContext.activeOrganization?.id || ''}:${state.appContext.activeMembership?.id || ''}:${state.appContext.contextVersion}:${(state.appContext.permissions || []).join(',')}`)
  return <ImageScope key={scope}>{children}</ImageScope>
}

const ProductionCardThumbnail = ({ descriptor, protectedImage = false }) => {
  const loader = useContext(Images)
  const container = useRef(null)
  const [visible, setVisible] = useState(false)
  const [image, setImage] = useState(null)
  const [failed, setFailed] = useState('')
  const key = descriptor?.cache_key || ''
  const request = useMemo(() => descriptor, [key])
  useEffect(() => {
    if (!container.current || protectedImage || !key) return
    if (typeof IntersectionObserver === 'undefined') { setVisible(true); return }
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) { setVisible(true); observer.disconnect() }
    }, { rootMargin: '160px' })
    observer.observe(container.current)
    return () => observer.disconnect()
  }, [key, protectedImage])
  useEffect(() => {
    if (!visible || !loader || !key || protectedImage) return
    let current = true
    let timer
    const load = async () => {
      const result = await loader.load(request)
      if (!current) return
      setImage(result ? { ...result, key, loader } : null)
      if (result) timer = setTimeout(load, Math.max(1_000, result.expiresAt - Date.now()))
    }
    load()
    return () => { current = false; clearTimeout(timer) }
  }, [key, loader, protectedImage, request, visible])
  const src = !protectedImage && image?.key === key && image?.loader === loader && failed !== image.src ? image?.src : null
  return <div ref={container} className={`productionCard__thumbnail${src ? ' has-image' : ''}`}>
    {src ? <img src={src} alt='' decoding='async' onError={() => setFailed(src)} /> : <>
      {protectedImage ? <ShieldAlert aria-hidden='true' /> : <Box aria-hidden='true' />}
      <span>{protectedImage ? 'Protected image' : 'No preview'}</span>
    </>}
  </div>
}

export default ProductionCardThumbnail
