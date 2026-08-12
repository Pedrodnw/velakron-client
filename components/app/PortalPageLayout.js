import AuthGuard from '../auth/AuthGuard'
import AppLayout from '../layouts/AppLayout'

const PortalPageLayout = page => <AuthGuard><AppLayout>{page}</AppLayout></AuthGuard>
export const WidePortalPageLayout = page => <AuthGuard><AppLayout wide>{page}</AppLayout></AuthGuard>

export default PortalPageLayout
