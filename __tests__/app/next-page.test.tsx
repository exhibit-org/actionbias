/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NextActionDisplay from '../../app/next/components/NextActionDisplay';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock setTimeout for the reload delay
jest.useFakeTimers();

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
    
    render(<NextActionDisplay colors={mockColors} />);
    
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
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: []
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        data: mockActionData
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      // Look for the title text anywhere in the document - it's rendered as part of a markdown block
      expect(screen.getByText(/Test Action Title/)).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.getByText(/Test action description/)).toBeInTheDocument();
    expect(screen.getByText(/Vision/)).toBeInTheDocument();
    expect(screen.getByText(/Test action vision/)).toBeInTheDocument();

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

    render(<NextActionDisplay colors={mockColors} />);

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

    render(<NextActionDisplay colors={mockColors} />);

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

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Database connection failed')).toBeInTheDocument();
  });
});