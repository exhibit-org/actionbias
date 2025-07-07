'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import { ActionTreeResource, ActionNode } from '../../../lib/types/resources';

interface TreemapData {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapData[];
  depth?: number;
}

function countDescendants(node: ActionNode): number {
  if (node.children.length === 0) {
    return 1; // Leaf node counts as 1
  }
  return node.children.reduce((sum, child) => sum + countDescendants(child), 0);
}

function transformToTreemapData(actionNodes: ActionNode[], hoveredNodeId?: string, hoveredSubtreeRoot?: ActionNode, currentDepth: number = 0, maxDepth?: number): TreemapData[] {
  return actionNodes.map(node => {
    const shouldShowChildren = maxDepth === undefined || currentDepth < maxDepth;
    const childrenData = node.children.length > 0 && shouldShowChildren ? transformToTreemapData(node.children, hoveredNodeId, hoveredSubtreeRoot, currentDepth + 1, maxDepth) : [];
    
    // Determine if this node should be highlighted
    let isHighlighted = false;
    let isSibling = false;
    if (hoveredNodeId && hoveredSubtreeRoot) {
      // Only highlight if this node is the hovered node or a descendant of it
      isHighlighted = node.id === hoveredNodeId || isDescendantOf(node, hoveredSubtreeRoot);
      
      // Check if this node is a sibling of the hovered node
      if (!isHighlighted && hoveredNodeId !== node.id) {
        isSibling = actionNodes.some(sibling => sibling.id === hoveredNodeId) && actionNodes.some(sibling => sibling.id === node.id);
      }
    }
    
    const result: TreemapData = {
      id: node.id,
      name: node.title,
      color: getNodeColor(node, childrenData.length > 0, isHighlighted, isSibling),
      depth: currentDepth,
    };
    
    if (childrenData.length > 0) {
      result.children = childrenData;
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

function getNodeColor(node: ActionNode, isParent: boolean, isHighlighted: boolean, isSibling: boolean = false): string {
  if (isHighlighted) {
    return '#22c55e'; // green-500 for highlighted nodes
  }
  if (isSibling) {
    return '#000000'; // black for sibling nodes
  }
  return isParent ? '#374151' : '#4b5563'; // gray-700 for parents, gray-600 for leaves
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

function TreemapIdPageContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const actionId = params.id as string;
  
  const [treeData, setTreeData] = useState<ActionTreeResource | null>(null);
  const [targetAction, setTargetAction] = useState<ActionNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  
  const maxDepth = searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : undefined;
  const isRootView = actionId === 'root';

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        const response = await fetch('/api/tree');
        const result = await response.json();
        
        if (result.success) {
          setTreeData(result.data);
          
          if (!isRootView) {
            // Find the target action in the tree
            const foundAction = findActionInTree(result.data.rootActions, actionId);
            if (foundAction) {
              setTargetAction(foundAction);
            } else {
              setError(`Action with ID ${actionId} not found`);
            }
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
  }, [actionId, isRootView]);

  const handleNodeClick = (node: any) => {
    const params = new URLSearchParams();
    if (maxDepth) params.set('depth', maxDepth.toString());
    router.push(`/treemap/${node.data.id}?${params.toString()}`);
  };

  const handleBackClick = () => {
    const params = new URLSearchParams();
    if (maxDepth) params.set('depth', maxDepth.toString());
    router.push(`/treemap/root?${params.toString()}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-gray-300 font-mono">
          Loading {isRootView ? 'action tree' : 'action subtree'}...
        </div>
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

  if (!treeData || treeData.rootActions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black">
        <div className="text-gray-500 font-mono mb-4">No actions found</div>
        <button
          onClick={handleBackClick}
          className="px-4 py-2 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono"
        >
          Back to Full Tree
        </button>
      </div>
    );
  }

  // Determine what to display
  const displayAction = isRootView ? null : targetAction;
  const displayNodes = displayAction ? displayAction.children : treeData.rootActions;
  const displayTitle = displayAction ? displayAction.title : 'Actions';
  
  // Find the hovered subtree root within the display nodes
  const hoveredSubtreeRoot = hoveredNodeId ? findNodeInTree(displayNodes, hoveredNodeId) : null;
  
  // Create treemap data
  const treemapData = displayNodes.length > 0 ? {
    name: displayTitle,
    children: transformToTreemapData(displayNodes, hoveredNodeId || undefined, hoveredSubtreeRoot || undefined, 0, maxDepth)
  } : {
    name: displayTitle,
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
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          line-height: 1.3 !important;
          color: #d1d5db !important;
        }
        
        /* Parent label styling - bolder and different color */
        [data-testid^="label."][data-testid*="parent"] {
          font-weight: 600 !important;
          color: #f3f4f6 !important;
        }
      `}</style>
      <div className="w-full h-full flex flex-col">
        {/* Header with breadcrumb - only show if we have a focused action */}
        {displayAction && (
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleBackClick}
                className="px-3 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono text-sm"
              >
                ← Back to Full Tree
              </button>
              <div className="text-gray-400 font-mono text-sm">
                / {displayAction.title}
              </div>
            </div>
          </div>
        )}

        {/* Treemap */}
        <div className="flex-1 p-4">
          {displayNodes.length > 0 ? (
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
              label={({ data }) => (data as any).name}
              parentLabel={({ data }) => (data as any).name}
              tooltip={() => null}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="text-2xl text-gray-300 font-mono mb-2">
                  {displayTitle}
                </div>
                <div className="text-gray-500 font-mono text-sm">
                  {displayAction ? "This action has no children" : "No actions found"}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TreemapIdPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-black">
        <div className="text-lg text-gray-300 font-mono">Loading...</div>
      </div>
    }>
      <TreemapIdPageContent />
    </Suspense>
  );
}