import MarketingHeader from './MarketingHeader'
import MarketingFooter from './MarketingFooter'


export default function MarketingLayout({ children }) {
  return <div className='marketing'><a className='skipLink' href='#main-content'>Skip to main content</a><MarketingHeader /><main id='main-content'>{children}</main><MarketingFooter /></div>
}
export const withMarketing = Page => {
  Page.getLayout = page => <MarketingLayout>{page}</MarketingLayout>
  Page.publicPage = true
  return Page
}
