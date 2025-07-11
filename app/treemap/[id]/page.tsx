'use client';

import { useState, useEffect, Suspense, useMemo, memo } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useActionCompletion } from '../../contexts/ActionCompletionContext';
import { ResponsiveTreeMapHtml } from '@nivo/treemap';
import { ActionTreeResource, ActionNode, ActionDetailResource } from '../../../lib/types/resources';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';
import TreemapInspector from './inspector';
import TreemapBreadcrumbs from './TreemapBreadcrumbs';
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
  currentDepth, 
  handleNodeClick, 
  selectedNodeId,
  hoveredNodeId,
  setHoveredNodeId,
  displayNodes,
  dataRevision,
  windowDimensions,
  displayTitle,
  displayAction,
  actionDetail
}: {
  treemapData: any;
  actionId: string;
  currentDepth: number;
  handleNodeClick: (node: any) => void;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  displayNodes: ActionNode[];
  dataRevision: number;
  windowDimensions: { width: number; height: number };
  displayTitle: string;
  displayAction: ActionNode | null;
  actionDetail: ActionDetailResource | null;
}) => {
  return (
    <ResponsiveTreeMapHtml
      key={`treemap-${actionId}-${currentDepth === 10 ? 'unlimited' : currentDepth}-rev${dataRevision}`}
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
          
          // Handle case where both nodes are at root level (no parent)
          const bothAtRoot = parent === null && highlightedParent === null;
          const sameParent = parent && highlightedParent && parent.id === highlightedParent.id;
          
          if ((bothAtRoot || sameParent) && highlightNodeId !== nodeId) {
            // Use very light green palette for siblings
            const siblingColors = [
              '#f0fdf4', // green-50
              '#dcfce7', // green-100
              '#bbf7d0', // green-200
              '#86efac', // green-300
              '#6ee7b7', // emerald-300
              '#a7f3d0', // emerald-200
              '#d1fae5', // emerald-100
              '#ecfdf5', // emerald-50
              '#f3f4f6', // gray-100 (very light)
              '#e5e7eb', // gray-200 (light)
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
      labelSkipSize={0}
      parentLabelSize={60}
      enableParentLabel={true}
      labelTextColor="#d1d5db"
      parentLabelTextColor="#f3f4f6"
      borderWidth={1}
      borderColor="rgba(0, 0, 0, 0)"
      animate={true}
      motionConfig="gentle"
      onClick={handleNodeClick}
      onMouseEnter={(node) => {
        // Only show hover highlighting if no node is selected
        if (!selectedNodeId) {
          setHoveredNodeId((node as any).data.id);
        }
      }}
      label={({ data }) => {
        const nodeData = (data as any);
        const actionNode = findNodeInTree(displayNodes, nodeData.id);
        
        // Check if this is the main/root node of the current view
        const isMainNode = nodeData.name === displayTitle;
        
        console.log('label called:', { 
          nodeDataName: nodeData.name, 
          displayTitle, 
          isMainNode,
          hasChildren: actionNode?.children?.length || 0 
        });
        
        if (isMainNode && displayAction) {
          // For the main focused node, show breadcrumb
          console.log('Building breadcrumb for main node:', { displayAction, actionDetail, hasParentChain: actionDetail?.parent_chain?.length });
          if (actionDetail && actionDetail.parent_chain) {
            const breadcrumbParts = ['Actions'];
            actionDetail.parent_chain.forEach(parent => {
              breadcrumbParts.push(parent.title);
            });
            breadcrumbParts.push(displayAction.title);
            const breadcrumbText = breadcrumbParts.join(' / ');
            console.log('Full breadcrumb:', breadcrumbText);
            return breadcrumbText;
          } else {
            const breadcrumbText = `Actions / ${displayAction.title}`;
            console.log('Simple breadcrumb:', breadcrumbText);
            return breadcrumbText;
          }
        }
        
        if (!actionNode || !actionNode.children || actionNode.children.length === 0) {
          return nodeData.name;
        }
        
        const descendantCount = countDescendants(actionNode);
        return `${nodeData.name} (${descendantCount} actions)`;
      }}
      parentLabel={({ data }) => {
        const nodeData = (data as any);
        const actionNode = findNodeInTree(displayNodes, nodeData.id);
        const isRootNode = nodeData.name === displayTitle;
        
        console.log('parentLabel called:', { 
          nodeDataName: nodeData.name, 
          displayTitle, 
          isRootNode,
          actionNode: !!actionNode,
          displayAction: !!displayAction,
          actionDetail: !!actionDetail 
        });
        
        // For the root node (focused action), show breadcrumb
        if (isRootNode && displayAction) {
          console.log('Building breadcrumb for root node:', { hasParentChain: actionDetail?.parent_chain?.length });
          if (actionDetail && actionDetail.parent_chain && actionDetail.parent_chain.length > 0) {
            const breadcrumbParts = ['Actions'];
            actionDetail.parent_chain.forEach(parent => {
              breadcrumbParts.push(parent.title);
            });
            breadcrumbParts.push(displayAction.title);
            const breadcrumbText = breadcrumbParts.join(' / ');
            console.log('Full breadcrumb:', breadcrumbText);
            return `${breadcrumbText} (${displayNodes.length})`;
          } else {
            const breadcrumbText = `Actions / ${displayAction.title}`;
            console.log('Simple breadcrumb:', breadcrumbText);
            return `${breadcrumbText} (${displayNodes.length})`;
          }
        }
        
        // For child nodes, use normal logic
        if (!actionNode || !actionNode.children || actionNode.children.length === 0) {
          return nodeData.name;
        }
        
        const descendantCount = countDescendants(actionNode);
        return `${nodeData.name} (${descendantCount})`;
      }}
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
  const { openModal: openCompletionModal } = useActionCompletion();
  
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
  const [dataRevision, setDataRevision] = useState(0);
  const [depthSliderValue, setDepthSliderValue] = useState<number>(10);
  const [actionDetail, setActionDetail] = useState<ActionDetailResource | null>(null);
  
  const maxDepth = searchParams.get('depth') ? parseInt(searchParams.get('depth')!) : undefined;
  const isRootView = actionId === 'root';

  // Initialize depth slider value from URL params
  useEffect(() => {
    setDepthSliderValue(maxDepth || 10);
  }, [maxDepth]);

  // Determine what to display (computed values for memoization)
  const displayAction = isRootView ? null : targetAction;
  const displayNodes = displayAction ? displayAction.children : treeData?.rootActions || [];
  const displayTitle = displayAction ? displayAction.title : 'Actions';

  // Create stable treemap data that responds to depth changes smoothly
  const stableTreemapData = useMemo(() => {
    const effectiveDepth = depthSliderValue === 10 ? undefined : depthSliderValue;
    return displayNodes.length > 0 ? {
      name: displayTitle,
      children: transformToTreemapData(displayNodes, 0, effectiveDepth)
    } : {
      name: displayTitle,
      value: 1,
      color: '#4b5563'
    };
  }, [displayNodes, displayTitle, depthSliderValue]);

  // Use the stable data for the treemap component
  const treemapData = stableTreemapData;

  // Separate function to refresh tree data that can be called from multiple places
  const refreshTreeData = async () => {
    try {
      const response = await fetch('/api/tree');
      const result = await response.json();
      
      if (result.success) {
        setTreeData(result.data);
        setDataRevision(prev => prev + 1); // Force treemap re-render
        
        if (!isRootView) {
          // Find the target action in the tree
          const foundAction = findActionInTree(result.data.rootActions, actionId);
          if (foundAction) {
            // Check if this is a leaf node (no children)
            if (foundAction.children.length === 0) {
              // This is a leaf node - redirect to parent
              // First try to find the parent by searching for actions that have this as a child
              const findParentAction = (nodes: ActionNode[], targetId: string): ActionNode | null => {
                for (const node of nodes) {
                  if (node.children.some(child => child.id === targetId)) {
                    return node;
                  }
                  const parentInChildren = findParentAction(node.children, targetId);
                  if (parentInChildren) return parentInChildren;
                }
                return null;
              };
              
              const parentAction = findParentAction(result.data.rootActions, actionId);
              if (parentAction) {
                // Redirect to parent action
                const params = new URLSearchParams();
                if (maxDepth) params.set('depth', maxDepth.toString());
                router.replace(`/treemap/${parentAction.id}?${params.toString()}`);
                return;
              } else {
                // No parent found, redirect to root
                const params = new URLSearchParams();
                if (maxDepth) params.set('depth', maxDepth.toString());
                router.replace(`/treemap/root?${params.toString()}`);
                return;
              }
            }
            setTargetAction(foundAction);
            
            // Also fetch the action detail to get parent_chain for breadcrumbs
            if (!isRootView) {
              try {
                const detailResponse = await fetch(`/api/actions/${actionId}`);
                if (detailResponse.ok) {
                  const detailData = await detailResponse.json();
                  if (detailData.success) {
                    setActionDetail(detailData.data);
                  }
                }
              } catch (err) {
                console.error('Failed to fetch action detail for breadcrumbs:', err);
              }
            }
          } else {
            setError(`Action with ID ${actionId} not found`);
          }
        }
      } else {
        setError(result.error || 'Failed to fetch tree data');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshTreeData();
      } finally {
        setLoading(false);
      }
    };

    if (actionId) {
      fetchTreeData();
    }
  }, [actionId, isRootView, maxDepth, router]);

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
    
    // Find the node to check if it's a leaf
    const actionNode = findNodeInTree(displayNodes, nodeId);
    const isLeaf = actionNode && actionNode.children.length === 0;
    
    // Check if this is a second click on the same node within the delay
    const isSecondClick = lastClickedNodeId === nodeId && 
                         (currentTime - lastClickTime) < doubleClickDelay;
    
    console.log('CLICK DEBUG:', { nodeId, isSecondClick, lastClickedNodeId, timeDiff: currentTime - lastClickTime, isLeaf });
    
    if (isSecondClick && !isLeaf) {
      // Second click: navigate to focus on this node (only if not a leaf)
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

  const handleDepthChange = (newDepth: number) => {
    setDepthSliderValue(newDepth);
    // Don't navigate immediately - just update the local state
    // The treemap will re-render smoothly with the new depth
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
    
    if (selectedActionDetail.done) {
      // If uncompleting, call the API directly
      try {
        const response = await fetch(`/api/actions/${selectedActionDetail.id}/uncomplete`, {
          method: 'POST'
        });
        
        if (!response.ok) throw new Error('Failed to uncomplete action');
        
        // Refetch action details
        const detailResponse = await fetch(`/api/actions/${selectedActionDetail.id}`);
        if (detailResponse.ok) {
          const data = await detailResponse.json();
          if (data.success) {
            setSelectedActionDetail(data.data);
          }
        }
        
        // Refresh tree data to update treemap
        await refreshTreeData();
      } catch (err) {
        console.error('Failed to uncomplete action:', err);
      }
    } else {
      // If completing, open the completion modal
      openCompletionModal(selectedActionDetail.id, selectedActionDetail.title);
      
      // Set up a callback to refresh data when completion is done
      (window as any).setActionCompletionCallback = (setCallbackFn: (callback: () => void) => void) => {
        setCallbackFn(async () => {
          // Refetch action details
          const detailResponse = await fetch(`/api/actions/${selectedActionDetail.id}`);
          if (detailResponse.ok) {
            const data = await detailResponse.json();
            if (data.success) {
              setSelectedActionDetail(data.data);
            }
          }
          
          // Refresh tree data to update treemap
          await refreshTreeData();
        });
      };
    }
  };

  // Handle action updates (including title changes)
  const handleActionUpdate = async (actionId: string, field: string, value: string) => {
    // Update the selected action detail if it matches the updated action
    if (selectedActionDetail && selectedActionDetail.id === actionId) {
      setSelectedActionDetail(prev => prev ? { ...prev, [field]: value } : null);
    }
    
    // Refresh tree data to update treemap
    await refreshTreeData();
    
    // Notify the sidebar to refresh (using window custom event)
    window.dispatchEvent(new CustomEvent('actionUpdated', { 
      detail: { actionId, field, value } 
    }));
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
        setDataRevision(prev => prev + 1); // Force treemap re-render
        
        // Update target action if needed - use the page's actionId, not the deleted action's ID
        if (!isRootView) {
          const foundAction = findActionInTree(treeResult.data.rootActions, params.id as string);
          if (foundAction) {
            setTargetAction(foundAction);
          } else {
            // If the current page's action was deleted, navigate back to root
            router.push('/treemap/root');
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
          transform: translate(8px, 8px) !important;
          width: calc(100% - 16px) !important;
          height: auto !important;
          min-height: 12px !important;
          max-width: calc(100% - 16px) !important;
          justify-content: flex-start !important;
          align-items: flex-start !important;
          text-align: left !important;
          white-space: normal !important;
          word-wrap: break-word !important;
          overflow-wrap: break-word !important;
          font-family: ui-monospace, SFMono-Regular, monospace !important;
          line-height: 1.4 !important;
          color: #d1d5db !important;
          pointer-events: none !important;
          display: flex !important;
          flex-direction: column !important;
          overflow: visible !important;
          min-font-size: 8px !important;
        }
        
        /* Action label styling */
        .action-label {
          display: flex !important;
          flex-direction: column !important;
          height: auto !important;
          min-height: 12px !important;
          overflow: visible !important;
        }
        
        .action-label .title {
          font-weight: 600;
          color: #f3f4f6;
          margin-bottom: 4px;
          overflow: visible !important;
          text-overflow: unset !important;
          display: block !important;
          -webkit-line-clamp: unset !important;
          -webkit-box-orient: unset !important;
          min-font-size: 8px !important;
          min-height: 12px !important;
          height: auto !important;
          line-height: 1.2 !important;
        }
        
        .action-label .description {
          color: #e5e7eb;
          margin-bottom: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          font-style: italic;
        }
        
        .action-label .vision {
          color: #22c55e;
          margin-bottom: 3px;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          font-weight: 500;
        }
        
        .action-label .metadata {
          display: flex;
          flex-direction: column;
          gap: 2px;
          color: #9ca3af;
          margin-top: auto;
        }
        
        .action-label .children-count {
          font-weight: 500;
          color: #9ca3af;
        }
        
        /* Parent label styling - simpler, just for title */
        [data-testid^="label."][data-testid*="parent"] {
          pointer-events: auto !important;
          cursor: pointer !important;
          padding: 6px 12px !important;
          margin: 4px !important;
          background-color: rgba(55, 65, 81, 0.9) !important;
          border-radius: 6px !important;
          width: auto !important;
          max-width: 95% !important;
          min-width: 80px !important;
          border: 1px solid rgba(75, 85, 99, 0.5) !important;
          color: #f9fafb !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          white-space: nowrap !important;
          overflow: visible !important;
          text-overflow: unset !important;
          box-sizing: border-box !important;
        }
        
        /* Special styling for the root header with navigation and controls */
        .treemap-root-header {
          width: calc(100% - 8px) !important;
          height: auto !important;
          min-height: 56px !important;
          background-color: rgba(17, 24, 39, 0.95) !important;
          border: 1px solid rgba(75, 85, 99, 0.8) !important;
          border-radius: 8px !important;
          margin: 4px !important;
          padding: 12px !important;
          pointer-events: auto !important;
          display: flex !important;
          align-items: center !important;
          justify-content: flex-start !important;
        }
        
        .treemap-root-header input[type="range"] {
          background: #4b5563 !important;
          -webkit-appearance: none !important;
          appearance: none !important;
        }
        
        .treemap-root-header input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none !important;
          background: #22c55e !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          cursor: pointer !important;
        }
        
        .treemap-root-header input[type="range"]::-moz-range-thumb {
          background: #22c55e !important;
          width: 12px !important;
          height: 12px !important;
          border-radius: 50% !important;
          cursor: pointer !important;
          border: none !important;
        }
        
        /* Sibling highlighting with bright blue colors */
        
        /* Custom slider styles */
        .slider {
          -webkit-appearance: none;
          appearance: none;
          background: #374151;
          outline: none;
          border-radius: 8px;
        }
        
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #22c55e;
          border-radius: 50%;
          cursor: pointer;
          transition: background 0.2s;
        }
        
        .slider::-webkit-slider-thumb:hover {
          background: #16a34a;
        }
        
        .slider::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: #22c55e;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: background 0.2s;
        }
        
        .slider::-moz-range-thumb:hover {
          background: #16a34a;
        }
      `}</style>
      <div className={`w-full h-screen flex ${!isMobile ? 'flex-row' : 'flex-col'}`}>
        {/* Left side: Treemap (full height) */}
        <div className="flex-1 relative">
          {/* Small floating controls for depth and back button */}
          <div className="absolute top-6 right-6 z-10 flex items-center space-x-3 bg-gray-900/80 backdrop-blur-sm border border-gray-700 rounded-lg px-3 py-2">
            {displayAction && (
              <button
                onClick={handleBackClick}
                className="px-2 py-1 bg-gray-700 text-gray-200 rounded hover:bg-gray-600 font-mono text-xs transition-colors"
              >
                ← Back
              </button>
            )}
            <div className="flex items-center space-x-2">
              <label htmlFor="depth-slider" className="text-gray-300 font-mono text-xs">
                Depth:
              </label>
              <input
                id="depth-slider"
                type="range"
                min="1"
                max="10"
                value={depthSliderValue}
                onChange={(e) => handleDepthChange(parseInt(e.target.value))}
                className="w-20 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
              <span className="text-gray-300 font-mono text-xs min-w-[16px]">
                {depthSliderValue === 10 ? '∞' : depthSliderValue}
              </span>
            </div>
          </div>

          {/* Breadcrumbs overlay inside treemap - temporarily disabled to test in-label breadcrumbs */}
          {/* <TreemapBreadcrumbs 
            actionId={actionId}
            isRootView={isRootView}
            maxDepth={maxDepth}
          /> */}

          {/* Treemap (full area) */}
          <div 
            key="treemap-container" 
            className="w-full h-full p-4"
            style={{ overflow: 'hidden' }}
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
              currentDepth={depthSliderValue}
              handleNodeClick={handleNodeClick}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              setHoveredNodeId={setHoveredNodeId}
              displayNodes={displayNodes}
              dataRevision={dataRevision}
              windowDimensions={windowDimensions}
              displayTitle={displayTitle}
              displayAction={displayAction}
              actionDetail={actionDetail}
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
        
        {/* Right side: Inspector with full height */}
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
          onActionUpdate={handleActionUpdate}
          onDataRefresh={refreshTreeData}
        />
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