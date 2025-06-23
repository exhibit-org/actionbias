'use client';

import React, { useState, useCallback } from 'react';

export interface TreeNodeData {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  children: TreeNodeData[];
  dependencies: string[];
}

interface TreeNodeProps {
  node: TreeNodeData;
  depth?: number;
  currentActionId?: string;
  onNodeClick?: (nodeId: string) => void;
  expandedNodes?: Set<string>;
  onToggleExpanded?: (nodeId: string) => void;
  className?: string;
}

export const TreeNode: React.FC<TreeNodeProps> = ({
  node,
  depth = 0,
  currentActionId,
  onNodeClick,
  expandedNodes = new Set(),
  onToggleExpanded,
  className = '',
}) => {
  const isExpanded = expandedNodes.has(node.id);
  const hasChildren = node.children && node.children.length > 0;
  const isCurrentAction = currentActionId === node.id;
  
  const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren && onToggleExpanded) {
      onToggleExpanded(node.id);
    }
  }, [hasChildren, node.id, onToggleExpanded]);
  
  const handleNodeClick = useCallback(() => {
    if (onNodeClick) {
      onNodeClick(node.id);
    }
  }, [node.id, onNodeClick]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleNodeClick();
        break;
      case 'ArrowRight':
        if (hasChildren && !isExpanded && onToggleExpanded) {
          e.preventDefault();
          onToggleExpanded(node.id);
        }
        break;
      case 'ArrowLeft':
        if (hasChildren && isExpanded && onToggleExpanded) {
          e.preventDefault();
          onToggleExpanded(node.id);
        }
        break;
    }
  }, [handleNodeClick, hasChildren, isExpanded, node.id, onToggleExpanded]);
  
  // Style variables for theming
  const indentSize = 16; // pixels per depth level
  const indent = depth * indentSize;
  
  return (
    <div className={`tree-node ${className}`}>
      {/* Current node */}
      <div
        className={`tree-node-item ${isCurrentAction ? 'current' : ''} ${node.done ? 'completed' : 'pending'}`}
        style={{ paddingLeft: `${indent}px` }}
        onClick={handleNodeClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="treeitem"
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-level={depth + 1}
        aria-selected={isCurrentAction}
      >
        {/* Disclosure triangle */}
        <button
          className={`disclosure-triangle ${hasChildren ? 'has-children' : 'no-children'} ${isExpanded ? 'expanded' : 'collapsed'}`}
          onClick={handleToggleExpanded}
          disabled={!hasChildren}
          aria-label={hasChildren ? (isExpanded ? 'Collapse' : 'Expand') : 'No children'}
        >
          {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
        </button>
        
        {/* Completion status indicator */}
        <span className={`status-indicator ${node.done ? 'done' : 'pending'}`}>
          {node.done ? '✓' : ''}
        </span>
        
        {/* Action title */}
        <span className="node-title" title={node.title}>
          {node.title}
        </span>
      </div>
      
      {/* Children (with animation) */}
      {hasChildren && (
        <div
          className={`tree-children ${isExpanded ? 'expanded' : 'collapsed'}`}
          style={{
            maxHeight: isExpanded ? 'none' : '0',
            overflow: 'hidden',
            transition: 'max-height 0.2s ease-in-out',
          }}
        >
          {isExpanded && node.children.map(child => (
            <TreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              currentActionId={currentActionId}
              onNodeClick={onNodeClick}
              expandedNodes={expandedNodes}
              onToggleExpanded={onToggleExpanded}
              className={className}
            />
          ))}
        </div>
      )}
      
      <style jsx>{`
        .tree-node {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          line-height: 1.4;
        }
        
        .tree-node-item {
          display: flex;
          align-items: flex-start;
          padding: 4px 8px 4px 0;
          cursor: pointer;
          border-radius: 3px;
          transition: background-color 0.15s ease;
          min-height: 24px;
          color: #111827;
        }
        
        .tree-node-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .tree-node-item.current {
          background-color: #007acc;
          color: white;
        }
        
        .tree-node-item.current:hover {
          background-color: #005a9e;
        }
        
        .disclosure-triangle {
          background: none;
          border: none;
          padding: 0;
          margin-right: 4px;
          width: 12px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 8px;
          color: #666;
          transition: transform 0.15s ease;
          flex-shrink: 0;
          margin-top: 1px;
        }
        
        .disclosure-triangle:hover:not(:disabled) {
          color: #333;
        }
        
        .disclosure-triangle.no-children {
          cursor: default;
          opacity: 0;
          pointer-events: none;
        }
        
        .disclosure-triangle.expanded {
          transform: rotate(0deg);
        }
        
        .disclosure-triangle.collapsed {
          transform: rotate(0deg);
        }
        
        .status-indicator {
          margin-right: 6px;
          font-size: 10px;
          flex-shrink: 0;
          width: 12px;
          text-align: center;
          margin-top: 1px;
        }
        
        .status-indicator.done {
          color: #28a745;
        }
        
        .status-indicator.pending {
          color: transparent;
        }
        
        .tree-node-item.current .status-indicator {
          color: white;
        }
        
        .node-title {
          flex: 1;
          white-space: normal;
          word-wrap: break-word;
          hyphens: auto;
          font-weight: 400;
          line-height: 1.3;
        }
        
        .tree-node-item.completed .node-title {
          opacity: 0.7;
        }
        
        .tree-children.collapsed {
          max-height: 0 !important;
          opacity: 0;
          transition: max-height 0.2s ease-in-out, opacity 0.15s ease-in-out;
        }
        
        .tree-children.expanded {
          max-height: none;
          opacity: 1;
          transition: max-height 0.2s ease-in-out, opacity 0.15s ease-in-out;
        }
        
        /* Accessibility */
        .disclosure-triangle:focus {
          outline: none;
        }
        
        .disclosure-triangle:focus-visible {
          outline: 2px solid #007acc;
          outline-offset: 1px;
        }
        
        .tree-node-item:focus {
          outline: 2px solid #007acc;
          outline-offset: 1px;
        }
      `}</style>
    </div>
  );
};