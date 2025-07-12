"use client"

import type React from "react"
import { useState, useCallback } from "react"
import { ActionItem } from "./action-item"
import type { Action, DropIndicator } from "../types/action"

interface ActionHierarchyProps {
  actions: Action[]
  selectedActionId: string | null
  expandedIds: Set<string>
  searchQuery?: string
  onSelect: (actionId: string) => void
  onToggleExpand: (actionId: string) => void
  onSetRoot: (actionId: string) => void
  onMoveAction: (draggedId: string, targetId: string, position: "above" | "below" | "inside") => void
}

export function ActionHierarchy({
  actions,
  selectedActionId,
  expandedIds,
  searchQuery,
  onSelect,
  onToggleExpand,
  onSetRoot,
  onMoveAction,
}: ActionHierarchyProps) {
  console.log('ActionHierarchy received actions:', actions.length, actions)
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)

  const handleDragStart = useCallback((e: React.DragEvent, actionId: string) => {
    setDraggedActionId(actionId)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent, actionId: string) => {
      e.preventDefault()
      e.stopPropagation()
      e.dataTransfer.dropEffect = "move"

      if (draggedActionId && draggedActionId !== actionId) {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
        const y = e.clientY - rect.top
        const height = rect.height

        // Determine drop position based on mouse position
        let position: "above" | "below" | "inside"

        if (y < height * 0.25) {
          position = "above"
        } else if (y > height * 0.75) {
          position = "below"
        } else {
          position = "inside"
        }

        setDropIndicator({ targetId: actionId, position })
      }
    },
    [draggedActionId],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = e.clientX
    const y = e.clientY

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropIndicator(null)
    }
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string, position: "above" | "below" | "inside") => {
      e.preventDefault()
      if (draggedActionId && draggedActionId !== targetId) {
        onMoveAction(draggedActionId, targetId, position)
      }
      setDraggedActionId(null)
      setDropIndicator(null)
    },
    [draggedActionId, onMoveAction],
  )

  const renderActions = (actions: Action[], level = 0) => {
    return actions.map((action) => (
      <ActionItem
        key={action.id}
        action={action}
        level={level}
        isSelected={selectedActionId === action.id}
        isExpanded={expandedIds.has(action.id)}
        selectedActionId={selectedActionId}
        expandedIds={expandedIds}
        dropIndicator={dropIndicator}
        searchQuery={searchQuery}
        onSelect={onSelect}
        onToggleExpand={onToggleExpand}
        onSetRoot={onSetRoot}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />
    ))
  }

  const renderedActions = renderActions(actions)
  console.log('ActionHierarchy rendering actions:', renderedActions.length)
  return <div className="action-hierarchy">{renderedActions}</div>
}
