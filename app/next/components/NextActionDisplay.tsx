'use client';

// Add CSS for spinner animation
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;
  document.head.appendChild(style);
}

import { useState, useEffect } from 'react';
import { ActionDetailResource, ActionMetadata } from '../../../lib/types/resources';
import EditableField from './EditableField';
import ActionNavigation from './ActionNavigation';
import { ColorScheme } from './types';
import ActionPageSkeleton from './ActionPageSkeleton';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';

interface Props {
  colors: ColorScheme;
  actionId?: string; // If provided, fetch this specific action instead of next action
}

export default function NextActionDisplay({ colors, actionId }: Props) {
  const [actionData, setActionData] = useState<ActionDetailResource | null>(null);
  const [siblings, setSiblings] = useState<ActionMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [copying, setCopying] = useState(false);
  const [copyingCodex, setCopyingCodex] = useState(false);
  const [suggestions, setSuggestions] = useState<ActionMetadata[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [savingVision, setSavingVision] = useState(false);
  const [savingDescription, setSavingDescription] = useState(false);
  const [savingTitle, setSavingTitle] = useState(false);
  const [nextFamilyMemberId, setNextFamilyMemberId] = useState<string | null>(null);
  const [showCompletionContext, setShowCompletionContext] = useState(false);
  const [completionContext, setCompletionContext] = useState({
    implementationStory: '',
    impactStory: '',
    learningStory: '',
    changelogVisibility: 'team' as 'private' | 'team' | 'public'
  });
  const [savingContext, setSavingContext] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchAction = async () => {
      try {
        setLoading(true);
        setError(null);
        const endpoint = actionId ? `/api/actions/${actionId}` : '/api/actions/next';
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || `Failed to fetch ${actionId ? 'action' : 'next action'}`);
        setActionData(data.data);
        if (data.data?.parent_id) {
          try {
            const parentResponse = await fetch(`/api/actions/${data.data.parent_id}`);
            if (parentResponse.ok) {
              const parentData = await parentResponse.json();
              if (parentData.success && parentData.data?.children && Array.isArray(parentData.data.children)) {
                // Filter out the current action from the parent's children to get true siblings
                const currentActionId = data.data.id;
                const actionSiblings = parentData.data.children.filter((child: ActionMetadata) => {
                  // Strict comparison: both should be defined and not equal
                  return child && child.id && currentActionId && child.id !== currentActionId;
                });
                setSiblings(actionSiblings);
              } else {
                setSiblings([]);
              }
            } else {
              setSiblings([]);
            }
          } catch (siblingErr) {
            console.error('Error fetching siblings:', siblingErr);
            setSiblings([]);
          }
        } else {
          setSiblings([]);
        }

        if (actionId) {
          try {
            const nextResp = await fetch(`/api/actions/next/${actionId}`);
            if (nextResp.ok) {
              const nextData = await nextResp.json();
              if (nextData.success && nextData.data && nextData.data.parent_id === actionId) {
                setNextFamilyMemberId(nextData.data.id);
              } else {
                setNextFamilyMemberId(null);
              }
            }
          } catch (nextErr) {
            console.error('Error fetching next child action:', nextErr);
          }
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

  const updateVision = async (newVision: string) => {
    if (!actionData || actionData.vision === newVision) return;
    try {
      setSavingVision(true);
      setError(null);
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vision: newVision })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update vision');
      setActionData(prev => (prev ? { ...prev, vision: newVision } : null));
    } catch (err) {
      console.error('Error updating vision:', err);
      setError(err instanceof Error ? err.message : 'Failed to update vision');
    } finally {
      setSavingVision(false);
    }
  };

  const updateDescription = async (newDescription: string) => {
    if (!actionData || actionData.description === newDescription) return;
    try {
      setSavingDescription(true);
      setError(null);
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newDescription })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update description');
      setActionData(prev => (prev ? { ...prev, description: newDescription } : null));
    } catch (err) {
      console.error('Error updating description:', err);
      setError(err instanceof Error ? err.message : 'Failed to update description');
    } finally {
      setSavingDescription(false);
    }
  };

  const updateTitle = async (newTitle: string) => {
    if (!actionData || actionData.title === newTitle) return;
    try {
      setSavingTitle(true);
      setError(null);
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to update title');
      setActionData(prev => (prev ? { ...prev, title: newTitle } : null));
    } catch (err) {
      console.error('Error updating title:', err);
      setError(err instanceof Error ? err.message : 'Failed to update title');
    } finally {
      setSavingTitle(false);
    }
  };

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const generateClaudeCodePrompt = (action: ActionDetailResource): string => {
    let prompt = `I'm working on: ${action.title}\nMCP URI: action://${action.id}\n\n`;
    prompt += `## Current Task\n`;
    prompt += `**${action.title}**\n`;
    if (action.description) prompt += `${action.description}\n`;
    prompt += `\n## Vision\n`;
    prompt += `${action.vision || 'No vision defined for this action.'}\n\n`;
    prompt += `## Broader Context\n`;
    prompt += `${action.family_context_summary || 'This action has no family context.'}\n\n`;
    prompt += `## Broader Vision\n`;
    prompt += `${action.family_vision_summary || 'This action has no family vision context.'}\n\n`;
    
    // Add completion context from dependencies
    if (action.dependency_completion_context && action.dependency_completion_context.length > 0) {
      prompt += `## Completion Context from Dependencies\n`;
      prompt += `This action builds on work completed in its dependencies. Here's what was learned and accomplished:\n\n`;
      
      action.dependency_completion_context.forEach((context, index) => {
        prompt += `### Dependency ${index + 1}: ${context.action_title}\n`;
        prompt += `Completed: ${new Date(context.completion_timestamp).toLocaleDateString()}\n\n`;
        
        if (context.implementation_story) {
          prompt += `**Implementation Approach:**\n${context.implementation_story}\n\n`;
        }
        
        if (context.impact_story) {
          prompt += `**Impact Achieved:**\n${context.impact_story}\n\n`;
        }
        
        if (context.learning_story) {
          prompt += `**Key Learnings:**\n${context.learning_story}\n\n`;
        }
        
        prompt += `---\n\n`;
      });
      
      prompt += `**💡 Use This Context:** Apply insights from dependency work to avoid repeated mistakes and build on successful approaches.\n\n`;
    }
    
    prompt += `## MCP Resources Available\n`;
    prompt += `- action://tree (full action hierarchy)\n`;
    prompt += `- action://next (current priority action)\n`;
    prompt += `- action://${action.id} (this action's details)\n\n`;
    prompt += `Please help me complete this task. You can use the MCP URIs above to access the ActionBias system for context and updates.`;
    return prompt;
  };

  const generateCodexPrompt = (action: ActionDetailResource): string => {
    return buildActionPrompt(action);
  };

  const copyPromptToClipboard = async () => {
    if (!actionData) return;
    try {
      setCopying(true);
      const prompt = generateClaudeCodePrompt(actionData);
      await navigator.clipboard.writeText(prompt);
      setTimeout(() => setCopying(false), 1000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopying(false);
    }
  };

  const copyCodexPromptToClipboard = async () => {
    if (!actionData) return;
    try {
      setCopyingCodex(true);
      const prompt = generateCodexPrompt(actionData);
      await navigator.clipboard.writeText(prompt);
      setTimeout(() => setCopyingCodex(false), 1000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopyingCodex(false);
    }
  };

  const fetchSuggestions = async () => {
    if (!actionData) return;
    const nextActions: ActionMetadata[] = [];
    try {
      for (const dep of actionData.dependents || []) {
        const resp = await fetch(`/api/actions/${dep.id}`);
        if (!resp.ok) continue;
        const detail = await resp.json();
        if (detail.success && detail.data) {
          const allDone = detail.data.dependencies.every((d: ActionMetadata) => d.done);
          if (!detail.data.done && allDone) {
            nextActions.push({
              id: detail.data.id,
              title: detail.data.title,
              description: detail.data.description,
              vision: detail.data.vision,
              done: detail.data.done,
              version: detail.data.version,
              created_at: detail.data.created_at,
              updated_at: detail.data.updated_at,
            });
          }
        }
      }
      const nextResp = await fetch('/api/actions/next');
      if (nextResp.ok) {
        const nextData = await nextResp.json();
        if (nextData.success && nextData.data) {
          nextActions.unshift({
            id: nextData.data.id,
            title: nextData.data.title,
            description: nextData.data.description,
            vision: nextData.data.vision,
            done: nextData.data.done,
            version: nextData.data.version,
            created_at: nextData.data.created_at,
            updated_at: nextData.data.updated_at,
          });
        }
      }
    } catch (err) {
      console.error('Error fetching suggestions:', err);
    }
    setSuggestions(nextActions);
    setShowModal(true);
  };

  const toggleCompletion = async () => {
    if (!actionData) return;
    
    const newDone = !actionData.done;
    
    if (newDone) {
      // Show completion context modal when marking as complete
      setShowCompletionContext(true);
    } else {
      // Handle uncompleting directly
      try {
        setCompleting(true);
        setError(null);
        const response = await fetch(`/api/actions/${actionData.id}/uncomplete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        if (!data.success) throw new Error(data.error || 'Failed to update action');
        setActionData(prev => (prev ? { ...prev, done: false } : null));
        setCompleted(false);
      } catch (err) {
        console.error('Error marking action incomplete:', err);
        setError(err instanceof Error ? err.message : 'Failed to mark action as incomplete');
      } finally {
        setCompleting(false);
      }
    }
  };

  const handleCompletionSubmit = async (skipContext = false) => {
    if (!actionData) return;
    
    try {
      setSavingContext(true);
      setError(null);
      
      // Prepare completion context data
      const completionData = skipContext ? {
        implementation_story: "Action completed without detailed context",
        impact_story: "Impact details not provided",
        learning_story: "Learning insights not captured",
        changelog_visibility: completionContext.changelogVisibility,
      } : {
        implementation_story: completionContext.implementationStory.trim() || "No implementation details provided",
        impact_story: completionContext.impactStory.trim() || "No impact details provided", 
        learning_story: completionContext.learningStory.trim() || "No learning insights provided",
        changelog_visibility: completionContext.changelogVisibility,
      };
      
      // Complete action with required completion context
      const response = await fetch(`/api/actions/${actionData.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(completionData)
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to complete action');
      
      // Update UI state
      setActionData(prev => (prev ? { ...prev, done: true } : null));
      setCompleted(true);
      setShowCompletionContext(false);
      
      // Reset context form
      setCompletionContext({
        implementationStory: '',
        impactStory: '',
        learningStory: '',
        changelogVisibility: 'team'
      });
      
      // Show next actions suggestions
      await fetchSuggestions();
      
    } catch (err) {
      console.error('Error completing action:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete action');
    } finally {
      setSavingContext(false);
    }
  };

  const handleContextCancel = () => {
    setShowCompletionContext(false);
    setCompletionContext({
      implementationStory: '',
      impactStory: '',
      learningStory: '',
      changelogVisibility: 'team'
    });
  };

  const handleDelete = async () => {
    if (!actionData) return;
    
    try {
      setDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_handling: 'delete_recursive'
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to delete action');
      
      // Redirect to home page after successful deletion
      window.location.href = '/';
      
    } catch (err) {
      console.error('Error deleting action:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete action');
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  if (loading) {
    return <ActionPageSkeleton colors={colors} isMobile={isMobile} />;
  }

  if (error) {
    return (
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.5rem', borderLeft: `4px solid ${colors.borderAccent}` }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>Error Loading Next Action</h2>
        <p style={{ color: colors.textMuted, marginBottom: '1rem' }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{ padding: '0.5rem 1rem', backgroundColor: colors.borderAccent, color: 'white', borderRadius: '0.25rem', border: 'none', cursor: 'pointer', fontSize: '0.875rem' }} onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.opacity = '0.8'} onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.opacity = '1'}>
          Retry
        </button>
      </div>
    );
  }

  if (!actionData) {
    return (
      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1.5rem', borderLeft: `4px solid ${colors.borderAccent}` }}>
        <h2 style={{ fontSize: '1.125rem', fontWeight: '600', color: colors.text, marginBottom: '0.5rem' }}>🎉 All Done!</h2>
        <p style={{ color: colors.textMuted }}>No next action found. You're all caught up!</p>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', borderRadius: '0.5rem', padding: '1.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gridTemplateRows: isMobile ? 'auto auto auto auto' : 'auto auto', gap: '1rem', marginBottom: '1.5rem' }}>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', order: isMobile ? 1 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <button onClick={toggleCompletion} disabled={completing} aria-label={actionData.done ? 'Mark Incomplete' : 'Mark Complete'} style={{ width: '20px', height: '20px', backgroundColor: actionData.done ? colors.borderAccent : completing ? colors.textFaint : colors.surface, border: `2px solid ${completing ? colors.textFaint : colors.borderAccent}`, borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: completing ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all 0.2s ease', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onMouseEnter={e => { if (!completing) { e.currentTarget.style.borderColor = colors.text; e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)'; } }} onMouseLeave={e => { if (!completing) { e.currentTarget.style.borderColor = colors.borderAccent; e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; } }}>
              {completing ? (
                <svg style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.355 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                actionData.done && (
                  <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )
              )}
            </button>
            <div style={{ flex: 1 }}>
              <EditableField 
                value={actionData.title} 
                placeholder="Action title" 
                colors={colors} 
                onSave={updateTitle}
                style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '600', 
                  color: colors.text,
                  padding: '0.25rem 0.5rem'
                }}
              />
              {savingTitle && (<div style={{ fontSize: '0.625rem', color: colors.textFaint, marginTop: '0.25rem' }}>Saving...</div>)}
            </div>
            <button onClick={() => setShowDeleteModal(true)} disabled={deleting} aria-label="Delete Action" style={{ width: '20px', height: '20px', backgroundColor: deleting ? colors.textFaint : colors.surface, border: `2px solid ${deleting ? colors.textFaint : '#dc2626'}`, borderRadius: '0.375rem', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: deleting ? 'not-allowed' : 'pointer', flexShrink: 0, transition: 'all 0.2s ease', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = '#b91c1c'; e.currentTarget.style.backgroundColor = '#fef2f2'; e.currentTarget.style.boxShadow = '0 2px 4px 0 rgba(0, 0, 0, 0.1)'; } }} onMouseLeave={e => { if (!deleting) { e.currentTarget.style.borderColor = '#dc2626'; e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)'; } }}>
              {deleting ? (
                <svg style={{ width: '12px', height: '12px', animation: 'spin 1s linear infinite', color: '#dc2626' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.355 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg style={{ width: '12px', height: '12px', color: '#dc2626' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              )}
            </button>
          </div>
          <div style={{ marginTop: '0.5rem' }}>
            <EditableField value={actionData.description || ''} placeholder="Click to add description..." colors={colors} onSave={updateDescription} />
            {savingDescription && (<div style={{ fontSize: '0.625rem', color: colors.textFaint, marginTop: '0.25rem' }}>Saving...</div>)}
          </div>
          {completed && (
            <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '0.375rem', padding: '0.75rem', marginTop: '1rem', textAlign: 'center' }}>
              <p style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.text, margin: '0 0 0.25rem 0' }}>Action Completed! 🎉</p>
              <p style={{ fontSize: '0.75rem', color: colors.textMuted, margin: 0 }}>Fetching suggestions...</p>
            </div>
          )}
        </div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.borderAccent}`, order: isMobile ? 2 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <svg style={{ width: '16px', height: '16px', minWidth: '16px', maxWidth: '16px', color: colors.borderAccent, marginTop: '0.125rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h3 style={{ fontWeight: '600', color: colors.text, fontSize: '0.875rem', margin: 0 }}>Vision</h3>
          </div>
          <EditableField value={actionData.vision || ''} placeholder="Click to add vision..." colors={colors} onSave={updateVision} />
          {savingVision && (<div style={{ fontSize: '0.625rem', color: colors.textFaint, marginTop: '0.25rem' }}>Saving...</div>)}
        </div>
        <div style={{ backgroundColor: colors.bg, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.textFaint}`, order: isMobile ? 3 : 'unset' }}>
          <h3 style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.textMuted, margin: '0 0 0.75rem 0' }}>Broader Context</h3>
          <p style={{ fontSize: '0.8rem', color: colors.textSubtle, margin: 0, lineHeight: '1.5' }}>{actionData.family_context_summary || 'This action has no family context.'}</p>
        </div>
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: '0.5rem', padding: '1rem', borderLeft: `4px solid ${colors.textFaint}`, order: isMobile ? 4 : 'unset' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <svg style={{ width: '14px', height: '14px', minWidth: '14px', maxWidth: '14px', color: colors.textFaint, marginTop: '0.125rem', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <h3 style={{ fontWeight: '500', color: colors.textMuted, fontSize: '0.875rem', margin: 0 }}>Broader Vision</h3>
          </div>
          <p style={{ color: colors.textSubtle, fontSize: '0.8rem', margin: 0, lineHeight: '1.5' }}>{actionData.family_vision_summary || 'This action has no family vision context.'}</p>
        </div>
      </div>
      <div style={{ marginTop: '1.5rem', marginBottom: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}`, display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button onClick={copyPromptToClipboard} disabled={copying} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: copying ? colors.surface : colors.borderAccent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: copying ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (!copying) { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; } }} onMouseLeave={e => { if (!copying) { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; } }}>
          {copying ? (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Full Context for Claude Code
            </>
          )}
        </button>
        <button onClick={copyCodexPromptToClipboard} disabled={copyingCodex} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', backgroundColor: copyingCodex ? colors.surface : colors.borderAccent, color: 'white', border: 'none', borderRadius: '0.5rem', cursor: copyingCodex ? 'not-allowed' : 'pointer', fontSize: '0.875rem', fontWeight: '500', transition: 'all 0.2s ease' }} onMouseEnter={e => { if (!copyingCodex) { (e.currentTarget as HTMLButtonElement).style.opacity = '0.9'; } }} onMouseLeave={e => { if (!copyingCodex) { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; } }}>
          {copyingCodex ? (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Copied!
            </>
          ) : (
            <>
              <svg style={{ width: '16px', height: '16px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copy Action Instructions for Claude Code
            </>
          )}
        </button>
      </div>
      <ActionNavigation action={actionData} siblings={siblings} colors={colors} nextFamilyMemberId={nextFamilyMemberId} />

      {/* Dependent Actions Section */}
      {actionData.dependents && actionData.dependents.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: colors.text, marginBottom: '0.75rem' }}>Dependent Actions</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {actionData.dependents.map(dependent => (
              <li key={dependent.id} style={{ marginBottom: '0.5rem' }}>
                <a href={`/${dependent.id}`} style={{ color: colors.textSubtle, textDecoration: 'none', fontSize: '0.875rem' }} onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
                  {dependent.title}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dependency Completion Context Section */}
      {actionData.dependency_completion_context && actionData.dependency_completion_context.length > 0 && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: `1px solid ${colors.border}` }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', color: colors.text, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🔗 Completion Context from Dependencies
          </h3>
          <p style={{ fontSize: '0.875rem', color: colors.textSubtle, marginBottom: '1rem', lineHeight: '1.4' }}>
            This action builds on work completed in its dependencies. Here's what was learned and accomplished:
          </p>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {actionData.dependency_completion_context.map((context, index) => (
              <div key={context.action_id} style={{ 
                backgroundColor: colors.bg, 
                border: `1px solid ${colors.border}`, 
                borderRadius: '0.5rem', 
                padding: '1rem' 
              }}>
                <div style={{ marginBottom: '0.75rem' }}>
                  <h4 style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: '600', 
                    color: colors.text, 
                    marginBottom: '0.25rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    📋 {context.action_title}
                  </h4>
                  <p style={{ 
                    fontSize: '0.75rem', 
                    color: colors.textSubtle, 
                    margin: 0 
                  }}>
                    Completed: {new Date(context.completion_timestamp).toLocaleString()} • 
                    <a href={`/${context.action_id}`} style={{ color: colors.textSubtle, textDecoration: 'underline' }}>
                      View Action
                    </a>
                  </p>
                </div>

                {context.implementation_story && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      color: colors.text, 
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      🔧 Implementation Approach
                    </div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: colors.text, 
                      margin: 0, 
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {context.implementation_story}
                    </p>
                  </div>
                )}

                {context.impact_story && (
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      color: colors.text, 
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      📈 Impact Achieved
                    </div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: colors.text, 
                      margin: 0, 
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {context.impact_story}
                    </p>
                  </div>
                )}

                {context.learning_story && (
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: '600', 
                      color: colors.text, 
                      marginBottom: '0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem'
                    }}>
                      💡 Key Learnings
                    </div>
                    <p style={{ 
                      fontSize: '0.875rem', 
                      color: colors.text, 
                      margin: 0, 
                      lineHeight: '1.4',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {context.learning_story}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.75rem', 
            backgroundColor: colors.surface, 
            border: `1px solid ${colors.border}`, 
            borderRadius: '0.375rem' 
          }}>
            <p style={{ 
              fontSize: '0.75rem', 
              color: colors.text, 
              margin: 0, 
              fontWeight: '500',
              lineHeight: '1.4'
            }}>
              💡 <strong>Use This Context:</strong> Apply insights from dependency work to avoid repeated mistakes<br/>
              🚀 <strong>Build on Success:</strong> Leverage approaches that worked well in dependencies<br/>
              ⚠️ <strong>Learn from Challenges:</strong> Address issues that were discovered in dependency work
            </p>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '90%', width: '28rem', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <svg style={{ width: '20px', height: '20px', color: '#dc2626', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <h3 style={{ marginTop: 0, marginBottom: 0, color: colors.text, fontSize: '1.125rem', fontWeight: '600' }}>
                Delete Action
              </h3>
            </div>
            <p style={{ marginBottom: '1.5rem', color: colors.textSubtle, fontSize: '0.875rem', lineHeight: '1.4' }}>
              Are you sure you want to delete <strong>"{actionData?.title}"</strong>?
            </p>
            <p style={{ marginBottom: '1.5rem', color: colors.textSubtle, fontSize: '0.875rem', lineHeight: '1.4' }}>
              This action will be permanently removed and cannot be recovered. Any child actions will also be deleted.
            </p>
            
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: 'transparent', 
                  color: colors.textSubtle, 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                disabled={deleting}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: '#dc2626', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {deleting ? (
                  <>
                    <svg style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite', color: 'white' }} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.355 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <svg style={{ width: '14px', height: '14px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete Action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Context Modal */}
      {showCompletionContext && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '0.5rem', maxWidth: '90%', width: '32rem', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', color: colors.text, fontSize: '1.125rem', fontWeight: '600' }}>
              Share Your Completion Story
            </h3>
            <p style={{ marginBottom: '1.5rem', color: colors.textSubtle, fontSize: '0.875rem', lineHeight: '1.4' }}>
              Help build institutional knowledge by sharing how you completed this action. All fields are optional.
            </p>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text, fontSize: '0.875rem', fontWeight: '500' }}>
                🔧 Implementation Story
              </label>
              <textarea
                value={completionContext.implementationStory}
                onChange={(e) => setCompletionContext(prev => ({ ...prev, implementationStory: e.target.value }))}
                placeholder="How did you build this? What tools/approach did you use? What challenges did you overcome?"
                style={{ 
                  width: '100%', 
                  height: '4rem', 
                  padding: '0.5rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text, fontSize: '0.875rem', fontWeight: '500' }}>
                🎯 Impact Story
              </label>
              <textarea
                value={completionContext.impactStory}
                onChange={(e) => setCompletionContext(prev => ({ ...prev, impactStory: e.target.value }))}
                placeholder="What did you accomplish? What value was delivered? Who benefits from this work?"
                style={{ 
                  width: '100%', 
                  height: '4rem', 
                  padding: '0.5rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text, fontSize: '0.875rem', fontWeight: '500' }}>
                💡 Learning Story
              </label>
              <textarea
                value={completionContext.learningStory}
                onChange={(e) => setCompletionContext(prev => ({ ...prev, learningStory: e.target.value }))}
                placeholder="What did you learn? What insights were gained? What would you do differently next time?"
                style={{ 
                  width: '100%', 
                  height: '4rem', 
                  padding: '0.5rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: colors.text, fontSize: '0.875rem', fontWeight: '500' }}>
                👥 Changelog Visibility
              </label>
              <select
                value={completionContext.changelogVisibility}
                onChange={(e) => setCompletionContext(prev => ({ ...prev, changelogVisibility: e.target.value as 'private' | 'team' | 'public' }))}
                style={{ 
                  width: '100%', 
                  padding: '0.5rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="private">Private - Personal notes only</option>
                <option value="team">Team - Internal team visibility</option>
                <option value="public">Public - External stakeholder visibility</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={handleContextCancel}
                disabled={savingContext}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: 'transparent', 
                  color: colors.textSubtle, 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.25rem', 
                  cursor: savingContext ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={() => handleCompletionSubmit(true)}
                disabled={savingContext}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: colors.textSubtle, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  cursor: savingContext ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {savingContext ? 'Completing...' : 'Skip & Complete'}
              </button>
              <button 
                onClick={() => handleCompletionSubmit(false)}
                disabled={savingContext}
                style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: colors.borderAccent, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.25rem', 
                  cursor: savingContext ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                {savingContext ? 'Saving...' : 'Save & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div data-testid="suggestions-modal" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '1rem', borderRadius: '0.5rem', maxWidth: '90%', width: '24rem', boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.75rem', color: colors.text, fontSize: '1rem' }}>Next Actions</h3>
            {suggestions.length > 0 ? (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {suggestions.map(s => (
                  <li key={s.id} style={{ marginBottom: '0.5rem' }}>
                    <a href={`/${s.id}`} style={{ color: colors.textSubtle, textDecoration: 'none' }}>{s.title}</a>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: '0.875rem', color: colors.textMuted }}>No immediate next actions found.</p>
            )}
            <button onClick={() => { setShowModal(false); if (!actionId) { window.location.reload(); } }} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: colors.borderAccent, color: 'white', border: 'none', borderRadius: '0.25rem', cursor: 'pointer' }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
