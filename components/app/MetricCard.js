import LinkWrap from '../LinkWrap'

const MetricContent = ({ label, value, detail, Icon }) => <>
  <div className='metricCard__top'>
    <span>{label}</span>
    {Icon && <Icon aria-hidden='true' />}
  </div>
  <strong>{value}</strong>
  {detail && <p>{detail}</p>}
</>

const MetricCard = ({ label, value, detail, icon: Icon, tone = 'default', href }) => {
  const className = `metricCard metricCard--${tone}${href ? ' metricCard--linked' : ''}`
  if (href) return <LinkWrap href={href} className={className} aria-label={`${label}: ${value}. ${detail || ''}`}>
    <MetricContent label={label} value={value} detail={detail} Icon={Icon} />
  </LinkWrap>
  return <article className={className}>
    <MetricContent label={label} value={value} detail={detail} Icon={Icon} />
  </article>
}

export default MetricCard
