import { ShieldCheck } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useDispatch } from 'react-redux'
import Seo from '../components/Seo'
import { loadPlatformTerms } from '../store/slices/identity'

const ConfidentialityTerms = () => {
  const dispatch = useDispatch()
  const [terms, setTerms] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    dispatch(loadPlatformTerms()).then(result => {
      if (result?.ok) setTerms(result.payload?.data?.platform_terms || null)
      else setError('The current confidentiality terms could not be loaded. Please try again.')
    })
  }, [dispatch])

  return <>
    <Seo title='Platform Confidentiality Terms' description='The confidentiality duties that protect documents shared through Velakron.' path='/confidentiality-terms' />
    <main className='legalTermsPage'>
      <header className='legalTermsHero'>
        <div className='legalTermsHero__icon'><ShieldCheck aria-hidden='true' /></div>
        <p className='technicalLabel'>Platform protection</p>
        <h1>{terms?.title || 'Velakron Platform Confidentiality Terms'}</h1>
        <p>These terms create a common confidentiality baseline for every OEM and supplier account using Velakron.</p>
        {terms && <small>Version {terms.version} · Effective {terms.effective_on}</small>}
      </header>
      {error && <section className='legalTermsDocument'><p>{error}</p></section>}
      {!terms && !error && <section className='legalTermsDocument'><p>Loading current terms…</p></section>}
      {terms && <article className='legalTermsDocument'>
        {terms.sections.map(section => <section key={section.title}>
          <h2>{section.title}</h2>
          {section.paragraphs.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
        </section>)}
        <aside>
          <strong>Electronic acceptance</strong>
          <p>{terms.acceptance_statement}</p>
        </aside>
      </article>}
    </main>
  </>
}

export default ConfidentialityTerms
