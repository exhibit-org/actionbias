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
  isStripe?: boolean;
  stripeAngle?: number;
}

function countDescendants(node: ActionNode): number {
  if (node.children.length === 0) {
    return 1; // Leaf node counts as 1
  }
  return node.children.reduce((sum, child) => sum + countDescendants(child), 0);
}

function transformToTreemapData(actionNodes: ActionNode[], hoveredNodeId?: string, hoveredSubtreeRoot?: ActionNode, currentDepth: number = 0, maxDepth?: number): TreemapData[] {
  return actionNodes.map((node, index) => {
    const shouldShowChildren = maxDepth === undefined || currentDepth < maxDepth;
    const childrenData = node.children.length > 0 && shouldShowChildren ? transformToTreemapData(node.children, hoveredNodeId, hoveredSubtreeRoot, currentDepth + 1, maxDepth) : [];
    
    // Determine if this node should be highlighted
    let isHighlighted = false;
    let siblingIndex = -1;
    if (hoveredNodeId && hoveredSubtreeRoot) {
      // Only highlight if this node is the hovered node or a descendant of it
      isHighlighted = node.id === hoveredNodeId || isDescendantOf(node, hoveredSubtreeRoot);
      
      // Check if this node is a sibling of the hovered node
      if (!isHighlighted && hoveredNodeId !== node.id) {
        const isSibling = actionNodes.some(sibling => sibling.id === hoveredNodeId) && actionNodes.some(sibling => sibling.id === node.id);
        if (isSibling) {
          siblingIndex = index;
        }
      }
    }
    
    const result: TreemapData = {
      id: node.id,
      name: node.title,
      color: getNodeColor(node, childrenData.length > 0, isHighlighted, siblingIndex),
      depth: currentDepth,
      isStripe: siblingIndex >= 0,
      stripeAngle: siblingIndex >= 0 ? getSiblingStripeAngle(node) : undefined,
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

function getNodeColor(node: ActionNode, isParent: boolean, isHighlighted: boolean, siblingIndex: number = -1): string {
  if (isHighlighted) {
    return '#22c55e'; // light green for focused action
  }
  // For siblings, we'll use CSS stripes instead of different colors
  // Return the default color for all non-highlighted nodes
  return isParent ? '#374151' : '#4b5563'; // gray-700 for parents, gray-600 for leaves
}

function getSiblingStripeAngle(node: ActionNode): number {
  // Generate a consistent random angle between 15-165 degrees for diagonal stripes
  const hash = node.id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  // Map hash to angle between 15 and 165 degrees (avoiding too horizontal/vertical)
  return 15 + (Math.abs(hash) % 150);
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
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isInspectorMinimized, setIsInspectorMinimized] = useState(false);
  const [windowDimensions, setWindowDimensions] = useState({ width: 0, height: 0 });
  const [lastClickTime, setLastClickTime] = useState<number>(0);
  const [lastClickedNodeId, setLastClickedNodeId] = useState<string | null>(null);
  
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

  // Window resize handler for responsive inspector
  useEffect(() => {
    const handleResize = () => {
      setWindowDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial dimensions
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleNodeClick = (node: any) => {
    const nodeId = node.data.id;
    const currentTime = Date.now();
    const doubleClickDelay = 500; // ms
    
    // Check if this is a second click on the same node within the delay
    const isSecondClick = lastClickedNodeId === nodeId && 
                         (currentTime - lastClickTime) < doubleClickDelay;
    
    if (isSecondClick) {
      // Second click: navigate to focus on this node
      const params = new URLSearchParams();
      if (maxDepth) params.set('depth', maxDepth.toString());
      router.push(`/treemap/${nodeId}?${params.toString()}`);
    } else {
      // First click: select node and freeze highlighting
      setSelectedNodeId(nodeId);
      setLastClickedNodeId(nodeId);
      setLastClickTime(currentTime);
    }
  };

  const handleBackClick = () => {
    const params = new URLSearchParams();
    if (maxDepth) params.set('depth', maxDepth.toString());
    router.push(`/treemap/root?${params.toString()}`);
  };

  // Determine inspector layout based on mobile form factors
  const isMobile = windowDimensions.width < 768; // Mobile breakpoint (Tailwind's md breakpoint)
  const inspectorSize = isInspectorMinimized ? (!isMobile ? 'w-12' : 'h-12') : (!isMobile ? 'w-80' : 'h-64');
  
  // Find selected node data
  const selectedNode = selectedNodeId ? findNodeInTree(treeData?.rootActions || [], selectedNodeId) : null;
  const hoveredNode = hoveredNodeId ? findNodeInTree(treeData?.rootActions || [], hoveredNodeId) : null;
  const inspectorNode = selectedNode || hoveredNode;
  
  // Use selected node for highlighting if available, otherwise use hovered node
  const highlightNodeId = selectedNodeId || hoveredNodeId;

  // Inspector component
  const Inspector = () => (
    <div className={`bg-gray-900 border-gray-700 ${!isMobile ? 'border-l' : 'border-t'} ${inspectorSize} transition-all duration-300 flex flex-col`}>
      {/* Inspector header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700">
        {!isInspectorMinimized && (
          <div className="flex items-center space-x-2">
            <h3 className="text-sm font-mono text-gray-200">Inspector</h3>
            {selectedNodeId && (
              <button
                onClick={() => {
                  setSelectedNodeId(null);
                  setLastClickedNodeId(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-2 py-1 rounded bg-gray-800 hover:bg-gray-700"
                title="Clear selection"
              >
                Clear
              </button>
            )}
          </div>
        )}
        <button
          onClick={() => setIsInspectorMinimized(!isInspectorMinimized)}
          className="text-gray-400 hover:text-gray-200 transition-colors p-1"
          title={isInspectorMinimized ? 'Expand inspector' : 'Minimize inspector'}
        >
          {isInspectorMinimized ? (
            !isMobile ? '◀' : '▲'
          ) : (
            !isMobile ? '▶' : '▼'
          )}
        </button>
      </div>
      
      {/* Inspector content */}
      {!isInspectorMinimized && (
        <div className="flex-1 p-3 overflow-y-auto">
          {inspectorNode ? (
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 font-mono mb-1">Title</div>
                <div className="text-sm text-gray-200 font-mono">{inspectorNode.title}</div>
              </div>
              
              {(inspectorNode as any).description && (
                <div>
                  <div className="text-xs text-gray-400 font-mono mb-1">Description</div>
                  <div className="text-xs text-gray-300 font-mono">{(inspectorNode as any).description}</div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-gray-400 font-mono mb-1">ID</div>
                <div className="text-xs text-gray-500 font-mono break-all">{inspectorNode.id}</div>
              </div>
              
              {inspectorNode.children.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 font-mono mb-1">Children</div>
                  <div className="text-xs text-gray-300 font-mono">{inspectorNode.children.length} child{inspectorNode.children.length !== 1 ? 'ren' : ''}</div>
                </div>
              )}
              
              <div>
                <div className="text-xs text-gray-400 font-mono mb-1">Status</div>
                <div className="text-xs text-gray-300 font-mono">
                  {selectedNodeId === inspectorNode.id ? 'Selected (click again to focus)' : 'Hovered'}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-gray-500 font-mono space-y-2">
              <div>Click a node to select and inspect</div>
              <div>Click again to focus on that node</div>
            </div>
          )}
        </div>
      )}
    </div>
  );

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
  
  // Find the highlight subtree root within the display nodes
  const highlightSubtreeRoot = highlightNodeId ? findNodeInTree(displayNodes, highlightNodeId) : null;
  
  // Create treemap data
  const treemapData = displayNodes.length > 0 ? {
    name: displayTitle,
    children: transformToTreemapData(displayNodes, highlightNodeId || undefined, highlightSubtreeRoot || undefined, 0, maxDepth)
  } : {
    name: displayTitle,
    value: 1,
    color: '#4b5563'
  };

  // Generate CSS for stripe patterns
  const generateStripeCSS = (data: any): string => {
    let css = '';
    const processNode = (node: any) => {
      if (node.isStripe && node.stripeAngle) {
        css += `
          [data-testid="rect.${node.id}"] {
            background-image: repeating-linear-gradient(
              ${node.stripeAngle}deg,
              transparent,
              transparent 3px,
              rgba(255, 255, 255, 0.15) 3px,
              rgba(255, 255, 255, 0.15) 6px
            ) !important;
          }
        `;
      }
      if (node.children) {
        node.children.forEach(processNode);
      }
    };
    if (data.children) {
      data.children.forEach(processNode);
    }
    return css;
  };

  const stripeCSS = generateStripeCSS(treemapData);

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
          pointer-events: none !important;
        }
        
        /* Parent label styling - bolder and different color */
        [data-testid^="label."][data-testid*="parent"] {
          font-weight: 600 !important;
          color: #f3f4f6 !important;
          pointer-events: auto !important;
          cursor: pointer !important;
          padding: 4px 6px !important;
          margin: 2px !important;
          background-color: rgba(55, 65, 81, 0.8) !important;
          border-radius: 4px !important;
          width: auto !important;
          max-width: 50% !important;
        }
        
        /* Dynamic stripe patterns for sibling highlighting */
        ${stripeCSS}
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

        {/* Main content area with treemap and inspector */}
        <div className={`flex-1 flex ${!isMobile ? 'flex-row' : 'flex-col'}`}>
          {/* Treemap */}
          <div 
            className="flex-1 p-4"
            onClick={(e) => {
              // Clear selection if clicking on empty area
              if (e.target === e.currentTarget) {
                setSelectedNodeId(null);
                setLastClickedNodeId(null);
              }
            }}
            onMouseLeave={() => {
              // Only clear hover highlighting if no node is selected
              if (!selectedNodeId) {
                setHoveredNodeId(null);
              }
            }}
          >
          {displayNodes.length > 0 ? (
            <ResponsiveTreeMapHtml
              data={treemapData}
              identity="id"
              value="value"
              colors={({ data }) => (data as any).color || '#4b5563'}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              leavesOnly={false}
              tile="squarify"
              innerPadding={0}
              outerPadding={0}
              labelSkipSize={12}
              parentLabelSize={16}
              enableParentLabel={true}
              labelTextColor="#d1d5db"
              parentLabelTextColor="#f3f4f6"
              borderWidth={1}
              borderColor="rgba(0, 0, 0, 0)"
              animate={false}
              onClick={handleNodeClick}
              onMouseEnter={(node) => {
                // Only show hover highlighting if no node is selected
                if (!selectedNodeId) {
                  setHoveredNodeId((node as any).data.id);
                }
              }}
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
          
          {/* Inspector */}
          <Inspector />
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