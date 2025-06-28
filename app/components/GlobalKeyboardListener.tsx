'use client'

import { useEffect } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';
import { useRouter } from 'next/navigation';

export default function GlobalKeyboardListener() {
  const { openModal } = useQuickAction();
  const router = useRouter();

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
      
      // CMD+K for search functionality - redirect to search page
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        router.push('/search');
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openModal, router]);

  // This component doesn't render anything
  return null;
}