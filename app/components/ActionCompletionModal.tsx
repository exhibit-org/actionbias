'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { useActionCompletion } from '../contexts/ActionCompletionContext';
import { Loader, CheckCircle } from 'react-feather';
import { Modal, ModalBody, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { componentClasses, cn } from '@/lib/utils/design-system';
import SuccessToast from './SuccessToast';

interface CompletionFields {
  implementation_story: string;
  impact_story: string;
  learning_story: string;
}

interface CompletionPreview {
  estimatedReadingTime: string;
  wordCount: number;
  completenessScore: number;
  suggestions: string[];
}

export default function ActionCompletionModal() {
  const { isOpen, actionId, actionTitle, closeModal, onComplete } = useActionCompletion();
  const [completionFields, setCompletionFields] = useState<CompletionFields>({
    implementation_story: '',
    impact_story: '',
    learning_story: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [preview, setPreview] = useState<CompletionPreview | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  const implementationRef = useRef<HTMLTextAreaElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus first textarea when modal opens and reset state
  useEffect(() => {
    if (isOpen && implementationRef.current) {
      implementationRef.current.focus();
      setError(null);
      setPreview(null);
      setCompletionFields({
        implementation_story: '',
        impact_story: '',
        learning_story: ''
      });
    }
  }, [isOpen]);

  // Generate preview from completion fields
  const generatePreview = useCallback(async (fields: CompletionFields) => {
    const allFieldsEmpty = !fields.implementation_story.trim() && 
                          !fields.impact_story.trim() && 
                          !fields.learning_story.trim();
    
    if (allFieldsEmpty) {
      setPreview(null);
      return;
    }

    setIsGeneratingPreview(true);

    try {
      // Calculate basic metrics
      const allText = [fields.implementation_story, fields.impact_story, fields.learning_story].join(' ');
      const wordCount = allText.trim().split(/\s+/).filter(word => word.length > 0).length;
      const estimatedReadingTime = Math.max(1, Math.ceil(wordCount / 200)); // 200 words per minute
      
      // Calculate completeness score
      const fieldsWithContent = [
        fields.implementation_story.trim(),
        fields.impact_story.trim(),
        fields.learning_story.trim()
      ].filter(field => field.length > 0);
      
      const completenessScore = Math.round((fieldsWithContent.length / 3) * 100);
      
      // Generate suggestions
      const suggestions = [];
      if (!fields.implementation_story.trim()) {
        suggestions.push('Add implementation details to explain what you did');
      }
      if (!fields.impact_story.trim()) {
        suggestions.push('Describe the impact and outcomes of your work');
      }
      if (!fields.learning_story.trim()) {
        suggestions.push('Share what you learned or discovered');
      }
      if (wordCount < 50) {
        suggestions.push('Consider adding more detail to create a richer story');
      }

      setPreview({
        estimatedReadingTime: `${estimatedReadingTime} min read`,
        wordCount,
        completenessScore,
        suggestions
      });
    } catch (err) {
      console.error('Error generating preview:', err);
    } finally {
      setIsGeneratingPreview(false);
    }
  }, []);

  // Debounced field change handler
  const handleFieldChange = useCallback((field: keyof CompletionFields, value: string) => {
    const newFields = { ...completionFields, [field]: value };
    setCompletionFields(newFields);
    setError(null);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      generatePreview(newFields);
    }, 500); // 500ms debounce
  }, [completionFields, generatePreview]);

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


  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!actionId || isSubmitting) return;

    // Validate that at least one field has content
    const hasContent = completionFields.implementation_story.trim() || 
                      completionFields.impact_story.trim() || 
                      completionFields.learning_story.trim();
    
    if (!hasContent) {
      setError('Please fill in at least one completion field');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Complete the action using the completion API
      const response = await fetch(`/api/actions/${actionId}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          implementation_story: completionFields.implementation_story.trim() || undefined,
          impact_story: completionFields.impact_story.trim() || undefined,
          learning_story: completionFields.learning_story.trim() || undefined,
          changelog_visibility: 'team'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to complete action:', errorData);
        setError(errorData.error || 'Failed to complete action');
        return;
      }

      const result = await response.json();
      console.log('Action completed:', result);
      
      // Show success message
      setSuccessMessage(`Action "${actionTitle}" completed successfully!`);
      setShowSuccess(true);
      
      // Reset form and close modal
      setCompletionFields({
        implementation_story: '',
        impact_story: '',
        learning_story: ''
      });
      setPreview(null);
      closeModal();
      
      // Call completion callback if provided
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error completing action:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };


  if (!isOpen && !showSuccess) return null;

  return (
    <>
      <Modal 
        isOpen={isOpen} 
        onClose={closeModal} 
        title="Complete Action"
        maxWidth="max-w-6xl"
        className="max-h-[90vh]"
      >
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="text-primary" size={24} />
          <span className="text-xl font-semibold text-foreground">Complete Action</span>
        </div>
        
        <div className={cn(componentClasses.textSecondary, componentClasses.textSmall, "mb-6")}>
          <strong className="text-foreground">{actionTitle}</strong>
        </div>

        <ModalBody>
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
            <div className="flex gap-6 flex-1 min-h-0">
              {/* Left side - Completion Fields */}
              <div className="w-1/2 flex flex-col flex-shrink-0 space-y-4">
                <div className="flex flex-col flex-1">
                  <label className={cn(componentClasses.textSmall, "font-semibold text-foreground mb-2")}>
                    Implementation Story
                  </label>
                  <Textarea
                    ref={implementationRef}
                    value={completionFields.implementation_story}
                    onChange={(e) => handleFieldChange('implementation_story', e.target.value)}
                    placeholder="What did you implement? How did you approach the problem? What technologies or methods did you use?"
                    className="flex-1 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
                  
                <div className="flex flex-col flex-1">
                  <label className={cn(componentClasses.textSmall, "font-semibold text-foreground mb-2")}>
                    Impact Story
                  </label>
                  <Textarea
                    value={completionFields.impact_story}
                    onChange={(e) => handleFieldChange('impact_story', e.target.value)}
                    placeholder="What was the impact of your work? What problems did it solve? How does it benefit users or the system?"
                    className="flex-1 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
                  
                <div className="flex flex-col flex-1">
                  <label className={cn(componentClasses.textSmall, "font-semibold text-foreground mb-2")}>
                    Learning Story
                  </label>
                  <Textarea
                    value={completionFields.learning_story}
                    onChange={(e) => handleFieldChange('learning_story', e.target.value)}
                    placeholder="What did you learn? What challenges did you overcome? What would you do differently next time?"
                    className="flex-1 resize-none"
                    disabled={isSubmitting}
                  />
                </div>
                
                {error && (
                  <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </div>

              {/* Right side - Preview */}
              <div className="w-1/2 flex-shrink-0">
                <div className={cn(componentClasses.card, "h-full flex flex-col")}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className={cn(componentClasses.textSmall, "font-semibold text-foreground")}>Completion Preview</h3>
                    {isGeneratingPreview && (
                      <div className={cn("flex items-center gap-2", componentClasses.textSmall, componentClasses.textSecondary)}>
                        <Loader size={14} className="animate-spin" />
                        <span>Analyzing...</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-4">
                    {preview ? (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div className={cn(componentClasses.card, "p-3")}>
                            <div className={cn(componentClasses.textExtraSmall, "font-medium", componentClasses.textSecondary, "mb-1")}>Reading Time</div>
                            <div className="text-lg font-semibold text-foreground">{preview.estimatedReadingTime}</div>
                          </div>
                          <div className={cn(componentClasses.card, "p-3")}>
                            <div className={cn(componentClasses.textExtraSmall, "font-medium", componentClasses.textSecondary, "mb-1")}>Word Count</div>
                            <div className="text-lg font-semibold text-foreground">{preview.wordCount}</div>
                          </div>
                        </div>
                          
                        <div className={cn(componentClasses.card, "p-3")}>
                          <div className={cn(componentClasses.textExtraSmall, "font-medium", componentClasses.textSecondary, "mb-2")}>Completeness</div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full transition-all duration-300"
                                style={{ width: `${preview.completenessScore}%` }}
                              />
                            </div>
                            <span className={cn(componentClasses.textSmall, "font-medium text-foreground")}>{preview.completenessScore}%</span>
                          </div>
                        </div>
                          
                        {preview.suggestions.length > 0 && (
                          <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                            <div className={cn(componentClasses.textExtraSmall, "font-medium text-primary mb-2")}>Suggestions</div>
                            <ul className="space-y-1">
                              {preview.suggestions.map((suggestion, index) => (
                                <li key={index} className={cn(componentClasses.textSmall, "text-primary/80 flex items-start gap-2")}>
                                  <span className="text-primary mt-1">•</span>
                                  <span>{suggestion}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        </>
                      ) : (
                        <div className={cn(componentClasses.flexCenter, "h-full", componentClasses.textSecondary)}>
                          <div className="text-center">
                            <div className="text-4xl mb-2">📝</div>
                            <div className={componentClasses.textSmall}>Start writing to see preview</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

            </form>
          </ModalBody>
          
          <ModalFooter>
            <div className={cn(componentClasses.textSmall, componentClasses.textSecondary)}>
              <p>Tip: Press <kbd className="px-1.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground border border-border rounded">ESC</kbd> to close</p>
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                variant="ghost"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || isGeneratingPreview}
                className="bg-primary hover:bg-primary/90"
              >
                {isSubmitting ? 'Completing...' : 'Complete Action'}
              </Button>
            </div>
          </ModalFooter>
        </Modal>
      )
      
      {showSuccess && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccess(false)}
        />
      )}
    </>
  );
}