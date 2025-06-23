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
}

export default function ActionTree({ actions, colors }: ActionTreeProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
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
              <a
                href={`/tree/${action.id}`}
                style={{
                  fontSize: '0.7rem',
                  color: colors.textSubtle,
                  textDecoration: 'none',
                  padding: '2px 6px',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '4px',
                  backgroundColor: 'white',
                  transition: 'all 0.2s ease',
                  flexShrink: 0
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = colors.borderAccent;
                  el.style.borderColor = colors.borderAccent;
                  el.style.backgroundColor = colors.bg;
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = colors.textSubtle;
                  el.style.borderColor = colors.border;
                  el.style.backgroundColor = 'white';
                }}
              >
                tree
              </a>
            </div>
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

  return (
    <>
      {actions.map((action: any) => renderAction(action))}
    </>
  );
}