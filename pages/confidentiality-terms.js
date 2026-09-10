import Seo from '../components/marketing/MarketingSeo'
import { withMarketing } from '../components/marketing/MarketingLayout'
import { PageHero } from '../components/marketing/Elements'
import terms from '../content/marketing/platformTerms.json'

function ConfidentialityTerms() { return <>
  <Seo title='Platform Confidentiality Terms' description='The confidentiality duties that protect documents shared through Velakron.' path='/confidentiality-terms' />
  <PageHero eyebrow='Platform protection' title={terms.title} action={false}><p>The common confidentiality baseline for OEM and supplier accounts using Velakron.</p><p className='mk-article-meta'>Version {terms.version} · Effective {terms.effective_on}</p></PageHero>
  <section className='mk-section'><article className='mk-container mk-editorial'>
    {terms.sections.map(section=><section key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(paragraph=><p key={paragraph}>{paragraph}</p>)}</section>)}
    <aside className='mk-notice'><h2>Electronic acceptance</h2><p>{terms.acceptance_statement}</p><p>Reading this page does not record acceptance. Acceptance takes place within the account activation workflow.</p></aside>
  </article></section>
</> }
export default withMarketing(ConfidentialityTerms)
