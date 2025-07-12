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
        const requestBody = updates.done ? {
          // Provide minimal structured completion data to satisfy schema
          technical_changes: {},
          outcomes: {},
          challenges: {},
          changelog_visibility: 'team' as const
        } : undefined
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          ...(requestBody && { body: JSON.stringify(requestBody) })
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
    // Capture current state BEFORE any modifications for potential rollback
    const previousActions = actions
    
    try {
      // OPTIMISTIC UPDATE: Update UI immediately
      setActions(prevActions => {
        
        // Find and capture the action to move (with all its children)
        let movedAction: Action | null = null
        
        // Remove the action from its current location and capture it
        const removeAction = (actionsArray: Action[]): Action[] => {
          return actionsArray.reduce<Action[]>((acc, action) => {
            if (action.id === actionId) {
              // Found the action to move - capture it with ALL its data including children
              movedAction = { ...action }
              return acc // Don't include in result (effectively removes it)
            }
            
            // For other actions, recursively process children
            if (action.children && action.children.length > 0) {
              const updatedChildren = removeAction(action.children)
              acc.push({
                ...action,
                children: updatedChildren
              })
            } else {
              acc.push(action)
            }
            
            return acc
          }, [])
        }
        
        const updatedActions = removeAction([...prevActions])
        
        if (!movedAction) return prevActions // Action not found, return original
        
        if (!newParentId) {
          // Move to root level
          return [...updatedActions, movedAction]
        }
        
        // Add to new parent
        const addToParent = (actionsArray: Action[]): Action[] => {
          return actionsArray.map((action): Action => {
            if (action.id === newParentId) {
              return {
                ...action,
                children: [...(action.children || []), movedAction as Action]
              }
            }
            if (action.children && action.children.length > 0) {
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
      
      // BACKGROUND API CALL: Make the API call after UI update
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
      
      return result
    } catch (err) {
      // ROLLBACK: Restore previous state on API failure
      setActions(previousActions)
      setError(err instanceof Error ? err.message : 'Failed to move action')
      throw err
    }
  }, [actions])

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