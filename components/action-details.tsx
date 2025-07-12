"use client"

import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Copy, ExternalLink, Trash2, Check, GitBranch } from "lucide-react"
import type { Action } from "../types/action"
import { useActionCompletion } from "../app/contexts/ActionCompletionContext"

interface ActionDetailsProps {
  action: Action | null
  onUpdateAction?: (actionId: string, updates: Partial<Action>) => void
  onDeleteAction?: (actionId: string) => void
  onCompleteAction?: (actionId: string) => void
  onDecomposeAction?: (actionId: string) => void
  onRefresh?: () => void
}

interface ExtendedAction extends Action {
  description?: string
  vision?: string
  status?: "Active" | "Complete" | "Blocked" | "Draft"
  dependencies?: string[]
  dependents?: string[]
  url?: string
  completed?: boolean
}

export function ActionDetails({
  action,
  onUpdateAction,
  onDeleteAction,
  onCompleteAction,
  onDecomposeAction,
  onRefresh,
}: ActionDetailsProps) {
  const extendedAction = action as ExtendedAction
  const { openModal } = useActionCompletion()

  const [localTitle, setLocalTitle] = useState(extendedAction?.title || "")
  const [localDescription, setLocalDescription] = useState(extendedAction?.description || "")
  const [localVision, setLocalVision] = useState(extendedAction?.vision || "")

  // Update local state when action changes
  useEffect(() => {
    setLocalTitle(extendedAction?.title || "")
    setLocalDescription(extendedAction?.description || "")
    setLocalVision(extendedAction?.vision || "")
  }, [extendedAction])

  // Debounced auto-save
  useEffect(() => {
    if (!extendedAction || !onUpdateAction) return

    const timeoutId = setTimeout(() => {
      const updates: Partial<ExtendedAction> = {}
      let hasChanges = false

      if (localTitle !== extendedAction.title) {
        updates.title = localTitle
        hasChanges = true
      }
      if (localDescription !== (extendedAction.description || "")) {
        updates.description = localDescription
        hasChanges = true
      }
      if (localVision !== (extendedAction.vision || "")) {
        updates.vision = localVision
        hasChanges = true
      }

      if (hasChanges) {
        onUpdateAction(extendedAction.id, updates)
      }
    }, 500)

    return () => clearTimeout(timeoutId)
  }, [localTitle, localDescription, localVision, extendedAction, onUpdateAction])

  const generateFullPrompt = useCallback(() => {
    if (!extendedAction) return ""

    const childrenContext = extendedAction.children?.length
      ? `\n\nSubtasks:\n${extendedAction.children.map((child) => `- ${child.title}`).join("\n")}`
      : ""

    return `# Current Task
**${extendedAction.title}**
${extendedAction.url ? `${extendedAction.url}` : `https://done.engineering/${extendedAction.id}`}

${extendedAction.description || "Update existing services and create new API endpoints to support tenant-scoped data access and authentication workflows"}

# Vision
${extendedAction.vision || "All API endpoints and services properly support multi-tenancy with secure authentication and tenant isolation"}

# Context from Family Chain
The current action of "${extendedAction.title}" is crucial in supporting the broader project goals by enhancing the system's ability to provide tenant-scoped data access and authentication workflows. These updates are essential for transforming the existing single-tenant system into a secure, multi-tenant platform with role-based access control. This action directly contributes to expanding the system's capabilities, improving user experience, and ensuring data security across multiple tenant environments.${childrenContext}

Please help me execute this task with attention to the vision and context provided.`
  }, [extendedAction])

  const handleCopyPrompt = useCallback(async () => {
    const prompt = generateFullPrompt()
    try {
      await navigator.clipboard.writeText(prompt)
      // You could add a toast notification here
    } catch (err) {
      console.error("Failed to copy prompt:", err)
    }
  }, [generateFullPrompt])

  const handleCompleteButtonClick = useCallback(() => {
    if (!extendedAction) return
    
    if (extendedAction.done) {
      // If already completed, directly uncomplete it
      onCompleteAction?.(extendedAction.id)
    } else {
      // If not completed, open the completion modal with refresh callback
      openModal(extendedAction.id, extendedAction.title, onRefresh)
    }
  }, [extendedAction, onCompleteAction, openModal, onRefresh])

  if (!action) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-lg mb-2">No action selected</p>
          <p className="text-sm">Click on an action to view its details</p>
        </div>
      </div>
    )
  }

  const childrenCount = extendedAction.children?.length || 0
  const dependenciesCount = extendedAction.dependencies?.length || 0
  const dependentsCount = extendedAction.dependents?.length || 0
  const isCompleted = extendedAction.done

  return (
    <div className="h-full overflow-auto">
      <div className="p-4 space-y-6">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className={`w-10 h-10 p-0 transition-colors ${
              isCompleted
                ? "bg-primary/20 border-primary text-primary"
                : "bg-transparent hover:bg-primary/10 hover:border-primary hover:text-primary"
            }`}
            onClick={handleCompleteButtonClick}
            title={isCompleted ? "Mark as incomplete" : "Complete with story"}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-10 h-10 p-0 bg-transparent hover:bg-primary/10 hover:border-primary hover:text-primary"
            onClick={() => onDecomposeAction?.(extendedAction.id)}
            title="Decompose into subtasks"
          >
            <GitBranch className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="w-10 h-10 p-0 bg-transparent" title="Open in new tab">
            <ExternalLink className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" className="w-10 h-10 p-0 bg-transparent" title="Copy action details">
            <Copy className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-10 h-10 p-0 hover:bg-destructive hover:text-destructive-foreground bg-transparent"
            onClick={() => onDeleteAction?.(extendedAction.id)}
            title="Delete action"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Title</label>
          <Input
            value={localTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="bg-muted/20 border-muted"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Description</label>
          <Textarea
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            className="min-h-[100px] bg-muted/20 border-muted"
            placeholder="Update existing services and create new API endpoints to support..."
          />
        </div>

        {/* Vision */}
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-2 block">Vision</label>
          <Textarea
            value={localVision}
            onChange={(e) => setLocalVision(e.target.value)}
            className="min-h-[100px] bg-muted/20 border-muted"
            placeholder="All API endpoints and services properly support multi-tenancy wit..."
          />
        </div>

        <Separator />

        {/* Metadata */}
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-4">Metadata</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID:</span>
              <span className="font-mono text-xs">{extendedAction.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={isCompleted ? "default" : "secondary"}>
                {isCompleted ? "Complete" : extendedAction.status || "Active"}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Children:</span>
              <span>{childrenCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dependencies:</span>
              <span>{dependenciesCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Dependents:</span>
              <span>{dependentsCount}</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Full Prompt */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Full Prompt</h3>
            <Button size="sm" variant="outline" onClick={handleCopyPrompt}>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-muted-foreground">
            {generateFullPrompt()}
          </pre>
        </div>
      </div>
    </div>
  )
}
