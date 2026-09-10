import Image from 'next/image'
import { useRef, useState } from 'react'
import { Maximize2, X } from 'lucide-react'
import { productMedia } from '../../content/marketing/media'

export default function ProductFigure({ name, priority = false, caption, className = '', label = true }) {
  const asset = productMedia[name]
  const dialog = useRef(null)
  const trigger = useRef(null)
  const [open, setOpen] = useState(false)
  const close = () => { dialog.current?.close(); setOpen(false); trigger.current?.focus() }
  const enlarge = () => { setOpen(true); dialog.current?.showModal() }
  if (!asset) return null
  return <figure className={`mk-product ${className}`}>
    <div className='mk-product__frame'><Image src={asset.src} width={asset.width} height={asset.height} alt={asset.alt} preload={priority} sizes={name === 'mobile' ? '(max-width: 640px) 84vw, 360px' : '(max-width: 767px) 92vw, (max-width: 1100px) 88vw, 960px'} quality={85} />
      <button type='button' className='mk-product__enlarge' ref={trigger} onClick={enlarge} aria-label={`Enlarge ${asset.alt}`}><Maximize2 size={16} aria-hidden /><span>View larger</span></button>
    </div>
    <figcaption><span>{caption || asset.caption}</span>{label && <small>Actual product · illustrative data</small>}</figcaption>
    <dialog ref={dialog} className='mk-lightbox' aria-label={caption || asset.caption} onCancel={event => { event.preventDefault(); close() }} onClick={event => { if (event.target === dialog.current) close() }}>
      <div className='mk-lightbox__toolbar'><span>Velakron · example workspace</span><button type='button' onClick={close} autoFocus aria-label='Close enlarged image'><X size={22} aria-hidden /></button></div>
      {open && <Image src={asset.src} width={asset.width} height={asset.height} alt={asset.alt} sizes='95vw' quality={90} />}
      <p>{caption || asset.caption} <span>Synthetic companies and production data.</span> <a href={asset.src} target='_blank' rel='noopener'>Open original image (new tab)</a></p>
    </dialog>
    <noscript><a href={asset.src}>Open full-resolution image</a></noscript>
  </figure>
}
