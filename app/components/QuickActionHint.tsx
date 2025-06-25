'use client'

import { useState, useEffect } from 'react';
import { useQuickAction } from '../contexts/QuickActionContext';

export default function QuickActionHint() {
  const { openModal } = useQuickAction();
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenDismissed, setHasBeenDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed the hint before
    const dismissed = localStorage.getItem('quickActionHintDismissed');
    if (dismissed) {
      setHasBeenDismissed(true);
      return;
    }

    // Show hint after a short delay
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setHasBeenDismissed(true);
    localStorage.setItem('quickActionHintDismissed', 'true');
  };

  if (hasBeenDismissed || !isVisible) return null;

  const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

  return (
    <div 
      className="fixed bottom-24 right-6 bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-xs z-40"
      style={{ 
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
        aria-label="Dismiss hint"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M11 1L1 11M1 1L11 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      
      <div className="pr-6">
        <p className="text-sm text-gray-600 mb-2">
          Quick tip: Press{' '}
          <button
            onClick={openModal}
            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold text-gray-700 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200 transition-colors"
          >
            {isMac ? '⌘' : 'Ctrl'}+K
          </button>
          {' '}to quickly add a new action from anywhere.
        </p>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}