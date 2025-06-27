// Resource type definitions for MCP resources

export interface Action {
  id: string;
  data: {
    title: string;
  };
  done: boolean;
  version: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Edge {
  src: string;
  dst: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
}

// action://list
export interface ActionListResource {
  actions: Action[];
  total: number;
  offset?: number;
  limit?: number;
  filtered_by_done?: boolean;
}

// action://tree  
export interface ActionTreeResource {
  rootActions: ActionNode[];
  rootAction?: string; // For scoped trees, the ID of the root action
  scope?: string; // For scoped trees, the ID of the scope action
}

export interface ActionNode {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  children: ActionNode[];
  dependencies: string[]; // IDs of actions this depends on
}

// action://dependencies
export interface ActionDependenciesResource {
  dependencies: DependencyMapping[];
}

export interface DependencyMapping {
  action_id: string;
  action_title: string;
  action_done: boolean;
  depends_on: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
  dependents: Array<{
    id: string;
    title: string;
    done: boolean;
  }>;
}

// action://{id}
export interface ActionDetailResource {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number | null;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  parent_chain: ActionMetadata[]; // all parent actions up to root
  family_context_summary?: string; // AI-generated summary of family context
  family_vision_summary?: string; // AI-generated summary of family vision
  children: ActionMetadata[];
  dependencies: ActionMetadata[]; // actions this depends on
  dependents: ActionMetadata[]; // actions that depend on this one
  dependency_completion_context: DependencyCompletionContext[]; // completion context from dependencies
  completion_context?: DependencyCompletionContext; // action's own completion context if completed
}

// Completion context from dependencies for enhanced knowledge transfer
export interface DependencyCompletionContext {
  action_id: string;
  action_title: string;
  completion_timestamp: string;
  implementation_story?: string;
  impact_story?: string;
  learning_story?: string;
  changelog_visibility: string;
  // Magazine-style editorial content
  headline?: string;
  deck?: string;
  pull_quotes?: string[];
  // Git information
  git_commit_hash?: string;
  git_commit_message?: string;
  git_branch?: string;
  git_commit_author?: string;
  git_related_commits?: string[];
}

export interface ActionMetadata {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number | null;
  created_at: string;
  updated_at: string;
}