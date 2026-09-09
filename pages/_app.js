import { Provider } from 'react-redux'
import AuthBootstrap from '../components/auth/AuthBootstrap'
import { AppDialogProvider } from '../components/app/AppDialogProvider'
import MainLayout from '../components/layouts/mainLayout'
import { wrapper } from '../store/configStore'
import '../scss/styles.scss'

const MyApp = ({ Component, ...rest }) => {
  const { store, props } = wrapper.useWrappedStore(rest)
  const getLayout = Component.getLayout || (page => <MainLayout>{page}</MainLayout>)

  return <Provider store={store}>
    <AuthBootstrap />
    <AppDialogProvider>{getLayout(<Component {...props.pageProps} />)}</AppDialogProvider>
  </Provider>
}

export default MyApp
