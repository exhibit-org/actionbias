'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';
import { X, Loader } from 'react-feather';

interface ActionFields {
  title: string;
  description: string;
  vision: string;
}

interface FamilySuggestion {
  id: string;
  title: string;
  similarity: number;
}

export default function QuickActionModal() {
  const { isOpen, closeModal } = useQuickAction();
  const [actionText, setActionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [actionFields, setActionFields] = useState<ActionFields | null>(null);
  const [familySuggestion, setFamilySuggestion] = useState<FamilySuggestion | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-focus textarea when modal opens and reset state
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      setError(null);
      setActionFields(null);
      setFamilySuggestion(null);
    }
  }, [isOpen]);

  // Generate action fields from text
  const generateActionFields = useCallback(async (text: string) => {
    if (!text.trim()) {
      setActionFields(null);
      setFamilySuggestion(null);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      // Parse the text into structured fields
      const parseResponse = await fetch('/api/actions/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse action text');
      }

      const parseData = await parseResponse.json();
      setActionFields(parseData.data);

      // Get family suggestion based on the generated title
      if (parseData.data?.title) {
        // Use the same suggest-family endpoint that the MCP tools use
        const suggestResponse = await fetch('/api/actions/suggest-family', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: parseData.data.title,
            description: parseData.data.description,
            vision: parseData.data.vision,
            limit: 10, // Get more candidates to see what's available
            threshold: 0.05, // Very low threshold to be more inclusive
          }),
        });

        if (suggestResponse.ok) {
          const suggestData = await suggestResponse.json();
          console.log('Generated action fields:', {
            title: parseData.data.title,
            description: parseData.data.description,
            vision: parseData.data.vision
          });
          
          console.log('Family suggestions response:', {
            candidatesCount: suggestData.data?.candidates?.length || 0,
            metadata: suggestData.data?.metadata,
            firstCandidate: suggestData.data?.candidates?.[0]
          }); // Enhanced debug log
          
          // Log all candidates for debugging
          if (suggestData.data?.candidates?.length > 0) {
            console.log('All family candidates:');
            suggestData.data.candidates.forEach((candidate: any, index: number) => {
              console.log(`${index + 1}. ${candidate.title} (${Math.round(candidate.similarity * 100)}%)`);
            });
          } else {
            console.log('No family candidates found at all');
          }
          
          const topCandidate = suggestData.data?.candidates?.[0];
          if (topCandidate) {
            setFamilySuggestion({
              id: topCandidate.id,
              title: topCandidate.title,
              similarity: topCandidate.similarity,
            });
          } else {
            setFamilySuggestion(null); // Explicitly clear if no match
          }
        } else {
          console.error('Failed to get family suggestions:', await suggestResponse.text());
          setFamilySuggestion(null);
        }
      } else {
        setFamilySuggestion(null);
      }
    } catch (err) {
      console.error('Error generating fields:', err);
      // Don't show error for generation failures, just don't update fields
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Debounced text change handler
  const handleTextChange = useCallback((text: string) => {
    setActionText(text);
    setError(null);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      generateActionFields(text);
    }, 500); // 500ms debounce
  }, [generateActionFields]);

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

    // If we don't have generated fields yet, wait for generation
    if (!actionFields && actionText.trim()) {
      setError('Please wait for the action preview to generate');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create the action with generated fields
      const createResponse = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: actionFields?.title || actionText.trim(),
          description: actionFields?.description,
          vision: actionFields?.vision,
          parent_id: familySuggestion?.id,
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
      
      setActionText('');
      setActionFields(null);
      setFamilySuggestion(null);
      closeModal();
      
      // Show success message (could be improved with a toast notification)
      // For now, just reload the page to show the new action
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Error creating action:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 relative"
        style={{ maxHeight: '80vh' }}
      >
        <button
          onClick={closeModal}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Quick Add Action
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <textarea
              ref={textareaRef}
              value={actionText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="What needs to be done? (e.g., 'Refactor authentication system to use JWT tokens')"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
              disabled={isSubmitting}
            />
            
            {error && (
              <div className="mt-2 text-sm text-red-600">
                {error}
              </div>
            )}
          </div>

          {/* Real-time preview */}
          {(actionText.trim() || actionFields) && (
            <div className="space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700">Preview</h3>
                {isGenerating && (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader size={14} className="animate-spin" />
                    <span>Generating...</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-xs font-medium text-gray-600">Title</label>
                  <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm">
                    {actionFields?.title || <span className="text-gray-400">Generating...</span>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Description</label>
                  <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm">
                    {actionFields?.description || <span className="text-gray-400">Generating...</span>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Vision</label>
                  <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm">
                    {actionFields?.vision || <span className="text-gray-400">Generating...</span>}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600">Family</label>
                  <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm">
                    {familySuggestion ? (
                      <span>
                        {familySuggestion.title}
                        <span className="text-xs text-gray-500 ml-2">
                          ({Math.round(familySuggestion.similarity * 100)}% match)
                        </span>
                      </span>
                    ) : (
                      <span className="text-gray-400">
                        {actionFields ? 'No matching family found (root action)' : 'Generating...'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={closeModal}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!actionText.trim() || isSubmitting || isGenerating || !actionFields}
            >
              {isSubmitting ? 'Creating...' : isGenerating ? 'Generating...' : 'Create Action'}
            </button>
          </div>
        </form>

        <div className="mt-4 text-sm text-gray-500">
          <p>Tip: Press <kbd className="px-1.5 py-0.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded">ESC</kbd> to close</p>
        </div>
      </div>
    </div>
  );
}