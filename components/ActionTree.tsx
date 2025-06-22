'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { TreeNode, TreeNodeData } from './TreeNode';

interface ActionTreeProps {
  currentActionId?: string;
  onNodeClick?: (nodeId: string) => void;
  includeCompleted?: boolean;
  className?: string;
}

interface TreeApiResponse {
  success: boolean;
  data: {
    rootActions: TreeNodeData[];
  };
  meta?: {
    includeCompleted: boolean;
    timestamp: string;
  };
  error?: string;
}

export const ActionTree: React.FC<ActionTreeProps> = ({
  currentActionId,
  onNodeClick,
  includeCompleted = false,
  className = '',
}) => {
  const [treeData, setTreeData] = useState<TreeNodeData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Load tree data from API
  const loadTreeData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (includeCompleted) {
        params.set('includeCompleted', 'true');
      }
      
      const response = await fetch(`/api/tree?${params}`);
      const data: TreeApiResponse = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to load tree data');
      }
      
      setTreeData(data.data.rootActions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error loading tree data:', err);
    } finally {
      setLoading(false);
    }
  }, [includeCompleted]);

  // Load data on mount and when includeCompleted changes
  useEffect(() => {
    loadTreeData();
  }, [loadTreeData]);

  // Auto-expand path to current action
  useEffect(() => {
    if (currentActionId && treeData.length > 0) {
      const pathToAction = findPathToNode(treeData, currentActionId);
      if (pathToAction.length > 0) {
        setExpandedNodes(prev => {
          const newExpanded = new Set(prev);
          // Expand all nodes in the path except the leaf
          pathToAction.slice(0, -1).forEach(nodeId => {
            newExpanded.add(nodeId);
          });
          return newExpanded;
        });
      }
    }
  }, [currentActionId, treeData]);

  // Handle node expansion/collapse
  const handleToggleExpanded = useCallback((nodeId: string) => {
    setExpandedNodes(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(nodeId)) {
        newExpanded.delete(nodeId);
      } else {
        newExpanded.add(nodeId);
      }
      return newExpanded;
    });
  }, []);

  // Handle node click - navigate to action
  const handleNodeClick = useCallback((nodeId: string) => {
    if (onNodeClick) {
      onNodeClick(nodeId);
    } else {
      // Default behavior: navigate to action page
      window.location.href = `/${nodeId}`;
    }
  }, [onNodeClick]);

  // Store expanded state in sessionStorage
  useEffect(() => {
    const expandedArray = Array.from(expandedNodes);
    sessionStorage.setItem('actionTree.expandedNodes', JSON.stringify(expandedArray));
  }, [expandedNodes]);

  // Restore expanded state from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('actionTree.expandedNodes');
      if (stored) {
        const expandedArray = JSON.parse(stored);
        setExpandedNodes(new Set(expandedArray));
      }
    } catch (err) {
      console.warn('Failed to restore expanded state:', err);
    }
  }, []);

  if (loading) {
    return (
      <div className={`action-tree loading ${className}`}>
        <div className="loading-message">Loading action tree...</div>
        <style jsx>{`
          .action-tree.loading {
            padding: 16px;
            text-align: center;
            color: #666;
            font-size: 13px;
          }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`action-tree error ${className}`}>
        <div className="error-message">
          Failed to load tree: {error}
        </div>
        <button className="retry-button" onClick={loadTreeData}>
          Retry
        </button>
        <style jsx>{`
          .action-tree.error {
            padding: 16px;
            text-align: center;
          }
          
          .error-message {
            color: #d73a49;
            font-size: 13px;
            margin-bottom: 8px;
          }
          
          .retry-button {
            background: #007acc;
            color: white;
            border: none;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 12px;
            cursor: pointer;
          }
          
          .retry-button:hover {
            background: #005a9e;
          }
        `}</style>
      </div>
    );
  }

  if (treeData.length === 0) {
    return (
      <div className={`action-tree empty ${className}`}>
        <div className="empty-message">No actions found</div>
        <style jsx>{`
          .action-tree.empty {
            padding: 16px;
            text-align: center;
            color: #666;
            font-size: 13px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`action-tree ${className}`}>
      {treeData.map(rootNode => (
        <TreeNode
          key={rootNode.id}
          node={rootNode}
          currentActionId={currentActionId}
          onNodeClick={handleNodeClick}
          expandedNodes={expandedNodes}
          onToggleExpanded={handleToggleExpanded}
        />
      ))}
      
      <style jsx>{`
        .action-tree {
          overflow-y: auto;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
};

// Helper function to find path to a specific node
function findPathToNode(nodes: TreeNodeData[], targetId: string, currentPath: string[] = []): string[] {
  for (const node of nodes) {
    const nodePath = [...currentPath, node.id];
    
    if (node.id === targetId) {
      return nodePath;
    }
    
    if (node.children && node.children.length > 0) {
      const childPath = findPathToNode(node.children, targetId, nodePath);
      if (childPath.length > 0) {
        return childPath;
      }
    }
  }
  
  return [];
}