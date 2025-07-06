'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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

function transformToTreemapData(actionNodes: ActionNode[], hoveredNodeId?: string, hoveredSubtreeRoot?: ActionNode, currentDepth: number = 0): TreemapNode[] {
  return actionNodes.map(node => {
    const childrenData = node.children.length > 0 ? transformToTreemapData(node.children, hoveredNodeId, hoveredSubtreeRoot, currentDepth + 1) : [];
    
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
    // For leaf nodes, set value to 1
    if (childrenData.length > 0) {
      result.children = childrenData;
      // Don't set value for parent nodes - treemap will sum children automatically
    } else {
      result.value = 1; // Only leaf nodes get explicit values
    }
    
    return result;
  });
}

function isDescendantOf(node: ActionNode, ancestor: ActionNode): boolean {
  if (node.id === ancestor.id) return true;
  return ancestor.children.some(child => isDescendantOf(node, child));
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

export default function TreemapPage() {
  const router = useRouter();
  const [treeData, setTreeData] = useState<ActionTreeResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const response = await fetch('/api/tree');
        const result = await response.json();
        
        if (result.success) {
          setTreeData(result.data);
        } else {
          setError(result.error || 'Failed to fetch tree data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchTreeData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-gray-300 font-mono">Loading action tree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-red-400 font-mono">Error loading action tree: {error}</div>
      </div>
    );
  }

  if (!treeData || treeData.rootActions.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-gray-500 font-mono">No actions found</div>
      </div>
    );
  }

  const hoveredSubtreeRoot = hoveredNodeId ? findNodeInTree(treeData.rootActions, hoveredNodeId) : null;
  
  const treemapData = {
    name: 'Actions',
    children: transformToTreemapData(treeData.rootActions, hoveredNodeId || undefined, hoveredSubtreeRoot || undefined)
  };

  const handleNodeClick = (node: any) => {
    // Navigate to the treemap page for the specific action
    router.push(`/treemap/${node.data.id}`);
  };

  return (
    <div className="w-full h-screen bg-black">
      <style jsx global>{`
        /* Override the centering transform and dimensions */
        [data-testid^="label."] {
          transform: translate(6px, 6px) !important;
          width: calc(100% - 12px) !important;
          height: auto !important;
          max-width: calc(100% - 12px) !important;
          justify-content: flex-start !important;
          align-items: flex-start !important;
          text-align: left !important;
          white-space: normal !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          font-size: 11px !important;
          line-height: 1.3 !important;
          color: #d1d5db !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
        
        /* Parent label styling */
        [data-testid^="label."][data-testid*="parent"] {
          font-size: 14px !important;
          font-weight: 600 !important;
          color: #f3f4f6 !important;
        }
      `}</style>
      <div className="w-full h-full p-4">
        <ResponsiveTreeMapHtml
          data={treemapData}
          identity="id"
          value="value"
          colors={({ data }) => (data as any).color || '#4b5563'}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
          leavesOnly={false}
          tile="squarify"
          innerPadding={2}
          outerPadding={0}
          labelSkipSize={12}
          parentLabelSize={16}
          enableParentLabel={true}
          labelTextColor="#d1d5db"
          parentLabelTextColor="#f3f4f6"
          borderWidth={0}
          animate={false}
          onClick={handleNodeClick}
          onMouseEnter={(node) => setHoveredNodeId((node as any).data.id)}
          onMouseLeave={() => setHoveredNodeId(null)}
          theme={{
            tooltip: {
              container: {
                background: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '4px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }
            }
          }}
          label={({ data, width, height }) => {
            const name = (data as any).name;
            return name; // Show all labels, let CSS handle wrapping
          }}
          parentLabel={({ data, width, height }) => {
            const name = (data as any).name;
            return name; // Show all parent labels
          }}
          tooltip={({ node }) => (
            <div className="bg-gray-900 p-3 border border-gray-700 rounded shadow-lg max-w-xs">
              <div className="font-semibold text-gray-100 break-words font-mono text-sm">{(node as any).data.name}</div>
              <div className="text-xs text-gray-400 font-mono mt-1">
                Status: Pending
              </div>
            </div>
          )}
        />
      </div>
    </div>
  );
}