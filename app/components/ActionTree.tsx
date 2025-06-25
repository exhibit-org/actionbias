'use client';

import Link from 'next/link';

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
  expandedNodes: Set<string>;
  onToggleExpanded: (actionId: string) => void;
}

export default function ActionTree({ actions, colors, expandedNodes, onToggleExpanded }: ActionTreeProps) {

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
    // Parent has: count (2rem) + margin (0.25rem) + triangle (16px) + gap (0.15rem) + checkmark (16px) + gap (0.15rem)
    const indentLevel = depth > 0 ? `calc(${depth} * (2rem + 0.25rem + 16px + 0.15rem + 16px + 0.15rem))` : '0';
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
            {hasChildren && (
              <Link
                href={`/tree/${action.id}`}
                prefetch={true}
                style={{ 
                  fontSize: '0.75rem', 
                  color: colors.textSubtle,
                  textDecoration: 'none',
                  minWidth: '2rem',
                  textAlign: 'right',
                  marginRight: '0.25rem'
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.textDecoration = 'underline';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.textDecoration = 'none';
                }}
              >
                {countAllDescendants(action)}
              </Link>
            )}
            {!hasChildren && (
              <div style={{ minWidth: '2rem', marginRight: '0.25rem' }}></div>
            )}
            {hasChildren ? (
              <button
                onClick={() => onToggleExpanded(action.id)}
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
            <Link 
              href={`/${action.id}`}
              prefetch={true}
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
            </Link>
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