'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ReactFlow, { 
  Controls, 
  Background, 
  Node, 
  Edge,
  ConnectionMode
} from 'reactflow';
import 'reactflow/dist/style.css';

type ActionNode = {
  id: string;
  title: string;
  done: boolean;
  created_at: string;
  children: ActionNode[];
  dependencies: string[];
};

// Define node types outside component
const nodeTypes = {};

export default function FlowIdPage() {
  const params = useParams();
  const router = useRouter();
  const actionId = params.id as string;
  
  const [rootAction, setRootAction] = useState<ActionNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchActionTree = async () => {
      try {
        const response = await fetch(`/api/actions/tree/${actionId}?includeCompleted=false`);
        if (!response.ok) {
          throw new Error('Failed to fetch action tree');
        }
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch action tree');
        }
        
        // Extract the first root action from the response
        const rootActions = result.data.rootActions || [];
        const actionData = rootActions.length > 0 ? rootActions[0] : null;
        
        setRootAction(actionData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    if (actionId) {
      fetchActionTree();
    }
  }, [actionId]);

  // Create nodes and edges using useMemo
  const { nodes, edges } = useMemo(() => {
    if (!rootAction) {
      return { nodes: [], edges: [] };
    }

    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];
    
    // Ensure root action has valid ID
    if (!rootAction.id) {
      console.error('Root action missing ID:', rootAction);
      return { nodes: [], edges: [] };
    }
    
    // Add the root node
    flowNodes.push({
      id: String(rootAction.id),
      position: { x: 400, y: 50 },
      data: { 
        label: rootAction.title || 'Untitled'
      }
    });
    
    // Add child nodes in a grid layout
    (rootAction.children || []).forEach((child, index) => {
      // Ensure child has valid ID
      if (!child.id) {
        console.error('Child action missing ID:', child);
        return;
      }
      
      const col = index % 3;
      const row = Math.floor(index / 3);
      
      flowNodes.push({
        id: String(child.id),
        position: { 
          x: 150 + (col * 200), 
          y: 200 + (row * 100) 
        },
        data: { 
          label: child.title || 'Untitled'
        }
      });
      
      // Add edge from root to child
      flowEdges.push({
        id: `edge-${String(rootAction.id)}-${String(child.id)}`,
        source: String(rootAction.id),
        target: String(child.id)
      });
    });

    console.log('Generated nodes:', flowNodes.map(n => ({ id: n.id, label: n.data.label })));
    return { nodes: flowNodes, edges: flowEdges };
  }, [rootAction]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    router.push(`/flow/${node.id}`);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return <div className="flex items-center justify-center h-screen text-red-500">Error: {error}</div>;
  }

  if (!rootAction) {
    return <div className="flex items-center justify-center h-screen">Action not found</div>;
  }

  return (
    <div className="h-screen">
      <div className="p-4 bg-gray-100 border-b">
        <h1 className="text-2xl font-bold">{rootAction.title}</h1>
        <p className="text-gray-600">Status: {rootAction.done ? 'Completed' : 'In Progress'}</p>
        <p className="text-sm text-gray-500">
          Showing {(rootAction.children || []).length} child action{(rootAction.children || []).length !== 1 ? 's' : ''}
        </p>
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