'use client'

import { useEffect, useRef, useState, useCallback } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';
import { X, Loader } from 'react-feather';
import SuccessToast from './SuccessToast';

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
          ...(selectedParentId && selectedParentId !== 'CREATE_NEW_PARENT' && { parent_id: selectedParentId }),
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
      setSuccessMessage(`Action "${actionTitle}" created successfully!`);
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
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          style={{ backdropFilter: 'blur(4px)' }}
        >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-5xl w-full p-6 relative flex flex-col"
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
                  className="flex-1 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  disabled={isSubmitting}
                />
                
                {error && (
                  <div className="mt-2 text-sm text-red-600">
                    {error}
                  </div>
                )}
              </div>
              
              {/* Parent Suggestions */}
              <div className="mt-4 flex-shrink-0">
                <label className="text-sm font-semibold text-gray-700 mb-2 block">Parent Suggestions</label>
                <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 max-h-48 overflow-y-auto">
                  {aiPreview?.placement.suggestions && aiPreview.placement.suggestions.length > 0 ? (
                    <div className="space-y-2">
                      {aiPreview.placement.suggestions.map((suggestion) => (
                        <div 
                          key={suggestion.id} 
                          className={`p-2 border rounded-lg cursor-pointer transition-colors ${
                            selectedParentId === suggestion.id 
                              ? 'border-blue-500 bg-blue-50' 
                              : 'border-gray-200 bg-white hover:border-gray-300'
                          }`}
                          onClick={() => setSelectedParentId(suggestion.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium truncate">{suggestion.title}</span>
                                {suggestion.canCreateNewParent && (
                                  <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex-shrink-0">NEW</span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {suggestion.confidence}% confidence • {suggestion.source}
                              </div>
                            </div>
                            <div className="text-xs text-gray-400 ml-2 flex-shrink-0">
                              {Math.round(suggestion.confidence)}%
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2 bg-white rounded border border-gray-200 text-sm text-gray-500">
                      {actionText.trim() && isGenerating ? 'Analyzing hierarchy...' : 
                       aiPreview ? 'No parent suggestions available' : 'Enter action text to analyze'}
                    </div>
                  )}
                  
                  {/* Root-level option */}
                  <div 
                    className={`mt-2 p-2 border rounded-lg cursor-pointer transition-colors ${
                      selectedParentId === null 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedParentId(null)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium">Root Level</span>
                        <div className="text-xs text-gray-500 mt-1">
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
              <div className="h-full bg-gray-50 rounded-lg border border-gray-200 p-4 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-gray-700">AI Preview</h3>
                  {isGenerating && actionText.trim() && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader size={14} className="animate-spin" />
                      <span>Generating...</span>
                    </div>
                  )}
                </div>

                {aiPreview?.isDuplicate && aiPreview.duplicate && (
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-600 text-sm font-medium">⚠️ Duplicate Detected</span>
                    </div>
                    <p className="text-sm text-yellow-700 mt-1">
                      Similar action exists: "{aiPreview.duplicate.title}" 
                      ({Math.round(aiPreview.duplicate.similarity * 100)}% match)
                    </p>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600">Title</label>
                    <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm min-h-[2rem]">
                      {aiPreview?.fields.title || (
                        actionText.trim() && isGenerating ? 
                        <span className="text-gray-400 italic">Generating...</span> : 
                        <span className="text-gray-300 italic">Enter action text to generate</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Description</label>
                    <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm min-h-[4rem] max-h-24 overflow-y-auto">
                      {aiPreview?.fields.description || (
                        actionText.trim() && isGenerating ? 
                        <span className="text-gray-400 italic">Generating...</span> : 
                        <span className="text-gray-300 italic">Enter action text to generate</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600">Vision</label>
                    <div className="mt-1 p-2 bg-white rounded border border-gray-200 text-sm min-h-[3rem] max-h-20 overflow-y-auto">
                      {aiPreview?.fields.vision || (
                        actionText.trim() && isGenerating ? 
                        <span className="text-gray-400 italic">Generating...</span> : 
                        <span className="text-gray-300 italic">Enter action text to generate</span>
                      )}
                    </div>
                  </div>

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
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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