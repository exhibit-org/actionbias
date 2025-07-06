'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ResponsiveTreeMap } from '@nivo/treemap';
import { ActionTreeResource, ActionNode } from '../../../lib/types/resources';

interface TreemapNode {
  id: string;
  name: string;
  value?: number;
  color?: string;
  children?: TreemapNode[];
}

function transformToTreemapData(actionNodes: ActionNode[]): TreemapNode[] {
  return actionNodes.map(node => {
    const childrenData = node.children.length > 0 ? transformToTreemapData(node.children) : [];
    
    const result: TreemapNode = {
      id: node.id,
      name: node.title,
      color: childrenData.length > 0 ? '#374151' : '#4b5563',
    };
    
    if (childrenData.length > 0) {
      result.children = childrenData;
    } else {
      result.value = 1;
    }
    
    return result;
  });
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

  // If the target action has no children, show it as a single node
  const treemapData = targetAction.children.length > 0 ? {
    name: targetAction.title,
    children: transformToTreemapData(targetAction.children)
  } : {
    name: targetAction.title,
    value: 1,
    color: '#4b5563'
  };

  return (
    <div className="w-full h-screen bg-black">
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
            <ResponsiveTreeMap
              data={treemapData}
              identity="id"
              value="value"
              colors={({ data }) => (data as any).color || '#4b5563'}
              margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
              leavesOnly={false}
              tile="squarify"
              innerPadding={2}
              outerPadding={0}
              labelSkipSize={20}
              parentLabelSize={16}
              enableParentLabel={true}
              labelTextColor="#d1d5db"
              parentLabelTextColor="#f3f4f6"
              borderWidth={0}
              animate={true}
              motionConfig="gentle"
              onClick={handleNodeClick}
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
                if (width < 80 || height < 40) return '';
                return name.length > 15 ? name.substring(0, 12) + '...' : name;
              }}
              parentLabel={({ data, width, height }) => {
                const name = (data as any).name;
                if (width < 120 || height < 60) return '';
                return name.length > 25 ? name.substring(0, 22) + '...' : name;
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