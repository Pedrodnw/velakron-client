export const visibilityContactFieldOrder = ['first_name', 'last_name', 'company_name', 'email', 'job_title', 'phone', 'consent']

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const validateVisibilityContact = contact => {
  const errors = {}
  const firstName = String(contact?.first_name || '').trim()
  const lastName = String(contact?.last_name || '').trim()
  const companyName = String(contact?.company_name || '').trim()
  const email = String(contact?.email || '').trim().toLowerCase()
  const jobTitle = String(contact?.job_title || '').trim()
  const phone = String(contact?.phone || '').trim()

  if (!firstName) errors.first_name = 'Enter your first name'
  if (!lastName) errors.last_name = 'Enter your last name'
  if (companyName.length < 2) errors.company_name = 'Enter your company name'
  if (!emailPattern.test(email) || email.length > 320) errors.email = 'Enter a valid work email address'
  if (jobTitle.length > 160) errors.job_title = 'Job title is too long'
  if (phone.length > 40) errors.phone = 'Phone number is too long'
  if (contact?.consent !== true) errors.consent = 'Please confirm that Velakron may contact you about your assessment and demo.'

  return errors
}

export const firstVisibilityContactError = errors => visibilityContactFieldOrder.find(field => errors?.[field]) || ''

export const visibilityContactErrorSummary = errors => {
  const invalidFields = visibilityContactFieldOrder.filter(field => errors?.[field])
  if (!invalidFields.length) return ''
  if (invalidFields.length === 1 && invalidFields[0] === 'consent') {
    return 'Contact permission is required. Please check the highlighted box below.'
  }
  return 'Please correct the information marked below.'
}
