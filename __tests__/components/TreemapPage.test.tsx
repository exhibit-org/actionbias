import { render, screen, waitFor } from '@testing-library/react';
import TreemapPage from '../../app/treemap/page';
import { ActionTreeResource, ActionNode } from '../../lib/types/resources';

// Mock Next.js navigation
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockGet = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  useSearchParams: () => ({
    get: mockGet,
  }),
}));

// Mock the @nivo/treemap component
jest.mock('@nivo/treemap', () => ({
  ResponsiveTreeMapHtml: ({ data, tooltip, onClick, onMouseEnter, onMouseLeave, ...props }: any) => (
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
    mockPush.mockClear();
    mockReplace.mockClear();
    mockGet.mockClear();
  });

  it('redirects to root treemap view', () => {
    mockGet.mockReturnValue(null); // No depth parameter
    
    render(<TreemapPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/treemap/root?');
    expect(screen.getByText('Redirecting to treemap...')).toBeInTheDocument();
  });

  it('redirects to root treemap view with depth parameter', () => {
    mockGet.mockReturnValue('3'); // depth=3
    
    render(<TreemapPage />);
    
    expect(mockReplace).toHaveBeenCalledWith('/treemap/root?depth=3');
    expect(screen.getByText('Redirecting to treemap...')).toBeInTheDocument();
  });

});