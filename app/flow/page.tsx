'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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

export default function FlowPage() {
  const router = useRouter();
  const [actions, setActions] = useState<ActionNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRootActions();
  }, []);

  const fetchRootActions = async () => {
    try {
      setLoading(true);
      // Fetch the action tree which contains root actions
      const response = await fetch('/api/actions/tree?includeCompleted=false');
      if (!response.ok) {
        throw new Error('Failed to fetch action tree');
      }
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch actions');
      }
      
      // Extract root actions from the tree structure
      const rootActions = result.data.rootActions || [];
      
      setActions(rootActions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Create nodes using useMemo
  const { nodes, edges } = useMemo(() => {
    const flowNodes: Node[] = actions.map((action, index) => {
      // Calculate position in a grid layout
      const gridSize = Math.ceil(Math.sqrt(actions.length));
      const row = Math.floor(index / gridSize);
      const col = index % gridSize;
      
      return {
        id: action.id,
        type: 'default',
        position: { 
          x: col * 300 + 50, 
          y: row * 150 + 50 
        },
        data: { 
          label: action.title
        },
        style: {
          width: 250,
          border: action.done ? '2px solid #10b981' : '2px solid #3b82f6',
          borderRadius: '8px',
          backgroundColor: action.done ? '#ecfdf5' : '#eff6ff',
          cursor: 'pointer'
        }
      };
    });

    return { nodes: flowNodes, edges: [] };
  }, [actions]);

  const onNodeClick = (_event: React.MouseEvent, node: Node) => {
    router.push(`/flow/${node.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading root actions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="h-screen">
      <div className="h-16 bg-white border-b flex items-center px-6">
        <h1 className="text-2xl font-bold">Root Actions Flow</h1>
        <div className="ml-4 text-sm text-gray-600">
          {actions.length} root actions
        </div>
      </div>
      
      <div className="h-[calc(100vh-4rem)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          connectionMode={ConnectionMode.Loose}
          fitView
          fitViewOptions={{ padding: 0.2 }}
        >
          <Controls />
          <Background color="#aaa" gap={16} />
        </ReactFlow>
      </div>
    </div>
  );
}