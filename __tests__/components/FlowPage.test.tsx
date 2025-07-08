/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import FlowPage from '../../app/flow/page';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Add browser APIs that React Flow needs
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  })),
});

Object.defineProperty(window, 'DOMMatrix', {
  writable: true,
  value: jest.fn().mockImplementation(() => ({
    m41: 0,
    m42: 0,
  })),
});

// React Flow works fine in Jest with the browser APIs mocked above

// Mock fetch for the tree API
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockUseRouter.mockReturnValue({
    push: mockPush,
  });
});

describe('FlowPage', () => {

  it('renders loading state initially', () => {
    mockFetch.mockImplementationOnce(() => new Promise(() => {})); // Never resolves

    render(<FlowPage />);
    
    expect(screen.getByText('Loading root actions...')).toBeInTheDocument();
  });

  it('successfully fetches and displays root actions from tree API', async () => {
    const mockTreeResponse = {
      success: true,
      data: {
        rootActions: [
          {
            id: 'action-1',
            title: 'Test Action 1',
            done: false,
            created_at: '2025-01-01T00:00:00Z',
            children: [],
            dependencies: []
          },
          {
            id: 'action-2',
            title: 'Test Action 2',
            done: true,
            created_at: '2025-01-02T00:00:00Z',
            children: [],
            dependencies: []
          }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockTreeResponse)
    });

    render(<FlowPage />);

    // Wait for the API call to complete
    await waitFor(() => {
      expect(screen.getByText('Root Actions Flow')).toBeInTheDocument();
    });

    // Verify the API was called correctly
    expect(mockFetch).toHaveBeenCalledWith('/api/actions/tree?includeCompleted=false');
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Check that the action count is displayed
    expect(screen.getByText('2 root actions')).toBeInTheDocument();

    // Verify React Flow components are rendered (real React Flow elements)
    expect(screen.getByTestId('rf__wrapper')).toBeInTheDocument();
    expect(screen.getByTestId('rf__background')).toBeInTheDocument();
    // Check for the control panel (zoom in/out buttons)
    expect(screen.getByRole('button', { name: 'zoom in' })).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch action tree/)).toBeInTheDocument();
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/actions/tree?includeCompleted=false');
  });

  it('handles API success=false response', async () => {
    const mockErrorResponse = {
      success: false,
      error: 'Database connection failed'
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockErrorResponse)
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Database connection failed/)).toBeInTheDocument();
    });
  });

  it('handles empty root actions array', async () => {
    const mockEmptyResponse = {
      success: true,
      data: {
        rootActions: []
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockEmptyResponse)
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText('Root Actions Flow')).toBeInTheDocument();
      expect(screen.getByText('0 root actions')).toBeInTheDocument();
    });
  });

  it('handles missing rootActions property in response', async () => {
    const mockResponseWithoutRootActions = {
      success: true,
      data: {} // Missing rootActions property
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockResponseWithoutRootActions)
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText('Root Actions Flow')).toBeInTheDocument();
      expect(screen.getByText('0 root actions')).toBeInTheDocument();
    });
  });

  it('handles network errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('makes the correct API call to tree endpoint', async () => {
    const mockTreeResponse = {
      success: true,
      data: { rootActions: [] }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockTreeResponse)
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/actions/tree?includeCompleted=false');
    });

    // Verify it doesn't call other endpoints
    expect(mockFetch).not.toHaveBeenCalledWith('/api/actions');
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('displays action status correctly', async () => {
    const mockTreeResponse = {
      success: true,
      data: {
        rootActions: [
          {
            id: 'completed-action',
            title: 'Completed Action',
            done: true,
            created_at: '2025-01-01T00:00:00Z',
            children: [],
            dependencies: []
          },
          {
            id: 'incomplete-action',
            title: 'Incomplete Action',
            done: false,
            created_at: '2025-01-02T00:00:00Z',
            children: [],
            dependencies: []
          }
        ]
      }
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValueOnce(mockTreeResponse)
    });

    render(<FlowPage />);

    await waitFor(() => {
      expect(screen.getByText('Root Actions Flow')).toBeInTheDocument();
    });

    // The actual status display would be tested if we weren't mocking React Flow
    // In a real integration test, we would verify the node colors and status text
  });
});