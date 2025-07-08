import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActionDetailResource } from '../../lib/types/resources';
import TreemapInspector from '../../app/treemap/[id]/inspector';

// Mock data
const mockActionDetail: ActionDetailResource = {
  id: 'test-action-123',
  title: 'Test Action',
  description: 'Test description',
  vision: 'Test vision',
  done: false,
  version: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  parent_chain: [],
  children: [],
  dependencies: [],
  dependents: [],
  siblings: [],
  relationship_flags: {},
  dependency_completion_context: []
};

// Mock fetch
global.fetch = jest.fn();

describe('TreemapInspector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Editable fields', () => {
    it('should display action details with editable fields', () => {
      render(
        <TreemapInspector 
          selectedActionDetail={mockActionDetail}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
        />
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Test Action')).toBeInTheDocument();
      expect(screen.getByText('Description')).toBeInTheDocument();
      expect(screen.getByText('Test description')).toBeInTheDocument();
      expect(screen.getByText('Vision')).toBeInTheDocument();
      expect(screen.getByText('Test vision')).toBeInTheDocument();
    });

    it('should handle empty fields with placeholder', () => {
      const actionWithEmptyFields = {
        ...mockActionDetail,
        description: null,
        vision: null
      };

      render(
        <TreemapInspector 
          selectedActionDetail={actionWithEmptyFields}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
        />
      );

      expect(screen.getByText('No description')).toBeInTheDocument();
      expect(screen.getByText('No vision')).toBeInTheDocument();
    });
  });

  describe('Delete functionality', () => {
    it('should display delete button', () => {
      render(
        <TreemapInspector 
          selectedActionDetail={mockActionDetail}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={jest.fn()}
          deleting={false}
        />
      );

      expect(screen.getByTitle('Delete action')).toBeInTheDocument();
    });

    it('should show confirmation modal when delete is clicked', async () => {
      const mockOnDelete = jest.fn();
      
      render(
        <TreemapInspector 
          selectedActionDetail={mockActionDetail}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={mockOnDelete}
          deleting={false}
        />
      );

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Should show confirmation modal
      await waitFor(() => {
        expect(screen.getByText('Delete Action')).toBeInTheDocument();
        expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
      });
    });

    it('should call onDelete when confirmed', async () => {
      const mockOnDelete = jest.fn();
      
      render(
        <TreemapInspector 
          selectedActionDetail={mockActionDetail}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={mockOnDelete}
          deleting={false}
        />
      );

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Click confirm
      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'));
      });

      // Since mockActionDetail has no parent_id, it defaults to 'delete_recursive'
      expect(mockOnDelete).toHaveBeenCalledWith(mockActionDetail.id, 'delete_recursive');
    });

    it('should close modal when cancelled', async () => {
      const mockOnDelete = jest.fn();
      
      render(
        <TreemapInspector 
          selectedActionDetail={mockActionDetail}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={mockOnDelete}
          deleting={false}
        />
      );

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Click cancel
      await waitFor(() => {
        fireEvent.click(screen.getByText('Cancel'));
      });

      // Modal should be closed
      expect(screen.queryByText('Delete Action')).not.toBeInTheDocument();
      expect(mockOnDelete).not.toHaveBeenCalled();
    });

    it('should show child handling options when action has children', async () => {
      const actionWithChildren = {
        ...mockActionDetail,
        parent_id: 'parent-123',
        children: [
          { id: 'child-1', title: 'Child 1', done: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', version: 1 },
          { id: 'child-2', title: 'Child 2', done: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', version: 1 }
        ]
      };

      render(
        <TreemapInspector 
          selectedActionDetail={actionWithChildren}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={jest.fn()}
          deleting={false}
        />
      );

      // Verify action has children
      expect(actionWithChildren.children.length).toBe(2);

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Check that modal appears and shows child handling content
      await waitFor(() => {
        expect(screen.getByText('Delete Action')).toBeInTheDocument();
        expect(screen.getByText(/This action has 2 child action/)).toBeInTheDocument();
        expect(screen.getByText('Child actions:')).toBeInTheDocument();
        expect(screen.getByText('Child 1')).toBeInTheDocument();
        expect(screen.getByText('Child 2')).toBeInTheDocument();
      });
    });

    it('should call onDelete with selected child handling option', async () => {
      const mockOnDelete = jest.fn();
      const actionWithChildren = {
        ...mockActionDetail,
        parent_id: 'parent-123',
        children: [
          { id: 'child-1', title: 'Child 1', done: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', version: 1 }
        ]
      };

      render(
        <TreemapInspector 
          selectedActionDetail={actionWithChildren}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={mockOnDelete}
          deleting={false}
        />
      );

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Select delete_recursive option
      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/Delete all children/));
      });

      // Click confirm
      await waitFor(() => {
        fireEvent.click(screen.getByText('Delete'));
      });

      expect(mockOnDelete).toHaveBeenCalledWith(mockActionDetail.id, 'delete_recursive');
    });

    it('should show child action completion status with icons', async () => {
      const actionWithMixedChildren = {
        ...mockActionDetail,
        parent_id: 'parent-123',
        children: [
          { id: 'child-1', title: 'Completed Child', done: true, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', version: 1 },
          { id: 'child-2', title: 'Active Child', done: false, created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z', version: 1 }
        ]
      };

      render(
        <TreemapInspector 
          selectedActionDetail={actionWithMixedChildren}
          loadingActionDetail={false}
          copying={false}
          copyingUrl={false}
          onCopyPrompt={jest.fn()}
          onCopyUrl={jest.fn()}
          onToggleComplete={jest.fn()}
          onClearSelection={jest.fn()}
          isMinimized={false}
          onToggleMinimize={jest.fn()}
          isMobile={false}
          onDelete={jest.fn()}
          deleting={false}
        />
      );

      // Click delete button
      fireEvent.click(screen.getByTitle('Delete action'));

      // Should show child titles with status indicators
      await waitFor(() => {
        expect(screen.getByText('Completed Child')).toBeInTheDocument();
        expect(screen.getByText('Active Child')).toBeInTheDocument();
        expect(screen.getByText('✓')).toBeInTheDocument(); // checkmark for completed
        expect(screen.getByText('○')).toBeInTheDocument(); // circle for active
      });
    });
  });
});