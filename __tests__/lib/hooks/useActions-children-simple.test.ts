/**
 * Simple test for children preservation during drag and drop
 */

import { renderHook, act } from '@testing-library/react'
import { useActions } from '../../../lib/hooks/useActions'

// Mock fetch for API calls
global.fetch = jest.fn()
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>

describe('useActions - Children Preservation (Simple)', () => {
  beforeEach(() => {
    mockFetch.mockClear()
  })

  test('should preserve children when moving action with moveAction', async () => {
    const mockActionsData = [
      {
        id: 'parent',
        title: 'Parent Action',
        done: false,
        children: [
          {
            id: 'child1', 
            title: 'Child 1',
            done: false,
            children: []
          },
          {
            id: 'child2',
            title: 'Child 2', 
            done: false,
            children: []
          }
        ]
      },
      {
        id: 'target',
        title: 'Target Action',
        done: false,
        children: []
      }
    ]

    // Mock initial fetch and move API call
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

    // Check initial state
    const initialParent = result.current.actions.find(a => a.id === 'parent')
    expect(initialParent?.children).toHaveLength(2)

    // Move parent into target
    await act(async () => {
      await result.current.moveAction('parent', 'target')
    })

    // Check that parent still has children after move
    const target = result.current.actions.find(a => a.id === 'target')
    const movedParent = target?.children?.[0]
    
    expect(movedParent?.id).toBe('parent')
    expect(movedParent?.children).toHaveLength(2)
    expect(movedParent?.children?.[0]?.id).toBe('child1')
    expect(movedParent?.children?.[1]?.id).toBe('child2')
  })
})