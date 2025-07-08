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

  it('should fetch and display action context for specific ID', async () => {
    const mockContext = {
      action: {
        id: 'test-action-id',
        title: 'Root Action',
        done: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        version: 1,
        description: null,
        vision: null,
      },
      relationships: {
        ancestors: [],
        children: [
          {
            id: 'child-1',
            title: 'Child Action 1',
            done: true,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          },
          {
            id: 'child-2',
            title: 'Child Action 2',
            done: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          },
        ],
        dependencies: [],
        dependents: [],
        siblings: [],
      },
      relationship_flags: {
        'child-1': ['child'],
        'child-2': ['child'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockContext
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Root Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Status: In Progress')).toBeInTheDocument();
    expect(screen.getByText('Contextual Flow View')).toBeInTheDocument();
    expect(screen.getByText('0 ancestors • 2 children • 0 dependencies • 0 dependents • 0 siblings')).toBeInTheDocument();
  });

  it('should display error when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error: Failed to fetch action context/)).toBeInTheDocument();
    });
  });

  it('should display action not found when no data returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: null
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Action not found')).toBeInTheDocument();
    });
  });

  it('should make API call with correct URL and parameters', async () => {
    const mockContext = {
      action: {
        id: 'test-action-id',
        title: 'Root Action',
        done: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        version: 1,
        description: null,
        vision: null,
      },
      relationships: {
        ancestors: [],
        children: [],
        dependencies: [],
        dependents: [],
        siblings: [],
      },
      relationship_flags: {},
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockContext
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/actions/test-action-id/context');
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
    const mockContext = {
      action: {
        id: 'test-action-id',
        title: 'Completed Root Action',
        done: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        version: 1,
        description: null,
        vision: null,
      },
      relationships: {
        ancestors: [],
        children: [],
        dependencies: [],
        dependents: [],
        siblings: [],
      },
      relationship_flags: {},
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockContext
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Status: Completed')).toBeInTheDocument();
    });
  });


  it('should display contextual relationships with dependencies', async () => {
    const mockContext = {
      action: {
        id: 'test-action-id',
        title: 'Central Action',
        done: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        version: 1,
        description: 'Test description',
        vision: null,
      },
      relationships: {
        ancestors: [
          {
            id: 'parent-1',
            title: 'Parent Action',
            done: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          }
        ],
        children: [
          {
            id: 'child-1',
            title: 'Child Action',
            done: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          }
        ],
        dependencies: [
          {
            id: 'dep-1',
            title: 'Dependency Action',
            done: true,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          }
        ],
        dependents: [
          {
            id: 'dependent-1',
            title: 'Dependent Action',
            done: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          }
        ],
        siblings: [
          {
            id: 'sibling-1',
            title: 'Sibling Action',
            done: false,
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
            version: 1,
            description: null,
            vision: null,
          }
        ],
      },
      relationship_flags: {
        'parent-1': ['ancestor'],
        'child-1': ['child'],
        'dep-1': ['dependency'],
        'dependent-1': ['dependent'],
        'sibling-1': ['sibling'],
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: mockContext
      }),
    });

    render(<FlowIdPage />);

    await waitFor(() => {
      expect(screen.getByText('Central Action')).toBeInTheDocument();
    });

    expect(screen.getByText('Contextual Flow View')).toBeInTheDocument();
    expect(screen.getByText('1 ancestor • 1 child • 1 dependency • 1 dependent • 1 sibling')).toBeInTheDocument();
  });
});