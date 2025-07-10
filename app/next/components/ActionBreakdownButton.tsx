'use client';

import { useState } from 'react';
import { ColorScheme } from './types';
import { ActionDetailResource } from '../../../lib/types/resources';

interface Props {
  action: ActionDetailResource;
  colors: ColorScheme;
  onBreakdownClick: () => void;
}

export default function ActionBreakdownButton({ action, colors, onBreakdownClick }: Props) {
  const [isHovered, setIsHovered] = useState(false);

  // Don't show button for completed actions
  if (action.done) {
    return null;
  }

  // Don't show button if action already has children
  if (action.children && action.children.length > 0) {
    return null;
  }

  return (
    <button
      onClick={onBreakdownClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 0.75rem',
        fontSize: '0.875rem',
        fontWeight: 500,
        color: isHovered ? colors.text : colors.textSubtle,
        backgroundColor: isHovered ? colors.bg : 'white',
        border: `1px solid ${isHovered ? colors.borderAccent : colors.border}`,
        borderRadius: '0.375rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
      }}
      aria-label="Break down this action into smaller actions"
    >
      <svg 
        style={{ width: '16px', height: '16px' }} 
        fill="none" 
        stroke="currentColor" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth={2} 
          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z M9 12l2 2 4-4" 
        />
      </svg>
      Break Down Action
    </button>
  );
}