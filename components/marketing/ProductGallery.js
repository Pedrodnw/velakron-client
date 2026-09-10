import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TextLink } from './Elements'
import ProductFigure from './ProductFigure'

const benefits = [
  ['issue', 'Spot the next action', 'See the production concern and which company needs to respond.', '/for-oems'],
  ['update', 'Share a changed forecast', 'Keep the expected ship date and the reason for a change together.', '/for-suppliers'],
  ['conversation', 'Resolve a part question', 'Keep the technical question, revision, and next response together.', '/how-it-works'],
]
export default function ProductGallery() {
  const [selected, setSelected] = useState(0)
  const id = useId()
  return <div className='mk-gallery' aria-label='Explore product benefits'>
    {benefits.map(([name, title, description, href], index) => <div className={`mk-gallery__item${selected === index ? ' is-selected' : ''}`} key={name}>
      <h3 className='mk-gallery__choice' style={{ gridRow: index + 1 }}><button type='button' id={`${id}-choice-${index}`} aria-expanded={selected === index} aria-controls={`${id}-panel-${index}`} onClick={event => { const button=event.currentTarget; setSelected(index); if (window.innerWidth<=767) requestAnimationFrame(() => button.scrollIntoView({block:'start',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'})) }}>
        <span className='mk-label'>0{index + 1}</span><strong>{title}</strong><ChevronDown size={18} aria-hidden />
      </button></h3>
      <div className='mk-gallery__display' id={`${id}-panel-${index}`} role='region' aria-labelledby={`${id}-choice-${index}`} hidden={selected !== index}>
        <p className='mk-gallery__description'>{description}</p>
        {selected === index && <ProductFigure name={name} placement='hero' />}
        <TextLink href={href}>Explore this workflow</TextLink>
      </div>
    </div>)}
  </div>
}
