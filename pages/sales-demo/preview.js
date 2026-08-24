import { LoaderCircle } from 'lucide-react'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import FormMessage from '../../components/auth/FormMessage'
import { VelakronLogo } from '../../components/design-system'
import Seo from '../../components/Seo'
import { apiCallBegan } from '../../store/api'
import { getAuthInitialized, getAuthUser, loadSession } from '../../store/slices/auth'

const SalesDemoPreviewExchange = () => {
  const dispatch = useDispatch()
  const router = useRouter()
  const initialized = useSelector(getAuthInitialized)
  const user = useSelector(getAuthUser)
  const [error, setError] = useState('')
  const exchanging = useRef(false)

  useEffect(() => {
    if (!router.isReady || !initialized) return
    if (!user) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
      return
    }
    const code = String(router.query.code || '')
    if (!code) { setError('This founder preview link is incomplete.'); return }
    if (exchanging.current) return
    exchanging.current = true
    let active = true
    const exchange = async () => {
      const result = await dispatch(apiCallBegan({
        url: '/sales-demos/presenter-grants/exchange',
        method: 'post',
        data: { code },
      }))
      if (!active) return
      if (!result?.ok) {
        exchanging.current = false
        setError(result?.error?.message || 'This preview link is unavailable or expired.')
        return
      }
      const presenterToken = result.payload.data.presenter_token
      window.sessionStorage.setItem('velakron_sales_demo_presenter', presenterToken)
      await dispatch(loadSession({ 'X-Velakron-Demo-Presenter': presenterToken }))
      await router.replace(result.payload.data.redirect_to || '/app')
    }
    exchange()
    return () => { active = false }
  }, [dispatch, initialized, router.isReady, router.query.code, user])

  return <div className='authLoading authLoading--workspace'>
    <Seo title='Opening Sales Demo preview' noIndex />
    <VelakronLogo priority sizes='150px' />
    {error ? <FormMessage type='error'>{error}</FormMessage> : <><LoaderCircle className='spin' aria-hidden='true' /><p>Opening your founder preview…</p></>}
  </div>
}

SalesDemoPreviewExchange.getLayout = page => page
export default SalesDemoPreviewExchange
