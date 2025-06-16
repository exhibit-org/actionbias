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

export default function NextActionDisplay() {
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
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            width: '25%',
            marginBottom: '1rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: '#e5e7eb',
            borderRadius: '0.25rem',
            width: '75%',
            marginBottom: '0.5rem'
          }}></div>
          <div style={{
            height: '1rem',
            backgroundColor: '#e5e7eb',
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
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#991b1b',
          marginBottom: '0.5rem'
        }}>
          Error Loading Next Action
        </h2>
        <p style={{
          color: '#dc2626',
          marginBottom: '1rem'
        }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#dc2626',
            color: 'white',
            borderRadius: '0.25rem',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
          onMouseOver={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#b91c1c'}
          onMouseOut={(e) => (e.target as HTMLButtonElement).style.backgroundColor = '#dc2626'}
        >
          Retry
        </button>
      </div>
    );
  }

  if (!nextAction) {
    return (
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '0.5rem',
        padding: '1.5rem'
      }}>
        <h2 style={{
          fontSize: '1.125rem',
          fontWeight: '600',
          color: '#166534',
          marginBottom: '0.5rem'
        }}>
          🎉 All Done!
        </h2>
        <p style={{
          color: '#16a34a'
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
      {/* Mark Complete Button */}
      <div style={{ marginBottom: '1.5rem' }}>
        {completed ? (
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.5rem',
            padding: '1rem',
            textAlign: 'center'
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
                backgroundColor: '#22c55e',
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
                  color: '#166534',
                  margin: '0 0 0.25rem 0'
                }}>
                  Action Completed! 🎉
                </p>
                <p style={{
                  fontSize: '0.875rem',
                  color: '#16a34a',
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
              transition: 'background-color 0.2s ease',
              backgroundColor: completing ? '#9ca3af' : '#16a34a',
              border: 'none',
              cursor: completing ? 'not-allowed' : 'pointer',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
            }}
            onMouseEnter={(e) => {
              if (!completing) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#15803d';
              }
            }}
            onMouseLeave={(e) => {
              if (!completing) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#16a34a';
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

      {/* Main Action Content */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'flex-start', 
          gap: '0.75rem', 
          marginBottom: '1rem' 
        }}>
          <div style={{ 
            flexShrink: 0, 
            marginTop: '0.25rem' 
          }}>
            <div style={{ 
              height: '0.75rem', 
              width: '0.75rem', 
              backgroundColor: '#3b82f6', 
              borderRadius: '50%' 
            }}></div>
          </div>
          <h1 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 'bold', 
            color: '#111827', 
            lineHeight: '1.25',
            margin: 0
          }}>
            {nextAction.title}
          </h1>
        </div>
        
        {nextAction.description && (
          <div style={{ 
            marginLeft: '1.5rem', 
            marginBottom: '1rem' 
          }}>
            <p style={{ 
              color: '#374151', 
              fontSize: '1rem', 
              lineHeight: '1.625' 
            }}>
              {nextAction.description}
            </p>
          </div>
        )}
        
        {nextAction.vision && (
          <div style={{ 
            marginLeft: '1.5rem', 
            backgroundColor: '#eff6ff', 
            borderLeft: '4px solid #60a5fa', 
            borderTopRightRadius: '0.5rem',
            borderBottomRightRadius: '0.5rem',
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'flex-start', 
              gap: '0.75rem' 
            }}>
              <svg 
                style={{
                  width: '16px', 
                  height: '16px', 
                  minWidth: '16px', 
                  maxWidth: '16px',
                  color: '#2563eb',
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
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{ 
                  fontWeight: '600', 
                  color: '#1e3a8a', 
                  fontSize: '0.875rem' 
                }}>Vision:</span>
                <p style={{ 
                  color: '#1e40af', 
                  fontSize: '0.875rem', 
                  marginTop: '0.25rem', 
                  lineHeight: '1.625' 
                }}>
                  {nextAction.vision}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Parent Context */}
      {nextAction.parent_chain.length > 0 && (
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem', 
            marginBottom: '1rem' 
          }}>
            <svg 
              style={{
                width: '16px', 
                height: '16px', 
                minWidth: '16px', 
                maxWidth: '16px',
                color: '#6b7280',
                flexShrink: 0
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <h3 style={{ 
              fontSize: '0.875rem', 
              fontWeight: '600', 
              color: '#374151', 
              textTransform: 'uppercase', 
              letterSpacing: '0.05em',
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
                  backgroundColor: index === 0 ? '#f3f4f6' : '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '0.5rem',
                  padding: '1rem',
                  borderLeft: index === 0 ? '4px solid #3b82f6' : '4px solid #d1d5db'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  marginBottom: '0.5rem' 
                }}>
                  <span style={{
                    fontSize: '0.75rem',
                    color: '#6b7280',
                    backgroundColor: '#e5e7eb',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '0.25rem',
                    fontWeight: '500'
                  }}>
                    Level {index + 1}
                  </span>
                  <h4 style={{ 
                    fontSize: '1rem', 
                    fontWeight: '600', 
                    color: '#111827',
                    margin: 0,
                    flex: 1
                  }}>
                    {parent.title}
                  </h4>
                </div>
                
                {parent.description && (
                  <p style={{ 
                    fontSize: '0.875rem', 
                    color: '#4b5563', 
                    margin: '0 0 0.75rem 0',
                    lineHeight: '1.5' 
                  }}>
                    {parent.description}
                  </p>
                )}
                
                {parent.vision && (
                  <div style={{ 
                    backgroundColor: '#eff6ff', 
                    borderLeft: '3px solid #60a5fa', 
                    borderTopRightRadius: '0.25rem',
                    borderBottomRightRadius: '0.25rem',
                    padding: '0.75rem', 
                    marginTop: '0.5rem' 
                  }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'flex-start', 
                      gap: '0.5rem' 
                    }}>
                      <svg 
                        style={{
                          width: '14px', 
                          height: '14px', 
                          minWidth: '14px', 
                          maxWidth: '14px',
                          color: '#2563eb',
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
                          color: '#1e3a8a', 
                          fontSize: '0.75rem' 
                        }}>Vision:</span>
                        <p style={{ 
                          color: '#1e40af', 
                          fontSize: '0.75rem', 
                          marginTop: '0.25rem', 
                          lineHeight: '1.5',
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
        borderTop: '1px solid #e5e7eb'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          fontSize: '0.75rem',
          color: '#6b7280'
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
                flexShrink: 0
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
                flexShrink: 0
              }} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Created: {new Date(nextAction.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}