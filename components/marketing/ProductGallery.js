import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { TextLink } from './Elements'
import ProductFigure from './ProductFigure'

const benefits = [
  ['record', 'See progress, dates, and attention', ['A clear production view helps you find the work that needs a response, a fresh update, or a closer look.', 'Keep the current stage, required arrival, and supplier commitment attached to the production record.'], '/for-oems'],
  ['conversation', 'Keep the question in context', ['Discuss the relevant part and revision with the information both teams need to reach an answer.', 'Give connected OEM customers a shared place to find progress, questions, and updates.'], '/how-it-works'],
  ['issue', 'Resolve problems with ownership', ['Make the next action explicit and retain the decisions behind a production issue or block.'], '/quality'],
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
        <div className='mk-gallery__description'>{description.map(text => <p key={text}>{text}</p>)}</div>
        {selected === index && <ProductFigure name={name} placement='hero' />}
        <TextLink href={href}>Explore this workflow</TextLink>
      </div>
    </div>)}
  </div>
}
