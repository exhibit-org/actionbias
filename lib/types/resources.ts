// Resource type definitions for MCP resources

export interface Action {
  id: string;
  data: {
    title: string;
  };
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

// actionbias://actions
export interface ActionListResource {
  actions: Action[];
  total: number;
  offset?: number;
  limit?: number;
}

// actionbias://actions/tree  
export interface ActionTreeResource {
  rootActions: ActionNode[];
}

export interface ActionNode {
  id: string;
  title: string;
  created_at: string;
  children: ActionNode[];
  dependencies: string[]; // IDs of actions this depends on
}

// actionbias://actions/dependencies
export interface ActionDependenciesResource {
  dependencies: DependencyMapping[];
}

export interface DependencyMapping {
  action_id: string;
  action_title: string;
  depends_on: Array<{
    id: string;
    title: string;
  }>;
  dependents: Array<{
    id: string;
    title: string;
  }>;
}

// actionbias://action/{id}
export interface ActionDetailResource {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  children: Action[];
  dependencies: Action[]; // actions this depends on
  dependents: Action[]; // actions that depend on this one
}