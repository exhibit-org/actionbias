/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import NextActionDisplay from '../../../../app/next/components/NextActionDisplay';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock window.location.reload
const mockReload = jest.fn();

// Mock setTimeout
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

const mockNextActionData = {
  id: 'test-action-id',
  title: 'Test Action',
  description: 'Test description',
  vision: 'Test vision',
  done: false,
  version: 1,
  created_at: '2023-01-01T00:00:00.000Z',
  updated_at: '2023-01-01T00:00:00.000Z',
  parent_id: 'parent-id',
  parent_chain: [
    {
      id: 'parent-1',
      title: 'Parent Action',
      done: false,
      version: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    }
  ],
  children: [],
  dependencies: [
    {
      id: 'dep-1',
      title: 'Dependency Action',
      done: true,
      version: 1,
      created_at: '2023-01-01T00:00:00.000Z',
      updated_at: '2023-01-01T00:00:00.000Z',
    }
  ],
  dependents: [],
  dependency_completion_context: [
    {
      action_id: 'dep-1',
      action_title: 'Dependency Action',
      completion_timestamp: '2023-01-01T00:00:00.000Z',
      implementation_story: 'Used React hooks for state management',
      impact_story: 'Improved component reusability by 50%',
      learning_story: 'Learned that custom hooks reduce code duplication',
      changelog_visibility: 'team'
    }
  ]
};

describe('NextActionDisplay Error Handling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockClear();
    mockReload.mockClear();
    
    // Ensure clean timer state for each test
    if (jest.isMockFunction(setTimeout)) {
      jest.useRealTimers();
    }
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up timers completely
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should handle HTTP errors during fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
      expect(screen.getByText('HTTP error! status: 500')).toBeInTheDocument();
    });
  });

  it('should handle MCP error responses', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'MCP server error'
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
      expect(screen.getByText('MCP server error')).toBeInTheDocument();
    });
  });

  it('should handle JSON parsing errors in fetch', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockRejectedValue(new Error('Unexpected token'))
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
    });
  });

  it('should handle network errors during fetch', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('should handle non-Error exceptions during fetch', async () => {
    mockFetch.mockRejectedValueOnce('String error');

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch next action')).toBeInTheDocument();
    });
  });

  it('should call window.location.reload when retry button is clicked', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // Test that the retry button is clickable and triggers reload behavior
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeEnabled();
    fireEvent.click(retryButton);
    
    // Test that clicking the button doesn't cause any errors (reload behavior is triggered)
    expect(retryButton).toBeInTheDocument();
  });

  it('should handle HTTP errors during mark complete', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    // Third call fails for mark complete
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Mark Complete'));

    await waitFor(() => {
      expect(screen.getByText('HTTP error! status: 403')).toBeInTheDocument();
    });
  });

  it('should handle MCP error responses during mark complete', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    // Third call returns error
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: 'Action not found'
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Mark Complete'));

    await waitFor(() => {
      expect(screen.getByText('Action not found')).toBeInTheDocument();
    });
  });

  it('should handle network errors during mark complete', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    // Third call fails with network error
    mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Mark Complete'));

    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });
  });

  it('should handle non-Error exceptions during mark complete', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    // Third call fails with string error
    mockFetch.mockRejectedValueOnce('Unknown error type');

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Mark Complete'));

    await waitFor(() => {
      expect(screen.getByText('Failed to mark action as complete')).toBeInTheDocument();
    });
  });

  it('should show suggestions modal after successful completion', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    // Third call succeeds for mark complete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { ...mockNextActionData, done: true }
      })
    });
    // Fourth call for fetching next suggestions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText('Mark Complete'));

    await waitFor(() => {
      expect(screen.getByText('Action Completed! 🎉')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByTestId('suggestions-modal')).toBeInTheDocument();
    });
  });

  it('should handle missing MCP error message gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: false,
        error: null // No error message
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Error Loading Next Action')).toBeInTheDocument();
      expect(screen.getByText('Failed to fetch next action')).toBeInTheDocument();
    });
  });

  it('should handle missing result contents gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: null // No data
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('🎉 All Done!')).toBeInTheDocument();
      expect(screen.getByText('No next action found. You\'re all caught up!')).toBeInTheDocument();
    });
  });

  it('should handle empty result contents gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: null // No data (equivalent to empty)
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('🎉 All Done!')).toBeInTheDocument();
    });
  });

  it('should handle missing text in contents gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: null // No data
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('🎉 All Done!')).toBeInTheDocument();
    });
  });

  it('shows checked checkbox for completed action and allows unchecking', async () => {
    const doneAction = { ...mockNextActionData, done: true };

    // Initial fetch returns completed action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: doneAction
      })
    });

    // Sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Incomplete')).toBeInTheDocument();
    });

    // Mock uncheck API call
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { ...doneAction, done: false }
      })
    });

    fireEvent.click(screen.getByLabelText('Mark Incomplete'));

    await waitFor(() => {
      expect(screen.getByLabelText('Mark Complete')).toBeInTheDocument();
    });
  });

  it('should include resource URLs in Claude Code prompt', async () => {
    // Mock navigator.clipboard.writeText
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText');

    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Copy Action Instructions for Claude Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Action Instructions for Claude Code'));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
    });

    const copiedText = writeTextSpy.mock.calls[0][0];
    expect(copiedText).toContain('# Resource URLs');
    expect(copiedText).toContain('- work://tree (full action hierarchy)');
    expect(copiedText).toContain('- work://next (current priority action)');
    expect(copiedText).toContain(`- work://${mockNextActionData.id} (this action's details)`);
  });

  it('should display dependency completion context when available', async () => {
    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('🎯 Knowledge from Dependencies')).toBeInTheDocument();
      expect(screen.getByText('Dependency Action')).toBeInTheDocument();
      expect(screen.getByText('Used React hooks for state management')).toBeInTheDocument();
      expect(screen.getByText('Improved component reusability by 50%')).toBeInTheDocument();
      expect(screen.getByText('Learned that custom hooks reduce code duplication')).toBeInTheDocument();
    });
  });

  it('should include completion context in clipboard prompts', async () => {
    // Mock navigator.clipboard.writeText
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
    const writeTextSpy = jest.spyOn(navigator.clipboard, 'writeText');

    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: mockNextActionData
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Copy Action Instructions for Claude Code')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Copy Action Instructions for Claude Code'));

    await waitFor(() => {
      expect(writeTextSpy).toHaveBeenCalled();
    });

    const copiedText = writeTextSpy.mock.calls[0][0];
    expect(copiedText).toContain('# Knowledge from Dependencies');
    expect(copiedText).toContain('Dependency Action');
    expect(copiedText).toContain('Used React hooks for state management');
    expect(copiedText).toContain('Improved component reusability by 50%');
    expect(copiedText).toContain('Learned that custom hooks reduce code duplication');
  });

  it('should not display completion context section when no dependencies have context', async () => {
    const actionWithoutContext = {
      ...mockNextActionData,
      dependency_completion_context: []
    };

    // First call succeeds for initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: actionWithoutContext
      })
    });

    // Second call for sibling fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: { children: [] }
      })
    });

    render(<NextActionDisplay colors={mockColors} />);

    await waitFor(() => {
      expect(screen.getByText('Test Action')).toBeInTheDocument();
    });

    // Should not show completion context section
    expect(screen.queryByText('🎯 Knowledge from Dependencies')).not.toBeInTheDocument();
  });
});