import Image from 'next/image'

const VelakronLogo = ({ className = '', priority = false, sizes = '180px' }) => (
  <Image
    className={`velakronLogo ${className}`.trim()}
    src='/images/velakron-logo.svg'
    alt='Velakron'
    width={244}
    height={80}
    sizes={sizes}
    priority={priority}
  />
)

export default VelakronLogo
