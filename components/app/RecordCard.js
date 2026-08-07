import LinkWrap from '../LinkWrap'

const RecordCard = ({ href, eyebrow, title, description, facts = [], badges, actionLabel = 'Open' }) => <article className='recordCard'>
  <header>
    <div>{eyebrow && <p className='technicalLabel'>{eyebrow}</p>}<h3>{title}</h3></div>
    {badges && <div className='recordCard__badges'>{badges}</div>}
  </header>
  {description && <p>{description}</p>}
  {!!facts.length && <dl>{facts.map(fact => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value || '—'}</dd></div>)}</dl>}
  {href && <LinkWrap href={href} className='recordCard__link'>{actionLabel}<span aria-hidden='true'> →</span></LinkWrap>}
</article>

export default RecordCard
