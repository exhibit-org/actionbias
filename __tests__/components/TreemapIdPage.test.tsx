import { render, screen, waitFor } from '@testing-library/react';
import TreemapIdPage from '../../app/treemap/[id]/page';
import { ActionTreeResource } from '../../lib/types/resources';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockParams = { id: '1' };

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useParams: () => mockParams,
}));

// Mock the @nivo/treemap component
jest.mock('@nivo/treemap', () => ({
  ResponsiveTreeMap: ({ data, onClick, onMouseEnter, onMouseLeave, ...props }: any) => (
    <div data-testid="treemap-container" {...props}>
      <div data-testid="treemap-data">{JSON.stringify(data)}</div>
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
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<TreemapIdPage />);
    expect(screen.getByText('Loading action subtree...')).toBeInTheDocument();
  });

  it('renders treemap for action with children', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    render(<TreemapIdPage />);

    await waitFor(() => {
      expect(screen.getByTestId('treemap-container')).toBeInTheDocument();
    });

    // Check that the action title appears in breadcrumb
    expect(screen.getByText('/ Root Action 1')).toBeInTheDocument();
    
    // Check that back button is present
    expect(screen.getByText('← Back to Full Tree')).toBeInTheDocument();
  });

  it('renders message for action with no children', async () => {
    // Mock params to point to an action with no children
    mockParams.id = '5';
    
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    render(<TreemapIdPage />);

    await waitFor(() => {
      expect(screen.getByText('This action has no children')).toBeInTheDocument();
    });

    expect(screen.getByText('Root Action 3')).toBeInTheDocument();
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

    render(<TreemapIdPage />);

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

    render(<TreemapIdPage />);

    await waitFor(() => {
      expect(screen.getByText('← Back to Full Tree')).toBeInTheDocument();
    });

    // Click the back button
    const backButton = screen.getByText('← Back to Full Tree');
    backButton.click();

    expect(mockPush).toHaveBeenCalledWith('/treemap');
  });
});