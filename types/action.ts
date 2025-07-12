export interface Action {
  id: string
  title: string
  description?: string
  vision?: string
  done: boolean
  children?: Action[]
  dependencies?: string[]
  isExpanded?: boolean
  level?: number
  created_at?: string
  updated_at?: string
}

export interface ActionState {
  selectedActionId: string | null
  rootActionId: string | null
  expandedIds: Set<string>
}

export interface DropIndicator {
  targetId: string
  position: "above" | "below" | "inside"
}
