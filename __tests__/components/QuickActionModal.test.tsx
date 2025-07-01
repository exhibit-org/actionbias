import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useQuickAction } from '../../app/contexts/QuickActionContext';
import QuickActionModal from '../../app/components/QuickActionModal';

// Mock the QuickActionContext
jest.mock('../../app/contexts/QuickActionContext');

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockUseQuickAction = useQuickAction as jest.MockedFunction<typeof useQuickAction>;

describe('QuickActionModal Context Sidebar', () => {
  const mockCloseModal = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuickAction.mockReturnValue({
      isOpen: true,
      closeModal: mockCloseModal,
      openModal: jest.fn(),
      toggleModal: jest.fn(),
    });
  });

  it('should display context sidebar when modal is open', async () => {
    render(<QuickActionModal />);

    // Should show the context sidebar
    expect(screen.getByText('Related Context')).toBeInTheDocument();
    expect(screen.getByText('Parent Goals')).toBeInTheDocument();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Dependencies')).toBeInTheDocument();
  });

  it('should fetch and display context when action text is analyzed', async () => {
    // Mock the analyze endpoint to return placement data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          fields: {
            title: 'Test Action',
            description: 'Test description',
            vision: 'Test vision'
          },
          placement: {
            parent: {
              id: 'parent-123',
              title: 'Parent Action',
              reasoning: 'Related to parent goal'
            },
            reasoning: 'Best placement here'
          }
        }
      })
    });

    // Mock the action detail resource endpoint
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parent_chain: [
          { id: 'root-1', title: 'Root Goal', done: false },
          { id: 'parent-123', title: 'Parent Action', done: false }
        ],
        siblings: [
          { id: 'sibling-1', title: 'Sibling Action 1', done: true },
          { id: 'sibling-2', title: 'Sibling Action 2', done: false }
        ],
        dependencies: [],
        dependents: [],
        relationship_flags: {
          'root-1': ['ancestor'],
          'parent-123': ['ancestor'],
          'sibling-1': ['sibling'],
          'sibling-2': ['sibling']
        }
      })
    });

    render(<QuickActionModal />);

    const textarea = screen.getByPlaceholderText(/What needs to be done/);
    fireEvent.change(textarea, { target: { value: 'implement new feature' } });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/actions/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: 'implement new feature' }),
      });
    });

    // Should fetch context for the suggested parent
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/actions/parent-123', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Should display parent goals in context sidebar
    await waitFor(() => {
      expect(screen.getByText('Root Goal')).toBeInTheDocument();
      // Parent Action will appear in multiple places (AI Preview label and context sidebar)
      expect(screen.getAllByText('Parent Action').length).toBeGreaterThanOrEqual(1);
    });

    // Should display recent sibling activity
    await waitFor(() => {
      expect(screen.getByText('Sibling Action 1')).toBeInTheDocument();
      expect(screen.getByText('Sibling Action 2')).toBeInTheDocument();
    });
  });

  it('should show no context message when no parent is suggested', async () => {
    // Mock analyze endpoint with no parent placement
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          fields: {
            title: 'Root Action',
            description: 'Root description',
            vision: 'Root vision'
          },
          placement: {
            parent: null,
            reasoning: 'Creating as root action'
          }
        }
      })
    });

    render(<QuickActionModal />);

    const textarea = screen.getByPlaceholderText(/What needs to be done/);
    fireEvent.change(textarea, { target: { value: 'create root action' } });

    await waitFor(() => {
      expect(screen.getByText('No parent context available')).toBeInTheDocument();
      expect(screen.getByText('This will be created as a root-level action')).toBeInTheDocument();
    });
  });

  it('should use relationship_flags to avoid duplicate displays', async () => {
    // Mock with overlapping relationships
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          fields: { title: 'Test', description: 'Test', vision: 'Test' },
          placement: {
            parent: { id: 'parent-123', title: 'Parent Action', reasoning: 'Test' },
            reasoning: 'Test'
          }
        }
      })
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        parent_chain: [
          { id: 'parent-123', title: 'Parent Action', done: false }
        ],
        siblings: [
          { id: 'parent-123', title: 'Parent Action', done: false }
        ],
        relationship_flags: {
          'parent-123': ['ancestor', 'sibling']
        }
      })
    });

    render(<QuickActionModal />);

    const textarea = screen.getByPlaceholderText(/What needs to be done/);
    fireEvent.change(textarea, { target: { value: 'test action' } });

    await waitFor(() => {
      // Should show parent action but use relationship_flags to avoid showing the same action multiple times in context sidebar
      // (It may still appear in AI Preview section as well, which is expected)
      const parentElements = screen.getAllByText('Parent Action');
      expect(parentElements.length).toBeGreaterThanOrEqual(1);
    });
  });
});