import { render, screen, waitFor } from '@testing-library/react';
import TreemapIdPage from '../../app/treemap/[id]/page';
import { ActionTreeResource } from '../../lib/types/resources';
import { ActionCompletionProvider } from '../../app/contexts/ActionCompletionContext';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockParams = { id: '1' };
const mockGet = jest.fn();

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useParams: () => mockParams,
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock the @nivo/treemap component
jest.mock('@nivo/treemap', () => ({
  ResponsiveTreeMapHtml: ({ data, onClick, onMouseEnter, onMouseLeave, parentLabel, ...props }: any) => (
    <div data-testid="treemap-container" {...props}>
      <div data-testid="treemap-data">{JSON.stringify(data)}</div>
      {/* Render parent label if available */}
      {parentLabel && data && (
        <div data-testid="treemap-parent-label">
          {parentLabel({ data })}
        </div>
      )}
      {data.children && data.children.map((child: any) => (
        <div 
          key={child.id} 
          data-testid={`treemap-node-${child.id}`}
          onClick={() => onClick && onClick({ data: child })}
          onMouseEnter={() => onMouseEnter && onMouseEnter({ data: child })}
          onMouseLeave={() => onMouseLeave && onMouseLeave()}
          style={{ cursor: 'pointer' }}
        >
          {child.name}
        </div>
      ))}
    </div>
  ),
}));

// Mock the fetch function
global.fetch = jest.fn();

// Test wrapper component that provides all necessary contexts
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ActionCompletionProvider>
    {children}
  </ActionCompletionProvider>
);

// Mock tree data
const mockTreeData: ActionTreeResource = {
  rootActions: [
    {
      id: '1',
      title: 'Root Action 1',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [
        {
          id: '3',
          title: 'Child Action 2',
          done: false,
          created_at: '2023-01-01T00:00:00Z',
          children: [],
          dependencies: []
        },
        {
          id: '4',
          title: 'Child Action 3',
          done: false,
          created_at: '2023-01-01T00:00:00Z',
          children: [],
          dependencies: []
        }
      ],
      dependencies: []
    },
    {
      id: '5',
      title: 'Root Action 3',
      done: false,
      created_at: '2023-01-01T00:00:00Z',
      children: [],
      dependencies: []
    }
  ]
};

describe('TreemapIdPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
    mockPush.mockClear();
    mockReplace.mockClear();
    mockGet.mockClear();
  });

  it('renders loading state initially', () => {
    mockGet.mockReturnValue(null); // No depth parameter
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<TreemapIdPage />, { wrapper: TestWrapper });
    expect(screen.getByText('Loading action subtree...')).toBeInTheDocument();
  });

  it('renders treemap for action with children', async () => {
    mockGet.mockReturnValue(null); // No depth parameter
    
    // Mock both the tree API call and the action details API call for breadcrumbs
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      if (url === '/api/tree') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: mockTreeData
          })
        });
      } else if (url === '/api/actions/1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: '1',
              title: 'Root Action 1',
              parent_chain: [], // No parents since this is a root action
              children: [],
              dependencies: [],
              dependents: []
            }
          })
        });
      }
      return Promise.reject(new Error('Unexpected fetch call'));
    });

    render(<TreemapIdPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByTestId('treemap-container')).toBeInTheDocument();
    });

    // Check that the action title appears in parent label with breadcrumb
    expect(screen.getByText('Actions / Root Action 1 (2)')).toBeInTheDocument();
    
    // Check that back button is present
    expect(screen.getByText('← Back')).toBeInTheDocument();
  });

  it('redirects leaf nodes to parent when they have one', async () => {
    // Mock params to point to an action with no children (leaf node with parent)
    mockParams.id = '3';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    mockGet.mockReturnValue(null); // No depth parameter
    render(<TreemapIdPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/treemap/1?');
    });
  });

  it('redirects leaf nodes to root when they have no parent', async () => {
    // Mock params to point to an action with no children (leaf node)
    mockParams.id = '5';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    mockGet.mockReturnValue(null); // No depth parameter
    render(<TreemapIdPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('/treemap/root?');
    });
  });

  it('renders error when action not found', async () => {
    // Mock params to point to non-existent action
    mockParams.id = 'nonexistent';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    mockGet.mockReturnValue(null); // No depth parameter
    render(<TreemapIdPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('Error: Action with ID nonexistent not found')).toBeInTheDocument();
    });
  });

  it('navigates back to full tree when back button is clicked', async () => {
    mockParams.id = '1';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    render(<TreemapIdPage />, { wrapper: TestWrapper });

    await waitFor(() => {
      expect(screen.getByText('← Back')).toBeInTheDocument();
    });

    // Click the back button
    const backButton = screen.getByText('← Back');
    backButton.click();

    expect(mockPush).toHaveBeenCalledWith('/treemap/root?');
  });
});