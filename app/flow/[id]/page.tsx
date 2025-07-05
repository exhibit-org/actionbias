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

// Define node types outside component
const nodeTypes = {};

export default function FlowIdPage() {
  const params = useParams();
  const router = useRouter();
  const actionId = params.id as string;
  
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Create nodes and edges using useMemo
  const { nodes, edges } = useMemo(() => {
    if (!context) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    const { action, relationships } = context;
    
    // Calculate vertical positions for hierarchy
    const ancestorCount = relationships.ancestors.length;
    const childrenCount = relationships.children.length;
    const totalHeight = (ancestorCount + 1 + Math.ceil(childrenCount / 3)) * 120;
    const startY = 100;
    
    // Add ancestors (parents) above - maintaining hierarchy
    relationships.ancestors.forEach((ancestor, index) => {
      flowNodes.push({
        id: ancestor.id,
        position: { x: 400, y: startY + (index * 120) },
        data: { 
          label: ancestor.title,
          type: 'ancestor'
        },
        style: { 
          background: '#059669', 
          color: 'white',
          borderRadius: '6px'
        }
      });
    });

    // Center the focal action - positioned after ancestors
    const focalY = startY + (ancestorCount * 120);
    flowNodes.push({
      id: action.id,
      position: { x: 400, y: focalY },
      data: { 
        label: action.title,
        type: 'focal'
      },
      style: { 
        background: '#4f46e5', 
        color: 'white',
        border: '2px solid #312e81',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 'bold'
      }
    });

    // Add children below the focal action - maintaining hierarchy
    relationships.children.forEach((child, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      
      flowNodes.push({
        id: child.id,
        position: { 
          x: 300 + (col * 200), 
          y: focalY + 120 + (row * 100) 
        },
        data: { 
          label: child.title,
          type: 'child'
        },
        style: { 
          background: '#0ea5e9', 
          color: 'white',
          borderRadius: '6px'
        }
      });
    });

    // Add dependencies to the left of focal action
    relationships.dependencies.forEach((dep, index) => {
      flowNodes.push({
        id: dep.id,
        position: { 
          x: 100, 
          y: focalY - 50 + (index * 100) 
        },
        data: { 
          label: dep.title,
          type: 'dependency'
        },
        style: { 
          background: '#dc2626', 
          color: 'white',
          borderRadius: '6px'
        }
      });
      
      // Add dependency edge from dependency to focal action
      flowEdges.push({
        id: `dependency-${dep.id}-${action.id}`,
        source: dep.id,
        target: action.id,
        type: 'default',
        style: { stroke: '#dc2626', strokeWidth: 2 },
        markerEnd: { type: MarkerType.Arrow, color: '#dc2626' }
      });
    });

    // Add dependents to the right of focal action
    relationships.dependents.forEach((dependent, index) => {
      flowNodes.push({
        id: dependent.id,
        position: { 
          x: 700, 
          y: focalY - 50 + (index * 100) 
        },
        data: { 
          label: dependent.title,
          type: 'dependent'
        },
        style: { 
          background: '#ea580c', 
          color: 'white',
          borderRadius: '6px'
        }
      });
      
      // Add dependency edge from focal action to dependent
      flowEdges.push({
        id: `dependency-${action.id}-${dependent.id}`,
        source: action.id,
        target: dependent.id,
        type: 'default',
        style: { stroke: '#ea580c', strokeWidth: 2 },
        markerEnd: { type: MarkerType.Arrow, color: '#ea580c' }
      });
    });

    // Add siblings at the same level as focal action
    relationships.siblings.forEach((sibling, index) => {
      const offsetX = (index - (relationships.siblings.length - 1) / 2) * 150;
      
      flowNodes.push({
        id: sibling.id,
        position: { 
          x: 400 + offsetX, 
          y: focalY + 60 
        },
        data: { 
          label: sibling.title,
          type: 'sibling'
        },
        style: { 
          background: '#7c3aed', 
          color: 'white',
          borderRadius: '6px'
        }
      });
    });

    console.log('Generated contextual nodes:', flowNodes.map(n => ({ id: n.id, label: n.data.label, type: n.data.type })));
    return { nodes: flowNodes, edges: flowEdges };
  }, [context]);

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
  const totalRelationships = relationships.ancestors.length + relationships.children.length + 
                             relationships.dependencies.length + relationships.dependents.length + 
                             relationships.siblings.length;

  return (
    <div className="h-screen">
      <div className="p-4 bg-gray-100 border-b">
        <h1 className="text-2xl font-bold">{action.title}</h1>
        <h2 className="text-lg text-gray-700 mb-2">Contextual Flow View</h2>
        <p className="text-gray-600">Status: {action.done ? 'Completed' : 'In Progress'}</p>
        <p className="text-sm text-gray-500">
          {relationships.ancestors.length} ancestor{relationships.ancestors.length !== 1 ? 's' : ''} • {' '}
          {relationships.children.length} child{relationships.children.length !== 1 ? 'ren' : ''} • {' '}
          {relationships.dependencies.length} dependenc{relationships.dependencies.length !== 1 ? 'ies' : 'y'} • {' '}
          {relationships.dependents.length} dependent{relationships.dependents.length !== 1 ? 's' : ''} • {' '}
          {relationships.siblings.length} sibling{relationships.siblings.length !== 1 ? 's' : ''}
        </p>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-green-600 rounded"></div>
            <span>Ancestors</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded"></div>
            <span>Children</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-600 rounded"></div>
            <span>Dependencies</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-600 rounded"></div>
            <span>Dependents</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-600 rounded"></div>
            <span>Siblings</span>
          </div>
        </div>
      </div>
      <ReactFlow
        key={`flow-${actionId}`}
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        connectionMode={ConnectionMode.Loose}
        fitView
        fitViewOptions={{ padding: 0.2 }}
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}