/** @type {import('next').NextConfig} */
const requestedDistDir = process.env.VELAKRON_NEXT_DIST_DIR
if (requestedDistDir && !/^\.next-[a-z0-9-]+$/.test(requestedDistDir)) {
  throw new Error('VELAKRON_NEXT_DIST_DIR must be an isolated .next-* directory name')
}

const developmentApiProxyTarget = process.env.VELAKRON_DEV_API_PROXY_TARGET?.replace(/\/$/, '')
if (developmentApiProxyTarget) {
  const parsedTarget = new URL(developmentApiProxyTarget)
  if (parsedTarget.protocol !== 'https:') {
    throw new Error('VELAKRON_DEV_API_PROXY_TARGET must use HTTPS')
  }
}

const nextConfig = {
  ...(requestedDistDir ? { distDir: requestedDistDir } : {}),
  allowedDevOrigins: ['127.0.0.1'],
  reactStrictMode: true,
  poweredByHeader: false,
  devIndicators: false,
  turbopack: {
    root: __dirname,
  },
  sassOptions: {
    silenceDeprecations: ['import'],
  },
  async rewrites() {
    if (process.env.NODE_ENV !== 'development' || !developmentApiProxyTarget) return []

    return [{
      source: '/velakron-development-api/:path*',
      destination: `${developmentApiProxyTarget}/:path*`,
    }]
  },
}

module.exports = nextConfig
