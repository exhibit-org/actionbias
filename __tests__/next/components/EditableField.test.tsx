/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditableField from '../../../app/next/components/EditableField';
import { ColorScheme } from '../../../app/next/components/types';

// This component doesn't need database, so clear database URLs to prevent PGlite issues
delete process.env.DATABASE_URL;
delete process.env.POSTGRES_URL;

// Mock window.getSelection
const mockSelection = {
  rangeCount: 1,
  getRangeAt: jest.fn(),
  removeAllRanges: jest.fn(),
  addRange: jest.fn(),
};

const mockRange = {
  cloneRange: jest.fn(),
  selectNodeContents: jest.fn(),
  setEnd: jest.fn(),
  setStart: jest.fn(),
  toString: jest.fn(() => 'test'),
  startContainer: null,
  startOffset: 0,
};

Object.defineProperty(window, 'getSelection', {
  value: jest.fn(() => mockSelection),
});

Object.defineProperty(document, 'createRange', {
  value: jest.fn(() => mockRange),
});

describe('EditableField', () => {
  const mockColors: ColorScheme = {
    bg: '#f9fafb',
    surface: '#f3f4f6',
    border: '#e5e7eb',
    borderAccent: '#1f2937',
    text: '#111827',
    textMuted: '#4b5563',
    textSubtle: '#6b7280',
    textFaint: '#9ca3af',
  };

  const mockOnSave = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockRange.cloneRange.mockReturnValue(mockRange);
    mockSelection.getRangeAt.mockReturnValue(mockRange);
  });

  it('renders with initial value', () => {
    render(
      <EditableField
        value="Test content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('shows placeholder when value is empty', () => {
    render(
      <EditableField
        value=""
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Add content...')).toBeInTheDocument();
  });

  it('becomes editable on focus', () => {
    const { container } = render(
      <EditableField
        value="Test content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    expect(editableDiv).toBeInTheDocument();

    fireEvent.focus(editableDiv!);
    expect(editableDiv).toHaveStyle({
      border: `1px solid ${mockColors.borderAccent}`,
      backgroundColor: mockColors.bg,
    });
  });

  it('calls onSave on blur when content changes', async () => {
    const { container } = render(
      <EditableField
        value="Initial content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    
    // Focus and change content
    fireEvent.focus(editableDiv!);
    
    // Simulate input
    act(() => {
      editableDiv!.textContent = 'Updated content';
      fireEvent.input(editableDiv!);
    });

    // Blur to save
    fireEvent.blur(editableDiv!);

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Updated content');
    });
  });

  it('does not update content from props while editing', async () => {
    const { container, rerender } = render(
      <EditableField
        value="Initial content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    
    // Focus to start editing
    fireEvent.focus(editableDiv!);
    
    // Change content locally
    act(() => {
      editableDiv!.textContent = 'User typed content';
      fireEvent.input(editableDiv!);
    });

    // Simulate prop update from parent (e.g., after save)
    rerender(
      <EditableField
        value="Updated from props"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    // Content should not change while editing
    expect(editableDiv!.textContent).toBe('User typed content');

    // After blur, it should update
    fireEvent.blur(editableDiv!);
    
    rerender(
      <EditableField
        value="Updated from props"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    // Now it should show the updated value
    expect(screen.getByText('Updated from props')).toBeInTheDocument();
  });

  it('saves on Cmd+Enter by triggering blur', async () => {
    const { container } = render(
      <EditableField
        value="Initial content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    
    fireEvent.focus(editableDiv!);
    
    act(() => {
      editableDiv!.textContent = 'Updated content';
      fireEvent.input(editableDiv!);
    });

    // Press Cmd+Enter
    fireEvent.keyDown(editableDiv!, { key: 'Enter', metaKey: true });

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledWith('Updated content');
    });
  });

  it('cancels changes on Escape', () => {
    const { container } = render(
      <EditableField
        value="Initial content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    
    fireEvent.focus(editableDiv!);
    
    act(() => {
      editableDiv!.textContent = 'Changed content';
      fireEvent.input(editableDiv!);
    });

    // Press Escape
    fireEvent.keyDown(editableDiv!, { key: 'Escape' });

    expect(editableDiv!.textContent).toBe('Initial content');
    expect(mockOnSave).not.toHaveBeenCalled();
  });

  it('does not call onSave if content has not changed', async () => {
    const { container } = render(
      <EditableField
        value="Initial content"
        placeholder="Add content..."
        colors={mockColors}
        onSave={mockOnSave}
      />
    );

    const editableDiv = container.querySelector('[contenteditable="true"]');
    
    // Focus without changing content
    fireEvent.focus(editableDiv!);
    
    // Blur without changes
    fireEvent.blur(editableDiv!);

    // Should not call onSave
    expect(mockOnSave).not.toHaveBeenCalled();
  });
});