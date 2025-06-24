'use client';

import { useState } from 'react';

interface ActionTreeProps {
  actions: any[];
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
  initiallyExpanded?: string[];
}

export default function ActionTree({ actions, colors, initiallyExpanded = [] }: ActionTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set(initiallyExpanded));

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

  // Recursive function to count all descendants
  const countAllDescendants = (action: any): number => {
    if (!action.children || action.children.length === 0) {
      return 0;
    }
    
    let count = action.children.length;
    for (const child of action.children) {
      count += countAllDescendants(child);
    }
    return count;
  };

  // Recursive function to render action tree
  const renderAction = (action: any, depth: number = 0): React.ReactNode => {
    // Indent so child triangle aligns with parent text
    // Parent has: triangle (16px) + gap (0.15rem) + checkmark (16px) + gap (0.15rem)
    const indentLevel = depth > 0 ? `calc(${depth} * (16px + 0.15rem + 16px + 0.15rem))` : '0';
    const hasChildren = action.children && action.children.length > 0;
    const isExpanded = expandedNodes.has(action.id);
    
    return (
      <div key={action.id} style={{ marginLeft: indentLevel }}>
        <div style={{
          marginBottom: '0.25rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.15rem'
          }}>
            {hasChildren ? (
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
            ) : (
              <div style={{ 
                width: '16px', 
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                color: colors.textSubtle
              }}>
                ▷
              </div>
            )}
            <span style={{
              fontSize: '0.75rem',
              color: action.done ? colors.textFaint : colors.borderAccent,
              fontWeight: '500',
              width: '16px',
              display: 'inline-block'
            }}>
              {action.done ? '✓' : ''}
            </span>
            <a 
              href={`/${action.id}`}
              style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: action.done ? colors.textFaint : colors.text,
                textDecoration: 'none',
                flex: 1
              }}
              onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline'}
              onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none'}
            >
              {action.title}
            </a>
            {hasChildren && (
              <a
                href={`/tree/${action.id}`}
                style={{ 
                  fontSize: '0.75rem', 
                  color: colors.textSubtle,
                  textDecoration: 'none',
                  marginLeft: '0.75rem'
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = colors.borderAccent;
                  el.style.textDecoration = 'underline';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = colors.textSubtle;
                  el.style.textDecoration = 'none';
                }}
              >
                {countAllDescendants(action)}
              </a>
            )}
          </div>
        </div>
        {/* Render children recursively - only if expanded */}
        {hasChildren && isExpanded && (
          <div style={{ marginTop: '0.25rem' }}>
            {action.children.map((child: any) => renderAction(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {actions.map((action: any) => renderAction(action))}
    </>
  );
}