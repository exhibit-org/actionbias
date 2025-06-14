/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextActionDisplay from '../../app/next/components/NextActionDisplay';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout for the reload delay
jest.useFakeTimers();

describe('NextActionDisplay', () => {
  beforeEach(() => {
    mockFetch.mockClear();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('displays loading state initially', () => {
    // Mock fetch to never resolve
    mockFetch.mockImplementation(() => new Promise(() => {}));
    
    render(<NextActionDisplay />);
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('displays next action when data is loaded', async () => {
    const mockActionData = {
      id: 'test-action-id',
      title: 'Test Action Title',
      description: 'Test action description',
      vision: 'Test action vision',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_id: null,
      parent_chain: [
        {
          id: 'parent-1',
          title: 'Parent Action',
          description: 'Parent description',
          vision: 'Parent vision',
          done: false,
          version: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ],
      children: [],
      dependencies: [
        {
          id: 'dep-1',
          title: 'Dependency Action',
          description: 'Dependency description',
          vision: 'Dependency vision',
          done: true,
          version: 1,
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-01T00:00:00Z'
        }
      ],
      dependents: []
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockActionData
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

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith('/api/actions/next');
  });

  it('displays "All Done" message when no next action', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
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

  it('displays error message when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('displays error message when API returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: false,
        error: 'Database connection failed'
      })
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });

  it('marks action as complete when button is clicked', async () => {
    const mockActionData = {
      id: 'test-action-id',
      title: 'Test Action Title',
      description: 'Test action description',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: []
    };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockActionData
      })
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });

    // Mock the update action call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: { ...mockActionData, done: true }
      })
    });

    const markCompleteButton = screen.getByText('Mark Complete');
    fireEvent.click(markCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Action completed! Loading next action...')).toBeInTheDocument();
    });

    // Verify the PUT request was made
    expect(mockFetch).toHaveBeenCalledWith('/api/actions/test-action-id', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        done: true
      })
    });
  });

  it('handles completion error gracefully', async () => {
    const mockActionData = {
      id: 'test-action-id',
      title: 'Test Action Title',
      description: 'Test action description',
      done: false,
      version: 1,
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: []
    };

    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockActionData
      })
    });

    render(<NextActionDisplay />);

    await waitFor(() => {
      expect(screen.getByText('Mark Complete')).toBeInTheDocument();
    });

    // Mock failed update
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    const markCompleteButton = screen.getByText('Mark Complete');
    fireEvent.click(markCompleteButton);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
  });
});