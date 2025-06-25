'use client';

import React, { useState, useEffect } from 'react';
import ActionTree from './ActionTree';
import Footer from './Footer';
import { usePathname } from 'next/navigation';

interface TreeSidebarLayoutProps {
  children: React.ReactNode;
  colors: {
    bg: string;
    surface: string;
    border: string;
    borderAccent: string;
    text: string;
    textMuted: string;
    textSubtle: string;
    textFaint: string;
  };
}

export default function TreeSidebarLayout({ children, colors }: TreeSidebarLayoutProps) {
  const [treeData, setTreeData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const pathname = usePathname();
  
  // Extract current action ID from pathname
  const currentActionId = pathname?.split('/')[1] || '';

  useEffect(() => {
    const fetchTreeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/actions/tree?includeCompleted=false');
        if (!response.ok) {
          throw new Error(`Failed to fetch tree: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || 'Failed to fetch tree');
        }
        
        setTreeData(result.data);
      } catch (err) {
        console.error('Error fetching tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tree');
      } finally {
        setLoading(false);
      }
    };

    fetchTreeData();
  }, []);

  // Calculate path to current action and merge with existing expanded nodes
  useEffect(() => {
    if (!treeData || !currentActionId) return;
    
    const pathToCurrentAction: string[] = [];
    
    const findPath = (nodes: any[], target: string, path: string[] = []): boolean => {
      for (const node of nodes) {
        if (node.id === target) {
          pathToCurrentAction.push(...path);
          return true;
        }
        if (node.children && node.children.length > 0) {
          if (findPath(node.children, target, [...path, node.id])) {
            return true;
          }
        }
      }
      return false;
    };
    
    if (treeData.rootActions) {
      findPath(treeData.rootActions, currentActionId);
    }
    
    // Merge path to current action with existing expanded nodes
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      pathToCurrentAction.forEach(id => newSet.add(id));
      return newSet;
    });
  }, [treeData, currentActionId]);

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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Tree Sidebar */}
        <div style={{
          width: sidebarCollapsed ? '0' : '320px',
          minWidth: sidebarCollapsed ? '0' : '320px',
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          overflow: 'hidden',
          transition: 'width 0.3s ease',
          position: 'relative'
        }}>
          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            style={{
              position: 'absolute',
              right: '-20px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '20px',
              height: '60px',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderLeft: 'none',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: colors.textSubtle,
              zIndex: 10
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = colors.bg;
              e.currentTarget.style.color = colors.text;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = colors.surface;
              e.currentTarget.style.color = colors.textSubtle;
            }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
          
          {/* Tree Content */}
          <div style={{
            padding: '1rem',
            overflowY: 'auto',
            height: '100%',
            opacity: sidebarCollapsed ? 0 : 1,
            transition: 'opacity 0.3s ease'
          }}>
            {loading ? (
              <p style={{ color: colors.textMuted }}>Loading tree...</p>
            ) : error ? (
              <p style={{ color: colors.textMuted }}>Error: {error}</p>
            ) : treeData && treeData.rootActions.length > 0 ? (
              <ActionTree 
                actions={treeData.rootActions} 
                colors={colors} 
                expandedNodes={expandedNodes}
                onToggleExpanded={handleToggleExpanded}
              />
            ) : (
              <p style={{ color: colors.textMuted }}>No actions available</p>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '2rem 1rem 12rem 1rem',
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto',
          }}>
            {children}
          </div>
        </div>
      </div>
      
      <Footer colors={colors} />
    </div>
  );
}