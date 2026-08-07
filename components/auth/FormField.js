import { Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const FormField = ({ id, label, hint, type = 'text', ...props }) => {
  const password = type === 'password'
  const [visible, setVisible] = useState(false)
  const inputType = password && visible ? 'text' : type
  const hintId = hint ? `${id}-hint` : undefined

  return <div className='formField'>
    <label htmlFor={id}>{label}</label>
    <div className={`formField__control ${password ? 'hasAction' : ''}`}>
      <input id={id} type={inputType} aria-describedby={hintId} {...props} />
      {password && <button
        type='button'
        aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        onClick={() => setVisible(current => !current)}
      >
        {visible ? <EyeOff aria-hidden='true' /> : <Eye aria-hidden='true' />}
      </button>}
    </div>
    {hint && <small id={hintId}>{hint}</small>}
  </div>
}

export default FormField
