import Link from 'next/link'
import { ArrowRight, ArrowUpRight, Check, Plus } from 'lucide-react'
import { workflow } from '../../content/marketing/site'

export function CtaLink({ href = '/early-access', children = 'Apply for Early Access', secondary = false, className = '', ...props }) {
  return <Link href={href} className={`mk-button${secondary ? ' mk-button--secondary' : ''} ${className}`} {...props}>{children}<ArrowUpRight size={18} aria-hidden /></Link>
}
export function TextLink({ href, children }) { return <Link className='mk-text-link' href={href}>{children}<ArrowRight size={17} aria-hidden /></Link> }
export function SectionHeading({ eyebrow, title, children, centered = false }) {
  return <div className={`mk-heading${centered ? ' mk-heading--center' : ''}`}>{eyebrow && <p className='mk-eyebrow'>{eyebrow}</p>}<h2>{title}</h2>{children && <div className='mk-lead'>{children}</div>}</div>
}
export function PageHero({ eyebrow, title, children, aside, action = true, className = '' }) {
  return <section className={`mk-page-hero mk-grid-bg ${className}`}><div className={`mk-container${aside ? ' mk-split' : ''}`}><div><p className='mk-eyebrow'>{eyebrow}</p><h1>{title}</h1><div className='mk-lead'>{children}</div>{action && <div className='mk-actions'><CtaLink /><TextLink href='/how-it-works'>See how it works</TextLink></div>}</div>{aside}</div></section>
}
export function CheckList({ items }) { return <ul className='mk-checklist'>{items.map(text => <li key={text}><Check size={18} aria-hidden /><span>{text}</span></li>)}</ul> }
export function WorkflowDiagram({ compact = false }) { return <ol className={`mk-workflow${compact ? ' mk-workflow--compact' : ''}`}>{workflow.map(([title,owner,description],index) => <li key={title}><span className='mk-workflow__number'>0{index+1}</span><span className='mk-label'>{owner}</span><h3>{title}</h3><p>{description}</p></li>)}</ol> }
export function FaqList({ items }) { return <div className='mk-faq'>{items.map(([question,answer]) => <details key={question}><summary>{question}<Plus size={20} aria-hidden /></summary><div><p>{answer}</p></div></details>)}</div> }
export function FinalCta({ title = 'Spend less time asking where your parts are.', children = 'Join the OEMs and suppliers shaping a clearer way to work together. Apply for a limited Early Access cohort.' }) {
  return <section className='mk-final'><div className='mk-container mk-final__inner'><div><p className='mk-eyebrow'>Build a clearer production picture</p><h2>{title}</h2><p>{children}</p></div><div className='mk-final__actions'><CtaLink /><Link href='/visibility-assessment'>Take the visibility assessment <ArrowRight size={16} aria-hidden /></Link></div></div></section>
}
export function FeatureStory({ number, eyebrow, title, children, media, reverse = false }) { return <section className={`mk-section mk-feature${reverse ? ' mk-feature--reverse' : ''}`}><div className='mk-container mk-split'><div className='mk-feature__copy'>{number && <span className='mk-section-number'>{number}</span>}<SectionHeading eyebrow={eyebrow} title={title}>{children}</SectionHeading></div><div className='mk-feature__media'>{media}</div></div></section> }
export function Notice({ children }) { return <div className='mk-notice'>{children}</div> }
