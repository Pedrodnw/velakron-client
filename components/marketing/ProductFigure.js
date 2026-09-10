import { getImageProps } from 'next/image'
import { useRef, useState } from 'react'
import { Maximize2, Minus, Plus, X } from 'lucide-react'
import { productMedia } from '../../content/marketing/media'

const imageSizes = {
  feature: '(max-width: 767px) calc(100vw - 40px), (max-width: 1100px) 46vw, 640px',
  hero: '(max-width: 1100px) calc(100vw - 64px), (max-width: 1440px) 54vw, 780px',
  full: '(max-width: 767px) calc(100vw - 40px), (max-width: 1328px) calc(100vw - 64px), 1264px',
  article: '(max-width: 767px) calc(100vw - 40px), 740px',
  portrait: '(max-width: 400px) calc(100vw - 56px), 360px',
}
export default function ProductFigure({ name, priority = false, caption, className = '', label = true, placement = 'feature' }) {
  const asset = productMedia[name]
  const dialog = useRef(null)
  const trigger = useRef(null)
  const closeButton = useRef(null)
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  if (!asset) return null
  const propsFor = (image, sizes) => getImageProps({ src: image.src, width: image.width, height: image.height, alt: asset.alt, sizes, quality: 90, unoptimized: Boolean(image.lossless), loading: priority ? 'eager' : 'lazy', fetchPriority: priority ? 'high' : undefined }).props
  const desktop = propsFor(asset, imageSizes[placement] || imageSizes.feature)
  const mobile = asset.mobile && propsFor(asset.mobile, 'calc(100vw - 40px)')
  const original = asset.original || asset
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus() }
  const enlarge = () => { setZoom(window.innerWidth < 640 ? 2 : 1); setOpen(true); dialog.current?.showModal(); closeButton.current?.focus() }
  return <figure className={`mk-product mk-product--${placement} ${className}`} style={asset.displayWidth ? {maxWidth:asset.displayWidth,marginInline:'auto'} : undefined}>
    <div className='mk-product__frame'>
      <button type='button' className='mk-product__open' ref={trigger} onClick={enlarge} aria-label={`Enlarge ${asset.alt}`}>
        <picture>{mobile && <source media='(max-width: 600px)' srcSet={mobile.srcSet || mobile.src} sizes={mobile.sizes} width={asset.mobile.width} height={asset.mobile.height} />}<img {...desktop} /></picture>
        <span className='mk-product__enlarge'><Maximize2 size={17} aria-hidden /><span>Explore image</span></span>
      </button>
    </div>
    <figcaption><span>{caption || asset.caption}</span>{label && <small>Actual product · illustrative data</small>}</figcaption>
    {asset.takeaway && <p className='mk-product__takeaway'><span aria-hidden>↳</span>{asset.takeaway}</p>}
    <dialog ref={dialog} className='mk-lightbox' aria-label={caption || asset.caption} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === dialog.current) close() }}>
      <div className='mk-lightbox__toolbar'><span>Product detail</span><div className='mk-lightbox__controls'>
        <button type='button' onClick={() => setZoom(value => Math.max(1, value - .5))} disabled={zoom === 1} aria-label='Zoom out'><Minus size={18} aria-hidden /></button>
        <button type='button' className='mk-lightbox__fit' onClick={() => setZoom(1)} aria-label='Fit image to window'>Fit</button>
        <button type='button' onClick={() => setZoom(value => Math.min(3, value + .5))} disabled={zoom === 3} aria-label='Zoom in'><Plus size={18} aria-hidden /></button>
        <button type='button' ref={closeButton} onClick={close} autoFocus aria-label='Close enlarged image'><X size={22} aria-hidden /></button>
      </div></div>
      <p className='mk-lightbox__instruction' role='status'>{zoom > 1 ? 'Scroll across or down to explore. Use Fit to see the whole image.' : 'Use + to inspect the detail.'}</p>
      <div className='mk-lightbox__viewport' tabIndex={0} role='region' aria-label='Scrollable product image'>
        {open && <img src={original.src} width={original.width} height={original.height} alt={asset.alt} style={{ width: `${zoom * 100}%`, maxWidth: 'none' }} />}
      </div>
      <p>{caption || asset.caption} <a href={original.src} target='_blank' rel='noopener'>Open original image (new tab)</a></p>
    </dialog>
    <noscript><a href={original.src}>Open full-resolution image</a></noscript>
  </figure>
}
