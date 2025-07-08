import { ActionNode } from '../../../lib/types/resources';

export interface TreemapData {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapData[];
  depth?: number;
}

export function countDescendants(node: ActionNode): number {
  if (node.children.length === 0) {
    return 1;
  }
  return 1 + node.children.reduce((acc, child) => acc + countDescendants(child), 0);
}

export function transformToTreemapData(actionNodes: ActionNode[], currentDepth: number = 0, maxDepth?: number): TreemapData[] {
  return actionNodes.map(node => {
    const hasChildren = node.children && node.children.length > 0;
    const shouldShowChildren = hasChildren && (maxDepth === undefined || currentDepth < maxDepth);
    
    if (shouldShowChildren) {
      return {
        id: node.id,
        name: node.title,
        children: transformToTreemapData(node.children, currentDepth + 1, maxDepth),
        depth: currentDepth
      };
    } else {
      return {
        id: node.id,
        name: node.title,
        value: countDescendants(node),
        depth: currentDepth
      };
    }
  });
}

export function isDescendantOf(node: ActionNode, ancestor: ActionNode): boolean {
  if (node.id === ancestor.id) return true;
  
  for (const child of ancestor.children) {
    if (isDescendantOf(node, child)) {
      return true;
    }
  }
  return false;
}

export function findActionInTree(actionNodes: ActionNode[], targetId: string): ActionNode | null {
  for (const node of actionNodes) {
    if (node.id === targetId) return node;
    
    if (node.children && node.children.length > 0) {
      const found = findActionInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findNodeInTree(nodes: ActionNode[], targetId: string): ActionNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    
    if (node.children && node.children.length > 0) {
      const found = findNodeInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

export function findParentOfNode(nodes: ActionNode[], targetId: string): ActionNode | null {
  for (const node of nodes) {
    // Check if any direct child matches
    if (node.children && node.children.some(child => child.id === targetId)) {
      return node;
    }
    
    // Recursively check descendants
    if (node.children && node.children.length > 0) {
      const found = findParentOfNode(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}