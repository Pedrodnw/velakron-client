import { ArrowRight } from 'lucide-react'
import LinkWrap from '../LinkWrap'

const Button = ({
  children,
  href,
  variant = 'primary',
  showArrow = false,
  className = '',
  ...props
}) => {
  const classes = `vk-button vk-button--${variant} ${className}`.trim()
  const content = <>{children}{showArrow && <ArrowRight aria-hidden='true' />}</>

  if (href) return <LinkWrap className={classes} href={href} {...props}>{content}</LinkWrap>
  return <button className={classes} type='button' {...props}>{content}</button>
}

export default Button
