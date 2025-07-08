'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { 
  Controls, 
  Background, 
  Node, 
  Edge,
  ConnectionMode,
  MarkerType
} from 'reactflow';
import 'reactflow/dist/style.css';

type ActionMetadata = {
  id: string;
  title: string;
  description?: string | null;
  vision?: string | null;
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

type ActionRelationships = {
  ancestors: ActionMetadata[];
  children: ActionMetadata[];
  dependencies: ActionMetadata[];
  dependents: ActionMetadata[];
  siblings: ActionMetadata[];
};

type RelationshipFlags = {
  [actionId: string]: string[];
};

type ContextResponse = {
  action: ActionMetadata;
  relationships: ActionRelationships;
  relationship_flags: RelationshipFlags;
};

// Define reusable styles outside component
const nodeStyles = {
  focal: {
    background: 'white',
    color: 'black',
    border: '2px solid #374151',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  default: {
    background: 'white',
    color: 'black',
    border: '1px solid #e5e7eb',
    borderRadius: '6px'
  }
};

const edgeStyle = {
  stroke: '#6b7280',
  strokeWidth: 2,
  strokeDasharray: '5,5'
};

const markerEnd = {
  type: MarkerType.Arrow,
  color: '#6b7280'
};

const fitViewOptions = { padding: 0.05 };

const defaultPosition = { x: 0, y: 0 };

export default function FlowIdPage() {
  const params = useParams();
  const router = useRouter();
  const actionId = params.id as string;
  
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create nodes and edges using useMemo with Dagre layout - MUST be before conditional returns
  const { nodes, edges } = useMemo(() => {
    if (!context) {
      return { nodes: [], edges: [] };
    }

    const { action, relationships } = context;
    const addedNodeIds = new Set<string>();
    const addedEdgeIds = new Set<string>(); // Track edge IDs to prevent duplicates
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    // Helper function to calculate node dimensions based on children count and importance
    const getNodeDimensions = (title: string, actionId: string, type: string) => {
      // Base dimensions
      let baseWidth = Math.min(Math.max(title.length * 6 + 30, 100), 200);
      let baseHeight = Math.max(30, Math.ceil(title.length / 25) * 15 + 15);
      
      // Calculate children count for this action
      let childrenCount = 0;
      if (actionId === action.id) {
        childrenCount = relationships.children.length;
      } else {
        // For other nodes, we don't have their children data, so estimate based on type
        if (type === 'parent') childrenCount = relationships.siblings.length + 1; // Approximate
      }
      
      // Size multiplier based on children count (focal node gets biggest boost)
      let sizeMultiplier = 1;
      if (type === 'focal') {
        sizeMultiplier = 1 + (childrenCount * 0.15); // Focal grows more dramatically
      } else if (childrenCount > 0) {
        sizeMultiplier = 1 + (childrenCount * 0.1);
      }
      
      return { 
        width: Math.min(baseWidth * sizeMultiplier, 300), 
        height: Math.min(baseHeight * sizeMultiplier, 100) 
      };
    };

    // Helper function to safely add edges without duplicates
    const addEdge = (sourceId: string, targetId: string, edgeType: string = 'dependency') => {
      const edgeId = `${edgeType}-${sourceId}-${targetId}`;
      if (!addedEdgeIds.has(edgeId)) {
        addedEdgeIds.add(edgeId);
        flowEdges.push({
          id: edgeId,
          source: sourceId,
          target: targetId,
          type: 'step',
          style: edgeStyle,
          markerEnd: markerEnd
        });
      }
    };

    // Add focal action first
    addedNodeIds.add(action.id);
    const focalDimensions = getNodeDimensions(action.title, action.id, 'focal');
    flowNodes.push({
      id: action.id,
      data: { 
        label: action.title,
        type: 'focal'
      },
      position: defaultPosition, // Will be set by tiling layout
      style: { 
        ...nodeStyles.focal,
        width: `${focalDimensions.width}px`,
        height: `${focalDimensions.height}px`
      }
    });

    // Add direct parent
    if (relationships.ancestors.length > 0) {
      const directParent = relationships.ancestors[relationships.ancestors.length - 1];
      if (!addedNodeIds.has(directParent.id)) {
        addedNodeIds.add(directParent.id);
        const parentDimensions = getNodeDimensions(directParent.title, directParent.id, 'parent');
        flowNodes.push({
          id: directParent.id,
          data: { 
            label: directParent.title,
            type: 'parent'
          },
          position: defaultPosition,
          style: { 
            ...nodeStyles.default,
            width: `${parentDimensions.width}px`,
            height: `${parentDimensions.height}px`
          }
        });
      }
    }

    // Add siblings (process first to prioritize sibling relationship)
    relationships.siblings.forEach((sibling) => {
      if (!addedNodeIds.has(sibling.id)) {
        addedNodeIds.add(sibling.id);
        const siblingDimensions = getNodeDimensions(sibling.title, sibling.id, 'sibling');
        flowNodes.push({
          id: sibling.id,
          data: { 
            label: sibling.title,
            type: 'sibling'
          },
          position: defaultPosition,
          style: { 
            ...nodeStyles.default,
            width: `${siblingDimensions.width}px`,
            height: `${siblingDimensions.height}px`
          }
        });
      }
    });

    // Add children
    relationships.children.forEach((child) => {
      if (!addedNodeIds.has(child.id)) {
        addedNodeIds.add(child.id);
        const childDimensions = getNodeDimensions(child.title, child.id, 'child');
        flowNodes.push({
          id: child.id,
          data: { 
            label: child.title,
            type: 'child'
          },
          position: defaultPosition,
          style: { 
            ...nodeStyles.default,
            width: `${childDimensions.width}px`,
            height: `${childDimensions.height}px`
          }
        });
      }
    });

    // Add dependencies
    relationships.dependencies.forEach((dep) => {
      if (!addedNodeIds.has(dep.id)) {
        addedNodeIds.add(dep.id);
        const depDimensions = getNodeDimensions(dep.title, dep.id, 'dependency');
        flowNodes.push({
          id: dep.id,
          data: { 
            label: dep.title,
            type: 'dependency'
          },
          position: defaultPosition,
          style: { 
            ...nodeStyles.default,
            width: `${depDimensions.width}px`,
            height: `${depDimensions.height}px`
          }
        });
      }
    });

    // Add dependents
    relationships.dependents.forEach((dependent) => {
      if (!addedNodeIds.has(dependent.id)) {
        addedNodeIds.add(dependent.id);
        const dependentDimensions = getNodeDimensions(dependent.title, dependent.id, 'dependent');
        flowNodes.push({
          id: dependent.id,
          data: { 
            label: dependent.title,
            type: 'dependent'
          },
          position: defaultPosition,
          style: { 
            ...nodeStyles.default,
            width: `${dependentDimensions.width}px`,
            height: `${dependentDimensions.height}px`
          }
        });
      }
    });

    // Add dependency edges (which include hierarchical relationships)
    // Parent to focal action (if parent exists)
    if (relationships.ancestors.length > 0) {
      const directParent = relationships.ancestors[relationships.ancestors.length - 1];
      addEdge(directParent.id, action.id, 'hierarchy');
      
      // Parent to siblings
      relationships.siblings.forEach((sibling) => {
        addEdge(directParent.id, sibling.id, 'hierarchy');
      });
    }

    // Focal action to children
    relationships.children.forEach((child) => {
      addEdge(action.id, child.id, 'hierarchy');
    });

    // Additional dependency edges (non-hierarchical dependencies)
    relationships.dependencies.forEach((dep) => {
      addEdge(action.id, dep.id, 'dependency');
    });

    relationships.dependents.forEach((dependent) => {
      addEdge(dependent.id, action.id, 'dependency');
    });

    // Apply custom radial layout with focal node in center
    const layoutedNodes = flowNodes.map((node) => {
      const width = parseInt(node.style?.width as string) || 120;
      const height = parseInt(node.style?.height as string) || 40;
      const nodeType = node.data.type;
      
      let x = 0, y = 0;
      
      if (nodeType === 'focal') {
        // Center the focal node
        x = 0;
        y = 0;
      } else if (nodeType === 'parent') {
        // Place parent above focal node
        x = 0;
        y = -150;
      } else if (nodeType === 'child') {
        // Place children below focal node in a grid
        const childIndex = relationships.children.findIndex(c => c.id === node.id);
        const childrenPerRow = Math.ceil(Math.sqrt(relationships.children.length));
        const row = Math.floor(childIndex / childrenPerRow);
        const col = childIndex % childrenPerRow;
        const totalCols = Math.min(childrenPerRow, relationships.children.length);
        
        x = (col - (totalCols - 1) / 2) * (width + 20);
        y = 150 + row * (height + 20);
      } else if (nodeType === 'sibling') {
        // Place siblings to the right of focal node in a vertical line
        const siblingIndex = relationships.siblings.findIndex(s => s.id === node.id);
        x = 250;
        y = (siblingIndex - (relationships.siblings.length - 1) / 2) * (height + 20);
      } else if (nodeType === 'dependency') {
        // Place dependencies to the left of focal node
        const depIndex = relationships.dependencies.findIndex(d => d.id === node.id);
        const depsPerCol = Math.ceil(Math.sqrt(relationships.dependencies.length));
        const row = Math.floor(depIndex / depsPerCol);
        const col = depIndex % depsPerCol;
        
        x = -250 - col * (width + 20);
        y = (row - (Math.ceil(relationships.dependencies.length / depsPerCol) - 1) / 2) * (height + 20);
      } else if (nodeType === 'dependent') {
        // Place dependents to the upper right
        const depIndex = relationships.dependents.findIndex(d => d.id === node.id);
        const depsPerRow = Math.ceil(Math.sqrt(relationships.dependents.length));
        const row = Math.floor(depIndex / depsPerRow);
        const col = depIndex % depsPerRow;
        
        x = 150 + col * (width + 20);
        y = -100 - row * (height + 20);
      }
      
      return {
        ...node,
        position: { x: x - width / 2, y: y - height / 2 }
      };
    });

    return { nodes: layoutedNodes, edges: flowEdges };
  }, [context]);

  useEffect(() => {
    const fetchActionContext = async () => {
      try {
        const response = await fetch(`/api/actions/${actionId}/context`);
        if (!response.ok) {
          throw new Error('Failed to fetch action context');
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch action context');
        }
        
        setContext(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (actionId) {
      fetchActionContext();
    }
  }, [actionId]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    router.push(`/flow/${node.id}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  if (!context) {
    return <div className="flex items-center justify-center h-screen">Action not found</div>;
  }

  const { action, relationships } = context;

  return (
    <div className="h-screen">
      <div className="p-3 bg-gray-100 border-b">
        <h1 className="text-xl font-bold">{action.title}</h1>
        <h2 className="text-sm text-gray-700">Contextual Flow View</h2>
        <p className="text-gray-600">Status: {action.done ? 'Completed' : 'In Progress'}</p>
        <p className="text-xs text-gray-500">
          {relationships.ancestors.length} ancestor{relationships.ancestors.length !== 1 ? 's' : ''} • {' '}
          {relationships.children.length} child{relationships.children.length !== 1 ? 'ren' : ''} • {' '}
          {relationships.dependencies.length} dependenc{relationships.dependencies.length !== 1 ? 'ies' : 'y'} • {' '}
          {relationships.dependents.length} dependent{relationships.dependents.length !== 1 ? 's' : ''} • {' '}
          {relationships.siblings.length} sibling{relationships.siblings.length !== 1 ? 's' : ''}
        </p>
      </div>
      <ReactFlow
        key={`flow-${actionId}`}
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={fitViewOptions}
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}