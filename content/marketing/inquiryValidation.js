import contract from './applicationContract.json'
export const validateInquiry = (form, earlyAccess) => {
  const errors = {}
  if (form.full_name.trim().length < 2) errors.full_name = 'Enter your full name.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.'
  if (form.company_name.trim().length < 2) errors.company_name = 'Enter your company name.'
  if (form.message.trim().length < 10) errors.message = 'Add a brief description (at least 10 characters).'
  if (!form.consent) errors.consent = 'Confirm we may respond about this request.'
  if (earlyAccess) {
    for (const name of ['applicant_type','country_region','intended_data_category']) if (!contract.enums[name].includes(form[name])) errors[name] = 'Choose an option.'
    if (!form.data_restrictions_acknowledged) errors.data_restrictions_acknowledged = 'Confirm you understand the current restrictions.'
  }
  return errors
}
