'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import { ActionTreeResource, ActionNode } from '../../../lib/types/resources';

interface TreemapNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
  depth?: number;
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
      depth: currentDepth,
    };
    
    if (childrenData.length > 0) {
      result.children = childrenData;
    } else {
      result.value = 1;
    }
    
    return result;
  });
}

function isDescendantOf(node: ActionNode, ancestor: ActionNode): boolean {
  if (node.id === ancestor.id) return true;
  return ancestor.children.some(child => isDescendantOf(node, child));
}

function getNodeColor(node: ActionNode, isParent: boolean, isHighlighted: boolean): string {
  if (isHighlighted) {
    return '#22c55e'; // green-500 for highlighted nodes
  }
  return isParent ? '#374151' : '#4b5563'; // gray-700 for parents, gray-600 for leaves
}

function calculateFontSize(width: number, height: number, isParent: boolean, depth: number): number {
  // Base font sizes
  const minFontSize = 7;
  const maxFontSize = isParent ? 20 : 14;
  
  // Calculate size based on rectangle area
  const area = width * height;
  const baseSize = Math.sqrt(area) / (isParent ? 15 : 20);
  
  // Adjust for hierarchy depth (deeper = smaller)
  const depthMultiplier = Math.max(0.7, 1 - (depth * 0.15));
  
  // Parent labels get a boost
  const parentMultiplier = isParent ? 1.4 : 1;
  
  const calculatedSize = baseSize * depthMultiplier * parentMultiplier;
  
  return Math.round(Math.max(minFontSize, Math.min(maxFontSize, calculatedSize)));
}

function createLabelWithStyle(text: string, fontSize: number, isParent: boolean): string {
  const color = isParent ? '#f3f4f6' : '#d1d5db';
  const fontWeight = isParent ? '600' : '400';
  
  return `<span style="font-size: ${fontSize}px; color: ${color}; font-weight: ${fontWeight}; font-family: ui-monospace, SFMono-Regular, monospace; line-height: 1.3;">${text}</span>`;
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

export default function TreemapIdPage() {
  const router = useRouter();
  const params = useParams();
  const actionId = params.id as string;
  
  const [treeData, setTreeData] = useState<ActionTreeResource | null>(null);
  const [targetAction, setTargetAction] = useState<ActionNode | null>(null);
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
          
          // Find the target action in the tree
          const foundAction = findActionInTree(result.data.rootActions, actionId);
          if (foundAction) {
            setTargetAction(foundAction);
          } else {
            setError(`Action with ID ${actionId} not found`);
          }
        } else {
          setError(result.error || 'Failed to fetch tree data');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (actionId) {
      fetchTreeData();
    }
  }, [actionId]);

  const handleNodeClick = (node: any) => {
    router.push(`/treemap/${node.data.id}`);
  };

  const handleBackClick = () => {
    router.push('/treemap');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-gray-300 font-mono">Loading action subtree...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="text-red-400 font-mono mb-4">Error: {error}</div>
        <button
          onClick={handleBackClick}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono"
        >
          Back to Full Tree
        </button>
      </div>
    );
  }

  if (!targetAction) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="text-gray-500 font-mono mb-4">Action not found</div>
        <button
          onClick={handleBackClick}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono"
        >
          Back to Full Tree
        </button>
      </div>
    );
  }

  // Find the hovered subtree root within the target action's children
  const hoveredSubtreeRoot = hoveredNodeId ? findActionInTree(targetAction.children, hoveredNodeId) : null;
  
  // If the target action has no children, show it as a single node
  const treemapData = targetAction.children.length > 0 ? {
    name: targetAction.title,
    children: transformToTreemapData(targetAction.children, hoveredNodeId || undefined, hoveredSubtreeRoot || undefined)
  } : {
    name: targetAction.title,
    value: 1,
    color: '#4b5563'
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
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
        }
      `}</style>
      <div className="w-full h-full flex flex-col">
        {/* Header with breadcrumb */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleBackClick}
              className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono text-sm"
            >
              ← Back to Full Tree
            </button>
            <div className="text-gray-400 font-mono text-sm">
              / {targetAction.title}
            </div>
          </div>
        </div>

        {/* Treemap */}
        <div className="flex-1 p-4">
          {targetAction.children.length > 0 ? (
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
                const depth = (data as any).depth || 0;
                const fontSize = calculateFontSize(width, height, false, depth);
                return createLabelWithStyle(name, fontSize, false);
              }}
              parentLabel={({ data, width, height }) => {
                const name = (data as any).name;
                const depth = (data as any).depth || 0;
                const fontSize = calculateFontSize(width, height, true, depth);
                return createLabelWithStyle(name, fontSize, true);
              }}
              tooltip={({ node }) => (
                <div className="bg-gray-900 p-3 border border-gray-700 rounded shadow-lg max-w-xs">
                  <div className="font-semibold text-gray-100 break-words font-mono text-sm">
                    {(node as any).data.name}
                  </div>
                  <div className="text-xs text-gray-400 font-mono mt-1">
                    Status: Pending
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl text-gray-300 font-mono mb-2">
                  {targetAction.title}
                </div>
                <div className="text-gray-500 font-mono text-sm">
                  This action has no children
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}