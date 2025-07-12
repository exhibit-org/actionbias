'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';
import { X, Loader } from 'react-feather';
import SuccessToast from './SuccessToast';
import { componentClasses } from '@/lib/utils/design-system';
import { cn } from '@/lib/utils';

interface ActionFields {
  title: string;
  description: string;
  vision: string;
}

interface ParentSuggestion {
  id: string;
  title: string;
  description?: string;
  confidence: number;
  source: 'vector' | 'classification' | 'create_new';
  reasoning: string;
  hierarchyPath: string[];
  canCreateNewParent: boolean;
}

interface AIPreview {
  fields: ActionFields;
  placement: {
    suggestions: ParentSuggestion[];
    metadata?: {
      totalProcessingTimeMs: number;
      vectorTimeMs: number;
      classificationTimeMs: number;
      totalCandidates: number;
    };
    reasoning: string;
  };
  isDuplicate?: boolean;
  duplicate?: {
    id: string;
    title: string;
    similarity: number;
  };
}

export default function QuickActionModal() {
  const { isOpen, closeModal } = useQuickAction();
  const [actionText, setActionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPreview, setAIPreview] = useState<AIPreview | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus textarea when modal opens and reset state
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      setError(null);
      setAIPreview(null);
      setSelectedParentId(null);
    }
  }, [isOpen]);

  // Generate AI preview from text
  const generateAIPreview = useCallback(async (text: string) => {
    if (!text.trim()) {
      setAIPreview(null);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Use the AI-powered endpoint to analyze and get placement
      const response = await fetch('/api/actions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze action');
      }

      // Set the preview data including duplicate detection
      setAIPreview({
        fields: data.data.fields,
        placement: data.data.placement,
        isDuplicate: data.data.isDuplicate,
        duplicate: data.data.duplicate,
      });

      // Don't set error for duplicates - the yellow warning box in the right panel is sufficient

      console.log('AI Preview generated:', {
        fields: data.data.fields,
        placement: data.data.placement,
      });
    } catch (err) {
      console.error('Error generating AI preview:', err);
      // Fallback to basic parsing if AI analysis fails
      try {
        const parseResponse = await fetch('/api/actions/parse', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });

        if (parseResponse.ok) {
          const parseData = await parseResponse.json();
          setAIPreview({
            fields: parseData.data,
            placement: {
              suggestions: [],
              reasoning: 'AI analysis unavailable, creating as root action',
            },
          });
        }
      } catch (fallbackErr) {
        console.error('Fallback parsing also failed:', fallbackErr);
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Debounced text change handler
  const handleTextChange = useCallback((text: string) => {
    setActionText(text);
    setError(null);
    setSelectedParentId(null); // Reset parent selection when text changes

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If text is empty or whitespace only, clear the fields immediately
    if (!text.trim()) {
      setAIPreview(null);
      setIsGenerating(false);
      return;
    }

    // Set new timer for non-empty text
    debounceTimerRef.current = setTimeout(() => {
      generateAIPreview(text);
    }, 500); // 500ms debounce
  }, [generateAIPreview]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        closeModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeModal]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        closeModal();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, closeModal]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionText.trim() || isSubmitting) return;

    // If we don't have AI preview yet, wait for generation
    if (!aiPreview && actionText.trim()) {
      setError('Please wait for the AI preview to generate');
      return;
    }

    // Allow submission even if duplicate detected - user can create as child or sibling

    setIsSubmitting(true);
    
    try {
      let parentId = selectedParentId;
      
      // Handle CREATE_NEW_PARENT case
      if (selectedParentId === 'CREATE_NEW_PARENT') {
        // Find the CREATE_NEW_PARENT suggestion to get its details
        const createNewSuggestion = aiPreview?.placement.suggestions.find(s => s.id === 'CREATE_NEW_PARENT');
        if (createNewSuggestion) {
          // Create the parent action first
          const parentResponse = await fetch('/api/actions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: createNewSuggestion.title,
              description: createNewSuggestion.description,
            }),
          });

          if (!parentResponse.ok) {
            const errorData = await parentResponse.json();
            console.error('Failed to create parent action:', errorData);
            setError(errorData.error || 'Failed to create parent action');
            return;
          }

          const parentData = await parentResponse.json();
          parentId = parentData.data.action.id;
          console.log('Parent action created:', parentData);
        } else {
          setError('CREATE_NEW_PARENT suggestion not found');
          return;
        }
      }

      // Create the action with AI-determined placement
      const createResponse = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: aiPreview?.fields.title || actionText.trim(),
          description: aiPreview?.fields.description,
          vision: aiPreview?.fields.vision,
          ...(parentId && { parent_id: parentId }),
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error('Failed to create action:', errorData);
        setError(errorData.error || 'Failed to create action');
        return;
      }

      const createData = await createResponse.json();
      console.log('Action created:', createData);
      
      // Show success message
      const actionTitle = aiPreview?.fields.title || actionText.trim();
      const parentMessage = selectedParentId === 'CREATE_NEW_PARENT' ? ' with new parent' : '';
      setSuccessMessage(`Action "${actionTitle}" created successfully${parentMessage}!`);
      setShowSuccess(true);
      
      // Reset form and close modal
      setActionText('');
      setAIPreview(null);
      setSelectedParentId(null);
      closeModal();
    } catch (error) {
      console.error('Error creating action:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {isOpen && (
        <div className={componentClasses.modalOverlay}>
          <div 
            ref={modalRef}
            className={cn(componentClasses.modalContainer, 'max-h-[80vh] text-foreground bg-background')}
          >
            <button
              onClick={closeModal}
              className={componentClasses.modalCloseButton}
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <h2 className={componentClasses.modalHeader}>
              Quick Add Action
            </h2>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex gap-6 flex-1 min-h-0">
            {/* Left side - Textarea and Parent Suggestions */}
            <div className="w-1/2 flex flex-col flex-shrink-0">
              {/* Textarea */}
              <div className="flex-1 flex flex-col">
                <textarea
                  ref={textareaRef}
                  value={actionText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder="What needs to be done? (e.g., 'Refactor authentication system to use JWT tokens')"
                  className={cn(componentClasses.input, 'flex-1')}
                  disabled={isSubmitting}
                />
                
                {error && (
                  <div className={cn('mt-2', componentClasses.textSmall)} style={{ color: 'rgb(239 68 68)' }}>
                    {error}
                  </div>
                )}
              </div>
              
              {/* Parent Suggestions */}
              <div className="mt-4 flex-shrink-0">
                <label className={cn(componentClasses.textSmall, 'font-semibold text-foreground mb-2 block')}>Parent Suggestions</label>
                <div className={cn(componentClasses.card, 'max-h-48 overflow-y-auto')}>
                  {aiPreview?.placement.suggestions && aiPreview.placement.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {aiPreview.placement.suggestions.map((suggestion) => (
                        <div 
                          key={suggestion.id} 
                          className={cn(
                            'p-2 border rounded-lg cursor-pointer transition-colors',
                            selectedParentId === suggestion.id 
                              ? componentClasses.cardSelected
                              : cn(componentClasses.card, componentClasses.cardHover)
                          )}
                          onClick={() => setSelectedParentId(suggestion.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={cn(componentClasses.textSmall, 'font-medium truncate text-foreground')}>{suggestion.title}</span>
                                {suggestion.canCreateNewParent && (
                                  <span className={cn(componentClasses.textExtraSmall, 'bg-primary/20 text-primary px-1.5 py-0.5 rounded flex-shrink-0')}>NEW</span>
                                )}
                              </div>
                              <div className={cn(componentClasses.textExtraSmall, componentClasses.textSecondary, 'mt-1 line-clamp-2')}>
                                {suggestion.confidence}% confidence • {suggestion.source}
                              </div>
                            </div>
                            <div className={cn(componentClasses.textExtraSmall, componentClasses.textSecondary, 'ml-2 flex-shrink-0')}>
                              {Math.round(suggestion.confidence)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(componentClasses.card, componentClasses.textSmall, componentClasses.textSecondary)}>
                      {actionText.trim() && isGenerating ? 'Analyzing hierarchy...' : 
                       aiPreview ? 'No parent suggestions available' : 'Enter action text to analyze'}
                    </div>
                  )}
                  
                  {/* Root-level option */}
                  <div 
                    className={cn(
                      'mt-2 p-2 border rounded-lg cursor-pointer transition-colors',
                      selectedParentId === null 
                        ? componentClasses.cardSelected
                        : cn(componentClasses.card, componentClasses.cardHover)
                    )}
                    onClick={() => setSelectedParentId(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={cn(componentClasses.textSmall, 'font-medium text-foreground')}>Root Level</span>
                        <div className={cn(componentClasses.textExtraSmall, componentClasses.textSecondary, 'mt-1')}>
                          Create as a top-level action without a parent
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - AI Preview only */}
            <div className="w-1/2 flex-shrink-0">
              <div className={cn(componentClasses.card, 'h-full flex flex-col')}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className={cn(componentClasses.textSmall, 'font-semibold text-foreground')}>AI Preview</h3>
                  {isGenerating && actionText.trim() && (
                    <div className={cn('flex items-center gap-2', componentClasses.textSmall, componentClasses.textSecondary)}>
                      <Loader size={14} className="animate-spin" />
                      <span>Generating...</span>
                    </div>
                  )}
                </div>

                {aiPreview?.isDuplicate && aiPreview.duplicate && (
                  <div className="mb-3 p-3 bg-warning/10 border border-warning/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className={cn(componentClasses.textSmall, 'font-medium')} style={{ color: 'rgb(234 179 8)' }}>⚠️ Duplicate Detected</span>
                    </div>
                    <p className={cn(componentClasses.textSmall, 'mt-1')} style={{ color: 'rgb(217 119 6)' }}>
                      Similar action exists: "{aiPreview.duplicate.title}" 
                      ({Math.round(aiPreview.duplicate.similarity * 100)}% match)
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3">
                  <div>
                    <label className={cn(componentClasses.textExtraSmall, 'font-medium text-foreground')}>Title</label>
                    <div className={cn('mt-1 p-2 bg-muted/20 rounded border border-border', componentClasses.textSmall, 'min-h-[2rem]')}>
                      {aiPreview?.fields.title || (
                        actionText.trim() && isGenerating ? 
                        <span className={cn(componentClasses.textSecondary, 'italic')}>Generating...</span> : 
                        <span className={cn(componentClasses.textSecondary, 'italic opacity-60')}>Enter action text to generate</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={cn(componentClasses.textExtraSmall, 'font-medium text-foreground')}>Description</label>
                    <div className={cn('mt-1 p-2 bg-muted/20 rounded border border-border', componentClasses.textSmall, 'min-h-[4rem] max-h-24 overflow-y-auto')}>
                      {aiPreview?.fields.description || (
                        actionText.trim() && isGenerating ? 
                        <span className={cn(componentClasses.textSecondary, 'italic')}>Generating...</span> : 
                        <span className={cn(componentClasses.textSecondary, 'italic opacity-60')}>Enter action text to generate</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className={cn(componentClasses.textExtraSmall, 'font-medium text-foreground')}>Vision</label>
                    <div className={cn('mt-1 p-2 bg-muted/20 rounded border border-border', componentClasses.textSmall, 'min-h-[3rem] max-h-20 overflow-y-auto')}>
                      {aiPreview?.fields.vision || (
                        actionText.trim() && isGenerating ? 
                        <span className={cn(componentClasses.textSecondary, 'italic')}>Generating...</span> : 
                        <span className={cn(componentClasses.textSecondary, 'italic opacity-60')}>Enter action text to generate</span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between flex-shrink-0">
            <div className={cn(componentClasses.textSmall, componentClasses.textSecondary)}>
              <p>Tip: Press <kbd className={cn('px-1.5 py-0.5', componentClasses.textExtraSmall, 'font-semibold text-foreground bg-muted border border-border rounded')}>ESC</kbd> to close</p>
            </div>
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeModal}
                className={cn(componentClasses.button, componentClasses.buttonSecondary)}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className={cn(componentClasses.button, componentClasses.buttonPrimary)}
                disabled={!actionText.trim() || isSubmitting || isGenerating || !aiPreview}
              >
                {isSubmitting ? 'Creating...' : isGenerating ? 'Generating...' : 'Create Action'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
      )}
      
      {showSuccess && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}