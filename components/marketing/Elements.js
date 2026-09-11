import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { ArrowRight, Check, Plus } from 'lucide-react'
import { workflow } from '../../content/marketing/site'

export function CtaLink({ href = '/early-access', children = 'Apply for Early Access', secondary = false, className = '', ...props }) {
  return <Link href={href} className={`mk-button${secondary ? ' mk-button--secondary' : ''} ${className}`} {...props}>{children}<ArrowRight size={18} aria-hidden /></Link>
}
export function TextLink({ href, children }) { return <Link className='mk-text-link' href={href}>{children}<ArrowRight size={17} aria-hidden /></Link> }
export function SectionHeading({ eyebrow, title, children, centered = false }) {
  return <div className={`mk-heading${centered ? ' mk-heading--center' : ''}`}>{eyebrow && <p className='mk-eyebrow'>{eyebrow}</p>}<h2>{title}</h2>{children && <div className='mk-lead'>{children}</div>}</div>
}
export function PageHero({ eyebrow, title, children, aside, action = true, compact = false, className = '' }) {
  return <section className={`mk-page-hero mk-grid-bg${compact ? ' mk-page-hero--compact' : ''} ${className}`}><div className={`mk-container${aside ? ' mk-split' : ''}`}><div><p className='mk-eyebrow'>{eyebrow}</p><h1>{title}</h1><div className='mk-lead'>{children}</div>{action && <div className='mk-actions'><CtaLink /><TextLink href='/request-demo'>Request a demo</TextLink></div>}</div>{aside}</div></section>
}
export function CheckList({ items }) { return <ul className='mk-checklist'>{items.map(text => <li key={text}><Check size={18} aria-hidden /><span>{text}</span></li>)}</ul> }
export function WorkflowDiagram({ compact = false }) { return <ol className={`mk-workflow${compact ? ' mk-workflow--compact' : ''}`}>{workflow.map(([title,owner,description],index) => <li key={title}><span className='mk-workflow__number'>0{index+1}</span><span className='mk-label'>{owner}</span><h3>{title}</h3><p>{description}</p></li>)}</ol> }
export const sectionId = text => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
export function FaqList({ items }) {
  const root = useRef(null)
  useEffect(() => {
    const reveal = () => { const id = window.location.hash.slice(1); const match = Array.from(root.current?.querySelectorAll('details') || []).find(node => node.id === id); if (match) match.open = true }
    reveal(); window.addEventListener('hashchange', reveal); return () => window.removeEventListener('hashchange', reveal)
  }, [])
  return <div className='mk-faq' ref={root}>{items.map(([question, answer, links = []]) => <details id={`faq-${sectionId(question)}`} key={question}><summary>{question}<Plus size={20} aria-hidden /></summary><div><p>{answer}</p><div className='mk-faq__links'>{links.map(([text, href]) => <TextLink href={href} key={href}>{text}</TextLink>)}<a className='mk-faq__anchor' href={`#faq-${sectionId(question)}`} aria-label={`Link to: ${question}`}>Link to this answer</a></div></div></details>)}</div>
}
export function FinalCta({ title = 'Spend less time asking where your parts are.', children = 'Join the OEMs and suppliers shaping a clearer way to work together. Apply for a limited Early Access cohort.', href = '/early-access', action = 'Apply for Early Access' }) {
  return <section className='mk-final'><div className='mk-container mk-final__inner'><div><p className='mk-eyebrow'>Take the next step</p><h2>{title}</h2><p>{children}</p></div><div className='mk-final__actions'><CtaLink href={href}>{action}</CtaLink><Link href='/request-demo'>Request a demo <ArrowRight size={16} aria-hidden /></Link></div></div></section>
}
export function FeatureStory({ id, number, eyebrow, title, children, media, reverse = false }) { return <section id={id} className={`mk-section mk-feature${reverse ? ' mk-feature--reverse' : ''}`}><div className='mk-container mk-split'><div className='mk-feature__copy'>{number && <span className='mk-section-number'>{number}</span>}<SectionHeading eyebrow={eyebrow} title={title}>{children}</SectionHeading></div><div className='mk-feature__media'>{media}</div></div></section> }
export function Notice({ children }) { return <div className='mk-notice'>{children}</div> }

export function Contents({ items, label = 'On this page' }) {
  const links = <nav aria-label={label}>{items.map(({title, id}) => <a href={`#${id}`} key={id}>{title}</a>)}</nav>
  return <aside className='mk-contents'><div className='mk-contents__desktop'><p className='mk-label'>{label}</p>{links}</div><details className='mk-contents__mobile'><summary>{label}<Plus size={18} aria-hidden /></summary>{links}</details></aside>
}
export function PolicyText({ text: value, children }) {
  return <>{(value || children || '').split(/(info@velakron\.com)/g).map((text, index) => text === 'info@velakron.com' ? <a key={index} href='mailto:info@velakron.com'>{text}</a> : text)}</>
}
