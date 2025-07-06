import { render, screen, waitFor } from '@testing-library/react';
import TreemapPage from '../../app/treemap/page';
import { ActionTreeResource, ActionNode } from '../../lib/types/resources';

// Mock the @nivo/treemap component
jest.mock('@nivo/treemap', () => ({
  ResponsiveTreeMap: ({ data, tooltip, ...props }: any) => (
    <div data-testid="treemap-container" {...props}>
      <div data-testid="treemap-data">{JSON.stringify(data)}</div>
      {data.children && data.children.map((child: any) => (
        <div key={child.id} data-testid={`treemap-node-${child.id}`}>
          {child.name}
        </div>
      ))}
    </div>
  ),
}));

// Mock the fetch function
global.fetch = jest.fn();

// Mock tree data representing what the API returns (completed actions already filtered out)
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

describe('TreemapPage', () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it('renders loading state initially', () => {
    (global.fetch as jest.Mock).mockImplementation(() => 
      new Promise(resolve => setTimeout(resolve, 1000))
    );
    
    render(<TreemapPage />);
    expect(screen.getByText('Loading action tree...')).toBeInTheDocument();
  });

  it('renders treemap visualization after loading data', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    render(<TreemapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('treemap-container')).toBeInTheDocument();
    });
  });

  it('renders error state when fetch fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Failed to fetch tree data'
      })
    });

    render(<TreemapPage />);

    await waitFor(() => {
      expect(screen.getByText(/Error loading action tree/)).toBeInTheDocument();
    });
  });

  it('displays pending actions from API response', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: mockTreeData
      })
    });

    render(<TreemapPage />);

    await waitFor(() => {
      expect(screen.getByTestId('treemap-container')).toBeInTheDocument();
    });

    // Check that top-level pending actions from API are displayed
    expect(screen.getByText('Root Action 1')).toBeInTheDocument();
    expect(screen.getByText('Root Action 3')).toBeInTheDocument();
    
    // Check that the treemap data includes the child action in the JSON
    const treemapData = screen.getByTestId('treemap-data');
    expect(treemapData.textContent).toContain('Child Action 2');
  });
});