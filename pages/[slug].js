import Seo from '../components/Seo'
import StaticContentPage from '../components/StaticContentPage'
import { informationPages, informationPageSlugs } from '../content/pages'

const InformationPage = ({ page, slug }) => <>
  <Seo title={page.eyebrow} description={page.description} path={`/${slug}`} />
  <StaticContentPage page={page} />
</>

export const getStaticPaths = () => ({
  paths: informationPageSlugs.map(slug => ({ params: { slug } })),
  fallback: false,
})

export const getStaticProps = ({ params }) => ({
  props: {
    page: informationPages[params.slug],
    slug: params.slug,
  },
})

export default InformationPage
