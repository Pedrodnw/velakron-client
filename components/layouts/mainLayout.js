import SiteFooter from '../SiteFooter'
import SiteHeader from '../SiteHeader'
import UiLayout from './UiLayout'

const MainLayout = ({ children }) => (
  <div className='mainLayout'>
    <a className='skipLink' href='#main-content'>Skip to main content</a>
    <SiteHeader />
    <UiLayout />
    <main id='main-content'>{children}</main>
    <SiteFooter />
  </div>
)

export default MainLayout
