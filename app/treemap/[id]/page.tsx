'use client';

import { useState, useEffect, Suspense, useMemo, memo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import { ActionTreeResource, ActionNode, ActionDetailResource } from '../../../lib/types/resources';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';
import TreemapInspector from './inspector';
import { 
  TreemapData, 
  countDescendants, 
  transformToTreemapData, 
  isDescendantOf, 
  findActionInTree, 
  findNodeInTree, 
  findParentOfNode 
} from './utils';

// Stable treemap component that never re-renders once mounted
const MemoizedTreemap = memo(({ 
  treemapData, 
  actionId, 
  maxDepth, 
  handleNodeClick, 
  selectedNodeId,
  hoveredNodeId,
  setHoveredNodeId,
  displayNodes 
}: {
  treemapData: any;
  actionId: string;
  maxDepth?: number;
  handleNodeClick: (node: any) => void;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  displayNodes: ActionNode[];
}) => {
  return (
    <ResponsiveTreeMapHtml
      key={`treemap-${actionId}-${maxDepth || 'unlimited'}`}
      data={treemapData}
      identity="id"
      value="value"
      colors={({ data, id }) => {
        const nodeId = (data as any).id || id;
        const highlightNodeId = selectedNodeId || hoveredNodeId;
        
        // Find the node in the tree to get more info
        const node = findNodeInTree(displayNodes, nodeId);
        if (!node) return '#4b5563';
        
        // Check if highlighted
        if (highlightNodeId === nodeId) {
          return '#22c55e'; // light green for focused action
        }
        
        // Check if sibling (same parent level)
        if (highlightNodeId) {
          const parent = findParentOfNode(displayNodes, nodeId);
          const highlightedParent = findParentOfNode(displayNodes, highlightNodeId);
          if (parent && highlightedParent && parent.id === highlightedParent.id && highlightNodeId !== nodeId) {
            // Use rich color palette for siblings
            const siblingColors = [
              '#ffba08', // selective_yellow
              '#faa307', // orange_(web)
              '#f48c06', // princeton_orange
              '#e85d04', // persimmon
              '#dc2f02', // sinopia
              '#d00000', // engineering_orange
              '#9d0208', // penn_red
              '#6a040f', // rosewood
              '#370617', // chocolate_cosmos
              '#03071e', // rich_black
            ];
            return siblingColors[Math.floor(Math.random() * siblingColors.length)];
          }
        }
        
        // Default colors
        return node.children.length > 0 ? '#374151' : '#4b5563';
      }}
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
  );
});

MemoizedTreemap.displayName = 'MemoizedTreemap';

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
  const [selectedActionDetail, setSelectedActionDetail] = useState<ActionDetailResource | null>(null);
  const [loadingActionDetail, setLoadingActionDetail] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyingUrl, setCopyingUrl] = useState(false);
  const [inspectorWidth, setInspectorWidth] = useState(320); // Default width in pixels
  const [isDragging, setIsDragging] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const maxDepth = searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : undefined;
  const isRootView = actionId === 'root';

  // Determine what to display (computed values for memoization)
  const displayAction = isRootView ? null : targetAction;
  const displayNodes = displayAction ? displayAction.children : treeData?.rootActions || [];
  const displayTitle = displayAction ? displayAction.title : 'Actions';

  // Create stable treemap data that never changes structure (only for layout)
  // This must NEVER depend on selectedActionDetail or any API response data
  const stableTreemapData = useMemo(() => {
    return displayNodes.length > 0 ? {
      name: displayTitle,
      children: transformToTreemapData(displayNodes, 0, maxDepth)
    } : {
      name: displayTitle,
      value: 1,
      color: '#4b5563'
    };
  }, [displayNodes, displayTitle, maxDepth]);

  // Use the stable data for the treemap component
  const treemapData = stableTreemapData;

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

  // Inspector resize drag logic
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Calculate new width based on mouse position from right edge
      const newWidth = Math.max(200, Math.min(600, window.innerWidth - e.clientX));
      setInspectorWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const handleNodeClick = (node: any) => {
    const nodeId = node.data.id;
    const currentTime = Date.now();
    const doubleClickDelay = 500; // ms
    
    // Check if this is a second click on the same node within the delay
    const isSecondClick = lastClickedNodeId === nodeId && 
                         (currentTime - lastClickTime) < doubleClickDelay;
    
    console.log('CLICK DEBUG:', { nodeId, isSecondClick, lastClickedNodeId, timeDiff: currentTime - lastClickTime });
    
    if (isSecondClick) {
      // Second click: navigate to focus on this node
      console.log('NAVIGATING to:', nodeId);
      const params = new URLSearchParams();
      if (maxDepth) params.set('depth', maxDepth.toString());
      router.push(`/treemap/${nodeId}?${params.toString()}`);
    } else {
      // First click: select node and freeze highlighting
      console.log('SELECTING node:', nodeId);
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
  
  // Dynamic inspector sizing
  const getInspectorStyle = () => {
    if (isMobile) {
      return {
        [isInspectorMinimized ? 'height' : 'height']: isInspectorMinimized ? '48px' : '256px',
        width: '100%'
      };
    } else {
      return {
        width: isInspectorMinimized ? '48px' : `${inspectorWidth}px`,
        height: '100%'
      };
    }
  };
  

  // Fetch detailed action data when a node is selected
  useEffect(() => {
    const fetchActionDetail = async (actionId: string) => {
      try {
        setLoadingActionDetail(true);
        const response = await fetch(`/api/actions/${actionId}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to fetch action details');
        setSelectedActionDetail(data.data);
      } catch (err) {
        console.error('Error fetching action details:', err);
        setSelectedActionDetail(null);
      } finally {
        setLoadingActionDetail(false);
      }
    };

    if (selectedNodeId) {
      fetchActionDetail(selectedNodeId);
    } else {
      setSelectedActionDetail(null);
      setLoadingActionDetail(false);
    }
  }, [selectedNodeId]);

  // Copy functions
  const copyPromptToClipboard = async () => {
    if (!selectedActionDetail) return;
    try {
      setCopying(true);
      const prompt = buildActionPrompt(selectedActionDetail);
      await navigator.clipboard.writeText(prompt);
      setTimeout(() => setCopying(false), 1000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopying(false);
    }
  };

  const copyActionUrl = async () => {
    if (!selectedActionDetail) return;
    try {
      setCopyingUrl(true);
      const url = `https://done.engineering/${selectedActionDetail.id}`;
      await navigator.clipboard.writeText(url);
      setTimeout(() => setCopyingUrl(false), 1000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setCopyingUrl(false);
    }
  };

  // Toggle complete handler
  const handleToggleComplete = async () => {
    if (!selectedActionDetail) return;
    
    try {
      const endpoint = selectedActionDetail.done 
        ? `/api/actions/${selectedActionDetail.id}/uncomplete`
        : `/api/actions/${selectedActionDetail.id}/complete`;
      
      const response = await fetch(endpoint, { method: 'POST' });
      if (!response.ok) throw new Error('Failed to toggle completion');
      
      // Refetch action details
      const detailResponse = await fetch(`/api/actions/${selectedActionDetail.id}`);
      if (detailResponse.ok) {
        const data = await detailResponse.json();
        if (data.success) {
          setSelectedActionDetail(data.data);
        }
      }
    } catch (err) {
      console.error('Failed to toggle completion:', err);
    }
  };

  // Delete action handler
  const handleDelete = async (actionId: string, childHandling: 'reparent' | 'delete_recursive') => {
    if (!selectedActionDetail) return;
    
    try {
      setDeleting(true);
      
      // Prepare delete parameters
      const deleteParams: { child_handling: string; new_parent_id?: string } = {
        child_handling: childHandling,
      };
      
      // If using reparent mode and action has children and a parent, provide the parent ID
      if (childHandling === 'reparent' && selectedActionDetail.children.length > 0 && selectedActionDetail.parent_id) {
        deleteParams.new_parent_id = selectedActionDetail.parent_id;
      }
      
      const response = await fetch(`/api/actions/${actionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(deleteParams),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete action: ${response.status}`);
      }
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete action');
      }
      
      // Clear selection
      setSelectedNodeId(null);
      setLastClickedNodeId(null);
      setSelectedActionDetail(null);
      
      // Refresh tree data
      const treeResponse = await fetch('/api/tree');
      const treeResult = await treeResponse.json();
      if (treeResult.success) {
        setTreeData(treeResult.data);
        
        // Update target action if needed
        if (!isRootView) {
          const foundAction = findActionInTree(treeResult.data.rootActions, actionId);
          if (foundAction) {
            setTargetAction(foundAction);
          }
        }
      }
    } catch (err) {
      console.error('Failed to delete action:', err);
      // TODO: Show user-friendly error message
    } finally {
      setDeleting(false);
    }
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
        
        /* Sibling highlighting with bright blue colors */
      `}</style>
      <div className="w-full h-screen flex flex-col">
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
            key="treemap-container" 
            className="flex-1 p-4"
            style={{ maxHeight: '100vh', overflow: 'hidden' }}
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
            <MemoizedTreemap
              treemapData={treemapData}
              actionId={actionId}
              maxDepth={maxDepth}
              handleNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              setHoveredNodeId={setHoveredNodeId}
              displayNodes={displayNodes}
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
          
          {/* Inspector with resize handle */}
          <TreemapInspector 
            selectedActionDetail={selectedActionDetail}
            loadingActionDetail={loadingActionDetail}
            copying={copying}
            copyingUrl={copyingUrl}
            onCopyPrompt={copyPromptToClipboard}
            onCopyUrl={copyActionUrl}
            onToggleComplete={handleToggleComplete}
            onClearSelection={() => {
              setSelectedNodeId(null);
              setLastClickedNodeId(null);
              setSelectedActionDetail(null);
            }}
            isMinimized={isInspectorMinimized}
            onToggleMinimize={() => setIsInspectorMinimized(!isInspectorMinimized)}
            isMobile={isMobile}
            inspectorWidth={inspectorWidth}
            isDragging={isDragging}
            setIsDragging={setIsDragging}
            onDelete={handleDelete}
            deleting={deleting}
          />
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