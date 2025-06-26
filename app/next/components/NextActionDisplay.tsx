'use client';

import { useState, useEffect, useRef } from 'react';
import { ActionDetailResource } from '../../../lib/types/resources';
import { ColorScheme } from './types';
import ActionPageSkeleton from './ActionPageSkeleton';
import { buildActionPrompt } from '../../../lib/utils/action-prompt-builder';
import { Copy, Link, Check, CheckCircle, Square, CheckSquare } from 'react-feather';
import MagazineArticle from '../../../components/MagazineArticle';

interface Props {
  colors: ColorScheme;
  actionId?: string; // If provided, fetch this specific action instead of next action
}

export default function NextActionDisplay({ colors, actionId }: Props) {
  const [actionData, setActionData] = useState<ActionDetailResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [copyingCodex, setCopyingCodex] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [showUncompletionModal, setShowUncompletionModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completionContext, setCompletionContext] = useState({
    implementationStory: '',
    impactStory: '',
    learningStory: '',
    changelogVisibility: 'team' as 'private' | 'team' | 'public'
  });
  const [previewData, setPreviewData] = useState<any>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewDebounceTimer, setPreviewDebounceTimer] = useState<NodeJS.Timeout | null>(null);

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
      } catch (err) {
        console.error(`Error fetching ${actionId ? 'action' : 'next action'}:`, err);
        setError(err instanceof Error ? err.message : `Failed to fetch ${actionId ? 'action' : 'next action'}`);
      } finally {
        setLoading(false);
      }
    };

    fetchAction();
  }, [actionId]);

  const generateActionPrompt = (action: ActionDetailResource): string => {
    return buildActionPrompt(action);
  };

  const copyPromptToClipboard = async () => {
    if (!actionData) return;
    try {
      setCopying(true);
      const prompt = generateActionPrompt(actionData);
      await navigator.clipboard.writeText(prompt);
      setTimeout(() => setCopying(false), 1000);
    } catch (err) {
      console.error('Failed to copy prompt:', err);
      setCopying(false);
    }
  };

  const copyActionUrl = async () => {
    if (!actionData) return;
    try {
      setCopyingCodex(true);
      const url = `https://www.actionbias.ai/${actionData.id}`;
      await navigator.clipboard.writeText(url);
      setTimeout(() => setCopyingCodex(false), 1000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      setCopyingCodex(false);
    }
  };

  const handleComplete = async () => {
    if (!actionData || actionData.done) return;
    
    try {
      setCompleting(true);
      setError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          implementation_story: completionContext.implementationStory,
          impact_story: completionContext.impactStory,
          learning_story: completionContext.learningStory,
          changelog_visibility: completionContext.changelogVisibility
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to complete action');
      
      // Update local state
      setActionData(prev => prev ? { ...prev, done: true } : null);
      setShowCompletionModal(false);
      
      // Reset form and preview
      setCompletionContext({
        implementationStory: '',
        impactStory: '',
        learningStory: '',
        changelogVisibility: 'team'
      });
      setPreviewData(null);
      setPreviewError(null);
      
      // Reload after short delay to get next action
      setTimeout(() => {
        if (!actionId) {
          window.location.reload();
        }
      }, 1500);
      
    } catch (err) {
      console.error('Error completing action:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete action');
    } finally {
      setCompleting(false);
    }
  };

  const handleUncomplete = async () => {
    if (!actionData || !actionData.done) return;
    
    try {
      setCompleting(true);
      setError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}/uncomplete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to uncomplete action');
      
      // Update local state
      setActionData(prev => prev ? { ...prev, done: false } : null);
      setShowUncompletionModal(false);
      
    } catch (err) {
      console.error('Error uncompleting action:', err);
      setError(err instanceof Error ? err.message : 'Failed to uncomplete action');
    } finally {
      setCompleting(false);
    }
  };

  const generatePreview = async () => {
    if (!actionData) return;
    
    // Check if all required fields have content
    const hasContent = completionContext.implementationStory.trim() && 
                      completionContext.impactStory.trim() && 
                      completionContext.learningStory.trim();
    
    if (!hasContent) {
      setPreviewData(null);
      return;
    }

    try {
      setIsGeneratingPreview(true);
      setPreviewError(null);
      
      const response = await fetch(`/api/actions/${actionData.id}/preview-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          implementation_story: completionContext.implementationStory,
          impact_story: completionContext.impactStory,
          learning_story: completionContext.learningStory,
          changelog_visibility: completionContext.changelogVisibility
        })
      });
      
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      if (!data.success) throw new Error(data.error || 'Failed to generate preview');
      
      setPreviewData(data.data);
    } catch (err) {
      console.error('Error generating preview:', err);
      setPreviewError(err instanceof Error ? err.message : 'Failed to generate preview');
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Handle completion context changes with debouncing
  const handleCompletionContextChange = (updates: Partial<typeof completionContext>) => {
    const newContext = { ...completionContext, ...updates };
    setCompletionContext(newContext);
    
    // Clear existing timer
    if (previewDebounceTimer) {
      clearTimeout(previewDebounceTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      generatePreview();
    }, 500); // 500ms debounce
    
    setPreviewDebounceTimer(timer);
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (previewDebounceTimer) {
        clearTimeout(previewDebounceTimer);
      }
    };
  }, [previewDebounceTimer]);

  if (loading) {
    return <ActionPageSkeleton colors={colors} isMobile={false} />;
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
    <>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={copyPromptToClipboard} 
            disabled={copying} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: colors.surface, 
              color: copying ? colors.borderAccent : colors.textMuted, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.375rem', 
              cursor: copying ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease' 
            }} 
            onMouseEnter={e => { if (!copying) { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.color = colors.text; } }} 
            onMouseLeave={e => { if (!copying) { e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.color = colors.textMuted; } }}
            aria-label="Copy prompt to clipboard"
          >
            {copying ? <Check size={16} /> : <Copy size={16} />}
          </button>
          <span className="tooltip">Copy prompt to clipboard</span>
        </div>
        <div style={{ position: 'relative' }}>
          <button 
            onClick={copyActionUrl} 
            disabled={copyingCodex} 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              backgroundColor: colors.surface, 
              color: copyingCodex ? colors.borderAccent : colors.textMuted, 
              border: `1px solid ${colors.border}`, 
              borderRadius: '0.375rem', 
              cursor: copyingCodex ? 'not-allowed' : 'pointer', 
              transition: 'all 0.2s ease' 
            }} 
            onMouseEnter={e => { if (!copyingCodex) { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.color = colors.text; } }} 
            onMouseLeave={e => { if (!copyingCodex) { e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.color = colors.textMuted; } }}
            aria-label="Copy action URL"
          >
            {copyingCodex ? <Check size={16} /> : <Link size={16} />}
          </button>
          <span className="tooltip">Copy action URL</span>
        </div>
        {actionData && (
          <div style={{ position: 'relative' }}>
            <button 
              onClick={() => actionData.done ? setShowUncompletionModal(true) : setShowCompletionModal(true)} 
              disabled={completing} 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                width: '36px',
                height: '36px',
                backgroundColor: colors.surface, 
                color: actionData.done ? colors.text : colors.textMuted, 
                border: `1px solid ${colors.border}`, 
                borderRadius: '0.375rem', 
                cursor: completing ? 'not-allowed' : 'pointer', 
                transition: 'all 0.2s ease' 
              }} 
              onMouseEnter={e => { if (!completing) { e.currentTarget.style.backgroundColor = colors.bg; e.currentTarget.style.color = colors.text; e.currentTarget.style.borderColor = colors.borderAccent; } }} 
              onMouseLeave={e => { if (!completing) { e.currentTarget.style.backgroundColor = colors.surface; e.currentTarget.style.color = actionData.done ? colors.text : colors.textMuted; e.currentTarget.style.borderColor = colors.border; } }}
              aria-label={actionData.done ? "Reopen action" : "Complete action"}
            >
              {actionData.done ? <CheckSquare size={16} /> : <Square size={16} />}
            </button>
            <span className="tooltip">{actionData.done ? "Reopen action" : "Complete action"}</span>
          </div>
        )}
        <style jsx>{`
          .tooltip {
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            margin-top: 8px;
            padding: 6px 12px;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            font-size: 12px;
            border-radius: 4px;
            white-space: nowrap;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.2s ease;
            z-index: 1000;
          }
          
          .tooltip::before {
            content: '';
            position: absolute;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 0 4px 4px 4px;
            border-color: transparent transparent rgba(0, 0, 0, 0.9) transparent;
          }
          
          div:hover > .tooltip {
            opacity: 1;
          }
        `}</style>
      </div>
      
      <div style={{ 
        fontSize: '0.875rem',
        lineHeight: '1.6',
        color: colors.text,
        backgroundColor: 'transparent',
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
        margin: 0,
        padding: 0,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word'
      }}>
        {actionData ? generateActionPrompt(actionData) : ''}
      </div>

      {/* Completion Modal */}
      {showCompletionModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '0.5rem', 
            maxWidth: '90%', 
            width: '80rem', 
            maxHeight: '90vh', 
            overflowY: 'auto', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '1.5rem', 
              color: colors.text, 
              fontSize: '1.25rem', 
              fontWeight: '600' 
            }}>
              Complete Action: {actionData?.title}
            </h3>
            
            <p style={{ 
              marginBottom: '1.5rem', 
              color: colors.textMuted, 
              fontSize: '0.875rem', 
              lineHeight: '1.5' 
            }}>
              Share your experience to help build institutional knowledge. All fields are required.
            </p>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr', 
              gap: '2rem',
              height: 'calc(90vh - 12rem)',
              maxHeight: '800px'
            }}>
              {/* Left column - Form */}
              <div style={{ overflowY: 'auto', paddingRight: '1rem' }}>
            
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: colors.text, 
                fontSize: '0.875rem', 
                fontWeight: '500' 
              }}>
                🔧 How did you implement this?
              </label>
              <textarea
                value={completionContext.implementationStory}
                onChange={(e) => handleCompletionContextChange({ implementationStory: e.target.value })}
                placeholder="What approach did you take? What tools or technologies did you use? What challenges did you overcome?"
                style={{ 
                  width: '100%', 
                  minHeight: '5rem', 
                  padding: '0.75rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: colors.text, 
                fontSize: '0.875rem', 
                fontWeight: '500' 
              }}>
                🎯 What impact did this have?
              </label>
              <textarea
                value={completionContext.impactStory}
                onChange={(e) => handleCompletionContextChange({ impactStory: e.target.value })}
                placeholder="What did you accomplish? What value was delivered? Who benefits from this work?"
                style={{ 
                  width: '100%', 
                  minHeight: '5rem', 
                  padding: '0.75rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: colors.text, 
                fontSize: '0.875rem', 
                fontWeight: '500' 
              }}>
                💡 What did you learn?
              </label>
              <textarea
                value={completionContext.learningStory}
                onChange={(e) => handleCompletionContextChange({ learningStory: e.target.value })}
                placeholder="What insights did you gain? What would you do differently next time? What advice would you give to others?"
                style={{ 
                  width: '100%', 
                  minHeight: '5rem', 
                  padding: '0.75rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem',
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                color: colors.text, 
                fontSize: '0.875rem', 
                fontWeight: '500' 
              }}>
                👥 Who should see this?
              </label>
              <select
                value={completionContext.changelogVisibility}
                onChange={(e) => handleCompletionContextChange({ changelogVisibility: e.target.value as 'private' | 'team' | 'public' })}
                style={{ 
                  width: '100%', 
                  padding: '0.75rem', 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  fontSize: '0.875rem',
                  backgroundColor: 'white'
                }}
              >
                <option value="private">Private - Personal notes only</option>
                <option value="team">Team - Internal team visibility</option>
                <option value="public">Public - External stakeholder visibility</option>
              </select>
            </div>
              </div>
              
              {/* Right column - Preview */}
              <div style={{ 
                overflowY: 'auto', 
                backgroundColor: '#f9fafb', 
                borderRadius: '0.5rem', 
                padding: '1rem',
                border: `1px solid ${colors.border}`
              }}>
                {isGeneratingPreview ? (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    color: colors.textMuted
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '0.5rem' }}>Generating preview...</div>
                      <div style={{ fontSize: '0.75rem' }}>This may take a moment</div>
                    </div>
                  </div>
                ) : previewError ? (
                  <div style={{ 
                    padding: '1rem', 
                    backgroundColor: '#fee', 
                    border: '1px solid #fcc', 
                    borderRadius: '0.375rem',
                    color: '#c00'
                  }}>
                    Error: {previewError}
                  </div>
                ) : previewData ? (
                  <div style={{ 
                    transform: 'scale(0.6)', 
                    transformOrigin: 'top left',
                    width: '166.67%',
                    height: '166.67%'
                  }}>
                    <MagazineArticle 
                      item={{
                        id: actionData?.id || '',
                        actionId: actionData?.id || '',
                        ...previewData,
                        actionDone: true
                      }} 
                      showShare={false}
                    />
                  </div>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    height: '100%',
                    color: colors.textMuted
                  }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>📰</div>
                      <div>Fill out all fields to see a preview</div>
                      <div style={{ fontSize: '0.75rem', marginTop: '0.25rem' }}>of your engineering journal article</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              <button 
                onClick={() => {
                  setShowCompletionModal(false);
                  setPreviewData(null);
                  setPreviewError(null);
                }}
                disabled={completing}
                style={{ 
                  padding: '0.625rem 1.25rem', 
                  backgroundColor: 'transparent', 
                  color: colors.textMuted, 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  cursor: completing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleComplete}
                disabled={completing || !completionContext.implementationStory || !completionContext.impactStory || !completionContext.learningStory}
                style={{ 
                  padding: '0.625rem 1.25rem', 
                  backgroundColor: completing || !completionContext.implementationStory || !completionContext.impactStory || !completionContext.learningStory ? colors.textFaint : '#10b981', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: completing || !completionContext.implementationStory || !completionContext.impactStory || !completionContext.learningStory ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {completing ? (
                  <>Completing...</>
                ) : (
                  <>
                    <Check size={16} />
                    Complete Action
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Uncompletion Modal */}
      {showUncompletionModal && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000 
        }}>
          <div style={{ 
            backgroundColor: 'white', 
            padding: '2rem', 
            borderRadius: '0.5rem', 
            maxWidth: '90%', 
            width: '28rem', 
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)' 
          }}>
            <h3 style={{ 
              marginTop: 0, 
              marginBottom: '1rem', 
              color: colors.text, 
              fontSize: '1.125rem', 
              fontWeight: '600' 
            }}>
              Reopen Action?
            </h3>
            
            <p style={{ 
              marginBottom: '1.5rem', 
              color: colors.textMuted, 
              fontSize: '0.875rem', 
              lineHeight: '1.5' 
            }}>
              Are you sure you want to mark "{actionData?.title}" as incomplete? This will remove the completion context and allow you to work on it again.
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowUncompletionModal(false)}
                disabled={completing}
                style={{ 
                  padding: '0.625rem 1.25rem', 
                  backgroundColor: 'transparent', 
                  color: colors.textMuted, 
                  border: `1px solid ${colors.border}`, 
                  borderRadius: '0.375rem', 
                  cursor: completing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Cancel
              </button>
              <button 
                onClick={handleUncomplete}
                disabled={completing}
                style={{ 
                  padding: '0.625rem 1.25rem', 
                  backgroundColor: completing ? colors.textFaint : colors.borderAccent, 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '0.375rem', 
                  cursor: completing ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                {completing ? 'Reopening...' : 'Reopen Action'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
