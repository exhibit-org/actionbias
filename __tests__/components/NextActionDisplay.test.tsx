/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import NextActionDisplay from '../../app/next/components/NextActionDisplay';

// Mock fetch globally
global.fetch = jest.fn();

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

    render(<NextActionDisplay />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('should fetch and display next action data', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockNextActionData
      })
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Test Action Title')).toBeInTheDocument();
    });

    expect(screen.getByText('Test action description')).toBeInTheDocument();
    expect(screen.getByText('Vision:')).toBeInTheDocument();
    expect(screen.getByText('Test action vision')).toBeInTheDocument();
    expect(screen.getByText('Parent Action')).toBeInTheDocument();
    expect(screen.getByText('✓ Dependency Action')).toBeInTheDocument();
    expect(screen.getByText('Mark Complete')).toBeInTheDocument();
  });

  it('should display error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<NextActionDisplay />);

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

    render(<NextActionDisplay />);

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

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('🎉 All Done!')).toBeInTheDocument();
    });

    expect(screen.getByText('No next action found. You\'re all caught up!')).toBeInTheDocument();
  });

  it('should call update_action when mark complete is clicked', async () => {
    // Mock initial fetch
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      // Mock mark complete call
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: { ...mockNextActionData, done: true }
        })
      });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Test Action Title')).toBeInTheDocument();
    });

    const markCompleteButton = screen.getByRole('button', { name: /Mark Complete/ });
    fireEvent.click(markCompleteButton);

    // Verify the correct API call was made
    expect(global.fetch).toHaveBeenCalledWith('/api/actions/test-action-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        done: true
      })
    });
  });

  it('should handle mark complete failure', async () => {
    // Mock initial fetch
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockNextActionData
        })
      })
      // Mock mark complete failure
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Update failed'
        })
      });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Test Action Title')).toBeInTheDocument();
    });

    const markCompleteButton = screen.getByRole('button', { name: /Mark Complete/ });
    fireEvent.click(markCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Update failed')).toBeInTheDocument();
    });
  });

  it('should display dependencies with correct status indicators', async () => {
    const actionWithMixedDeps = {
      ...mockNextActionData,
      dependencies: [
        {
          id: 'dep-1',
          title: 'Completed Dependency',
          done: true,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        },
        {
          id: 'dep-2',
          title: 'Pending Dependency',
          done: false,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z'
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: actionWithMixedDeps
      })
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Test Action Title')).toBeInTheDocument();
    });

    expect(screen.getByText('✓ Completed Dependency')).toBeInTheDocument();
    expect(screen.getByText('⏳ Pending Dependency')).toBeInTheDocument();
  });
});