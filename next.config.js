/** @type {import('next').NextConfig} */
const requestedDistDir = process.env.VELAKRON_NEXT_DIST_DIR
if (requestedDistDir && !/^\.next-[a-z0-9-]+$/.test(requestedDistDir)) {
  throw new Error('VELAKRON_NEXT_DIST_DIR must be an isolated .next-* directory name')
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
}

module.exports = nextConfig
