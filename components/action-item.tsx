"use client"

import type React from "react"
import { ChevronRight, ChevronDown, GripVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Action, DropIndicator } from "../types/action"

interface ActionItemProps {
  action: Action
  level: number
  isSelected: boolean
  isExpanded: boolean
  selectedActionId: string | null
  expandedIds: Set<string>
  dropIndicator: DropIndicator | null
  onSelect: (actionId: string) => void
  onToggleExpand: (actionId: string) => void
  onSetRoot: (actionId: string) => void
  onDragStart: (e: React.DragEvent, actionId: string) => void
  onDragOver: (e: React.DragEvent, actionId: string) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent, targetId: string, position: "above" | "below" | "inside") => void
}

export function ActionItem({
  action,
  level,
  isSelected,
  isExpanded,
  selectedActionId,
  expandedIds,
  dropIndicator,
  onSelect,
  onToggleExpand,
  onSetRoot,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: ActionItemProps) {
  console.log('ActionItem rendering:', action.id, action.title)
  const hasChildren = action.children && action.children.length > 0
  const paddingLeft = level * 20

  const handleDragStart = (e: React.DragEvent) => {
    onDragStart(e, action.id)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent) => {
    onDragOver(e, action.id)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (dropIndicator && dropIndicator.targetId === action.id) {
      onDrop(e, action.id, dropIndicator.position)
    }
  }

  const showDropLineAbove = dropIndicator?.targetId === action.id && dropIndicator.position === "above"
  const showDropLineBelow = dropIndicator?.targetId === action.id && dropIndicator.position === "below"
  const showDropInside = dropIndicator?.targetId === action.id && dropIndicator.position === "inside"

  return (
    <div className="select-none relative">
      {/* Drop line above */}
      {showDropLineAbove && (
        <div
          className="absolute left-0 right-0 top-0 h-0.5 bg-primary z-10"
          style={{ marginLeft: `${paddingLeft + 8}px` }}
        />
      )}

      <div
        className={`action-item group ${isSelected ? 'selected' : ''} hover:bg-muted/20 transition-colors cursor-pointer`}
        style={{ paddingLeft: `${paddingLeft + 8}px` }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
      >
        {(isSelected || showDropInside) && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />}
        <GripVertical className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 mr-2 cursor-grab" />

        {hasChildren ? (
          <Button
            variant="ghost"
            size="sm"
            className="w-4 h-4 p-0 mr-2 text-muted-foreground hover:text-primary"
            onClick={(e) => {
              e.stopPropagation()
              onToggleExpand(action.id)
            }}
          >
            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </Button>
        ) : (
          <div className="w-4 h-4 mr-2" />
        )}

        <div className="flex items-center flex-1 cursor-pointer hover:text-green-500 transition-colors group/item"
             onClick={(e) => {
               e.stopPropagation()
               onSelect(action.id)
             }}>
          <Button
            variant="ghost"
            size="sm"
            className="w-3 h-3 p-0 mr-3 hover:bg-transparent relative transition-all duration-200"
            onClick={(e) => {
              e.stopPropagation()
              onSetRoot(action.id)
            }}
          >
            <div className="w-0.5 h-0.5 bg-muted-foreground rounded-full transition-all duration-200 group-hover/item:opacity-0" />
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full absolute inset-0 m-auto opacity-0 transition-all duration-200 group-hover/item:opacity-100" />
          </Button>

          <span className="text-sm leading-relaxed">
            {action.title}
          </span>
        </div>

        {hasChildren && (
          <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
            {action.children!.length}
          </span>
        )}
      </div>

      {/* Drop line below */}
      {showDropLineBelow && (
        <div
          className="absolute left-0 right-0 bottom-0 h-0.5 bg-primary z-10"
          style={{ marginLeft: `${paddingLeft + 8}px` }}
        />
      )}

      {hasChildren && isExpanded && (
        <div>
          {action.children!.map((child) => (
            <ActionItem
              key={child.id}
              action={child}
              level={level + 1}
              isSelected={selectedActionId === child.id}
              isExpanded={expandedIds.has(child.id)}
              selectedActionId={selectedActionId}
              expandedIds={expandedIds}
              dropIndicator={dropIndicator}
              onSelect={onSelect}
              onToggleExpand={onToggleExpand}
              onSetRoot={onSetRoot}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
            />
          ))}
        </div>
      )}
    </div>
  )
}
