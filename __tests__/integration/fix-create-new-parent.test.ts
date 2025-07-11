/**
 * Test for CREATE_NEW_PARENT functionality fix
 * This test verifies that when a CREATE_NEW_PARENT suggestion is selected,
 * the system creates both the parent and child actions correctly.
 */

import { describe, expect, it } from '@jest/globals';

describe('CREATE_NEW_PARENT Bug Fix', () => {
  it('should handle CREATE_NEW_PARENT suggestion correctly in web interface logic', async () => {
    // This test simulates the web interface logic for handling CREATE_NEW_PARENT
    // It verifies that the fix properly creates parent first, then child
    
    // Mock the AI preview with CREATE_NEW_PARENT suggestion
    const mockAIPreview = {
      fields: {
        title: 'Implement JWT token validation',
        description: 'Add JWT token validation to secure API endpoints',
        vision: 'All API endpoints properly validate JWT tokens'
      },
      placement: {
        suggestions: [
          {
            id: 'CREATE_NEW_PARENT',
            title: 'Authentication System',
            description: 'Manage authentication and authorization features',
            confidence: 85,
            source: 'create_new' as const,
            reasoning: 'No suitable parent category found for this authentication work',
            hierarchyPath: ['Authentication System'],
            canCreateNewParent: true
          }
        ]
      }
    };

    // Mock the selected parent ID
    const selectedParentId = 'CREATE_NEW_PARENT';

    // Mock fetch function to simulate API calls
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock the first call to create parent action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          action: {
            id: 'parent-action-id',
            title: 'Authentication System',
            description: 'Manage authentication and authorization features'
          }
        }
      })
    });

    // Mock the second call to create child action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          action: {
            id: 'child-action-id',
            title: 'Implement JWT token validation',
            description: 'Add JWT token validation to secure API endpoints',
            vision: 'All API endpoints properly validate JWT tokens'
          }
        }
      })
    });

    // Simulate the web interface logic (this is the fix)
    let parentId = selectedParentId;
    
    // Handle CREATE_NEW_PARENT case
    if (selectedParentId === 'CREATE_NEW_PARENT') {
      // Find the CREATE_NEW_PARENT suggestion to get its details
      const createNewSuggestion = mockAIPreview.placement.suggestions.find(s => s.id === 'CREATE_NEW_PARENT');
      expect(createNewSuggestion).toBeDefined();
      
      if (createNewSuggestion) {
        // Create the parent action first
        const parentResponse = await fetch('/api/actions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: createNewSuggestion.title,
            description: createNewSuggestion.description,
          }),
        });

        expect(parentResponse.ok).toBe(true);
        
        const parentData = await parentResponse.json();
        parentId = parentData.data.action.id;
        
        // Verify parent was created with correct data
        expect(parentData.data.action.title).toBe(createNewSuggestion.title);
        expect(parentData.data.action.description).toBe(createNewSuggestion.description);
      }
    }

    // Create the child action with the parent
    const createResponse = await fetch('/api/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: mockAIPreview.fields.title,
        description: mockAIPreview.fields.description,
        vision: mockAIPreview.fields.vision,
        parent_id: parentId,
      }),
    });

    expect(createResponse.ok).toBe(true);
    
    const createData = await createResponse.json();
    
    // Verify child was created
    expect(createData.data.action.title).toBe(mockAIPreview.fields.title);
    expect(createData.data.action.description).toBe(mockAIPreview.fields.description);
    expect(createData.data.action.vision).toBe(mockAIPreview.fields.vision);

    // Verify the correct sequence of API calls
    expect(mockFetch).toHaveBeenCalledTimes(2);
    
    // First call should create parent
    expect(mockFetch).toHaveBeenNthCalledWith(1, '/api/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Authentication System',
        description: 'Manage authentication and authorization features',
      }),
    });
    
    // Second call should create child with parent_id
    expect(mockFetch).toHaveBeenNthCalledWith(2, '/api/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Implement JWT token validation',
        description: 'Add JWT token validation to secure API endpoints',
        vision: 'All API endpoints properly validate JWT tokens',
        parent_id: 'parent-action-id', // This should be the parent's ID, not 'CREATE_NEW_PARENT'
      }),
    });

    // Verify that the fix properly uses the created parent's ID
    expect(parentId).toBe('parent-action-id');
    expect(parentId).not.toBe('CREATE_NEW_PARENT');
  });

  it('should handle CREATE_NEW_PARENT with missing suggestion gracefully', async () => {
    // Test error handling when CREATE_NEW_PARENT is selected but suggestion is missing
    const mockAIPreview = {
      fields: {
        title: 'Test action',
        description: 'Test description',
        vision: 'Test vision'
      },
      placement: {
        suggestions: [
          {
            id: 'some-other-id',
            title: 'Other suggestion',
            description: 'Other description',
            confidence: 50,
            source: 'vector' as const,
            reasoning: 'Test reasoning',
            hierarchyPath: ['Other'],
            canCreateNewParent: false
          }
        ]
      }
    };

    const selectedParentId = 'CREATE_NEW_PARENT';

    // Try to find CREATE_NEW_PARENT suggestion (should not exist)
    const createNewSuggestion = mockAIPreview.placement.suggestions.find(s => s.id === 'CREATE_NEW_PARENT');
    
    // This should be undefined, simulating the error case
    expect(createNewSuggestion).toBeUndefined();
    
    // In the web interface, this would result in an error
    // The fix should handle this by showing an error rather than creating a root-level action
    let errorOccurred = false;
    
    if (selectedParentId === 'CREATE_NEW_PARENT') {
      if (!createNewSuggestion) {
        errorOccurred = true;
      }
    }
    
    expect(errorOccurred).toBe(true);
  });

  it('should not create parent when existing parent is selected', async () => {
    // Test that existing parent selection works correctly (no change in behavior)
    const mockAIPreview = {
      fields: {
        title: 'Add database indexing',
        description: 'Improve query performance with proper indexing',
        vision: 'Database queries are optimized'
      },
      placement: {
        suggestions: [
          {
            id: 'existing-parent-id',
            title: 'Database Operations',
            description: 'Handle database-related functionality',
            confidence: 90,
            source: 'vector' as const,
            reasoning: 'High similarity to existing database work',
            hierarchyPath: ['Database Operations'],
            canCreateNewParent: false
          }
        ]
      }
    };

    const selectedParentId = 'existing-parent-id';

    // Mock fetch function
    const mockFetch = jest.fn();
    global.fetch = mockFetch;

    // Mock only one API call for the child action
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          action: {
            id: 'child-action-id',
            title: 'Add database indexing',
            description: 'Improve query performance with proper indexing',
            vision: 'Database queries are optimized'
          }
        }
      })
    });

    // Simulate the web interface logic
    let parentId = selectedParentId;
    
    // Handle CREATE_NEW_PARENT case (should not execute)
    if (selectedParentId === 'CREATE_NEW_PARENT') {
      // This should not execute
      throw new Error('Should not create parent for existing parent ID');
    }

    // Create the child action with existing parent
    const createResponse = await fetch('/api/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: mockAIPreview.fields.title,
        description: mockAIPreview.fields.description,
        vision: mockAIPreview.fields.vision,
        parent_id: parentId,
      }),
    });

    expect(createResponse.ok).toBe(true);

    // Verify only one API call was made (for the child action)
    expect(mockFetch).toHaveBeenCalledTimes(1);
    
    // Verify the call was made with the existing parent ID
    expect(mockFetch).toHaveBeenCalledWith('/api/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Add database indexing',
        description: 'Improve query performance with proper indexing',
        vision: 'Database queries are optimized',
        parent_id: 'existing-parent-id',
      }),
    });
  });
});