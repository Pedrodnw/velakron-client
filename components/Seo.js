import Head from 'next/head'

const Seo = ({ title, description, path = '/', noIndex = false }) => {
  const pageTitle = title === 'Home'
    ? 'Velakron | One Accountable Partner. Engineering-Led Manufacturing Solutions.'
    : `${title} | Velakron`
  const url = `https://www.velakron.com${path}`
  const organization = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Velakron',
    url: 'https://www.velakron.com/',
    email: 'info@velakron.com',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Vancouver',
      addressRegion: 'WA',
      addressCountry: 'US',
    },
  }

  return <Head>
    <title>{pageTitle}</title>
    <meta name='description' content={description} />
    {noIndex && <meta name='robots' content='noindex,nofollow' />}
    <link rel='canonical' href={url} />
    <meta property='og:type' content='website' />
    <meta property='og:site_name' content='Velakron' />
    <meta property='og:title' content={pageTitle} />
    <meta property='og:description' content={description} />
    <meta property='og:url' content={url} />
    <meta property='og:image' content='https://www.velakron.com/images/hero-spindle.png' />
    <meta name='twitter:card' content='summary_large_image' />
    <script type='application/ld+json' dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
  </Head>
}

export default Seo
