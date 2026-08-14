const CrmPanelHeader = ({ eyebrow, title, detail, actions }) => <header className='appPanel__header'>
  <div>{eyebrow && <p className='technicalLabel'>{eyebrow}</p>}<h2>{title}</h2>{detail && <p className='crmPanelDetail'>{detail}</p>}</div>
  {actions && <div className='crmPanelActions'>{actions}</div>}
</header>

export default CrmPanelHeader
