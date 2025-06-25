'use client'

import { useEffect, useRef, useState } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';
import { X } from 'react-feather';

export default function QuickActionModal() {
  const { isOpen, closeModal } = useQuickAction();
  const [actionText, setActionText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Auto-focus textarea when modal opens and reset error
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      setError(null);
    }
  }, [isOpen]);

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

    setIsSubmitting(true);
    
    try {
      // First, get family suggestions
      const suggestResponse = await fetch('/api/actions/suggest-family', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: actionText.trim(),
          limit: 1,
          threshold: 0.3
        }),
      });

      const suggestData = await suggestResponse.json();
      
      // Use the first suggestion as parent, if any
      const parentId = suggestData.data?.candidates?.[0]?.id;
      
      // Create the action
      const createResponse = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: actionText.trim(),
          parent_id: parentId,
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

        <form onSubmit={handleSubmit}>
          <textarea
            ref={textareaRef}
            value={actionText}
            onChange={(e) => {
              setActionText(e.target.value);
              setError(null); // Clear error when user types
            }}
            placeholder="What needs to be done? (e.g., 'Refactor authentication system to use JWT tokens')"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={4}
            disabled={isSubmitting}
          />
          
          {error && (
            <div className="mt-2 text-sm text-red-600">
              {error}
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
              disabled={!actionText.trim() || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Action'}
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