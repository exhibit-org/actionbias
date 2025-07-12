/**
 * Simple test for rollback functionality
 */

import { renderHook, act } from '@testing-library/react'
import { useActions } from '../../../lib/hooks/useActions'

// Mock fetch for API calls
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useActions - Rollback (Simple)', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  test('should rollback state when API call fails', async () => {
    const mockActionsData = [
      {
        id: 'action-1',
        title: 'Action 1',
        done: false,
        children: [
          {
            id: 'child-1',
            title: 'Child 1',
            done: false,
            children: []
          }
        ]
      },
      {
        id: 'action-2',
        title: 'Action 2',
        done: false,
        children: []
      }
    ]

    // Mock successful initial fetch, then failed move
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { rootActions: mockActionsData } 
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response)

    const { result } = renderHook(() => useActions())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Verify initial state
    const initialActions = result.current.actions
    expect(initialActions).toHaveLength(2)
    
    const initialAction1 = initialActions.find(a => a.id === 'action-1')
    expect(initialAction1).toBeDefined()
    expect(initialAction1!.children).toHaveLength(1)
    expect(initialAction1!.children![0].id).toBe('child-1')

    // Attempt move that will fail
    await act(async () => {
      try {
        await result.current.moveAction('action-1', 'action-2')
      } catch (error) {
        // Expected to fail
      }
    })

    // After rollback, should be back to original state
    const rolledBackActions = result.current.actions
    expect(rolledBackActions).toHaveLength(2)
    
    const rolledBackAction1 = rolledBackActions.find(a => a.id === 'action-1')
    expect(rolledBackAction1).toBeDefined()
    expect(rolledBackAction1!.children).toHaveLength(1)
    expect(rolledBackAction1!.children![0].id).toBe('child-1')

    // Verify action-1 is still at root level (not moved into action-2)
    const action2 = rolledBackActions.find(a => a.id === 'action-2')
    expect(action2!.children).toHaveLength(0)
  })
})