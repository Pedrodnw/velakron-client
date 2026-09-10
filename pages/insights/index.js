import Link from 'next/link'
import {ArrowRight} from 'lucide-react'
import Seo from '../../components/marketing/MarketingSeo'
import {withMarketing} from '../../components/marketing/MarketingLayout'
import {PageHero,FinalCta} from '../../components/marketing/Elements'
import articles from '../../content/insights/articles.json'
function Insights({guides}) { return <>
  <Seo title='Production visibility insights' path='/insights' description='Practical guides to outsourced production tracking, supplier collaboration, and a shared workflow alongside your existing systems.' />
  <PageHero compact eyebrow='Insights · practical manufacturing coordination' title='A clearer way to think about shared work.' action={false}><p>Guides for the production questions that cross company boundaries. Useful ideas to bring into the next supplier conversation.</p></PageHero>
  <section className='mk-section'><div className='mk-container mk-insights-list'>{guides.map((article,index)=><article key={article.slug} className={index===0?'mk-insight-featured':'mk-insight-row'}><div><p className='mk-eyebrow'>{article.topic}</p><h2><Link href={`/insights/${article.slug}`}>{article.title}</Link></h2><p>{article.summary}</p><span className='mk-article-meta'>Velakron · September 10, 2026 · {article.readMinutes} min read</span><Link className='mk-text-link' href={`/insights/${article.slug}`}>Read the guide<ArrowRight size={18} aria-hidden /></Link></div></article>)}</div></section>
  <FinalCta title='Put a clearer process into practice.' />
</> }
export const getStaticProps=()=>({props:{guides:articles.filter(article=>article.status==='published').map(({sections,intro,...summary})=>summary)}})
export default withMarketing(Insights)
