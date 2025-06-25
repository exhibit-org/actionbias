'use client'

import { useEffect } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';

export default function GlobalKeyboardListener() {
  const { openModal } = useQuickAction();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for CMD+K on Mac or CTRL+K on Windows/Linux
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault(); // Prevent browser's default search behavior
        openModal();
      }
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