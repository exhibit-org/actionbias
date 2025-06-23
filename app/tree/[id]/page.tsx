'use client';

import { useState, useEffect } from 'react';

interface TreeData {
  rootActions: any[];
  rootAction?: string;
  scope?: string;
}

export default function ScopedTreePage({ params }: { params: Promise<{ id: string }> }) {
  const [rootActionId, setRootActionId] = useState<string | null>(null);
  const [scopeTitle, setScopeTitle] = useState<string>('');
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

  const toggleExpanded = (actionId: string) => {
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

  // Recursive function to render action tree
  const renderAction = (action: any, depth: number = 0): React.ReactNode => {
    const indentLevel = depth * 1.5; // 1.5rem per level
    const hasChildren = action.children && action.children.length > 0;
    const isExpanded = expandedNodes.has(action.id);
    
    return (
      <div key={action.id} style={{ marginLeft: `${indentLevel}rem` }}>
        <div style={{
          marginBottom: '0.5rem',
          padding: '0.75rem',
          backgroundColor: 'white',
          border: `1px solid ${colors.border}`,
          borderRadius: '0.25rem',
          borderLeft: action.done ? `4px solid ${colors.textFaint}` : `4px solid ${colors.borderAccent}`
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.25rem'
          }}>
            {hasChildren && (
              <button
                onClick={() => toggleExpanded(action.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '16px',
                  height: '16px',
                  fontSize: '0.75rem',
                  color: colors.textSubtle,
                  transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s ease'
                }}
                onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = colors.borderAccent}
                onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = colors.textSubtle}
              >
                ▶
              </button>
            )}
            {!hasChildren && (
              <div style={{ width: '16px', height: '16px' }}></div>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: action.done ? colors.textFaint : colors.borderAccent,
              fontWeight: '500'
            }}>
              {action.done ? '✓' : ''}
            </span>
            <a 
              href={`/${action.id}`}
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: action.done ? colors.textFaint : colors.text,
                textDecoration: 'none'
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
            >
              {action.title}
            </a>
          </div>
          {hasChildren && (
            <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.75rem', color: colors.textSubtle }}>
                {action.children.length} child action{action.children.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
        {/* Render children recursively - only if expanded */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: '0.5rem' }}>
            {action.children.map((child: any) => renderAction(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  useEffect(() => {
    const fetchScopedTree = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Await the params
        const { id } = await params;
        setRootActionId(id);
        
        // Validate that the ID looks like a UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
          throw new Error(`Invalid action ID format: "${id}". Expected a UUID.`);
        }
        
        // First, get the scope action details to show its title
        const scopeResponse = await fetch(`/api/actions/${id}`);
        if (!scopeResponse.ok) {
          if (scopeResponse.status === 404) {
            throw new Error(`Action not found: ${id}`);
          }
          throw new Error(`Failed to fetch scope action: ${scopeResponse.status}`);
        }
        const scopeData = await scopeResponse.json();
        if (!scopeData.success) {
          throw new Error(scopeData.error || 'Failed to fetch scope action');
        }
        setScopeTitle(scopeData.data.title);

        // Then fetch the scoped tree data
        const treeResponse = await fetch(`/api/actions/tree/${id}?includeCompleted=false`);
        if (!treeResponse.ok) {
          throw new Error(`Failed to fetch scoped tree: ${treeResponse.status}`);
        }
        const treeResult = await treeResponse.json();
        if (!treeResult.success) {
          throw new Error(treeResult.error || 'Failed to fetch scoped tree');
        }
        
        setTreeData(treeResult.data);
      } catch (err) {
        console.error('Error fetching scoped tree:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch scoped tree');
      } finally {
        setLoading(false);
      }
    };

    fetchScopedTree();
  }, [params]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header Skeleton */}
        <div style={{
          backgroundColor: 'white',
          borderBottom: `1px solid ${colors.border}`,
          padding: '1rem'
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '12px',
              height: '12px',
              backgroundColor: colors.border,
              borderRadius: '50%',
              flexShrink: 0
            }}></div>
            <div>
              <div style={{ height: '1.125rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '200px', marginBottom: '0.25rem' }}></div>
              <div style={{ height: '0.875rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '300px' }}></div>
            </div>
          </div>
        </div>

        {/* Main Content Loading */}
        <div style={{
          flex: '1',
          overflow: 'auto',
          padding: '2rem 1rem 1rem 1rem'
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto'
          }}>
            <div style={{
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: '0.5rem',
              padding: '1.5rem'
            }}>
              <div style={{ height: '1.5rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '60%', marginBottom: '1rem' }}></div>
              <div style={{ height: '1rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '40%', marginBottom: '0.5rem' }}></div>
              <div style={{ height: '1rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '50%', marginBottom: '0.5rem' }}></div>
              <div style={{ height: '1rem', backgroundColor: colors.border, borderRadius: '0.25rem', width: '45%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.bg,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          flex: '1',
          overflow: 'auto',
          padding: '2rem 1rem 1rem 1rem'
        }}>
          <div style={{
            maxWidth: '48rem',
            margin: '0 auto'
          }}>
            <div style={{ 
              backgroundColor: colors.surface, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
              borderLeft: `4px solid ${colors.borderAccent}` 
            }}>
              <h2 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: colors.text, 
                marginBottom: '0.5rem' 
              }}>
                Error Loading Scoped Tree
              </h2>
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
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.bg,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Project Scope Header */}
      <div style={{
        backgroundColor: 'white',
        borderBottom: `1px solid ${colors.border}`,
        padding: '1rem'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '12px',
            height: '12px',
            backgroundColor: colors.borderAccent,
            borderRadius: '50%',
            flexShrink: 0
          }}></div>
          <div>
            <h1 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.text,
              margin: '0 0 0.25rem 0'
            }}>
              Project Tree: {scopeTitle}
            </h1>
            <p style={{
              fontSize: '0.875rem',
              color: colors.textMuted,
              margin: 0
            }}>
              Scoped to this project • <a 
                href={`/${rootActionId}`}
                style={{ 
                  color: colors.textSubtle, 
                  textDecoration: 'none' 
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
              >
                View action details
              </a> • <a 
                href="/next"
                style={{ 
                  color: colors.textSubtle, 
                  textDecoration: 'none' 
                }}
                onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
                onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
              >
                All projects
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Area - Scrollable */}
      <div style={{
        flex: '1',
        overflow: 'auto',
        padding: '2rem 1rem 1rem 1rem'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto'
        }}>
          {treeData && treeData.rootActions.length > 0 ? (
            <div style={{
              backgroundColor: 'white',
              border: `1px solid ${colors.border}`,
              borderRadius: '0.5rem',
              padding: '1.5rem'
            }}>
              <h2 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: colors.text,
                marginBottom: '1rem'
              }}>
                Action Tree Structure
              </h2>
              <div style={{
                fontSize: '0.875rem',
                color: colors.textMuted,
                marginBottom: '1rem',
                padding: '0.75rem',
                backgroundColor: colors.surface,
                borderRadius: '0.25rem',
                border: `1px solid ${colors.border}`
              }}>
                <strong>Scope:</strong> {scopeTitle} ({treeData.rootActions.length} action{treeData.rootActions.length !== 1 ? 's' : ''}) (excluding completed)
              </div>
              {treeData.rootActions.map((action: any) => renderAction(action))}
            </div>
          ) : (
            <div style={{ 
              backgroundColor: colors.surface, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.5rem', 
              padding: '1.5rem', 
              borderLeft: `4px solid ${colors.borderAccent}` 
            }}>
              <h2 style={{ 
                fontSize: '1.125rem', 
                fontWeight: '600', 
                color: colors.text, 
                marginBottom: '0.5rem' 
              }}>
                No Actions in Scope
              </h2>
              <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>
                "{scopeTitle}" has no visible actions. This might mean all actions are completed or the project is empty.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <a 
                  href={`/${rootActionId}`}
                  style={{ 
                    display: 'inline-block',
                    padding: '0.5rem 1rem', 
                    backgroundColor: colors.borderAccent, 
                    color: 'white', 
                    borderRadius: '0.25rem', 
                    textDecoration: 'none',
                    fontSize: '0.875rem' 
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '0.8'}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.opacity = '1'}
                >
                  View Action Details
                </a>
                <a 
                  href={`/api/actions/tree/${rootActionId}?includeCompleted=false`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ 
                    display: 'inline-block',
                    padding: '0.5rem 1rem', 
                    backgroundColor: colors.surface, 
                    color: colors.text,
                    border: `1px solid ${colors.border}`,
                    borderRadius: '0.25rem', 
                    textDecoration: 'none',
                    fontSize: '0.875rem' 
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.border}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.backgroundColor = colors.surface}
                >
                  View Tree Data (API)
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Persistent Footer */}
      <footer style={{
        backgroundColor: '#ffffff',
        borderTop: `1px solid ${colors.border}`,
        padding: '1.5rem 1rem',
        marginTop: 'auto'
      }}>
        <div style={{
          maxWidth: '48rem',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            marginBottom: '1rem'
          }}>
            <h3 style={{
              fontSize: '1.125rem',
              fontWeight: '600',
              color: colors.text,
              margin: '0 0 0.5rem 0'
            }}>
              ActionBias
            </h3>
            <p style={{
              fontSize: '0.875rem',
              color: colors.textMuted,
              margin: '0 0 0.75rem 0',
              lineHeight: '1.5'
            }}>
              Cross-LLM persistent planning system for focused action taking
            </p>
            <p style={{
              fontSize: '0.75rem',
              color: colors.textSubtle,
              margin: 0,
              lineHeight: '1.4'
            }}>
              Stay focused on what matters most. Break down complex projects into actionable steps with context-aware prioritization.
            </p>
          </div>
          
          <div style={{
            fontSize: '0.75rem',
            color: colors.textFaint,
            borderTop: `1px solid ${colors.border}`,
            paddingTop: '0.75rem'
          }}>
            Single-user instance • <a href="https://github.com/exhibit-org/actionbias" style={{ color: colors.textSubtle, textDecoration: 'none' }}>Open Source</a>
          </div>
        </div>
      </footer>
    </div>
  );
}