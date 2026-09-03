import { apiCallBegan } from './api'

const request = ({ url, method = 'get', data, token, requestKey }) => apiCallBegan({
  url,
  method,
  data,
  headers: token ? { 'X-Velakron-Assessment-Token': token } : undefined,
  requestKey,
})

export const createAssessmentVisit = () => request({
  url: '/visibility-assessments/visit',
  method: 'post',
  data: { page: '/visibility-assessment' },
  requestKey: 'visibility-assessment-visit',
})

export const startVisibilityAssessment = (id, token) => request({
  url: `/visibility-assessments/${id}/start`,
  method: 'post',
  data: {},
  token,
  requestKey: 'visibility-assessment-start',
})

export const saveVisibilityAnswers = (id, token, data) => request({
  url: `/visibility-assessments/${id}/answers`,
  method: 'put',
  data,
  token,
  requestKey: 'visibility-assessment-answers',
})

export const captureVisibilityContact = (id, token, data) => request({
  url: `/visibility-assessments/${id}/contact`,
  method: 'put',
  data,
  token,
  requestKey: 'visibility-assessment-contact',
})

export const loadVisibilityResult = (id, token) => request({
  url: `/visibility-assessments/${id}/result`,
  token,
  requestKey: 'visibility-assessment-result',
})

export const markVisibilityDemoClicked = (id, token) => request({
  url: `/visibility-assessments/${id}/demo-click`,
  method: 'post',
  data: {},
  token,
  requestKey: 'visibility-assessment-demo-click',
})

export const loadVisibilityAvailability = (id, token) => request({
  url: `/visibility-assessments/${id}/availability`,
  token,
  requestKey: 'visibility-assessment-availability',
})

export const bookVisibilityDemo = (id, token, startsAt) => request({
  url: `/visibility-assessments/${id}/book`,
  method: 'post',
  data: { starts_at: startsAt },
  token,
  requestKey: 'visibility-assessment-book',
})
