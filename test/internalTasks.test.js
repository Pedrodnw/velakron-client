import { describe, expect, it } from 'vitest'
import {
  dateInputToIso,
  dueDateForUrgency,
  tasksForCell,
  urgencyForDate,
} from '../components/app/tasks/taskMatrix'
import reducer from '../store/reducer'
import { organizationSwitchRequested } from '../store/slices/appContext'
import { internalTaskSelectors } from '../store/slices/entities/internalTasks'

describe('founder task state and priority matrix', () => {
  it('derives the urgency column from the due date', () => {
    const now = new Date('2026-08-10T12:00:00.000Z').getTime()
    expect(urgencyForDate('2026-08-11T12:00:00.000Z', now)).toBe('high')
    expect(urgencyForDate('2026-08-17T12:00:00.000Z', now)).toBe('medium')
    expect(urgencyForDate('2026-09-10T12:00:00.000Z', now)).toBe('low')
    expect(urgencyForDate('not-a-date', now)).toBe('low')
  })

  it('places tasks in one impact-by-urgency cell', () => {
    const tasks = [
      { id: 'task-a', importance: 'high', urgency: 'high' },
      { id: 'task-b', importance: 'high', urgency: 'medium' },
      { id: 'task-c', importance: 'low', urgency: 'high' },
    ]
    expect(tasksForCell(tasks, 'high', 'high').map(task => task.id)).toEqual(['task-a'])
    expect(tasksForCell(tasks, 'high', 'medium').map(task => task.id)).toEqual(['task-b'])
    expect(tasksForCell(tasks, 'medium', 'low')).toEqual([])
  })

  it('creates stable dates for matrix moves and date inputs', () => {
    const now = new Date('2026-08-10T12:00:00.000Z')
    expect(dueDateForUrgency('medium', now)).toContain('2026-08-17')
    expect(dateInputToIso('2026-08-21')).toMatch(/^2026-08-21T/)
    expect(dateInputToIso('')).toBeNull()
  })

  it('normalizes task lists and clears them when the organization changes', () => {
    let state = reducer(undefined, { type: '@@init' })
    state = reducer(state, {
      type: 'internalTasks/listReceived',
      payload: {
        data: {
          tasks: [
            { id: 'task-a', title: 'First task', version: 0 },
            { id: 'task-b', title: 'Second task', version: 2 },
          ],
          summary: { open: 1, in_progress: 1 },
        },
        meta: { total: 2 },
      },
    })
    expect(internalTaskSelectors.getTasks(state).map(task => task.id)).toEqual(['task-a', 'task-b'])
    expect(internalTaskSelectors.getSummary(state)).toEqual({ open: 1, in_progress: 1 })

    state = reducer(state, organizationSwitchRequested('organization-b'))
    expect(internalTaskSelectors.getTasks(state)).toEqual([])
    expect(internalTaskSelectors.getAssignees(state)).toEqual([])
  })
})
