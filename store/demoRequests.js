import { apiCallBegan } from './api'

export const submitDemoRequest = data => apiCallBegan({
  url: '/demo-requests',
  method: 'post',
  data,
  requestKey: 'public-demo-request',
})
