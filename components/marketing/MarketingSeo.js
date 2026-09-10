import Head from 'next/head'
import { siteOrigin } from '../../content/marketing/site'

const Seo = ({ title, description = 'Shared production visibility and collaboration for OEMs and manufacturing suppliers.', path = '/', noIndex = false, image = '/images/marketing/social-home.png', imageAlt = 'Velakron shared production workspace', article = null }) => {
  const pageTitle = `${title === 'Home' ? 'Shared production visibility' : title || 'Production visibility'} | Velakron`
  const url = `${siteOrigin}${path}`
  const excluded = noIndex || /^\/(app|admin|sales-demo|imts-demo|login|register|account|accept-invitation|reset-password|forgot-password|verify-email|confirm-email|development)(\/|$)/.test(path)
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Velakron',
    url: `${siteOrigin}/`,
    email: 'info@velakron.com',
    logo: `${siteOrigin}/images/velakron-logo.svg`,
  }
  const structured = article ? { '@context':'https://schema.org','@type':'Article',headline:title,description,datePublished:article.published,dateModified:article.updated,author:{'@type':'Organization',name:'Velakron',url:`${siteOrigin}/about`},publisher:organization,mainEntityOfPage:url,image:`${siteOrigin}${image}` } : organization

  return <Head>
    <title>{pageTitle}</title>
    <meta name='description' content={description} />
    {excluded && <meta name='robots' content='noindex,nofollow' />}
    <link rel='canonical' href={url} />
    <meta property='og:type' content={article ? 'article' : 'website'} />
    <meta property='og:site_name' content='Velakron' />
    <meta property='og:title' content={pageTitle} />
    <meta property='og:description' content={description} />
    <meta property='og:url' content={url} />
    <meta property='og:image' content={`${siteOrigin}${image}`} />
    <meta property='og:image:alt' content={imageAlt} />
    <meta property='og:image:width' content='1200' />
    <meta property='og:image:height' content='630' />
    <meta name='twitter:card' content='summary_large_image' />
    {article && <meta property='article:published_time' content={article.published} />}
    {article && <meta property='article:modified_time' content={article.updated} />}
    {!excluded && <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(structured).replace(/</g,'\\u003c') }} />}
  </Head>
}

export default Seo
