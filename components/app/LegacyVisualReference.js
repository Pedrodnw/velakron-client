import { CircleAlert, LoaderCircle } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import PartAssetViewer from './PartAssetViewer'
import { cacheVisualPreviewBestEffort } from './visualContextPreview'
import styles from './LegacyVisualReference.module.scss'

// Older anchors have a camera/selection but no saved image. Render once to
// recover that context, then release the viewer even when the case is read-only.
export default function LegacyVisualReference({ anchor, visual, title, onPreviewReady }) {
  const [preview, setPreview] = useState('')
  const [unavailable, setUnavailable] = useState(false)
  useEffect(() => {
    if (preview || visual?.loading || !visual?.source) return undefined
    const timeout = setTimeout(() => setUnavailable(true), 30000)
    return () => clearTimeout(timeout)
  }, [preview, visual?.loading, visual?.source])

  const capture = useCallback(image => {
    if (!image?.data_url) return
    setPreview(image.data_url)
    // Display does not depend on permission to cache, or a successful upload.
    void cacheVisualPreviewBestEffort(() => onPreviewReady?.(image))
  }, [onPreviewReady])

  if (preview) return <img className='partCaseVisual__image' src={preview} alt={`Visual reference for ${title}`} />
  if (unavailable) return <div className='partCaseVisual__notice'><CircleAlert aria-hidden='true' /><strong>Image preview unavailable</strong><span>Use Open full viewer to see this reference in context.</span></div>
  return <div className={styles.capture}>
    <div className='partCaseVisual__notice' role='status'><LoaderCircle className='spin' aria-hidden='true' /><strong>Preparing image preview</strong></div>
    <div className={styles.renderer} aria-hidden='true' inert>
      <PartAssetViewer asset={visual?.asset} source={visual?.source} loading={visual?.loading} anchors={[anchor]} selectedAnchorId={anchor.id || anchor._id} onPreviewReady={capture} />
    </div>
  </div>
}
