import { useState, useCallback, useEffect } from 'react'
import type { Action } from '../../types/action'

export function useActions() {
  const [actions, setActions] = useState<Action[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch actions tree from API
  const fetchActions = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/tree')
      if (!response.ok) {
        throw new Error(`Failed to fetch actions: ${response.statusText}`)
      }
      
      const result = await response.json()
      console.log('API response:', result)
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch actions')
      }
      
      console.log('Setting actions:', result.data.rootActions)
      setActions(result.data.rootActions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch actions')
      console.error('Error fetching actions:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Update an action
  const updateAction = useCallback(async (actionId: string, updates: Partial<Action>) => {
    try {
      // Handle completion separately since it uses a different endpoint
      if ('done' in updates) {
        const endpoint = updates.done ? `/api/actions/${actionId}/complete` : `/api/actions/${actionId}/uncomplete`
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to update action: ${response.statusText}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to update action')
        }
      } else {
        // Use PUT for other updates
        const response = await fetch(`/api/actions/${actionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updates),
        })

        if (!response.ok) {
          throw new Error(`Failed to update action: ${response.statusText}`)
        }

        const result = await response.json()
        if (!result.success) {
          throw new Error(result.error || 'Failed to update action')
        }
      }

      // Optimistically update local state
      setActions(prevActions => {
        const updateActionInTree = (actions: Action[]): Action[] => {
          return actions.map(action => {
            if (action.id === actionId) {
              return { ...action, ...updates }
            }
            if (action.children) {
              return { ...action, children: updateActionInTree(action.children) }
            }
            return action
          })
        }
        return updateActionInTree(prevActions)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update action')
      throw err
    }
  }, [])

  // Delete an action
  const deleteAction = useCallback(async (actionId: string) => {
    try {
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete action: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete action')
      }

      // Optimistically update local state
      setActions(prevActions => {
        const removeActionFromTree = (actions: Action[]): Action[] => {
          return actions.filter(action => {
            if (action.id === actionId) {
              return false
            }
            if (action.children) {
              action.children = removeActionFromTree(action.children)
            }
            return true
          })
        }
        return removeActionFromTree(prevActions)
      })

      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete action')
      throw err
    }
  }, [])

  // Create a new action
  const createAction = useCallback(async (title: string, options?: {
    description?: string
    vision?: string
    parent_id?: string
    depends_on_ids?: string[]
  }) => {
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          ...options,
        }),
      })

      if (!response.ok) {
        const errorResult = await response.json()
        throw new Error(errorResult.error || `Failed to create action: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to create action')
      }
      
      // Refresh the actions tree to include the new action
      await fetchActions()
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create action')
      throw err
    }
  }, [fetchActions])

  // Move action (join family) - this might need a separate endpoint
  const moveAction = useCallback(async (actionId: string, newParentId?: string) => {
    try {
      // For now, we'll use the PUT endpoint to update the family
      // You might want to create a dedicated move endpoint later
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_family_id: newParentId,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to move action: ${response.statusText}`)
      }

      const result = await response.json()
      if (!result.success) {
        throw new Error(result.error || 'Failed to move action')
      }

      // Optimistically update local state instead of refetching
      setActions(prevActions => {
        // Find and remove the action from its current location
        let movedAction: Action | null = null
        const removeAction = (actionsArray: Action[]): Action[] => {
          return actionsArray.filter(action => {
            if (action.id === actionId) {
              movedAction = action
              return false
            }
            if (action.children) {
              action.children = removeAction(action.children)
            }
            return true
          })
        }
        
        const updatedActions = removeAction([...prevActions])
        
        if (!movedAction) return prevActions // Action not found, return original
        
        // Create a copy without children to avoid duplication when moving
        const cleanedMovedAction: Action = {
          id: (movedAction as Action).id,
          title: (movedAction as Action).title,
          description: (movedAction as Action).description,
          vision: (movedAction as Action).vision,
          done: (movedAction as Action).done,
          dependencies: (movedAction as Action).dependencies,
          isExpanded: (movedAction as Action).isExpanded,
          level: (movedAction as Action).level,
          created_at: (movedAction as Action).created_at,
          updated_at: (movedAction as Action).updated_at,
          children: []
        }
        
        if (!newParentId) {
          // Move to root level
          return [...updatedActions, cleanedMovedAction]
        }
        
        // Add to new parent
        const addToParent = (actionsArray: Action[]): Action[] => {
          return actionsArray.map(action => {
            if (action.id === newParentId) {
              return {
                ...action,
                children: [...(action.children || []), cleanedMovedAction]
              }
            }
            if (action.children) {
              return {
                ...action,
                children: addToParent(action.children)
              }
            }
            return action
          })
        }
        
        return addToParent(updatedActions)
      })
      
      return result
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move action')
      throw err
    }
  }, [fetchActions])

  // Initial load
  useEffect(() => {
    fetchActions()
  }, [fetchActions])

  return {
    actions,
    loading,
    error,
    refetch: fetchActions,
    updateAction,
    deleteAction,
    createAction,
    moveAction,
  }
}