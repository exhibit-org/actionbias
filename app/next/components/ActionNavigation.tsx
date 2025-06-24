'use client';
import { ActionDetailResource, ActionMetadata } from '../../../lib/types/resources';
import { ColorScheme } from './types';

interface Props {
  action: ActionDetailResource;
  siblings: ActionMetadata[];
  colors: ColorScheme;
  nextChildId?: string | null;
}

export default function ActionNavigation({ action, siblings, colors, nextChildId }: Props) {
  const hasFamily = action.parent_chain && action.parent_chain.length > 0;
  const hasChildren = action.children && action.children.length > 0;
  const hasSiblings = siblings && siblings.length > 0;
  const hasNavigation = hasFamily || hasChildren || hasSiblings;

  if (!hasNavigation) return (
    <div style={{
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: `1px solid ${colors.border}`
    }} />
  );

  return (
    <div style={{
      marginTop: '1.5rem',
      paddingTop: '1rem',
      borderTop: `1px solid ${colors.border}`
    }}>
      <div style={{
        marginBottom: '1.5rem',
        padding: '1rem',
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        borderRadius: '0.5rem'
      }}>
        {hasFamily && (
          <div style={{ marginBottom: hasChildren || hasSiblings ? '1rem' : 0 }}>
            <div style={{
              fontSize: '0.75rem',
              color: colors.textMuted,
              marginBottom: '0.5rem',
              fontWeight: 500
            }}>
              HIERARCHY
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              {action.parent_chain.map((parent, index) => (
                <div key={parent.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <a
                    href={`/${parent.id}`}
                    style={{
                      color: colors.textSubtle,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor: 'white',
                      border: `1px solid ${colors.border}`,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = colors.bg;
                      e.currentTarget.style.borderColor = colors.borderAccent;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.borderColor = colors.border;
                    }}
                  >
                    {parent.title}
                  </a>
                  {index < action.parent_chain.length - 1 && (
                    <svg style={{ width: '12px', height: '12px', color: colors.textFaint }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg style={{ width: '12px', height: '12px', color: colors.textFaint }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                <span style={{
                  color: colors.text,
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.borderAccent}`
                }}>
                  {action.title}
                </span>
              </div>
            </div>
          </div>
        )}

        {hasChildren && (
          <div style={{ marginBottom: hasSiblings ? '1rem' : 0 }}>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '0.5rem', fontWeight: 500 }}>
              ACTIONS IN FAMILY ({action.children.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {action.children.map(child => (
                <a
                  key={child.id}
                  href={`/${child.id}`}
                  style={{
                    color: child.done ? colors.textFaint : colors.text,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    border: `1px solid ${colors.border}`,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = colors.bg;
                    e.currentTarget.style.borderColor = colors.borderAccent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '0.125rem',
                    backgroundColor: child.done ? colors.borderAccent : 'transparent',
                    border: `1px solid ${child.done ? colors.borderAccent : colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {child.done && (
                      <svg style={{ width: '6px', height: '6px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span style={{ textDecoration: child.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {child.title}
                  </span>
                  {nextChildId === child.id && (
                    <span data-testid="next-child-indicator" style={{ fontSize: '0.625rem', color: colors.borderAccent, fontWeight: 600 }}>
                      Next Action
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        {hasSiblings && (
          <div style={{ marginBottom: 0 }}>
            <div style={{ fontSize: '0.75rem', color: colors.textMuted, marginBottom: '0.5rem', fontWeight: 500 }}>
              RELATED ACTIONS ({siblings.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {siblings.map(sibling => (
                <a
                  key={sibling.id}
                  href={`/${sibling.id}`}
                  style={{
                    color: sibling.done ? colors.textFaint : colors.text,
                    textDecoration: 'none',
                    fontSize: '0.875rem',
                    padding: '0.5rem',
                    borderRadius: '0.25rem',
                    backgroundColor: 'white',
                    border: `1px solid ${colors.border}`,
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.backgroundColor = colors.bg;
                    e.currentTarget.style.borderColor = colors.borderAccent;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.backgroundColor = 'white';
                    e.currentTarget.style.borderColor = colors.border;
                  }}
                >
                  <div style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '0.125rem',
                    backgroundColor: sibling.done ? colors.borderAccent : 'transparent',
                    border: `1px solid ${sibling.done ? colors.borderAccent : colors.border}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    {sibling.done && (
                      <svg style={{ width: '6px', height: '6px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span style={{ textDecoration: sibling.done ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {sibling.title}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ fontSize: '0.75rem', color: colors.textMuted, fontWeight: 500, marginRight: '0.5rem' }}>NAVIGATE:</div>
          <a
            href="/next"
            style={{
              color: colors.textSubtle,
              textDecoration: 'none',
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: 'white',
              border: `1px solid ${colors.border}`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = colors.bg;
              e.currentTarget.style.borderColor = colors.borderAccent;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'white';
              e.currentTarget.style.borderColor = colors.border;
            }}
          >
            Next Action
          </a>
          {action.dependencies.length > 0 && (
            <span style={{
              color: colors.textFaint,
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`
            }}>
              {action.dependencies.length} Dependencies
            </span>
          )}
          {action.dependents.length > 0 && (
            <span style={{
              color: colors.textFaint,
              fontSize: '0.75rem',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              backgroundColor: colors.surface,
              border: `1px solid ${colors.border}`
            }}>
              {action.dependents.length} Dependents
            </span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.75rem', color: colors.textFaint }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            style={{ width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px', flexShrink: 0, color: colors.textFaint }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <span style={{ fontFamily: 'monospace' }}>ID: {action.id}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <svg
            style={{ width: '12px', height: '12px', minWidth: '12px', maxWidth: '12px', flexShrink: 0, color: colors.textFaint }}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Created: {new Date(action.created_at).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
}
