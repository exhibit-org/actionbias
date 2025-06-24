/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NextActionDisplay from '../../app/next/components/NextActionDisplay';

// Mock fetch globally
global.fetch = jest.fn();

// Mock color scheme for tests
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

const mockNextActionData = {
  id: 'test-action-id',
  title: 'Test Action Title',
  description: 'Test action description',
  vision: 'Test action vision',
  done: false,
  version: 1,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  parent_id: 'parent-id',
  parent_chain: [
    {
      id: 'parent-id',
      title: 'Parent Action',
      description: 'Parent description',
      done: false,
      version: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    }
  ],
  children: [],
  dependencies: [
    {
      id: 'dep-id',
      title: 'Dependency Action',
      description: 'Dependency description',
      done: true,
      version: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z'
    }
  ],
  dependents: []
};

describe('NextActionDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(() => {}) // Never resolves to keep loading state
    );

    render(<NextActionDisplay colors={mockColors} />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should fetch and display next action data', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            children: [
              {
                id: 'sibling-id',
                title: 'Sibling Action',
                description: 'Sibling description',
                done: false,
                version: 1,
                created_at: '2023-01-01T00:00:00.000Z',
                updated_at: '2023-01-01T00:00:00.000Z'
              }
            ]
          }
        })
      });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Action Title')).toHaveLength(2);
    });

    expect(screen.getByText('Test action description')).toBeInTheDocument();
    expect(screen.getByText('Vision')).toBeInTheDocument();
    expect(screen.getByText('Test action vision')).toBeInTheDocument();
    // Check that main action content is rendering correctly
  });

  it('should display error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Network error')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('should display error when API returns error', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        error: 'API Error'
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
  });

  it('should display completion message when no next action exists', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: null
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('🎉 All Done!')).toBeInTheDocument();
    });

    expect(screen.getByText('No next action found. You\'re all caught up!')).toBeInTheDocument();
  });

  it('should render component with buttons', async () => {
    // Mock initial fetch
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      // Mock sibling fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            children: []
          }
        })
      });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Action Title')).toHaveLength(2);
    });

    // Verify that buttons are rendered
    expect(screen.getByRole('button', { name: /Copy Full Context for Claude Code/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Copy Action Instructions for Claude Code/ })).toBeInTheDocument();
  });

  it('should render with navigation links', async () => {
    // Mock initial fetch
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      // Mock sibling fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            children: []
          }
        })
      });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Action Title')).toHaveLength(2);
    });

    // Check that navigation links are rendered
    expect(screen.getByRole('link', { name: /Parent Action/ })).toBeInTheDocument();
  });

  it('should render with action metadata', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      // Mock sibling fetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            children: []
          }
        })
      });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getAllByText('Test Action Title')).toHaveLength(2);
    });

    // Check that the component renders successfully
    expect(screen.getByText('Broader Context')).toBeInTheDocument();
  });

  it('should highlight the next child action when scoped', async () => {
    const mockAction = {
      id: 'parent-id',
      title: 'Parent Action',
      description: 'desc',
      vision: 'vision',
      done: false,
      version: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
      parent_id: null,
      parent_chain: [],
      children: [
        {
          id: 'child-1',
          title: 'Child 1',
          description: '',
          vision: '',
          done: false,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }
      ],
      dependencies: [],
      dependents: []
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockAction })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { id: 'child-1', parent_id: 'parent-id' } })
      });

    render(<NextActionDisplay colors={mockColors} actionId="parent-id" />);

    await waitFor(() => {
      expect(screen.getByText('Child 1')).toBeInTheDocument();
    });

    expect(screen.getByTestId('next-child-indicator')).toBeInTheDocument();
  });
});