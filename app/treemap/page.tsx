'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import { ActionTreeResource, ActionNode } from '../../lib/types/resources';

interface TreemapNode {
  id: string;
  name: string;
  value?: number; // Optional - parent nodes don't need explicit values
  color?: string;
  children?: TreemapNode[];
  depth?: number; // Track hierarchical depth
}

function countDescendants(node: ActionNode): number {
  if (node.children.length === 0) {
    return 1; // Leaf node counts as 1
  }
  return node.children.reduce((sum, child) => sum + countDescendants(child), 0);
}

function transformToTreemapData(actionNodes: ActionNode[], hoveredNodeId?: string, hoveredSubtreeRoot?: ActionNode, currentDepth: number = 0, maxDepth?: number): TreemapNode[] {
  return actionNodes.map(node => {
    const shouldShowChildren = maxDepth === undefined || currentDepth < maxDepth;
    const childrenData = node.children.length > 0 && shouldShowChildren ? transformToTreemapData(node.children, hoveredNodeId, hoveredSubtreeRoot, currentDepth + 1, maxDepth) : [];
    
    // Determine if this node should be highlighted
    let isHighlighted = false;
    if (hoveredNodeId && hoveredSubtreeRoot) {
      // Only highlight if this node is the hovered node or a descendant of it
      isHighlighted = node.id === hoveredNodeId || isDescendantOf(node, hoveredSubtreeRoot);
    }
    
    const result: TreemapNode = {
      id: node.id,
      name: node.title,
      color: getNodeColor(node, childrenData.length > 0, isHighlighted),
      depth: currentDepth, // Add depth information
    };
    
    // For parent nodes (with children), don't set a value - let treemap calculate from children
    // For leaf nodes or nodes at max depth, set value based on descendant count
    if (childrenData.length > 0) {
      result.children = childrenData;
      // Don't set value for parent nodes - treemap will sum children automatically
    } else {
      // This is either a true leaf node or a node at max depth
      // Weight by total descendant count
      result.value = countDescendants(node);
    }
    
    return result;
  });
}

function isDescendantOf(node: ActionNode, ancestor: ActionNode): boolean {
  if (node.id === ancestor.id) return true;
  return ancestor.children.some(child => isDescendantOf(node, child));
}

function findActionInTree(actionNodes: ActionNode[], targetId: string): ActionNode | null {
  for (const node of actionNodes) {
    if (node.id === targetId) {
      return node;
    }
    if (node.children.length > 0) {
      const found = findActionInTree(node.children, targetId);
      if (found) return found;
    }
  }
  return null;
}

function findNodeInTree(nodes: ActionNode[], targetId: string): ActionNode | null {
  for (const node of nodes) {
    if (node.id === targetId) return node;
    const found = findNodeInTree(node.children, targetId);
    if (found) return found;
  }
  return null;
}

function getNodeDepth(nodeId: string, treeData: ActionTreeResource): number {
  function findDepth(nodes: ActionNode[], targetId: string, currentDepth: number): number {
    for (const node of nodes) {
      if (node.id === targetId) {
        return currentDepth;
      }
      if (node.children.length > 0) {
        const found = findDepth(node.children, targetId, currentDepth + 1);
        if (found !== -1) return found;
      }
    }
    return -1;
  }
  
  return findDepth(treeData.rootActions, nodeId, 0);
}

function getNodeColor(node: ActionNode, isParent: boolean, isHighlighted: boolean): string {
  if (isHighlighted) {
    return '#22c55e'; // green-500 for highlighted nodes
  }
  return isParent ? '#374151' : '#4b5563'; // gray-700 for parents, gray-600 for leaves
}

function calculateFontSize(width: number, height: number, isParent: boolean, depth: number): number {
  // Font sizes based on hierarchy level
  // depth 0 = root "Actions" (biggest)
  // depth 1 = top-level actions 
  // depth 2 = their children, etc.
  
  const fontSizesByDepth = [
    24, // depth 0: root "Actions" 
    20, // depth 1: top-level actions
    16, // depth 2: first level children
    13, // depth 3: second level children
    11, // depth 4: third level children
    9   // depth 5+: deep children
  ];
  
  // Get base font size from depth
  const baseFontSize = fontSizesByDepth[Math.min(depth, fontSizesByDepth.length - 1)];
  
  // Parent labels get a slight boost over children at the same level
  const parentBoost = isParent ? 2 : 0;
  
  // Slight adjustment based on available space (but hierarchy is primary)
  const limitingDimension = Math.min(width, height);
  let spaceAdjustment = 0;
  
  // Only reduce font if space is very constrained
  if (limitingDimension < 30) {
    spaceAdjustment = -3;
  } else if (limitingDimension < 50) {
    spaceAdjustment = -1;
  }
  
  const finalSize = baseFontSize + parentBoost + spaceAdjustment;
  
  // Ensure minimum readability
  return Math.max(8, finalSize);
}

// Store font size calculations globally so we can apply them after render
let fontSizeMap = new Map<string, { fontSize: number, text: string, isParent: boolean }>();

function storeFontSize(nodeId: string, fontSize: number, text: string, isParent: boolean): string {
  fontSizeMap.set(nodeId, { fontSize, text, isParent });
  return nodeId;
}

function TreemapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Redirect to root treemap view
  useEffect(() => {
    const params = new URLSearchParams();
    const depth = searchParams.get('depth');
    if (depth) params.set('depth', depth);
    router.replace(`/treemap/root?${params.toString()}`);
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center h-screen bg-black">
      <div className="text-lg text-gray-300 font-mono">Redirecting to treemap...</div>
    </div>
  );
}

export default function TreemapPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-gray-300 font-mono">Loading...</div>
      </div>
    }>
      <TreemapPageContent />
    </Suspense>
  );
}