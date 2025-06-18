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

import { useState, useEffect, useRef } from 'react';

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
  parent_context_summary?: string;
  parent_vision_summary?: string;
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
  actionId?: string; // If provided, fetch this specific action instead of next action
}

export default function NextActionDisplay({ colors, actionId }: Props) {
  const [actionData, setActionData] = useState<NextActionData | null>(null);
  const [siblings, setSiblings] = useState<ActionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copying, setCopying] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [savingVision, setSavingVision] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const visionEditableRef = useRef<HTMLDivElement>(null);
  const descriptionEditableRef = useRef<HTMLDivElement>(null);
  const [visionSaveTimeout, setVisionSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [descriptionSaveTimeout, setDescriptionSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [visionContent, setVisionContent] = useState('');
  const [descriptionContent, setDescriptionContent] = useState('');
  const [isEditingVision, setIsEditingVision] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  useEffect(() => {
    const fetchAction = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Choose endpoint based on whether actionId is provided
        const endpoint = actionId ? `/api/actions/${actionId}` : '/api/actions/next';
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.success) {
          throw new Error(data.error || `Failed to fetch ${actionId ? 'action' : 'next action'}`);
        }

        setActionData(data.data);
        setVisionContent(data.data.vision || '');
        setDescriptionContent(data.data.description || '');
        
        // Fetch siblings if action has a parent
        if (data.data?.parent_id) {
          try {
            const parentResponse = await fetch(`/api/actions/${data.data.parent_id}`);
            if (parentResponse.ok) {
              const parentData = await parentResponse.json();
              if (parentData.success && parentData.data?.children) {
                // Filter out current action from siblings
                const actionSiblings = parentData.data.children.filter(
                  (child: ActionMetadata) => child.id !== data.data.id
                );
                setSiblings(actionSiblings);
              }
            }
          } catch (siblingErr) {
            console.error('Error fetching siblings:', siblingErr);
            // Don't fail the whole component if siblings fail to load
          }
        } else {
          setSiblings([]);
        }
      } catch (err) {
        console.error(`Error fetching ${actionId ? 'action' : 'next action'}:`, err);
        setError(err instanceof Error ? err.message : `Failed to fetch ${actionId ? 'action' : 'next action'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAction();
  }, [actionId]);

  const saveVisionWithDelay = (newVision: string) => {
    if (visionSaveTimeout) {
      clearTimeout(visionSaveTimeout);
    }
    
    const timeout = setTimeout(() => {
      saveVision(newVision);
    }, 1000); // Save after 1 second of no changes
    
    setVisionSaveTimeout(timeout);
  };

  const saveDescriptionWithDelay = (newDescription: string) => {
    if (descriptionSaveTimeout) {
      clearTimeout(descriptionSaveTimeout);
    }
    
    const timeout = setTimeout(() => {
      saveDescription(newDescription);
    }, 1000); // Save after 1 second of no changes
    
    setDescriptionSaveTimeout(timeout);
  };

  const handleVisionInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newVision = e.currentTarget.textContent || '';
    saveVisionWithDelay(newVision);
  };

  const handleDescriptionInput = (e: React.FormEvent<HTMLDivElement>) => {
    const newDescription = e.currentTarget.textContent || '';
    saveDescriptionWithDelay(newDescription);
  };

  const handleVisionFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    // Set the content first before switching to edit mode
    if (!e.currentTarget.textContent || e.currentTarget.textContent.includes('Click to add')) {
      e.currentTarget.textContent = visionContent;
    }
    setIsEditingVision(true);
    e.currentTarget.style.border = `1px solid ${colors.borderAccent}`;
    e.currentTarget.style.backgroundColor = colors.bg;
  };

  const handleVisionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditingVision(false);
    const newVision = e.currentTarget.textContent || '';
    setVisionContent(newVision);
    e.currentTarget.style.border = '1px solid transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const handleDescriptionFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    // Set the content first before switching to edit mode
    if (!e.currentTarget.textContent || e.currentTarget.textContent.includes('Click to add')) {
      e.currentTarget.textContent = descriptionContent;
    }
    setIsEditingDescription(true);
    e.currentTarget.style.border = `1px solid ${colors.borderAccent}`;
    e.currentTarget.style.backgroundColor = colors.bg;
  };

  const handleDescriptionBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setIsEditingDescription(false);
    const newDescription = e.currentTarget.textContent || '';
    setDescriptionContent(newDescription);
    e.currentTarget.style.border = '1px solid transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const saveVision = async (newVision: string) => {
    if (!actionData || actionData.vision === newVision) return;
    
    try {
      setSavingVision(true);
      setError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vision: newVision
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update vision');
      }

      setActionData(prev => prev ? { ...prev, vision: newVision } : null);
      setVisionContent(newVision);
      
    } catch (err) {
      console.error('Error updating vision:', err);
      setError(err instanceof Error ? err.message : 'Failed to update vision');
      // Revert the content on error
      setVisionContent(actionData.vision || '');
    } finally {
      setSavingVision(false);
    }
  };

  const saveDescription = async (newDescription: string) => {
    if (!actionData || actionData.description === newDescription) return;
    
    try {
      setSavingDescription(true);
      setError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: newDescription
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to update description');
      }

      setActionData(prev => prev ? { ...prev, description: newDescription } : null);
      setDescriptionContent(newDescription);
      
    } catch (err) {
      console.error('Error updating description:', err);
      setError(err instanceof Error ? err.message : 'Failed to update description');
      // Revert the content on error
      setDescriptionContent(actionData.description || '');
    } finally {
      setSavingDescription(false);
    }
  };

  const handleVisionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.blur(); // Remove focus to trigger save
      const newVision = e.currentTarget.textContent || '';
      if (visionSaveTimeout) {
        clearTimeout(visionSaveTimeout);
        setVisionSaveTimeout(null);
      }
      saveVision(newVision);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const originalVision = actionData?.vision || '';
      setVisionContent(originalVision);
      e.currentTarget.blur();
      if (visionSaveTimeout) {
        clearTimeout(visionSaveTimeout);
        setVisionSaveTimeout(null);
      }
    }
  };

  const handleDescriptionKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.blur(); // Remove focus to trigger save
      const newDescription = e.currentTarget.textContent || '';
      if (descriptionSaveTimeout) {
        clearTimeout(descriptionSaveTimeout);
        setDescriptionSaveTimeout(null);
      }
      saveDescription(newDescription);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const originalDescription = actionData?.description || '';
      setDescriptionContent(originalDescription);
      e.currentTarget.blur();
      if (descriptionSaveTimeout) {
        clearTimeout(descriptionSaveTimeout);
        setDescriptionSaveTimeout(null);
      }
    }
  };

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Check on mount
    checkMobile();

    // Add event listener for resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (visionSaveTimeout) clearTimeout(visionSaveTimeout);
      if (descriptionSaveTimeout) clearTimeout(descriptionSaveTimeout);
    };
  }, [visionSaveTimeout, descriptionSaveTimeout]);

  const generateClaudeCodePrompt = (action: NextActionData): string => {
    let prompt = `I'm working on: ${action.title}\nMCP URI: actions://${action.id}\n\n`;

    // Top Left Quadrant: Task Details
    prompt += `## Current Task\n`;
    prompt += `**${action.title}**\n`;
    if (action.description) {
      prompt += `${action.description}\n`;
    }
    prompt += `\n`;

    // Top Right Quadrant: Vision
    prompt += `## Vision\n`;
    prompt += `${action.vision || 'No vision defined for this action.'}\n\n`;

    // Bottom Left Quadrant: Broader Context
    prompt += `## Broader Context\n`;
    prompt += `${action.parent_context_summary || 'This action has no parent context.'}\n\n`;

    // Bottom Right Quadrant: Broader Vision
    prompt += `## Broader Vision\n`;
    prompt += `${action.parent_vision_summary || 'This action has no parent vision context.'}\n\n`;

    prompt += `## MCP Resources Available\n`;
    prompt += `- actions://tree (full action hierarchy)\n`;
    prompt += `- actions://next (current priority action)\n`;
    prompt += `- actions://${action.id} (this action's details)\n\n`;

    prompt += `Please help me complete this task. You can use the MCP URIs above to access the ActionBias system for context and updates.`;

    return prompt;
  };

  const copyPromptToClipboard = async () => {
    if (!actionData) return;
    
    try {
      setCopying(true);
      const prompt = generateClaudeCodePrompt(actionData);
      await navigator.clipboard.writeText(prompt);
      
      // Brief success feedback
      setTimeout(() => {
        setCopying(false);
      }, 1000);
      
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopying(false);
    }
  };

  const markComplete = async () => {
    if (!actionData) return;
    
    try {
      setCompleting(true);
      setError(null);
      
      // Call the REST API to update the action
      const response = await fetch(`/api/actions/${actionData.id}`, {
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

  if (!actionData) {
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

  const renderNavigation = () => {
    if (!actionData) return null;

    const hasParents = actionData.parent_chain && actionData.parent_chain.length > 0;
    const hasChildren = actionData.children && actionData.children.length > 0;
    const hasSiblings = siblings && siblings.length > 0;
    const hasNavigation = hasParents || hasChildren || hasSiblings;

    return (
      <div style={{
        marginTop: '1.5rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${colors.border}`
      }}>
        {hasNavigation && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: '0.5rem'
          }}>
            {/* Breadcrumb Navigation */}
            {hasParents && (
              <div style={{
                marginBottom: hasChildren || hasSiblings ? '1rem' : '0'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: colors.textMuted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  HIERARCHY
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  {actionData.parent_chain.map((parent, index) => (
                    <div key={parent.id} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}>
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
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = colors.bg;
                          e.currentTarget.style.borderColor = colors.borderAccent;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = colors.border;
                        }}
                      >
                        {parent.title}
                      </a>
                      {index < actionData.parent_chain.length - 1 && (
                        <svg
                          style={{
                            width: '12px',
                            height: '12px',
                            color: colors.textFaint
                          }}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  ))}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <svg
                      style={{
                        width: '12px',
                        height: '12px',
                        color: colors.textFaint
                      }}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span style={{
                      color: colors.text,
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.25rem',
                      backgroundColor: colors.bg,
                      border: `1px solid ${colors.borderAccent}`
                    }}>
                      {actionData.title}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Child Actions */}
            {hasChildren && (
              <div style={{
                marginBottom: hasSiblings ? '1rem' : '0'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: colors.textMuted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  SUB-TASKS ({actionData.children.length})
                </div>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem'
                }}>
                  {actionData.children.map((child) => (
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
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bg;
                        e.currentTarget.style.borderColor = colors.borderAccent;
                      }}
                      onMouseLeave={(e) => {
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
                          <svg
                            style={{
                              width: '8px',
                              height: '8px',
                              color: 'white'
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span style={{
                        textDecoration: child.done ? 'line-through' : 'none'
                      }}>
                        {child.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Sibling Actions */}
            {hasSiblings && (
              <div style={{
                marginBottom: '1rem'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  color: colors.textMuted,
                  marginBottom: '0.5rem',
                  fontWeight: '500'
                }}>
                  RELATED TASKS ({siblings.length})
                </div>
                <div style={{
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap'
                }}>
                  {siblings.map((sibling) => (
                    <a
                      key={sibling.id}
                      href={`/${sibling.id}`}
                      style={{
                        color: sibling.done ? colors.textFaint : colors.textSubtle,
                        textDecoration: 'none',
                        fontSize: '0.75rem',
                        padding: '0.375rem 0.5rem',
                        borderRadius: '0.25rem',
                        backgroundColor: 'white',
                        border: `1px solid ${colors.border}`,
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.375rem',
                        maxWidth: '200px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = colors.bg;
                        e.currentTarget.style.borderColor = colors.borderAccent;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.borderColor = colors.border;
                      }}
                    >
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '0.125rem',
                        backgroundColor: sibling.done ? colors.borderAccent : 'transparent',
                        border: `1px solid ${sibling.done ? colors.borderAccent : colors.border}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {sibling.done && (
                          <svg
                            style={{
                              width: '6px',
                              height: '6px',
                              color: 'white'
                            }}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span style={{
                        textDecoration: sibling.done ? 'line-through' : 'none',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {sibling.title}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div style={{
              display: 'flex',
              gap: '0.5rem',
              flexWrap: 'wrap',
              alignItems: 'center'
            }}>
              <div style={{
                fontSize: '0.75rem',
                color: colors.textMuted,
                fontWeight: '500',
                marginRight: '0.5rem'
              }}>
                NAVIGATE:
              </div>
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.bg;
                  e.currentTarget.style.borderColor = colors.borderAccent;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                  e.currentTarget.style.borderColor = colors.border;
                }}
              >
                Next Action
              </a>
              {actionData.dependencies.length > 0 && (
                <span style={{
                  color: colors.textFaint,
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`
                }}>
                  {actionData.dependencies.length} Dependencies
                </span>
              )}
              {actionData.dependents.length > 0 && (
                <span style={{
                  color: colors.textFaint,
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.25rem',
                  backgroundColor: colors.surface,
                  border: `1px solid ${colors.border}`
                }}>
                  {actionData.dependents.length} Dependents
                </span>
              )}
            </div>
          </div>
        )}

        {/* Metadata */}
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
            <span style={{ fontFamily: 'monospace' }}>ID: {actionData.id}</span>
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
            <span>Created: {new Date(actionData.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      borderRadius: '0.5rem',
      padding: '1.5rem'
    }}>
      {/* 4 Quadrant Layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
        gridTemplateRows: isMobile ? 'auto auto auto auto' : 'auto auto',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Top Left: Checkbox, Title, Description */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          order: isMobile ? 1 : 'unset'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '0.75rem'
          }}>
            {completed ? (
              <div style={{
                width: '20px',
                height: '20px',
                backgroundColor: colors.borderAccent,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.2) 2px, rgba(255,255,255,0.2) 4px)',
                borderRadius: '0.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <svg 
                  style={{
                    width: '12px', 
                    height: '12px', 
                    color: 'white'
                  }} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <button
                onClick={markComplete}
                disabled={completing}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: completing ? colors.textFaint : colors.surface,
                  border: `2px solid ${completing ? colors.textFaint : colors.borderAccent}`,
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: completing ? 'not-allowed' : 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s ease',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
                onMouseEnter={(e) => {
                  if (!completing) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = colors.text;
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.bg;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!completing) {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = colors.borderAccent;
                    (e.currentTarget as HTMLButtonElement).style.backgroundColor = colors.surface;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
                  }
                }}
              >
                {completing && (
                  <svg 
                    style={{
                      width: '12px', 
                      height: '12px',
                      animation: 'spin 1s linear infinite',
                      color: 'white'
                    }} 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle style={{opacity: 0.25}} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path style={{opacity: 0.75}} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
              </button>
            )}
            <h2 style={{ 
              fontSize: '1.125rem', 
              fontWeight: '600', 
              color: colors.text,
              margin: 0,
              flex: 1
            }}>
              {actionData.title}
            </h2>
          </div>
          
          <div style={{ 
            marginTop: '0.5rem',
            position: 'relative'
          }}>
            <div
              ref={descriptionEditableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleDescriptionInput}
              onKeyDown={handleDescriptionKeyDown}
              style={{
                fontSize: '0.875rem',
                color: colors.textMuted,
                margin: 0,
                lineHeight: '1.5',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid transparent',
                outline: 'none',
                minHeight: '1.5em',
                transition: 'all 0.2s ease',
                cursor: 'text'
              }}
              onFocus={handleDescriptionFocus}
              onBlur={handleDescriptionBlur}
              {...(!isEditingDescription && {
                dangerouslySetInnerHTML: {
                  __html: descriptionContent || '<span style="color: #9CA3AF; font-style: italic;">Click to add description...</span>'
                }
              })}
            >
              {isEditingDescription && descriptionContent}
            </div>
            {savingDescription && (
              <div style={{
                position: 'absolute',
                top: '0.25rem',
                right: '0.25rem',
                fontSize: '0.625rem',
                color: colors.textFaint,
                backgroundColor: 'white',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.125rem',
                border: `1px solid ${colors.border}`
              }}>
                Saving...
              </div>
            )}
          </div>

          {/* Completion message */}
          {completed && (
            <div style={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '0.375rem',
              padding: '0.75rem',
              marginTop: '1rem',
              textAlign: 'center'
            }}>
              <p style={{
                fontSize: '0.875rem',
                fontWeight: '500',
                color: colors.text,
                margin: '0 0 0.25rem 0'
              }}>
                Action Completed! 🎉
              </p>
              <p style={{
                fontSize: '0.75rem',
                color: colors.textMuted,
                margin: 0
              }}>
                Loading next action...
              </p>
            </div>
          )}
        </div>

        {/* Top Right: Action Vision */}
        <div style={{
          backgroundColor: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          borderLeft: `4px solid ${colors.borderAccent}`,
          order: isMobile ? 2 : 'unset'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
            gap: '0.5rem',
            marginBottom: '0.75rem'
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
            <h3 style={{ 
              fontWeight: '600', 
              color: colors.text, 
              fontSize: '0.875rem',
              margin: 0
            }}>Vision</h3>
          </div>
          
          <div style={{ position: 'relative' }}>
            <div
              ref={visionEditableRef}
              contentEditable
              suppressContentEditableWarning
              onInput={handleVisionInput}
              onKeyDown={handleVisionKeyDown}
              style={{
                color: colors.textMuted,
                fontSize: '0.875rem',
                margin: 0,
                lineHeight: '1.5',
                padding: '0.5rem',
                borderRadius: '0.25rem',
                border: '1px solid transparent',
                outline: 'none',
                minHeight: '1.5em',
                transition: 'all 0.2s ease',
                cursor: 'text'
              }}
              onFocus={handleVisionFocus}
              onBlur={handleVisionBlur}
              {...(!isEditingVision && {
                dangerouslySetInnerHTML: {
                  __html: visionContent || '<span style="color: #9CA3AF; font-style: italic;">Click to add vision...</span>'
                }
              })}
            >
              {isEditingVision && visionContent}
            </div>
            {savingVision && (
              <div style={{
                position: 'absolute',
                top: '0.25rem',
                right: '0.25rem',
                fontSize: '0.625rem',
                color: colors.textFaint,
                backgroundColor: 'white',
                padding: '0.125rem 0.25rem',
                borderRadius: '0.125rem',
                border: `1px solid ${colors.border}`
              }}>
                Saving...
              </div>
            )}
          </div>
        </div>

        {/* Bottom Left: Parent Context Summary */}
        <div style={{
          backgroundColor: colors.bg,
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          borderLeft: `4px solid ${colors.textFaint}`,
          order: isMobile ? 3 : 'unset'
        }}>
          <h3 style={{ 
            fontSize: '0.875rem', 
            fontWeight: '500', 
            color: colors.textMuted,
            margin: '0 0 0.75rem 0'
          }}>
            Broader Context
          </h3>
          <p style={{ 
            fontSize: '0.8rem', 
            color: colors.textSubtle, 
            margin: 0,
            lineHeight: '1.5' 
          }}>
            {actionData.parent_context_summary || 'This action has no parent context.'}
          </p>
        </div>

        {/* Bottom Right: Parent Vision Summary */}
        <div style={{ 
          backgroundColor: colors.surface, 
          border: `1px solid ${colors.border}`,
          borderRadius: '0.5rem',
          padding: '1rem',
          borderLeft: `4px solid ${colors.textFaint}`,
          order: isMobile ? 4 : 'unset'
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-start', 
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
            <h3 style={{ 
              fontWeight: '500', 
              color: colors.textMuted, 
              fontSize: '0.875rem',
              margin: 0
            }}>Broader Vision</h3>
          </div>
          
          <p style={{ 
            color: colors.textSubtle, 
            fontSize: '0.8rem', 
            margin: 0,
            lineHeight: '1.5'
          }}>
            {actionData.parent_vision_summary || 'This action has no parent vision context.'}
          </p>
        </div>
      </div>

      {/* Copy Prompt Button */}
      <div style={{
        marginTop: '1.5rem',
        marginBottom: '1.5rem',
        paddingTop: '1rem',
        borderTop: `1px solid ${colors.border}`,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <button
          onClick={copyPromptToClipboard}
          disabled={copying}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            backgroundColor: copying ? colors.surface : colors.borderAccent,
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: copying ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (!copying) {
              (e.currentTarget as HTMLButtonElement).style.opacity = '0.9';
            }
          }}
          onMouseLeave={(e) => {
            if (!copying) {
              (e.currentTarget as HTMLButtonElement).style.opacity = '1';
            }
          }}
        >
          {copying ? (
            <>
              <svg 
                style={{
                  width: '16px', 
                  height: '16px',
                  color: 'white'
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg 
                style={{
                  width: '16px', 
                  height: '16px',
                  color: 'white'
                }} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Full Context for Claude Code
            </>
          )}
        </button>
      </div>

      {/* Navigation */}
      {renderNavigation()}
    </div>
  );
}