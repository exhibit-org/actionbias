'use client';

import { useState, useEffect } from 'react';

export interface ColorScheme {
  bg: string;
  surface: string; 
  border: string;
  borderAccent: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  textFaint: string;
}

interface EditableFieldProps {
  value: string;
  placeholder?: string;
  multiline?: boolean;
  colors: ColorScheme;
  onSave?: (newValue: string) => void;
  disabled?: boolean;
  style?: React.CSSProperties;
}

export default function EditableField({
  value,
  placeholder = '',
  multiline = false,
  colors,
  onSave,
  disabled = false,
  style
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSave = async () => {
    if (editValue === value || !onSave) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      // Reset to original value if save fails
      setEditValue(value);
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancel();
    } else if (e.key === 'Enter' && !multiline && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Enter' && multiline && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  if (isEditing) {
    const commonProps = {
      value: editValue,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setEditValue(e.target.value),
      onKeyDown: handleKeyDown,
      onBlur: handleSave,
      disabled: isSaving,
      autoFocus: true,
      style: {
        backgroundColor: colors.surface,
        border: `1px solid ${colors.border}`,
        color: colors.text,
        padding: '8px',
        borderRadius: '4px',
        outline: 'none',
        width: '100%'
      }
    };

    if (multiline) {
      return (
        <textarea
          {...commonProps}
          rows={3}
          placeholder={placeholder}
        />
      );
    } else {
      return (
        <input
          type="text"
          {...commonProps}
          placeholder={placeholder}
        />
      );
    }
  }

  return (
    <div
      onClick={() => !disabled && setIsEditing(true)}
      style={{
        color: value ? colors.text : colors.textMuted,
        padding: '8px',
        minHeight: multiline ? '60px' : '20px',
        cursor: disabled ? 'default' : 'pointer',
        borderRadius: '4px',
        border: `1px solid transparent`,
        whiteSpace: multiline ? 'pre-wrap' : 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.surface;
          e.currentTarget.style.border = `1px solid ${colors.border}`;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.border = '1px solid transparent';
        }
      }}
    >
      {value || placeholder}
    </div>
  );
}