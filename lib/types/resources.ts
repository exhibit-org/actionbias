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

// actions://list
export interface ActionListResource {
  actions: Action[];
  total: number;
  offset?: number;
  limit?: number;
  filtered_by_done?: boolean;
}

// actions://tree  
export interface ActionTreeResource {
  rootActions: ActionNode[];
}

export interface ActionNode {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  children: ActionNode[];
  dependencies: string[]; // IDs of actions this depends on
}

// actions://dependencies
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

// actions://{id}
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
  children: ActionMetadata[];
  dependencies: ActionMetadata[]; // actions this depends on
  dependents: ActionMetadata[]; // actions that depend on this one
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