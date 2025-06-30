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
  parent_chain: ActionMetadata[]; // all parent actions up to root (renamed from ancestors for consistency)
  family_context_summary?: string; // AI-generated summary of family context
  family_vision_summary?: string; // AI-generated summary of family vision
  children: ActionMetadata[];
  dependencies: ActionMetadata[]; // actions this depends on
  dependents: ActionMetadata[]; // actions that depend on this one
  siblings: ActionMetadata[]; // same-parent actions (excluding current action)
  relationship_flags: RelationshipFlags; // indicates which lists each action appears in
  dependency_completion_context: DependencyCompletionContext[]; // completion context from dependencies
  completion_context?: DependencyCompletionContext; // action's own completion context if completed
}

// Relationship flags to help clients avoid duplicate display
export interface RelationshipFlags {
  [action_id: string]: string[]; // array of relationship types: 'ancestor', 'child', 'dependency', 'dependent', 'sibling'
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
  // Git context information
  git_context?: {
    commits?: Array<{
      hash?: string;
      shortHash?: string;
      message: string;
      author?: {
        name: string;
        email?: string;
        username?: string;
      };
      timestamp?: string;
      branch?: string;
      repository?: string;
      stats?: {
        filesChanged?: number;
        insertions?: number;
        deletions?: number;
        files?: string[];
      };
    }>;
    pullRequests?: Array<{
      number?: number;
      title: string;
      url?: string;
      repository?: string;
      author?: {
        name?: string;
        username?: string;
      };
      state?: 'open' | 'closed' | 'merged' | 'draft';
      merged?: boolean;
      mergedAt?: string;
      branch?: {
        head: string;
        base: string;
      };
    }>;
    repositories?: Array<{
      name: string;
      url?: string;
      platform?: 'github' | 'gitlab' | 'other';
    }>;
  };
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