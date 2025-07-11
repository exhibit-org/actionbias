'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { useActionCompletion } from '../contexts/ActionCompletionContext';
import { X, Loader, CheckCircle } from 'react-feather';
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
  const { isOpen, actionId, actionTitle, closeModal } = useActionCompletion();
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
  const [onCompletionCallback, setOnCompletionCallback] = useState<(() => void) | null>(null);
  
  const modalRef = useRef<HTMLDivElement>(null);
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
      if (onCompletionCallback) {
        onCompletionCallback();
      }
    } catch (error) {
      console.error('Error completing action:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Allow external components to set a callback for when completion is successful
  const setCompletionCallback = useCallback((callback: () => void) => {
    setOnCompletionCallback(() => callback);
  }, []);

  // Expose the callback setter for external use
  useEffect(() => {
    if (isOpen && (window as any).setActionCompletionCallback) {
      (window as any).setActionCompletionCallback(setCompletionCallback);
    }
  }, [isOpen, setCompletionCallback]);

  if (!isOpen && !showSuccess) return null;

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          <div 
            ref={modalRef}
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full p-6 relative flex flex-col"
            style={{ maxHeight: '90vh' }}
          >
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="text-green-500" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                Complete Action
              </h2>
            </div>

            <div className="text-sm text-gray-600 mb-6">
              <strong>{actionTitle}</strong>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
              <div className="flex gap-6 flex-1 min-h-0">
                {/* Left side - Completion Fields */}
                <div className="w-1/2 flex flex-col flex-shrink-0 space-y-4">
                  <div className="flex flex-col flex-1">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Implementation Story
                    </label>
                    <textarea
                      ref={implementationRef}
                      value={completionFields.implementation_story}
                      onChange={(e) => handleFieldChange('implementation_story', e.target.value)}
                      placeholder="What did you implement? How did you approach the problem? What technologies or methods did you use?"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Impact Story
                    </label>
                    <textarea
                      value={completionFields.impact_story}
                      onChange={(e) => handleFieldChange('impact_story', e.target.value)}
                      placeholder="What was the impact of your work? What problems did it solve? How does it benefit users or the system?"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  <div className="flex flex-col flex-1">
                    <label className="text-sm font-semibold text-gray-700 mb-2">
                      Learning Story
                    </label>
                    <textarea
                      value={completionFields.learning_story}
                      onChange={(e) => handleFieldChange('learning_story', e.target.value)}
                      placeholder="What did you learn? What challenges did you overcome? What would you do differently next time?"
                      className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      disabled={isSubmitting}
                    />
                  </div>
                  
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
                      {error}
                    </div>
                  )}
                </div>

                {/* Right side - Preview */}
                <div className="w-1/2 flex-shrink-0">
                  <div className="h-full bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-gray-700">Completion Preview</h3>
                      {isGeneratingPreview && (
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Loader size={14} className="animate-spin" />
                          <span>Analyzing...</span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-4">
                      {preview ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-1">Reading Time</div>
                              <div className="text-lg font-semibold text-gray-900">{preview.estimatedReadingTime}</div>
                            </div>
                            <div className="bg-white p-3 rounded-lg border border-gray-200">
                              <div className="text-xs font-medium text-gray-600 mb-1">Word Count</div>
                              <div className="text-lg font-semibold text-gray-900">{preview.wordCount}</div>
                            </div>
                          </div>
                          
                          <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <div className="text-xs font-medium text-gray-600 mb-2">Completeness</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                                  style={{ width: `${preview.completenessScore}%` }}
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{preview.completenessScore}%</span>
                            </div>
                          </div>
                          
                          {preview.suggestions.length > 0 && (
                            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                              <div className="text-xs font-medium text-blue-800 mb-2">Suggestions</div>
                              <ul className="space-y-1">
                                {preview.suggestions.map((suggestion, index) => (
                                  <li key={index} className="text-sm text-blue-700 flex items-start gap-2">
                                    <span className="text-blue-500 mt-1">•</span>
                                    <span>{suggestion}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                          <div className="text-center">
                            <div className="text-4xl mb-2">📝</div>
                            <div className="text-sm">Start writing to see preview</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between flex-shrink-0">
                <div className="text-sm text-gray-500">
                  <p>Tip: Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">ESC</kbd> to close</p>
                </div>
                
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting || isGeneratingPreview}
                  >
                    {isSubmitting ? 'Completing...' : 'Complete Action'}
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