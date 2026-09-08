import { describe, expect, it } from 'vitest'
import { firstVisibilityContactError, validateVisibilityContact } from '../store/visibilityContact'

const completeContact = {
  first_name: 'Jennifer',
  last_name: 'Shoemaker',
  company_name: 'Company Test',
  email: 'jshoemaker@velakron.com',
  job_title: 'Operations',
  phone: '2484640417',
  consent: true,
}

describe('visibility assessment contact validation', () => {
  it('identifies the unchecked consent control shown in the assessment', () => {
    const errors = validateVisibilityContact({ ...completeContact, consent: false })

    expect(errors).toEqual({ consent: 'Please confirm that Velakron may contact you about your assessment and demo.' })
    expect(firstVisibilityContactError(errors)).toBe('consent')
  })

  it('orders missing contact fields for predictable focus and accepts complete details', () => {
    const errors = validateVisibilityContact({ ...completeContact, first_name: '', email: 'not-an-email' })

    expect(errors).toMatchObject({ first_name: 'Enter your first name', email: 'Enter a valid work email address' })
    expect(firstVisibilityContactError(errors)).toBe('first_name')
    expect(validateVisibilityContact(completeContact)).toEqual({})
  })
})
