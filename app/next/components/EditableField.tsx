'use client';
import { useState, useEffect, useRef } from 'react';
import { ColorScheme } from './types';

interface EditableFieldProps {
  value: string;
  placeholder: string;
  colors: ColorScheme;
  onSave: (value: string) => Promise<void>;
}

export default function EditableField({ value, placeholder, colors, onSave }: EditableFieldProps) {
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    // Only update content if not editing
    if (!isEditingRef.current && ref.current) {
      if (value) {
        ref.current.textContent = value;
      } else {
        ref.current.innerHTML = `<span style="color: #9CA3AF; font-style: italic;">${placeholder}</span>`;
      }
    }
  }, [value, placeholder]);

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    isEditingRef.current = true;
    e.currentTarget.style.border = `1px solid ${colors.borderAccent}`;
    e.currentTarget.style.backgroundColor = colors.bg;
    
    // If showing placeholder, clear it
    const placeholderSpan = e.currentTarget.querySelector('span[style*="italic"]');
    if (placeholderSpan) {
      e.currentTarget.textContent = '';
    }
  };

  const handleBlur = async (e: React.FocusEvent<HTMLDivElement>) => {
    isEditingRef.current = false;
    const newContent = e.currentTarget.textContent || '';
    e.currentTarget.style.border = '1px solid transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
    
    // Show placeholder if empty
    if (!newContent) {
      e.currentTarget.innerHTML = `<span style="color: #9CA3AF; font-style: italic;">${placeholder}</span>`;
    }
    
    // Save on blur if content has changed
    if (newContent !== value) {
      try {
        setSaving(true);
        await onSave(newContent);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.blur(); // This will trigger handleBlur which saves
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.textContent = value; // Revert to original value
      e.currentTarget.blur();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          color: colors.textMuted,
          fontSize: '0.875rem',
          margin: 0,
          lineHeight: '1.5',
          padding: '0.5rem',
          borderRadius: '0.25rem',
          border: '1px solid transparent',
          outline: 'none',
          minHeight: '1.5em',
          transition: 'all 0.2s ease',
          cursor: 'text'
        }}
      />
      {saving && (
        <div style={{
          position: 'absolute',
          top: '0.25rem',
          right: '0.25rem',
          fontSize: '0.625rem',
          color: colors.textFaint,
          backgroundColor: 'white',
          padding: '0.125rem 0.25rem',
          borderRadius: '0.125rem',
          border: `1px solid ${colors.border}`
        }}>
          Saving...
        </div>
      )}
    </div>
  );
}
