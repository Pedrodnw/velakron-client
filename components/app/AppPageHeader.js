const AppPageHeader = ({ eyebrow, title, description, actions, media }) => <header className={`appPageHeader${media ? ' appPageHeader--withMedia' : ''}`}>
  <div className='appPageHeader__identity'>
    {media && <div className='appPageHeader__media'>{media}</div>}
    <div className='appPageHeader__copy'>
      {eyebrow && <p className='technicalLabel'>{eyebrow}</p>}
      <h1>{title}</h1>
      {description && <p>{description}</p>}
    </div>
  </div>
  {actions && <div className='appPageHeader__actions'>{actions}</div>}
</header>

export default AppPageHeader
