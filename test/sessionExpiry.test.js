import axios from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { loginPathForReturn } from '../components/auth/utils'
import { apiCallBegan } from '../store/api'
import apiMiddleware, { isExpiredAuthenticationResponse } from '../store/middleware/api'
import authReducer, { sessionExpired } from '../store/slices/auth'
import appContextReducer from '../store/slices/appContext'

describe('expired session handling', () => {
  afterEach(() => vi.restoreAllMocks())

  it('recognizes only the API authentication-required response as an expired session', () => {
    expect(isExpiredAuthenticationResponse({
      response: { status: 401, data: { error: { code: 'AUTHENTICATION_REQUIRED' } } },
    })).toBe(true)
    expect(isExpiredAuthenticationResponse({
      response: { status: 401, data: { error: { code: 'INVALID_CREDENTIALS' } } },
    })).toBe(false)
    expect(isExpiredAuthenticationResponse({
      response: { status: 403, data: { error: { code: 'AUTHENTICATION_REQUIRED' } } },
    })).toBe(false)
  })

  it('clears stale authentication and organization context', () => {
    const authState = authReducer({
      user: { id: 'user-1' },
      initialized: true,
      status: 'authenticated',
      error: null,
      sessionEndReason: null,
    }, sessionExpired())
    expect(authState).toMatchObject({
      user: null,
      initialized: true,
      status: 'anonymous',
      sessionEndReason: 'expired',
    })

    const contextState = appContextReducer({
      activeOrganization: { id: 'org-1' },
      activeMembership: { id: 'membership-1' },
      permissions: ['internal_task.update'],
      contextVersion: 4,
    }, sessionExpired())
    expect(contextState.activeOrganization).toBeNull()
    expect(contextState.activeMembership).toBeNull()
    expect(contextState.permissions).toEqual([])
    expect(contextState.contextVersion).toBe(5)
  })

  it('returns the user to the exact protected page after signing in again', () => {
    expect(loginPathForReturn('/app/tasks?task=task-1&tab=files', { sessionExpired: true }))
      .toBe('/login?next=%2Fapp%2Ftasks%3Ftask%3Dtask-1%26tab%3Dfiles&reason=session_expired')
    expect(loginPathForReturn('https://malicious.example', { sessionExpired: true }))
      .toBe('/login?next=%2Fapp&reason=session_expired')
  })

  it('automatically expires the stale client session when an authenticated request returns 401', async () => {
    vi.spyOn(axios, 'request').mockRejectedValue({
      response: {
        status: 401,
        data: { data: null, error: { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required' } },
      },
    })
    const dispatch = vi.fn()
    const result = await apiMiddleware({
      dispatch,
      getState: () => ({ auth: { user: { id: 'user-1' } }, appContext: { contextVersion: 1 } }),
    })(vi.fn())(apiCallBegan({ url: '/tasks/task-1' }))

    expect(result.ok).toBe(false)
    expect(dispatch.mock.calls.some(([action]) => action.type === sessionExpired.type)).toBe(true)
  })
})
