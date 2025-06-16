'use client';

// Add CSS for spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
}

import { useState, useEffect } from 'react';

interface ActionMetadata {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
}

interface NextActionData {
  id: string;
  title: string;
  description?: string;
  vision?: string;
  done: boolean;
  version: number;
  created_at: string;
  updated_at: string;
  parent_id?: string;
  parent_chain: ActionMetadata[];
  children: ActionMetadata[];
  dependencies: ActionMetadata[];
  dependents: ActionMetadata[];
}

interface ColorScheme {
  bg: string;
  surface: string;
  border: string;
  borderAccent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;
}

interface Props {
  colors: ColorScheme;
}

export default function NextActionDisplay({ colors }: Props) {
  const [nextAction, setNextAction] = useState<NextActionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    const fetchNextAction = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch from the REST API endpoint
        const response = await fetch('/api/actions/next');

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to fetch next action');
        }

        setNextAction(data.data);
      } catch (err) {
        console.error('Error fetching next action:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch next action');
      } finally {
        setLoading(false);
      }
    };

    fetchNextAction();
  }, []);

  const markComplete = async () => {
    if (!nextAction) return;
    
    try {
      setCompleting(true);
      setError(null);
      
      // Call the REST API to update the action
      const response = await fetch(`/api/actions/${nextAction.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          done: true
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to mark action as complete');
      }

      // Mark as completed and refresh after a short delay
      setCompleted(true);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err) {
      console.error('Error marking action complete:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark action as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <div data-testid="loading-skeleton">
          <div style={{
            height: '1.5rem',
            backgroundColor: colors.border,
            borderRadius: '0.25rem',
            width: '25%',
            marginBottom: '1rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: colors.border,
            borderRadius: '0.25rem',
            width: '75%',
            marginBottom: '0.5rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: colors.border,
            borderRadius: '0.25rem',
            width: '50%'
          }}></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
          Error Loading Next Action
        </h2>
        <p style={{
          color: colors.textMuted,
          marginBottom: '1rem'
        }}>{error}</p>
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
          onMouseEnter={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'}
          onMouseLeave={(e) => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!nextAction) {
    return (
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
          🎉 All Done!
        </h2>
        <p style={{
          color: colors.textMuted
        }}>
          No next action found. You're all caught up!
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem'
    }}>
      {/* Main Action Content with integrated Mark Complete button */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{
          backgroundColor: 'white',
          border: `2px solid ${colors.borderAccent}`,
          borderRadius: '0.5rem',
          padding: '1.5rem',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          {/* Mark Complete Button inside card */}
          <div style={{ marginBottom: '1.5rem' }}>
            {completed ? (
              <div style={{
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: '0.5rem',
                padding: '1rem',
                textAlign: 'center',
                borderLeft: `4px solid ${colors.borderAccent}`
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  gap: '0.75rem' 
                }}>
                  <div style={{
                    height: '2rem',
                    width: '2rem',
                    backgroundColor: colors.borderAccent,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <svg 
                      style={{
                        width: '20px', 
                        height: '20px', 
                        minWidth: '20px', 
                        maxWidth: '20px',
                        color: 'white',
                        flexShrink: 0
                      }} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: colors.text,
                      margin: '0 0 0.25rem 0'
                    }}>
                      Action Completed! 🎉
                    </p>
                    <p style={{
                      fontSize: '0.875rem',
                      color: colors.textMuted,
                      margin: 0
                    }}>
                      Loading next action...
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <button
                onClick={markComplete}
                disabled={completing}
                style={{
                  width: '100%',
                  borderRadius: '0.5rem',
                  padding: '1rem 1.5rem',
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: 'white',
                  transition: 'opacity 0.2s ease',
                  backgroundColor: completing ? colors.textFaint : colors.borderAccent,
                  backgroundImage: completing ? 'none' : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.1) 10px, rgba(255,255,255,0.1) 20px)',
                  border: 'none',
                  cursor: completing ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
                }}
                onMouseEnter={(e) => {
                  if (!completing) {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '0.8';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!completing) {
                    (e.currentTarget as HTMLButtonElement).style.opacity = '1';
                  }
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  {completing ? (
                    <>
                      <svg 
                        style={{
                          width: '20px', 
                          height: '20px', 
                          minWidth: '20px', 
                          maxWidth: '20px',
                          flexShrink: 0,
                          animation: 'spin 1s linear infinite'
                        }} 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle style={{opacity: 0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path style={{opacity: 0.75}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span>Marking Complete...</span>
                    </>
                  ) : (
                    <>
                      <svg 
                        style={{
                          width: '20px', 
                          height: '20px', 
                          minWidth: '20px', 
                          maxWidth: '20px',
                          flexShrink: 0
                        }} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Mark Complete</span>
                    </>
                  )}
                </div>
              </button>
            )}
          </div>
          <h1 style={{ 
            fontSize: '1.25rem', 
            fontWeight: '700', 
            color: colors.text,
            margin: '0 0 0.75rem 0'
          }}>
            {nextAction.title}
          </h1>
          
          {nextAction.description && (
            <p style={{ 
              fontSize: '1rem', 
              color: colors.textMuted, 
              margin: '0 0 1rem 0',
              lineHeight: '1.6' 
            }}>
              {nextAction.description}
            </p>
          )}
          
          {nextAction.vision && (
            <div style={{ 
              backgroundColor: colors.surface, 
              borderLeft: `4px solid ${colors.borderAccent}`, 
              borderTopRightRadius: '0.25rem',
              borderBottomRightRadius: '0.25rem',
              padding: '1rem', 
              marginTop: '0.75rem' 
            }}>
              <div style={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '0.5rem' 
              }}>
                <svg 
                  style={{
                    width: '16px', 
                    height: '16px', 
                    minWidth: '16px', 
                    maxWidth: '16px',
                    color: colors.borderAccent,
                    marginTop: '0.125rem',
                    flexShrink: 0
                  }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <div style={{ flex: 1 }}>
                  <span style={{ 
                    fontWeight: '600', 
                    color: colors.text, 
                    fontSize: '0.875rem' 
                  }}>Vision:</span>
                  <p style={{ 
                    color: colors.textMuted, 
                    fontSize: '0.875rem', 
                    marginTop: '0.25rem', 
                    lineHeight: '1.5',
                    margin: '0.25rem 0 0 0'
                  }}>
                    {nextAction.vision}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Parent Context - Reduced visual prominence */}
      {nextAction.parent_chain.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '0.75rem' 
          }}>
            <svg 
              style={{
                width: '14px', 
                height: '14px', 
                minWidth: '14px', 
                maxWidth: '14px',
                color: colors.textFaint,
                flexShrink: 0
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 style={{ 
              fontSize: '0.75rem', 
              fontWeight: '500', 
              color: colors.textSubtle, 
              textTransform: 'uppercase', 
              letterSpacing: '0.1em',
              margin: 0
            }}>Context</h3>
          </div>
          
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem' 
          }}>
            {nextAction.parent_chain.slice().reverse().map((parent, index) => (
              <div 
                key={parent.id} 
                style={{
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.375rem',
                  padding: '0.75rem',
                  borderLeft: `2px solid ${colors.textFaint}`
                }}
              >
                <h4 style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: colors.textMuted,
                  margin: '0 0 0.375rem 0'
                }}>
                  {parent.title}
                </h4>
                
                {parent.description && (
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: colors.textSubtle, 
                    margin: '0 0 0.5rem 0',
                    lineHeight: '1.4' 
                  }}>
                    {parent.description}
                  </p>
                )}
                
                {parent.vision && (
                  <div style={{ 
                    backgroundColor: colors.surface, 
                    borderLeft: `2px solid ${colors.textFaint}`, 
                    borderTopRightRadius: '0.25rem',
                    borderBottomRightRadius: '0.25rem',
                    padding: '0.5rem', 
                    marginTop: '0.375rem' 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.5rem' 
                    }}>
                      <svg 
                        style={{
                          width: '12px', 
                          height: '12px', 
                          minWidth: '12px', 
                          maxWidth: '12px',
                          color: colors.textFaint,
                          marginTop: '0.125rem',
                          flexShrink: 0
                        }} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontWeight: '500', 
                          color: colors.textSubtle, 
                          fontSize: '0.6875rem' 
                        }}>Vision:</span>
                        <p style={{ 
                          color: colors.textSubtle, 
                          fontSize: '0.6875rem', 
                          marginTop: '0.25rem', 
                          lineHeight: '1.4',
                          margin: '0.25rem 0 0 0'
                        }}>
                          {parent.vision}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Metadata */}
      <div style={{
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${colors.border}`
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.75rem',
          color: colors.textFaint
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <svg 
              style={{
                width: '12px', 
                height: '12px', 
                minWidth: '12px', 
                maxWidth: '12px',
                flexShrink: 0,
                color: colors.textFaint
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
            </svg>
            <span style={{ fontFamily: 'monospace' }}>ID: {nextAction.id.slice(0, 8)}...</span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem' 
          }}>
            <svg 
              style={{
                width: '12px', 
                height: '12px', 
                minWidth: '12px', 
                maxWidth: '12px',
                flexShrink: 0,
                color: colors.textFaint
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Created: {new Date(nextAction.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}