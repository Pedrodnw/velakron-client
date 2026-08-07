import Image from 'next/image'

const PicCont = ({ className = '', imageClassName = '', alt = '', ...props }) => (
  <span className={`piccont ${className}`.trim()}>
    <Image className={imageClassName} alt={alt} {...props} />
  </span>
)

export default PicCont
