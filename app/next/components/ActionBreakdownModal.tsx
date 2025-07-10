'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Loader } from 'react-feather';
import { ColorScheme } from './types';
import { ActionDetailResource } from '../../../lib/types/resources';
import SuccessToast from '../../components/SuccessToast';

interface ChildActionSuggestion {
  index: number;
  title: string;
  description: string;
  reasoning?: string;
  confidence: number;
}

interface DependencyRelationship {
  dependent_index: number;
  depends_on_index: number;
  reasoning?: string;
  dependency_type: 'sequential' | 'prerequisite' | 'informational';
}

interface BreakdownResponse {
  action: {
    id: string;
    title: string;
    description?: string;
    vision?: string;
  };
  suggestions: ChildActionSuggestion[];
  dependencies: DependencyRelationship[];
  metadata: {
    processingTimeMs: number;
    aiModel: string;
    analysisDepth: string;
  };
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  action: ActionDetailResource;
  colors: ColorScheme;
  onSuccess?: () => void; // Callback to refresh data without page reload
}

export default function ActionBreakdownModal({ isOpen, onClose, action, colors, onSuccess }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [breakdown, setBreakdown] = useState<BreakdownResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [isCreating, setIsCreating] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setBreakdown(null);
      setError(null);
      setSelectedSuggestions(new Set());
      setIsCreating(false);
      fetchBreakdown();
    }
  }, [isOpen, action.id]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const fetchBreakdown = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/actions/${action.id}/suggest-children`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          max_suggestions: 5,
          include_reasoning: true,
          complexity_level: 'detailed'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to generate breakdown (${response.status})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to generate breakdown');
      }

      setBreakdown(data.data);
      // Select all suggestions by default
      setSelectedSuggestions(new Set(data.data.suggestions.map((s: ChildActionSuggestion) => s.index)));
    } catch (err) {
      console.error('Error fetching breakdown:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate breakdown');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    const newSelected = new Set(selectedSuggestions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedSuggestions(newSelected);
  };

  const createSelectedActions = async () => {
    if (!breakdown || selectedSuggestions.size === 0) return;

    setIsCreating(true);
    setError(null);

    try {
      const selectedActions = breakdown.suggestions.filter(s => selectedSuggestions.has(s.index));
      const selectedDependencies = breakdown.dependencies.filter(d => 
        selectedSuggestions.has(d.dependent_index) && selectedSuggestions.has(d.depends_on_index)
      );

      // Create actions first
      const createdActions: { [index: number]: string } = {};
      
      for (const suggestion of selectedActions) {
        const response = await fetch('/api/actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: suggestion.title,
            description: suggestion.description,
            vision: action.vision, // Inherit parent's vision
            parent_id: action.id,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Failed to create action "${suggestion.title}": ${errorData.error}`);
        }

        const data = await response.json();
        createdActions[suggestion.index] = data.data.id;
      }

      // Create dependencies with error handling
      const dependencyErrors: string[] = [];
      for (const dependency of selectedDependencies) {
        const dependentId = createdActions[dependency.dependent_index];
        const dependsOnId = createdActions[dependency.depends_on_index];

        if (!dependentId || !dependsOnId) {
          console.warn('Skipping dependency creation: missing action IDs', { 
            dependency, 
            dependentId, 
            dependsOnId 
          });
          continue;
        }

        try {
          const response = await fetch('/api/actions/dependencies', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action_id: dependentId,
              depends_on_id: dependsOnId,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            const errorMsg = `Failed to create dependency (${response.status}): ${errorData.error || 'Unknown error'}`;
            console.error('Dependency creation failed:', errorMsg, { dependency, dependentId, dependsOnId });
            dependencyErrors.push(errorMsg);
          } else {
            const result = await response.json();
            console.log('Dependency created successfully:', result.data);
          }
        } catch (err) {
          const errorMsg = `Network error creating dependency: ${err instanceof Error ? err.message : 'Unknown error'}`;
          console.error('Dependency creation network error:', err, { dependency, dependentId, dependsOnId });
          dependencyErrors.push(errorMsg);
        }
      }

      // Show warning if some dependencies failed to create
      if (dependencyErrors.length > 0) {
        console.warn(`${dependencyErrors.length} dependency creation(s) failed:`, dependencyErrors);
        // Optionally, you could show this in the UI as well
      }

      // Success - show toast and refresh data
      const createdCount = selectedActions.length;
      let message = `Successfully created ${createdCount} child action${createdCount !== 1 ? 's' : ''}`;
      
      if (dependencyErrors.length > 0) {
        message += ` (${dependencyErrors.length} dependency creation${dependencyErrors.length !== 1 ? 's' : ''} failed - check console for details)`;
      }
      
      setSuccessMessage(message);
      setShowSuccessToast(true);
      onClose();
      
      // Call the refresh callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error creating actions:', err);
      setError(err instanceof Error ? err.message : 'Failed to create actions');
    } finally {
      setIsCreating(false);
    }
  };

  const getDependencyVisualization = () => {
    if (!breakdown || breakdown.dependencies.length === 0) return null;

    const relevantDeps = breakdown.dependencies.filter(d => 
      selectedSuggestions.has(d.dependent_index) && selectedSuggestions.has(d.depends_on_index)
    );

    if (relevantDeps.length === 0) return null;

    return (
      <div style={{ 
        marginTop: '1rem', 
        padding: '1rem', 
        backgroundColor: colors.surface, 
        border: `1px solid ${colors.border}`, 
        borderRadius: '0.5rem' 
      }}>
        <div style={{ 
          fontSize: '0.875rem', 
          fontWeight: 600, 
          color: colors.text, 
          marginBottom: '0.75rem' 
        }}>
          Dependencies ({relevantDeps.length})
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {relevantDeps.map((dep, index) => {
            const dependentAction = breakdown.suggestions.find(s => s.index === dep.dependent_index);
            const dependsOnAction = breakdown.suggestions.find(s => s.index === dep.depends_on_index);
            
            if (!dependentAction || !dependsOnAction) return null;

            return (
              <div key={index} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                fontSize: '0.75rem',
                color: colors.textSubtle 
              }}>
                <span style={{ fontWeight: 500 }}>{dependentAction.title}</span>
                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span>depends on</span>
                <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
                <span style={{ fontWeight: 500 }}>{dependsOnAction.title}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      style={{ backdropFilter: 'blur(4px)' }}
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 relative flex flex-col"
        style={{ maxHeight: '90vh' }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ 
            fontSize: '1.5rem', 
            fontWeight: 600, 
            color: colors.text, 
            marginBottom: '0.5rem' 
          }}>
            Break Down Action
          </h2>
          <p style={{ 
            fontSize: '0.875rem', 
            color: colors.textSubtle 
          }}>
            "{action.title}"
          </p>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {isLoading && (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              padding: '3rem',
              flexDirection: 'column',
              gap: '1rem'
            }}>
              <Loader size={24} className="animate-spin" style={{ color: colors.textSubtle }} />
              <span style={{ fontSize: '0.875rem', color: colors.textSubtle }}>
                Analyzing action and generating breakdown suggestions...
              </span>
            </div>
          )}

          {error && (
            <div style={{ 
              padding: '1rem', 
              backgroundColor: '#fef2f2', 
              border: '1px solid #fecaca', 
              borderRadius: '0.5rem',
              marginBottom: '1rem'
            }}>
              <div style={{ color: '#dc2626', fontSize: '0.875rem', fontWeight: 500 }}>
                Error generating breakdown
              </div>
              <div style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                {error}
              </div>
              <button
                onClick={fetchBreakdown}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.25rem',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Try Again
              </button>
            </div>
          )}

          {breakdown && (
            <div>
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between',
                marginBottom: '1rem'
              }}>
                <div style={{ 
                  fontSize: '1rem', 
                  fontWeight: 600, 
                  color: colors.text 
                }}>
                  Suggested Child Actions ({breakdown.suggestions.length})
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: colors.textFaint 
                }}>
                  Generated in {breakdown.metadata.processingTimeMs}ms
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {breakdown.suggestions.map((suggestion) => {
                  const isSelected = selectedSuggestions.has(suggestion.index);
                  const confidenceBar = '█'.repeat(Math.floor(suggestion.confidence * 10)) + 
                                      '░'.repeat(10 - Math.floor(suggestion.confidence * 10));

                  return (
                    <div
                      key={suggestion.index}
                      onClick={() => toggleSuggestion(suggestion.index)}
                      style={{
                        padding: '1rem',
                        border: `2px solid ${isSelected ? colors.borderAccent : colors.border}`,
                        borderRadius: '0.5rem',
                        backgroundColor: isSelected ? colors.bg : 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          border: `2px solid ${isSelected ? colors.borderAccent : colors.border}`,
                          borderRadius: '0.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: isSelected ? colors.borderAccent : 'transparent',
                          flexShrink: 0,
                          marginTop: '0.125rem'
                        }}>
                          {isSelected && (
                            <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>

                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            fontSize: '1rem', 
                            fontWeight: 600, 
                            color: colors.text,
                            marginBottom: '0.5rem'
                          }}>
                            {suggestion.index}. {suggestion.title}
                          </div>

                          <div style={{ 
                            fontSize: '0.875rem', 
                            color: colors.textSubtle,
                            marginBottom: '0.75rem',
                            lineHeight: 1.5
                          }}>
                            {suggestion.description}
                          </div>

                          {suggestion.reasoning && (
                            <div style={{ 
                              fontSize: '0.75rem', 
                              color: colors.textFaint,
                              marginBottom: '0.75rem',
                              fontStyle: 'italic'
                            }}>
                              💡 {suggestion.reasoning}
                            </div>
                          )}

                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.5rem',
                            fontSize: '0.75rem',
                            color: colors.textFaint
                          }}>
                            <span>Confidence:</span>
                            <span style={{ fontFamily: 'monospace', letterSpacing: '0.05em' }}>
                              {confidenceBar}
                            </span>
                            <span>{Math.round(suggestion.confidence * 100)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {getDependencyVisualization()}
            </div>
          )}
        </div>

        {breakdown && (
          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderTop: `1px solid ${colors.border}`,
            paddingTop: '1rem'
          }}>
            <div style={{ fontSize: '0.875rem', color: colors.textSubtle }}>
              {selectedSuggestions.size} of {breakdown.suggestions.length} actions selected
            </div>
            
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={onClose}
                disabled={isCreating}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  color: colors.textSubtle,
                  backgroundColor: 'white',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '0.375rem',
                  cursor: 'pointer',
                  opacity: isCreating ? 0.6 : 1
                }}
              >
                Cancel
              </button>
              <button
                onClick={createSelectedActions}
                disabled={selectedSuggestions.size === 0 || isCreating}
                style={{
                  padding: '0.75rem 1.5rem',
                  fontSize: '0.875rem',
                  color: 'white',
                  backgroundColor: colors.borderAccent,
                  border: 'none',
                  borderRadius: '0.375rem',
                  cursor: selectedSuggestions.size === 0 || isCreating ? 'not-allowed' : 'pointer',
                  opacity: selectedSuggestions.size === 0 || isCreating ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                {isCreating && <Loader size={16} className="animate-spin" />}
                {isCreating ? 'Creating Actions...' : `Create ${selectedSuggestions.size} Action${selectedSuggestions.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Success Toast */}
      {showSuccessToast && (
        <SuccessToast
          message={successMessage}
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  );
}