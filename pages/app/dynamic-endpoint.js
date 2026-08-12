import QRCode from 'qrcode'
import {
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FileUp,
  Link2,
  QrCode,
  RefreshCw,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  AppPageHeader,
  AppSkeleton,
  ErrorState,
  PermissionDenied,
  StatusBadge,
} from '../../components/app'
import { formatDateTime } from '../../components/app/formatters'
import PortalPageLayout from '../../components/app/PortalPageLayout'
import FormMessage from '../../components/auth/FormMessage'
import { resultError } from '../../components/auth/utils'
import { Button } from '../../components/design-system'
import Seo from '../../components/Seo'
import { getHasPermission } from '../../store/slices/appContext'
import {
  dynamicEndpointSelectors,
  loadDynamicEndpoint,
  publishDynamicEndpointFile,
  publishDynamicEndpointRedirect,
} from '../../store/slices/entities/dynamicEndpoint'

const fileSize = bytes => {
  if (!Number.isFinite(bytes)) return 'Unknown size'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const modeLabel = mode => ({
  file: 'File active',
  redirect: 'Redirect active',
  unconfigured: 'Not configured',
}[mode] || 'Not configured')

const DynamicEndpoint = () => {
  const dispatch = useDispatch()
  const canManage = useSelector(getHasPermission('dynamic_endpoint.manage'))
  const configuration = useSelector(dynamicEndpointSelectors.getConfiguration)
  const loading = useSelector(dynamicEndpointSelectors.getLoading)
  const mutating = useSelector(dynamicEndpointSelectors.getMutating)
  const upload = useSelector(dynamicEndpointSelectors.getUpload)
  const error = useSelector(dynamicEndpointSelectors.getError)
  const mutationError = useSelector(dynamicEndpointSelectors.getMutationError)
  const [destination, setDestination] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [feedback, setFeedback] = useState(null)
  const [qrSvg, setQrSvg] = useState('')
  const fileInput = useRef(null)

  useEffect(() => {
    if (canManage) dispatch(loadDynamicEndpoint())
  }, [canManage, dispatch])

  useEffect(() => {
    if (configuration?.mode === 'redirect') setDestination(configuration.redirect_url || '')
  }, [configuration?.mode, configuration?.redirect_url])

  useEffect(() => {
    let active = true
    if (!configuration?.public_url) { setQrSvg(''); return undefined }
    QRCode.toString(configuration.public_url, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 720,
      color: { dark: '#07101b', light: '#ffffff' },
    }).then(svg => { if (active) setQrSvg(svg) })
      .catch(() => { if (active) setQrSvg('') })
    return () => { active = false }
  }, [configuration?.public_url])

  const qrDownload = useMemo(() => (
    qrSvg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrSvg)}` : ''
  ), [qrSvg])

  if (!canManage) return <PermissionDenied description='The Dynamic Endpoint is available only to Velakron founders and administrators.' />
  if (loading && !configuration) return <section className='appPanel'><AppSkeleton lines={10} /></section>

  const publishRedirect = async event => {
    event.preventDefault()
    setFeedback(null)
    const result = await dispatch(publishDynamicEndpointRedirect(destination))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The redirect could not be published.') })
      return
    }
    setFeedback({ type: 'success', message: 'Redirect published. The printed QR code now opens this destination.' })
  }

  const publishFile = async event => {
    event.preventDefault()
    if (!selectedFile) {
      setFeedback({ type: 'error', message: 'Choose a file to publish.' })
      return
    }
    setFeedback(null)
    const result = await dispatch(publishDynamicEndpointFile(selectedFile))
    if (!result?.ok) {
      setFeedback({ type: 'error', message: resultError(result, 'The file could not be published.') })
      return
    }
    setSelectedFile(null)
    if (fileInput.current) fileInput.current.value = ''
    setFeedback({ type: 'success', message: 'File published. The printed QR code now opens this file.' })
  }

  const copyPublicUrl = async () => {
    try {
      await navigator.clipboard.writeText(configuration.public_url)
      setFeedback({ type: 'success', message: 'Permanent endpoint URL copied.' })
    } catch {
      setFeedback({ type: 'error', message: 'The URL could not be copied automatically.' })
    }
  }

  const currentFile = configuration?.mode === 'file' ? configuration.active_asset : null
  const statusTone = configuration?.mode === 'unconfigured' ? 'warning' : 'success'

  return <>
    <Seo title='Dynamic Endpoint' description='Manage Velakron’s permanent marketing QR destination.' path='/app/dynamic-endpoint' noIndex />
    <AppPageHeader
      eyebrow='Founder marketing control'
      title='Dynamic Endpoint'
      description='Keep one permanent URL and QR code on printed materials, then change where it leads whenever a campaign changes.'
      actions={configuration?.public_url && <Button href={configuration.public_url} target='_blank' rel='noreferrer' variant='secondary'><ExternalLink aria-hidden='true' /> Test endpoint</Button>}
    />

    {error && <ErrorState title='The Dynamic Endpoint could not be loaded' description={error.message} onRetry={() => dispatch(loadDynamicEndpoint())} />}
    <FormMessage type={feedback?.type}>{feedback?.message}</FormMessage>
    {!feedback && <FormMessage>{mutationError?.message}</FormMessage>}

    {configuration && <>
      <section className='dynamicEndpointSummary appPanel'>
        <div className='dynamicEndpointSummary__icon'><RefreshCw aria-hidden='true' /></div>
        <div>
          <p className='technicalLabel'>Permanent public address</p>
          <a href={configuration.public_url} target='_blank' rel='noreferrer'>{configuration.public_url}</a>
          <p>This address and its QR code never change. Publishing below only changes what visitors receive.</p>
        </div>
        <div className='dynamicEndpointSummary__status'>
          <StatusBadge tone={statusTone}>{modeLabel(configuration.mode)}</StatusBadge>
          <Button variant='secondary' onClick={copyPublicUrl}><Copy aria-hidden='true' /> Copy URL</Button>
        </div>
      </section>

      <div className='dynamicEndpointGrid'>
        <section className='appPanel dynamicEndpointCurrent'>
          <header className='appPanel__header'>
            <div><p className='technicalLabel'>Live destination</p><h2>What visitors get now</h2></div>
            <CheckCircle2 aria-hidden='true' />
          </header>
          {configuration.mode === 'redirect' && <div className='dynamicEndpointCurrent__content'>
            <span className='dynamicEndpointCurrent__kind'><Link2 aria-hidden='true' /> URL redirect</span>
            <a href={configuration.redirect_url} target='_blank' rel='noreferrer'>{configuration.redirect_url}</a>
          </div>}
          {currentFile && <div className='dynamicEndpointCurrent__content'>
            <span className='dynamicEndpointCurrent__kind'><FileUp aria-hidden='true' /> Published file</span>
            <strong>{currentFile.original_filename}</strong>
            <p>{currentFile.mime_type} · {fileSize(currentFile.byte_size)}</p>
          </div>}
          {configuration.mode === 'unconfigured' && <div className='dynamicEndpointCurrent__empty'>Choose a URL or file below before placing the QR code on materials.</div>}
          {configuration.updated_at && <p className='dynamicEndpointCurrent__updated'>Last changed {formatDateTime(configuration.updated_at)}</p>}
        </section>

        <section className='appPanel dynamicEndpointQr'>
          <header className='appPanel__header'>
            <div><p className='technicalLabel'>Print-ready asset</p><h2>Permanent QR code</h2></div>
            <QrCode aria-hidden='true' />
          </header>
          <div className='dynamicEndpointQr__body'>
            <div className='dynamicEndpointQr__code' aria-label={`QR code for ${configuration.public_url}`} dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <div><p>Use this same QR code on every printed item. Downloading it again is only necessary if you lose the original artwork.</p>
              {qrDownload && <a className='vk-button vk-button--secondary' href={qrDownload} download='velakron-dynamic-endpoint-qr.svg'><Download aria-hidden='true' /> Download QR code</a>}
            </div>
          </div>
        </section>
      </div>

      <div className='dynamicEndpointPublishers'>
        <form className='appPanel dynamicEndpointPublisher' onSubmit={publishRedirect}>
          <header className='appPanel__header'>
            <div><p className='technicalLabel'>Option 1</p><h2>Send visitors to a URL</h2></div>
            <Link2 aria-hidden='true' />
          </header>
          <label htmlFor='dynamic-endpoint-url'>HTTPS destination</label>
          <input id='dynamic-endpoint-url' type='url' inputMode='url' required maxLength='2000' placeholder='https://velakron.com/campaign' value={destination} onChange={event => setDestination(event.target.value)} />
          <p className='formHint'>Only secure HTTPS addresses are accepted. Publishing replaces the current file or redirect immediately.</p>
          <Button type='submit' disabled={mutating || !destination.trim()}>{mutating ? 'Publishing…' : 'Publish redirect'}</Button>
        </form>

        <form className='appPanel dynamicEndpointPublisher' onSubmit={publishFile}>
          <header className='appPanel__header'>
            <div><p className='technicalLabel'>Option 2</p><h2>Give visitors a file</h2></div>
            <FileUp aria-hidden='true' />
          </header>
          <label htmlFor='dynamic-endpoint-file'>PDF, image, or text file</label>
          <input ref={fileInput} id='dynamic-endpoint-file' type='file' accept='.pdf,.jpg,.jpeg,.png,.webp,.txt,application/pdf,image/jpeg,image/png,image/webp,text/plain' onChange={event => setSelectedFile(event.target.files?.[0] || null)} />
          <p className='formHint'>Images open in the browser. PDFs and other files download. Maximum size: 25 MB.</p>
          {selectedFile && <div className='dynamicEndpointPublisher__selection'><strong>{selectedFile.name}</strong><span>{fileSize(selectedFile.size)}</span></div>}
          {upload && <div className='dynamicEndpointUpload' role='status'><div style={{ width: `${upload.progress}%` }} /><span>{upload.state === 'verifying' ? 'Verifying file…' : `Uploading ${upload.progress}%`}</span></div>}
          <Button type='submit' disabled={mutating || !selectedFile}>{mutating ? 'Publishing…' : 'Upload and publish file'}</Button>
        </form>
      </div>
    </>}
  </>
}

DynamicEndpoint.getLayout = PortalPageLayout
export default DynamicEndpoint
