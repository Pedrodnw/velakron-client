const SectionHeading = ({ eyebrow, title, description, align = 'left' }) => (
  <header className={`sectionHeading sectionHeading--${align}`}>
    {eyebrow && <p className='sectionHeading__eyebrow'>{eyebrow}</p>}
    <h2>{title}</h2>
    {description && <p className='sectionHeading__description'>{description}</p>}
  </header>
)

export default SectionHeading
