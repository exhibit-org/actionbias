'use client';

import { useMemo } from 'react';
import ReactFlow, { 
  Controls, 
  Background, 
  Node, 
  Edge
} from 'reactflow';
import 'reactflow/dist/style.css';

// Define node types outside component to avoid recreation warnings
const nodeTypes = {};

export default function SimpleFlowPage() {
  // Create simple static nodes and edges
  const nodes: Node[] = useMemo(() => [
    {
      id: '1',
      position: { x: 0, y: 0 },
      data: { label: 'Hello' },
    },
    {
      id: '2',
      position: { x: 0, y: 100 },
      data: { label: 'World' },
    },
  ], []);

  const edges: Edge[] = useMemo(() => [
    {
      id: 'e1-2',
      source: '1',
      target: '2',
    },
  ], []);

  return (
    <div className="h-screen">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
      >
        <Controls />
        <Background />
      </ReactFlow>
    </div>
  );
}