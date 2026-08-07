import Link from 'next/link'

const LinkWrap = ({ href, children, ...props }) => {
  const external = typeof href === 'string' && /^(https?:|mailto:|tel:)/.test(href)

  if (external) {
    return <a href={href} {...props}>{children}</a>
  }

  return <Link href={href} {...props}>{children}</Link>
}

export default LinkWrap
