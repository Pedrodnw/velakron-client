const AppPageHeader = ({ eyebrow, title, description, actions }) => <header className='appPageHeader'>
  <div className='appPageHeader__copy'>
    {eyebrow && <p className='technicalLabel'>{eyebrow}</p>}
    <h1>{title}</h1>
    {description && <p>{description}</p>}
  </div>
  {actions && <div className='appPageHeader__actions'>{actions}</div>}
</header>

export default AppPageHeader
