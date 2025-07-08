import React from 'react';
import { render, screen } from '@testing-library/react';
import { ActionDetailResource } from '../../lib/types/resources';
import TreemapInspector from '../../app/treemap/[id]/inspector';

// Mock data
const mockActionDetail: ActionDetailResource = {
  id: 'test-action-123',
  title: 'Test Action',
  description: 'Test description',
  vision: 'Test vision',
  done: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  children: [],
  dependencies: [],
  dependents: []
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
});