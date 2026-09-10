import Link from 'next/link'
import Seo from '../../components/marketing/MarketingSeo'
import {withMarketing} from '../../components/marketing/MarketingLayout'
import {TextLink,FinalCta,Contents} from '../../components/marketing/Elements'
import GuideToolbox from '../../components/marketing/GuideToolbox'
import articles from '../../content/insights/articles.json'
function Insight({article,related}) { return <>
  <Seo title={article.title} description={article.description} path={`/insights/${article.slug}`} article={article} />
  <header className='mk-article-hero mk-grid-bg'><div className='mk-container'><Link className='mk-text-link' href='/insights'>← All insights</Link><p className='mk-eyebrow'>{article.topic}</p><h1>{article.title}</h1><p className='mk-lead'>{article.summary}</p><p className='mk-article-meta'>By the Velakron team · September 10, 2026 · {article.readMinutes} min read</p></div></header>
  <section className='mk-section'><div className='mk-container mk-article-layout'><Contents label='In this guide' items={[{title:'Practical starter',id:'practical-starter'},...article.sections]} /><article className='mk-editorial'><GuideToolbox slug={article.slug} />{article.sections.map(section=><section key={section.id} id={section.id}><h2>{section.title}</h2>{section.paragraphs.map(text=><p key={text}>{text}</p>)}{section.items && <ul>{section.items.map(item=><li key={item}>{item}</li>)}</ul>}{section.table && <div className='mk-table-scroll'><table><caption className='mk-sr-only'>{section.title} comparison</caption><thead><tr>{section.table.headings.map(heading=><th key={heading} scope='col'>{heading}</th>)}</tr></thead><tbody>{section.table.rows.map(row=><tr key={row[0]}>{row.map((cell,index)=>index===0?<th scope='row' key={index}>{cell}</th>:<td key={index} data-label={section.table.headings[index]}>{cell}</td>)}</tr>)}</tbody></table></div>}{section.links && <div className='mk-article-links'>{section.links.map(([label,href])=><TextLink key={href} href={href}>{label}</TextLink>)}</div>}</section>)}</article></div></section>
  <section className='mk-section mk-tint'><div className='mk-container'><p className='mk-eyebrow'>Keep exploring</p><div className='mk-related'>{related.map(item=><article key={item.slug}><p className='mk-label'>{item.topic}</p><h2><Link href={`/insights/${item.slug}`}>{item.title}</Link></h2><TextLink href={`/insights/${item.slug}`}>Read the guide</TextLink></article>)}</div></div></section>
  <FinalCta />
</> }
export const getStaticPaths=()=>({paths:articles.filter(article=>article.status==='published').map(article=>({params:{slug:article.slug}})),fallback:false})
export const getStaticProps=({params})=>{const article=articles.find(item=>item.slug===params.slug && item.status==='published');if(!article)return{notFound:true};return{props:{article,related:articles.filter(item=>item.status==='published' && item.slug!==article.slug).map(({slug,title,topic})=>({slug,title,topic}))}}}
export default withMarketing(Insight)
