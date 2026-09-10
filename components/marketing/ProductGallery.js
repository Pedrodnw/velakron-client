import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import ProductFigure from './ProductFigure'

const benefits = [
  ['worklist', 'See what needs attention', 'A clear production view helps you find the work that needs a response, a fresh update, or a closer look.', '/for-oems'],
  ['record', 'Understand progress and dates', 'Keep the current stage, required arrival, and supplier commitment attached to the production record.', '/how-it-works'],
  ['conversation', 'Keep the question in context', 'Discuss the relevant part and revision with the information both teams need to reach an answer.', '/how-it-works'],
  ['issue', 'Resolve problems with ownership', 'Make the next action explicit and retain the decisions behind a production issue or block.', '/quality'],
  ['supplier', 'Keep your customers informed', 'Give connected OEM customers a shared place to find progress, questions, and updates.', '/for-suppliers'],
]
export default function ProductGallery() {
  const [selected,setSelected] = useState(0)
  const current = benefits[selected]
  return <div className='mk-gallery'>
    <div className='mk-gallery__choices' aria-label='Explore product benefits'>{benefits.map(([name,title,description], index) => <button type='button' key={name} aria-pressed={selected === index} onClick={() => setSelected(index)}><span className='mk-label'>0{index+1}</span><strong>{title}</strong><span className='mk-gallery__description'>{description}</span><ArrowUpRight size={18} aria-hidden /></button>)}</div>
    <div className='mk-gallery__display'><ProductFigure key={current[0]} name={current[0]} /><Link className='mk-text-link' href={current[3]}>Explore this workflow <ArrowUpRight size={17} aria-hidden /></Link></div>
  </div>
}
