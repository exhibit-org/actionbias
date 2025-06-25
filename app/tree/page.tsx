'use client';

import { useState, useEffect } from 'react';
import ActionTree from '../components/ActionTree';
import Footer from '../components/Footer';

interface TreeData {
  rootActions: any[];
}

export default function GlobalTreePage() {
  const [treeData, setTreeData] = useState<TreeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  // Full grayscale color scheme with enhanced visual hierarchy
  const colors = {
    bg: '#f9fafb',           // Very light gray background
    surface: '#f3f4f6',      // Light gray surface  
    border: '#e5e7eb',       // Medium gray border
    borderAccent: '#1f2937', // Very dark gray accent (no color, maximum contrast)
    text: '#111827',         // Very dark gray (black) for primary text
    textMuted: '#4b5563',    // Medium dark gray for secondary text
    textSubtle: '#6b7280',   // Medium gray for tertiary text
    textFaint: '#9ca3af'     // Light gray for faint text/metadata
  };

  useEffect(() => {
    const fetchGlobalTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch the global tree data
        const treeResponse = await fetch(`/api/actions/tree?includeCompleted=false`);
        if (!treeResponse.ok) {
          throw new Error(`Failed to fetch global tree: ${treeResponse.status}`);
        }
        const treeResult = await treeResponse.json();
        if (!treeResult.success) {
          throw new Error(treeResult.error || 'Failed to fetch global tree');
        }
        
        setTreeData(treeResult.data);
        
        // Initially expand all nodes
        const allNodeIds: string[] = [];
        const collectAllIds = (actions: any[]) => {
          actions.forEach(action => {
            allNodeIds.push(action.id);
            if (action.children && action.children.length > 0) {
              collectAllIds(action.children);
            }
          });
        };
        if (treeResult.data?.rootActions) {
          collectAllIds(treeResult.data.rootActions);
        }
        setExpandedNodes(new Set(allNodeIds));
      } catch (err) {
        console.error('Error fetching global tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch global tree');
      } finally {
        setLoading(false);
      }
    };

    fetchGlobalTree();
  }, []);

  const handleToggleExpanded = (actionId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(actionId)) {
        newSet.delete(actionId);
      } else {
        newSet.add(actionId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div style={{
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: colors.textMuted
      }}>
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '2rem',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '0.5rem 1rem', 
            backgroundColor: colors.borderAccent, 
            color: 'white', 
            borderRadius: '0.25rem', 
            border: 'none', 
            cursor: 'pointer', 
            fontSize: '0.875rem' 
          }}
          onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
          onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      <div style={{
        padding: '2rem',
        paddingBottom: '12rem', // Add extra padding for sticky footer
        fontFamily: 'system-ui, -apple-system, sans-serif',
        minHeight: '100vh'
      }}>
        {treeData && treeData.rootActions.length > 0 ? (
          <ActionTree 
            actions={treeData.rootActions} 
            colors={colors} 
            expandedNodes={expandedNodes}
            onToggleExpanded={handleToggleExpanded}
          />
        ) : (
          <p style={{ color: colors.textMuted }}>
            No actions are currently available. This might mean all actions are completed or no actions have been created yet.
          </p>
        )}
      </div>
      <Footer colors={colors} />
    </>
  );
}