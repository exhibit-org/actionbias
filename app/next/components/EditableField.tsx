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
  const [content, setContent] = useState(value);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setContent(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const saveImmediate = async (val: string) => {
    if (val === value) return;
    try {
      setSaving(true);
      await onSave(val);
    } finally {
      setSaving(false);
    }
  };

  const saveWithDelay = (val: string) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => saveImmediate(val), 1000);
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    const val = e.currentTarget.textContent || '';
    saveWithDelay(val);
  };

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    if (!e.currentTarget.textContent || e.currentTarget.textContent.includes('Click to add')) {
      e.currentTarget.textContent = content;
    }
    setEditing(true);
    e.currentTarget.style.border = `1px solid ${colors.borderAccent}`;
    e.currentTarget.style.backgroundColor = colors.bg;
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setEditing(false);
    setContent(e.currentTarget.textContent || '');
    e.currentTarget.style.border = '1px solid transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      e.currentTarget.blur();
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
      saveImmediate(e.currentTarget.textContent || '');
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.currentTarget.textContent = content;
      e.currentTarget.blur();
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
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
        dangerouslySetInnerHTML={!editing ? { __html: content || `<span style="color: #9CA3AF; font-style: italic;">${placeholder}</span>` } : undefined}
      >
        {editing ? content : null}
      </div>
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
