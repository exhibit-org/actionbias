"use client"

import { useState, useCallback, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ActionHierarchy } from "./components/action-hierarchy"
import { ActionDetails } from "./components/action-details"
import { useActions } from "./lib/hooks/useActions"
import type { Action } from "./types/action"
import { BreadcrumbTrail } from "./components/breadcrumb-trail"
import { ResizablePanels } from "./components/resizable-panels"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"

export default function ActionInterface() {
  const { actions, loading, error, updateAction, deleteAction, createAction, moveAction } = useActions()
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Debug logging
  console.log('Actions in interface:', actions, 'Loading:', loading, 'Error:', error)
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null)
  const [rootActionId, setRootActionId] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set(["183", "178", "5"]))
  const [breadcrumbs, setBreadcrumbs] = useState<Array<{ id: string; text: string }>>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")

  // Debounce search query
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timeoutId)
  }, [searchQuery])

  // Build breadcrumb path to a given action
  const buildBreadcrumbPath = useCallback(
    (targetId: string): Array<{ id: string; text: string }> => {
      const path: Array<{ id: string; text: string }> = []

      const findPath = (actions: Action[], currentPath: Action[]): boolean => {
        for (const action of actions) {
          const newPath = [...currentPath, action]

          if (action.id === targetId) {
            // Found the target, build breadcrumb from path (excluding the target itself)
            path.push(...newPath.slice(0, -1).map((a) => ({ id: a.id, text: a.title })))
            return true
          }

          if (action.children && findPath(action.children, newPath)) {
            return true
          }
        }
        return false
      }

      findPath(actions, [])
      return path
    },
    [actions],
  )

  // Initialize state from URL parameters
  useEffect(() => {
    const rootId = searchParams.get('root')
    const selectedId = searchParams.get('selected')
    
    if (rootId && actions.length > 0) {
      setRootActionId(rootId)
      // Build breadcrumbs for the root action
      const actionPath = buildBreadcrumbPath(rootId)
      if (actionPath.length === 0) {
        setBreadcrumbs([{ id: rootId, text: '' }])
      } else {
        setBreadcrumbs(actionPath)
      }
      // Auto-expand the root item if it has children
      setExpandedIds((prev) => new Set([...prev, rootId]))
    }
    
    if (selectedId) {
      setSelectedActionId(selectedId)
    }
  }, [searchParams, actions, buildBreadcrumbPath])

  // Find action by ID recursively
  const findActionById = useCallback((actions: Action[], id: string): Action | null => {
    for (const action of actions) {
      if (action.id === id) return action
      if (action.children) {
        const found = findActionById(action.children, id)
        if (found) return found
      }
    }
    return null
  }, [])

  // Filter actions based on search query
  const filterActions = useCallback((actions: Action[], query: string): Action[] => {
    if (!query.trim()) return actions

    const searchTerms = query
      .toLowerCase()
      .split(" ")
      .filter((term) => term.length > 0)

    const matchesSearch = (action: Action): boolean => {
      const searchText = action.title.toLowerCase()
      const descriptionText = action.description?.toLowerCase() || ''
      return searchTerms.some((term) => 
        searchText.includes(term) || descriptionText.includes(term)
      )
    }

    const filterRecursive = (actions: Action[]): Action[] => {
      const filtered: Action[] = []

      for (const action of actions) {
        const actionMatches = matchesSearch(action)
        const filteredChildren = action.children ? filterRecursive(action.children) : []
        const hasMatchingChildren = filteredChildren.length > 0

        if (actionMatches || hasMatchingChildren) {
          filtered.push({
            ...action,
            children: filteredChildren.length > 0 ? filteredChildren : action.children,
          })
        }
      }

      return filtered
    }

    return filterRecursive(actions)
  }, [])

  // Auto-expand actions that have matching children when searching
  useEffect(() => {
    if (debouncedSearchQuery.trim()) {
      const expandMatchingParents = (actions: Action[], expandedSet: Set<string>) => {
        for (const action of actions) {
          if (action.children) {
            const hasMatchingChildren = action.children.some(
              (child) =>
                child.title.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                child.description?.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
                (child.children && child.children.length > 0),
            )
            if (hasMatchingChildren) {
              expandedSet.add(action.id)
            }
            expandMatchingParents(action.children, expandedSet)
          }
        }
      }

      setExpandedIds((prev) => {
        const newSet = new Set(prev)
        expandMatchingParents(actions, newSet)
        return newSet
      })
    }
  }, [debouncedSearchQuery, actions])

  const selectedAction = selectedActionId ? findActionById(actions, selectedActionId) : null

  const handleSelect = useCallback((actionId: string) => {
    const newSelectedId = selectedActionId === actionId ? null : actionId
    setSelectedActionId(newSelectedId)
    
    // Update URL to include selected action
    const params = new URLSearchParams(searchParams.toString())
    if (newSelectedId) {
      params.set('selected', newSelectedId)
    } else {
      params.delete('selected')
    }
    router.push(`?${params.toString()}`)
  }, [selectedActionId, searchParams, router])

  const handleToggleExpand = useCallback((actionId: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }, [])

  const handleSetRoot = useCallback(
    (actionId: string) => {
      setRootActionId(actionId)
      // Build and set breadcrumbs - for root-level actions, create a placeholder to show the breadcrumb bar
      const actionPath = buildBreadcrumbPath(actionId)
      if (actionPath.length === 0) {
        // Root-level action - create a placeholder breadcrumb to ensure the breadcrumb bar shows
        setBreadcrumbs([{ id: actionId, text: '' }])
      } else {
        setBreadcrumbs(actionPath)
      }
      // Select the action when setting it as root
      setSelectedActionId(actionId)
      // Auto-expand the root item if it has children
      setExpandedIds((prev) => new Set([...prev, actionId]))
      
      // Update URL to reflect the navigation
      const params = new URLSearchParams()
      params.set('root', actionId)
      params.set('selected', actionId)
      router.push(`?${params.toString()}`)
    },
    [buildBreadcrumbPath, router],
  )

  const handleUpdateAction = useCallback(async (actionId: string, updates: Partial<Action>) => {
    try {
      await updateAction(actionId, updates)
    } catch (err) {
      console.error('Failed to update action:', err)
    }
  }, [updateAction])

  const handleCompleteAction = useCallback(async (actionId: string) => {
    try {
      // Find the current action to get its done status
      const findAction = (actions: Action[], id: string): Action | null => {
        for (const action of actions) {
          if (action.id === id) return action
          if (action.children) {
            const found = findAction(action.children, id)
            if (found) return found
          }
        }
        return null
      }
      
      const action = findAction(actions, actionId)
      if (action) {
        await updateAction(actionId, { done: !action.done })
      }
    } catch (err) {
      console.error('Failed to complete action:', err)
    }
  }, [actions, updateAction])

  const handleDecomposeAction = useCallback(async (actionId: string) => {
    try {
      // Create some placeholder subtasks - in a real implementation you might
      // call an AI endpoint to generate suggestions
      const subtasks = [
        { title: "Research and planning phase", description: "Gather requirements and plan the approach" },
        { title: "Implementation phase", description: "Execute the main work" },
        { title: "Testing and validation phase", description: "Verify the work meets requirements" },
      ]
      
      for (const subtask of subtasks) {
        await createAction(subtask.title, {
          description: subtask.description,
          parent_id: actionId,
        })
      }
      
      // Auto-expand the action to show new children
      setExpandedIds((prev) => new Set([...prev, actionId]))
    } catch (err) {
      console.error('Failed to decompose action:', err)
    }
  }, [createAction])

  const handleDeleteAction = useCallback(
    async (actionId: string) => {
      try {
        await deleteAction(actionId)
        
        // Clear selection if deleted action was selected
        if (selectedActionId === actionId) {
          setSelectedActionId(null)
        }
      } catch (err) {
        console.error('Failed to delete action:', err)
      }
    },
    [deleteAction, selectedActionId],
  )

  const handleMoveAction = useCallback(
    async (draggedId: string, targetId: string, position: "above" | "below" | "inside") => {
      try {
        if (position === "inside") {
          // Move as child - use moveAction to set new parent
          await moveAction(draggedId, targetId)
        } else {
          // For above/below positioning, we need to find the target's parent
          // and move the dragged action to the same parent
          const findParent = (actions: Action[], childId: string, currentParent?: string): string | undefined => {
            for (const action of actions) {
              if (action.children?.some(child => child.id === childId)) {
                return action.id
              }
              if (action.children) {
                const result = findParent(action.children, childId, action.id)
                if (result !== undefined) return result
              }
            }
            return currentParent
          }
          
          const targetParent = findParent(actions, targetId)
          await moveAction(draggedId, targetParent)
          
          // TODO: Handle the exact positioning (above/below) - this might require
          // additional API support or client-side reordering
        }
      } catch (err) {
        console.error('Failed to move action:', err)
      }
    },
    [moveAction, actions],
  )

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
  }, [])

  // Get current actions to display (filtered by root and search)
  const getCurrentActions = useCallback((): Action[] => {
    let currentActions = actions
    console.log('getCurrentActions - input actions:', actions.length)

    // First apply root filtering
    if (rootActionId) {
      console.log('Filtering by root:', rootActionId)
      const rootAction = findActionById(actions, rootActionId)
      if (rootAction) {
        // Include the root action itself along with its children
        currentActions = [rootAction]
      }
    }

    // Then apply search filtering
    const filtered = filterActions(currentActions, debouncedSearchQuery)
    console.log('getCurrentActions - output actions:', filtered.length, 'search query:', debouncedSearchQuery)
    return filtered
  }, [actions, rootActionId, debouncedSearchQuery, findActionById, filterActions])

  const currentActions = getCurrentActions()

  const handleBreadcrumbNavigate = useCallback(
    (actionId: string | null) => {
      if (actionId === null) {
        // Navigate back to root (all actions view)
        setRootActionId(null)
        setBreadcrumbs([])
        // Clear URL parameters
        router.push(window.location.pathname)
      } else {
        // Navigate to specific breadcrumb level
        setRootActionId(actionId)
        const actionPath = buildBreadcrumbPath(actionId)
        if (actionPath.length === 0) {
          // Root-level action - create a placeholder breadcrumb to ensure the breadcrumb bar shows
          setBreadcrumbs([{ id: actionId, text: '' }])
        } else {
          setBreadcrumbs(actionPath)
        }
        // Update URL
        const params = new URLSearchParams()
        params.set('root', actionId)
        router.push(`?${params.toString()}`)
      }
      setSelectedActionId(null)
    },
    [buildBreadcrumbPath, router],
  )

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-lg">Loading actions...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <div className="flex-1">
        <ResizablePanels
          leftPanel={
            <div className="h-full flex flex-col border-r border-border">
              {/* Breadcrumb Navigation */}
              <BreadcrumbTrail breadcrumbs={breadcrumbs} onNavigate={handleBreadcrumbNavigate} />

              {/* Search Bar */}
              <div className="p-3 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Ask me to find relevant actions..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="bg-muted/20 border-muted text-sm pl-10"
                  />
                </div>
              </div>

              {/* Action Hierarchy */}
              <div className="flex-1">
                <ActionHierarchy
                  actions={currentActions}
                  selectedActionId={selectedActionId}
                  expandedIds={expandedIds}
                  searchQuery={debouncedSearchQuery}
                  onSelect={handleSelect}
                  onToggleExpand={handleToggleExpand}
                  onSetRoot={handleSetRoot}
                  onMoveAction={handleMoveAction}
                />
              </div>
            </div>
          }
          rightPanel={
            <ActionDetails
              action={selectedAction}
              onUpdateAction={handleUpdateAction}
              onDeleteAction={handleDeleteAction}
              onCompleteAction={handleCompleteAction}
              onDecomposeAction={handleDecomposeAction}
            />
          }
        />
      </div>

      {/* Footer */}
      <footer className="border-t border-border p-4 bg-muted/20">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="text-primary">actionbias.prototype</div>
          <div>
            {selectedActionId ? `selected: ${selectedActionId}` : "no selection"}
            {rootActionId && ` • root: ${rootActionId}`}
            {debouncedSearchQuery && ` • filtered`}
          </div>
        </div>
      </footer>
    </div>
  )
}
