/**
 * @jest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { useParams, useRouter } from 'next/navigation';
import FlowIdPage from '../../app/flow/[id]/page';

jest.mock('next/navigation', () => ({
  useParams: jest.fn(),
  useRouter: jest.fn(),
}));

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

const mockPush = jest.fn();
const mockUseRouter = useRouter as jest.Mock;
const mockUseParams = useParams as jest.Mock;

beforeEach(() => {
  mockUseRouter.mockReturnValue({
    push: mockPush,
  });
  mockUseParams.mockReturnValue({
    id: 'test-action-id',
  });
  global.fetch = jest.fn();
  jest.clearAllMocks();
});

describe('FlowIdPage', () => {
  it('should render loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => new Promise(() => {}));
    
    render(<FlowIdPage />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should fetch and display action tree for specific ID', async () => {
    const mockActionTree = {
      id: 'test-action-id',
      title: 'Root Action',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [
        {
          id: 'child-1',
          title: 'Child Action 1',
          done: true,
          created_at: '2023-01-01T00:00:00Z',
          children: [],
          dependencies: [],
        },
        {
          id: 'child-2',
          title: 'Child Action 2',
          done: false,
          created_at: '2023-01-01T00:00:00Z',
          children: [],
          dependencies: [],
        },
      ],
      dependencies: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: [mockActionTree]
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Root Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Status: In Progress')).toBeInTheDocument();
    expect(screen.getByText('Showing 2 child actions')).toBeInTheDocument();
  });

  it('should display error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch action tree/)).toBeInTheDocument();
    });
  });

  it('should display action not found when no data returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: []
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Action not found')).toBeInTheDocument();
    });
  });

  it('should make API call with correct URL and parameters', async () => {
    const mockActionTree = {
      id: 'test-action-id',
      title: 'Root Action',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [],
      dependencies: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: [mockActionTree]
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/actions/tree/test-action-id?includeCompleted=false');
    });
  });

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    });
  });

  it('should display completed status correctly', async () => {
    const mockActionTree = {
      id: 'test-action-id',
      title: 'Completed Root Action',
      done: true,
      created_at: '2023-01-01T00:00:00Z',
      children: [],
      dependencies: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: [mockActionTree]
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Status: Completed')).toBeInTheDocument();
    });
  });

  it('should handle singular child count correctly', async () => {
    const mockActionTree = {
      id: 'test-action-id',
      title: 'Root Action',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [
        {
          id: 'child-1',
          title: 'Single Child',
          done: false,
          created_at: '2023-01-01T00:00:00Z',
          children: [],
          dependencies: [],
        },
      ],
      dependencies: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: [mockActionTree]
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 1 child action')).toBeInTheDocument();
    });
  });

  it('should handle empty children array', async () => {
    const mockActionTree = {
      id: 'test-action-id',
      title: 'Root Action',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [],
      dependencies: [],
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          rootActions: [mockActionTree]
        }
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Showing 0 child actions')).toBeInTheDocument();
    });
  });
});