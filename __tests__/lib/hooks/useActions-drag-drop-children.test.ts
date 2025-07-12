/**
 * Test for drag and drop children preservation bug
 * 
 * Bug report:
 * 1. drag and drop action A, with children, into action B
 * 2. click bullet to focus on action B
 * 3. action A appears in action B's child list, but does not have any children!
 * 4. refresh -- action A's children come back.
 */

import { renderHook, act } from '@testing-library/react'
import { useActions } from '../../../lib/hooks/useActions'
import type { Action } from '../../../types/action'

// Mock fetch for API calls
global.fetch = jest.fn()

const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useActions - Drag and Drop Children Preservation', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  test('should preserve children when moving action with drag and drop', async () => {
    // Setup: Create mock actions with parent-child relationships
    const mockActionsData = [
      {
        id: 'action-a',
        title: 'Action A (with children)',
        description: 'Parent action',
        done: false,
        children: [
          {
            id: 'child-1',
            title: 'Child 1 of A',
            description: 'First child',
            done: false,
            children: []
          },
          {
            id: 'child-2', 
            title: 'Child 2 of A',
            description: 'Second child',
            done: false,
            children: []
          }
        ]
      },
      {
        id: 'action-b',
        title: 'Action B (target)',
        description: 'Target action for drop',
        done: false,
        children: []
      }
    ]

    // Mock successful fetch responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          success: true, 
          data: { rootActions: mockActionsData } 
        })
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as Response)

    const { result } = renderHook(() => useActions())

    // Wait for initial load
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    // Verify initial state - Action A has 2 children
    const initialActions = result.current.actions
    const actionA = initialActions.find(a => a.id === 'action-a')
    const actionB = initialActions.find(a => a.id === 'action-b')
    
    expect(actionA).toBeDefined()
    expect(actionB).toBeDefined()
    expect(actionA!.children).toHaveLength(2)
    expect(actionA!.children![0].id).toBe('child-1')
    expect(actionA!.children![1].id).toBe('child-2')

    // Perform drag and drop: move Action A into Action B
    await act(async () => {
      await result.current.moveAction('action-a', 'action-b')
    })

    // Check optimistic update state immediately after move
    const updatedActions = result.current.actions
    const updatedActionB = updatedActions.find(a => a.id === 'action-b')
    
    // Action B should now have Action A as a child
    expect(updatedActionB).toBeDefined()
    expect(updatedActionB!.children).toHaveLength(1)
    
    const movedActionA = updatedActionB!.children![0]
    expect(movedActionA.id).toBe('action-a')
    
    // BUG: This should pass but currently fails - children are lost during optimistic update
    expect(movedActionA.children).toHaveLength(2)
    expect(movedActionA.children![0].id).toBe('child-1')
    expect(movedActionA.children![1].id).toBe('child-2')

    // Verify API was called with correct parameters
    expect(mockFetch).toHaveBeenCalledWith('/api/actions/action-a', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        new_family_id: 'action-b',
      }),
    })
  })

  test('should handle rollback when API fails while preserving children', async () => {
    const mockActionsData = [
      {
        id: 'action-a',
        title: 'Action A (with children)',
        done: false,
        children: [
          { id: 'child-1', title: 'Child 1', done: false, children: [] }
        ]
      },
      {
        id: 'action-b', 
        title: 'Action B',
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

    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0))
    })

    const initialActions = result.current.actions
    const initialActionA = initialActions.find(a => a.id === 'action-a')
    expect(initialActionA!.children).toHaveLength(1)

    // Attempt move that will fail
    await act(async () => {
      try {
        await result.current.moveAction('action-a', 'action-b')
      } catch (error) {
        // Expected to fail
      }
    })

    // After rollback, Action A should still have its children
    const rolledBackActions = result.current.actions
    const rolledBackActionA = rolledBackActions.find(a => a.id === 'action-a')
    
    expect(rolledBackActionA).toBeDefined()
    expect(rolledBackActionA!.children).toHaveLength(1)
    expect(rolledBackActionA!.children![0].id).toBe('child-1')
  })
})