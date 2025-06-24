/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ActionNavigation from '../../app/next/components/ActionNavigation';
import { ActionDetailResource, ActionMetadata } from '../../lib/types/resources';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

const mockColors = {
  bg: '#ffffff',
  surface: '#f8f9fa',
  border: '#e5e7eb',
  borderAccent: '#3b82f6',
  text: '#111827',
  textMuted: '#6b7280',
  textSubtle: '#9ca3af',
  textFaint: '#d1d5db',
};

const mockAction: ActionDetailResource = {
  id: 'test-action-id',
  title: 'Test Action',
  description: 'Test description',
  vision: 'Test vision',
  done: false,
  version: 1,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  parent_id: 'parent-id',
  parent_chain: [{
    id: 'parent-id',
    title: 'Parent Action',
    description: null,
    vision: null,
    done: false,
    version: 1,
    created_at: '2023-01-01T00:00:00.000Z',
    updated_at: '2023-01-01T00:00:00.000Z',
  }],
  children: [],
  dependencies: [],
  dependents: [],
  full_family_size: 1,
  full_dependency_count: 0,
  full_dependent_count: 0,
  metadata_map: {},
  resource_type: 'action_detail',
};

describe('ActionNavigation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the copy button', () => {
    render(
      <ActionNavigation 
        action={mockAction} 
        siblings={[]} 
        colors={mockColors} 
      />
    );

    expect(screen.getByLabelText('Copy action ID')).toBeInTheDocument();
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('copies action ID to clipboard when copy button is clicked', async () => {
    render(
      <ActionNavigation 
        action={mockAction} 
        siblings={[]} 
        colors={mockColors} 
      />
    );

    const copyButton = screen.getByLabelText('Copy action ID');
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('test-action-id');
  });

  it('shows copied state after clicking copy button', async () => {
    render(
      <ActionNavigation 
        action={mockAction} 
        siblings={[]} 
        colors={mockColors} 
      />
    );

    const copyButton = screen.getByLabelText('Copy action ID');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByLabelText('ID copied')).toBeInTheDocument();
      expect(screen.getByText('Copied')).toBeInTheDocument();
    });
  });

  it('handles clipboard API failure gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockError = new Error('Clipboard API not available');
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(mockError);

    render(
      <ActionNavigation 
        action={mockAction} 
        siblings={[]} 
        colors={mockColors} 
      />
    );

    const copyButton = screen.getByLabelText('Copy action ID');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to copy action ID:', mockError);
    });

    consoleErrorSpy.mockRestore();
  });

  it('shows next family member indicator when nextFamilyMemberId matches', () => {
    const actionWithChildren: ActionDetailResource = {
      ...mockAction,
      children: [
        {
          id: 'child-1',
          title: 'Child 1',
          description: null,
          vision: null,
          done: false,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        },
      ],
    };

    render(
      <ActionNavigation 
        action={actionWithChildren} 
        siblings={[]} 
        colors={mockColors}
        nextFamilyMemberId="child-1"
      />
    );

    expect(screen.getByTestId('next-family-member-indicator')).toBeInTheDocument();
    
    // The Next Action text appears in the indicator span
    const indicator = screen.getByTestId('next-family-member-indicator');
    expect(indicator).toHaveTextContent('Next Action');
  });
});