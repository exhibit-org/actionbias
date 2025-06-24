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
  const cursorPositionRef = useRef<number | null>(null);

  useEffect(() => {
    // Only update content if not editing to prevent cursor jump
    if (!editing) {
      setContent(value);
    }
  }, [value, editing]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  const saveCursorPosition = () => {
    if (!ref.current) return;
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    
    const range = selection.getRangeAt(0);
    const preSelectionRange = range.cloneRange();
    preSelectionRange.selectNodeContents(ref.current);
    preSelectionRange.setEnd(range.startContainer, range.startOffset);
    cursorPositionRef.current = preSelectionRange.toString().length;
  };

  const restoreCursorPosition = () => {
    if (!ref.current || cursorPositionRef.current === null) return;
    
    const createRange = (node: Node, offset: number): Range | null => {
      const range = document.createRange();
      const textNodes: Node[] = [];
      
      const getTextNodes = (node: Node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          textNodes.push(node);
        } else {
          for (let i = 0; i < node.childNodes.length; i++) {
            getTextNodes(node.childNodes[i]);
          }
        }
      };
      
      getTextNodes(node);
      
      let currentOffset = 0;
      for (const textNode of textNodes) {
        const nodeLength = textNode.textContent?.length || 0;
        if (currentOffset + nodeLength >= offset) {
          range.setStart(textNode, offset - currentOffset);
          range.setEnd(textNode, offset - currentOffset);
          return range;
        }
        currentOffset += nodeLength;
      }
      
      return null;
    };
    
    const range = createRange(ref.current, cursorPositionRef.current);
    if (range) {
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }
  };

  const saveImmediate = async (val: string) => {
    if (val === value) return;
    try {
      setSaving(true);
      saveCursorPosition();
      await onSave(val);
      // Use requestAnimationFrame to ensure DOM has updated before restoring cursor
      requestAnimationFrame(() => {
        restoreCursorPosition();
      });
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
    setContent(val);
    saveWithDelay(val);
  };

  const handleFocus = (e: React.FocusEvent<HTMLDivElement>) => {
    setEditing(true);
    e.currentTarget.style.border = `1px solid ${colors.borderAccent}`;
    e.currentTarget.style.backgroundColor = colors.bg;
    
    // If showing placeholder, replace with empty content
    if (e.currentTarget.querySelector('span[style*="italic"]')) {
      e.currentTarget.textContent = '';
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    setEditing(false);
    setContent(e.currentTarget.textContent || '');
    e.currentTarget.style.border = '1px solid transparent';
    e.currentTarget.style.backgroundColor = 'transparent';
    cursorPositionRef.current = null;
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
        dangerouslySetInnerHTML={{ __html: content || `<span style="color: #9CA3AF; font-style: italic;">${placeholder}</span>` }}
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
