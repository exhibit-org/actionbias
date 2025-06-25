'use client'

import { useEffect } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';

export default function GlobalKeyboardListener() {
  const { openModal } = useQuickAction();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for + or = key (same physical key) to add new action
      // Avoid triggering when user is typing in an input field
      const isInputActive = document.activeElement?.tagName === 'INPUT' || 
                           document.activeElement?.tagName === 'TEXTAREA' ||
                           document.activeElement?.getAttribute('contenteditable') === 'true';
      
      if (!isInputActive && (e.key === '+' || e.key === '=')) {
        e.preventDefault();
        openModal();
      }
      
      // TODO: CMD+K reserved for search functionality
      // if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      //   e.preventDefault();
      //   // openSearchModal();
      // }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openModal]);

  // This component doesn't render anything
  return null;
}