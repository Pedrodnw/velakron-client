import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero, Contents, PolicyText, sectionId } from '../components/marketing/Elements'
import terms from '../content/marketing/platformTerms.json'

function ConfidentialityTerms() { return <>
  <Seo title='Platform Confidentiality Terms' description='The confidentiality duties that protect documents shared through Velakron.' path='/confidentiality-terms' />
  <PageHero compact eyebrow='Platform protection' title={terms.title} action={false}><p>The common confidentiality baseline for OEM and supplier accounts using Velakron.</p><p className='mk-article-meta'>Version {terms.version} · Effective {terms.effective_on}</p></PageHero>
  <section className='mk-section'><div className='mk-container mk-policy-layout'><Contents items={terms.sections.map(section => ({id:sectionId(section.title),title:section.title}))} label='In these terms' /><article className='mk-editorial'>
    {terms.sections.map(section=><section key={section.title} id={sectionId(section.title)}><h2>{section.title}</h2>{section.paragraphs.map(paragraph=><p key={paragraph}><PolicyText text={paragraph} /></p>)}</section>)}
    <aside className='mk-notice'><h2>Electronic acceptance</h2><p>{terms.acceptance_statement}</p><p>Reading this page does not record acceptance. Acceptance takes place within the account activation workflow.</p></aside>
  <button className='mk-text-button' type='button' onClick={() => window.print()}>Print / save as PDF</button></article></div></section>
</> }
export default withMarketing(ConfidentialityTerms)
