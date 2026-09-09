import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import ConfirmationDialog from './ConfirmationDialog'

const AppDialogContext = createContext(null)

// One app-owned dialog at a time. A cancelled or unmounted caller never applies
// its action, and no native browser confirm/prompt is needed.
export const AppDialogProvider = ({ children }) => {
  const [dialog, setDialog] = useState(null)
  const [values, setValues] = useState({})
  const [validationError, setValidationError] = useState('')
  const pending = useRef(null)
  const formRef = useRef(null)
  const settle = useCallback(value => {
    const current = pending.current
    pending.current = null
    setDialog(null)
    current?.resolve(value)
  }, [])
  const cancel = useCallback(owner => {
    if (pending.current?.owner === owner) settle(null)
  }, [settle])
  const ask = useCallback((options, owner) => {
    if (pending.current) return Promise.resolve(null)
    setValidationError('')
    setValues(Object.fromEntries((options.fields || []).map(field => [field.name, field.defaultValue || ''])))
    return new Promise(resolve => {
      pending.current = { owner, resolve }
      setDialog(options)
    })
  }, [])
  useEffect(() => () => pending.current?.resolve(null), [])
  const context = useMemo(() => ({ ask, cancel }), [ask, cancel])
  const confirm = () => {
    const invalid = formRef.current?.querySelector(':invalid')
    if (invalid) { setValidationError(invalid.validationMessage); invalid.focus(); return }
    const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, String(value).trim()]))
    if (dialog.fields?.some(field => field.required !== false && !normalized[field.name])) {
      setValidationError('Complete each required field before continuing.')
      return
    }
    settle(dialog.fields?.length ? normalized : true)
  }
  return <AppDialogContext.Provider value={context}>
    {children}
    {dialog && createPortal(<ConfirmationDialog open title={dialog.title} description={dialog.description} confirmLabel={dialog.confirmLabel} cancelLabel={dialog.cancelLabel} danger={dialog.danger} onConfirm={confirm} onClose={() => settle(null)}>
      {dialog.fields?.length > 0 && <form className='appDialogFields' noValidate ref={formRef} onSubmit={event => { event.preventDefault(); confirm() }}>
        {dialog.fields.map(field => <label key={field.name}>
          <span>{field.label}</span>
          {field.multiline
            ? <textarea rows={3} required={field.required !== false} minLength={field.minLength} maxLength={field.maxLength || 2000} value={values[field.name]} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} />
            : <input type={field.type || 'text'} required={field.required !== false} min={field.min} max={field.max} step={field.step} minLength={field.minLength} maxLength={field.maxLength || 2000} value={values[field.name]} onChange={event => setValues(current => ({ ...current, [field.name]: event.target.value }))} />}
        </label>)}
        {validationError && <p role='alert'>{validationError}</p>}
      </form>}
    </ConfirmationDialog>, document.querySelector('.appLayout') || document.body)}
  </AppDialogContext.Provider>
}

export const useAppDialog = () => {
  const context = useContext(AppDialogContext)
  const owner = useRef(Symbol('app-dialog'))
  useEffect(() => {
    const caller = owner.current
    return () => context?.cancel(caller)
  }, [context])
  return useCallback(options => {
    if (!context) throw new Error('App dialogs require AppDialogProvider')
    return context.ask(options, owner.current)
  }, [context])
}
