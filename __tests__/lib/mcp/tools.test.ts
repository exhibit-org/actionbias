import { registerTools, toolCapabilities } from '../../../lib/mcp/tools';
import { ActionsService } from '../../../lib/services/actions';

// Mock ActionsService
jest.mock('../../../lib/services/actions');
const mockActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

// Mock getDb
jest.mock('../../../lib/db/adapter', () => ({
  getDb: jest.fn(),
}));

// Mock db schema
jest.mock('../../../db/schema', () => ({
  actions: {},
  edges: {},
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Mock server object
const mockServer = {
  tool: jest.fn(),
};

describe('MCP Tools', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockServer.tool.mockClear();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterEach(() => {
    // Don't restore, keep mocks active
  });

  describe('registerTools', () => {
    it('should register all tools with the server', () => {
      registerTools(mockServer);

      expect(mockServer.tool).toHaveBeenCalledTimes(9);
      expect(mockServer.tool).toHaveBeenCalledWith('create_action', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('add_dependency', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('delete_action', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('remove_dependency', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('update_action', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('complete_action', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('uncomplete_action', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('join_family', expect.any(String), expect.any(Object), expect.any(Function));
      expect(mockServer.tool).toHaveBeenCalledWith('search_actions', expect.any(String), expect.any(Object), expect.any(Function));
    });
  });

  describe('toolCapabilities', () => {
    it('should export correct tool capabilities', () => {
      expect(toolCapabilities).toHaveProperty('create_action');
      expect(toolCapabilities).toHaveProperty('add_dependency');
      expect(toolCapabilities).toHaveProperty('delete_action');
      expect(toolCapabilities).toHaveProperty('remove_dependency');
      expect(toolCapabilities).toHaveProperty('update_action');
      expect(toolCapabilities).toHaveProperty('complete_action');
      expect(toolCapabilities).toHaveProperty('uncomplete_action');
      expect(toolCapabilities).toHaveProperty('join_family');
      expect(toolCapabilities).toHaveProperty('search_actions');

      expect(toolCapabilities.create_action.description).toBe('Create a new action in the database with a required family');
      expect(toolCapabilities.join_family.description).toBe('Update an action\'s family relationship by having it join a new family or making it independent');
    });
  });

  describe('create_action tool', () => {
    let createActionHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      // Get the create_action handler
      const createActionCall = mockServer.tool.mock.calls.find(call => call[0] === 'create_action');
      createActionHandler = createActionCall![3];
    });

    it('should successfully create an action', async () => {
      const mockResult = {
        action: {
          id: 'test-id',
          data: { title: 'Test Action' },
          createdAt: '2023-01-01T00:00:00.000Z',
        },
        dependencies_count: 0,
      };

      // Mock getDb to return a family action
      const mockGetDb = require('../../../lib/db/adapter').getDb;
      mockGetDb.mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'family-id' }])
            })
          })
        })
      });

      mockActionsService.createAction.mockResolvedValue(mockResult);

      const result = await createActionHandler({ title: 'Test Action', family_id: 'family-id' }, {});

      expect(mockActionsService.createAction).toHaveBeenCalledWith({
        title: 'Test Action',
        description: undefined,
        vision: undefined,
        parent_id: 'family-id',
        depends_on_ids: undefined,
        override_duplicate_check: undefined,
      });

      expect(result.content[0].text).toContain('Created action: Test Action');
      expect(result.content[0].text).toContain('ID: test-id');
    });

    it('should create action with family and dependencies', async () => {
      const mockResult = {
        action: {
          id: 'test-id',
          data: { title: 'Test Action' },
          createdAt: '2023-01-01T00:00:00.000Z',
        },
        dependencies_count: 2,
      };

      // Mock getDb to return a family action
      const mockGetDb = require('../../../lib/db/adapter').getDb;
      mockGetDb.mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'family-id' }])
            })
          })
        })
      });

      mockActionsService.createAction.mockResolvedValue(mockResult);

      const result = await createActionHandler({
        title: 'Test Action',
        description: 'Test description',
        vision: 'Test vision',
        family_id: 'family-id',
        depends_on_ids: ['dep1', 'dep2'],
      }, {});

      expect(mockActionsService.createAction).toHaveBeenCalledWith({
        title: 'Test Action',
        description: 'Test description',
        vision: 'Test vision',
        parent_id: 'family-id',
        depends_on_ids: ['dep1', 'dep2'],
        override_duplicate_check: undefined,
      });

      expect(result.content[0].text).toContain('Parent: family-id');
      expect(result.content[0].text).toContain('Dependencies: 2 actions');
    });

    it('should handle errors gracefully', async () => {
      // Mock getDb to return a family action
      const mockGetDb = require('../../../lib/db/adapter').getDb;
      mockGetDb.mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'family-id' }])
            })
          })
        })
      });

      mockActionsService.createAction.mockRejectedValue(new Error('Database error'));

      const result = await createActionHandler({ title: 'Test Action', family_id: 'family-id' }, {});

      expect(result.content[0].text).toBe('Error creating action: Database error');
      expect(mockConsoleError).toHaveBeenCalledWith('Error creating action:', expect.any(Error));
    });

    it('should handle non-Error exceptions', async () => {
      // Mock getDb to return a family action
      const mockGetDb = require('../../../lib/db/adapter').getDb;
      mockGetDb.mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'family-id' }])
            })
          })
        })
      });

      mockActionsService.createAction.mockRejectedValue('String error');

      const result = await createActionHandler({ title: 'Test Action', family_id: 'family-id' }, {});

      expect(result.content[0].text).toBe('Error creating action: Unknown error');
    });

    it('should error when family_id does not exist', async () => {
      // Mock getDb to return no family action
      const mockGetDb = require('../../../lib/db/adapter').getDb;
      mockGetDb.mockReturnValue({
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      });

      const result = await createActionHandler({ title: 'Test Action', family_id: 'non-existent' }, {});

      expect(result.content[0].text).toContain('Family action with ID non-existent not found');
    });
  });

  describe('add_dependency tool', () => {
    let addDependencyHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const addDependencyCall = mockServer.tool.mock.calls.find(call => call[0] === 'add_dependency');
      addDependencyHandler = addDependencyCall![3];
    });

    it('should successfully add dependency', async () => {
      const mockEdge = {
        src: 'dep-id',
        dst: 'action-id',
        kind: 'depends_on',
        createdAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.addDependency.mockResolvedValue(mockEdge);

      const result = await addDependencyHandler({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      }, {});

      expect(mockActionsService.addDependency).toHaveBeenCalledWith({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      });

      expect(result.content[0].text).toContain('Created dependency: action-id depends on dep-id');
      expect(result.content[0].text).toContain('Created: 2023-01-01T00:00:00.000Z');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.addDependency.mockRejectedValue(new Error('Circular dependency'));

      const result = await addDependencyHandler({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      }, {});

      expect(result.content[0].text).toBe('Error creating dependency: Circular dependency');
      expect(mockConsoleError).toHaveBeenCalledWith('Error creating dependency:', expect.any(Error));
    });
  });

  describe('delete_action tool', () => {
    let deleteActionHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const deleteActionCall = mockServer.tool.mock.calls.find(call => call[0] === 'delete_action');
      deleteActionHandler = deleteActionCall![3];
    });

    it('should successfully delete action with no children', async () => {
      const mockResult = {
        deleted_action: {
          id: 'action-id',
          data: { title: 'Deleted Action' },
        },
        children_count: 0,
        child_handling: 'reparent',
        new_family_id: undefined,
      };

      mockActionsService.deleteAction.mockResolvedValue(mockResult);

      const result = await deleteActionHandler({ action_id: 'action-id' }, {});

      expect(mockActionsService.deleteAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        child_handling: undefined,
        new_family_id: undefined,
      });

      expect(result.content[0].text).toContain('Deleted action: Deleted Action');
      expect(result.content[0].text).toContain('ID: action-id');
    });

    it('should delete action with children using reparent', async () => {
      const mockResult = {
        deleted_action: {
          id: 'action-id',
          data: { title: 'Deleted Action' },
        },
        children_count: 3,
        child_handling: 'reparent',
        new_parent_id: 'new-parent-id',
      };

      mockActionsService.deleteAction.mockResolvedValue(mockResult);

      const result = await deleteActionHandler({
        action_id: 'action-id',
        child_handling: 'reparent',
        new_parent_id: 'new-parent-id',
      }, {});

      expect(result.content[0].text).toContain('Children handled via reparent: 3 child actions');
      expect(result.content[0].text).toContain('New parent: new-parent-id');
    });

    it('should delete action with children using delete_recursive', async () => {
      const mockResult = {
        deleted_action: {
          id: 'action-id',
          data: { title: 'Deleted Action' },
        },
        children_count: 2,
        child_handling: 'delete_recursive',
        new_family_id: undefined,
      };

      mockActionsService.deleteAction.mockResolvedValue(mockResult);

      const result = await deleteActionHandler({
        action_id: 'action-id',
        child_handling: 'delete_recursive',
      }, {});

      expect(result.content[0].text).toContain('Children handled via delete_recursive: 2 child actions');
      expect(result.content[0].text).not.toContain('New parent:');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.deleteAction.mockRejectedValue(new Error('Action not found'));

      const result = await deleteActionHandler({ action_id: 'action-id' }, {});

      expect(result.content[0].text).toBe('Error deleting action: Action not found');
    });
  });

  describe('remove_dependency tool', () => {
    let removeDependencyHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const removeDependencyCall = mockServer.tool.mock.calls.find(call => call[0] === 'remove_dependency');
      removeDependencyHandler = removeDependencyCall![3];
    });

    it('should successfully remove dependency', async () => {
      const mockResult = {
        action: {
          id: 'action-id',
          data: { title: 'Action Title' },
        },
        depends_on: {
          id: 'dep-id',
          data: { title: 'Dependency Title' },
        },
        deleted_edge: {
          src: 'dep-id',
          dst: 'action-id',
          kind: 'depends_on',
          createdAt: '2023-01-01T00:00:00.000Z',
        },
      };

      mockActionsService.removeDependency.mockResolvedValue(mockResult);

      const result = await removeDependencyHandler({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      }, {});

      expect(mockActionsService.removeDependency).toHaveBeenCalledWith({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      });

      expect(result.content[0].text).toContain('Removed dependency: Action Title no longer depends on Dependency Title');
      expect(result.content[0].text).toContain('Removed: 2023-01-01T00:00:00.000Z');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.removeDependency.mockRejectedValue(new Error('Dependency not found'));

      const result = await removeDependencyHandler({
        action_id: 'action-id',
        depends_on_id: 'dep-id',
      }, {});

      expect(result.content[0].text).toBe('Error removing dependency: Dependency not found');
    });
  });

  describe('update_action tool', () => {
    let updateActionHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const updateActionCall = mockServer.tool.mock.calls.find(call => call[0] === 'update_action');
      updateActionHandler = updateActionCall![3];
    });

    it('should successfully update action title', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'Updated Title' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await updateActionHandler({
        action_id: 'action-id',
        title: 'Updated Title',
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        title: 'Updated Title',
      });

      expect(result.content[0].text).toContain('Updated action: Updated Title');
      expect(result.content[0].text).toContain('ID: action-id');
    });

    it('should update action description', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'Action Title', description: 'New description' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await updateActionHandler({
        action_id: 'action-id',
        description: 'New description',
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        description: 'New description',
      });
      expect(result.content[0].text).toContain('Updated action: Action Title');
    });

    it('should update action vision', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'Action Title', vision: 'New vision' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await updateActionHandler({
        action_id: 'action-id',
        vision: 'New vision',
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        vision: 'New vision',
      });
      expect(result.content[0].text).toContain('Updated action: Action Title');
    });

    it('should update multiple fields', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'New Title' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await updateActionHandler({
        action_id: 'action-id',
        title: 'New Title',
        description: 'New description',
        vision: 'New vision',
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        title: 'New Title',
        description: 'New description',
        vision: 'New vision',
      });
    });

    it('should return error when no fields provided', async () => {
      const result = await updateActionHandler({
        action_id: 'action-id',
      }, {});

      expect(result.content[0].text).toBe('Error: At least one field (title, description, or vision) must be provided');
      expect(mockActionsService.updateAction).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.updateAction.mockRejectedValue(new Error('Action not found'));

      const result = await updateActionHandler({
        action_id: 'action-id',
        title: 'New Title',
      }, {});

      expect(result.content[0].text).toBe('Error updating action: Action not found');
    });
  });

  describe('complete_action tool', () => {
    let completeActionHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const completeActionCall = mockServer.tool.mock.calls.find(call => call[0] === 'complete_action');
      completeActionHandler = completeActionCall![3];
    });

    it('should successfully complete action with all required fields', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'Completed Action' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await completeActionHandler({
        action_id: 'action-id',
        implementation_story: 'Implemented using React hooks and TypeScript',
        impact_story: 'Improved user experience by 50%',
        learning_story: 'Learned about performance optimization',
        changelog_visibility: 'team',
        headline: 'Revolutionary UI Update Boosts Performance',
        deck: 'A complete overhaul of the component architecture resulted in dramatic performance improvements.',
        pull_quotes: ['50% faster load times', 'React hooks simplified state management'],
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        done: true,
        completion_context: {
          implementation_story: 'Implemented using React hooks and TypeScript',
          impact_story: 'Improved user experience by 50%',
          learning_story: 'Learned about performance optimization',
          changelog_visibility: 'team',
          headline: 'Revolutionary UI Update Boosts Performance',
          deck: 'A complete overhaul of the component architecture resulted in dramatic performance improvements.',
          pull_quotes: ['50% faster load times', 'React hooks simplified state management'],
        }
      });

      expect(result.content[0].text).toContain('✅ Completed action: Completed Action');
      expect(result.content[0].text).toContain('ID: action-id');
      expect(result.content[0].text).toContain('📋 Completion Context Captured:');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.updateAction.mockRejectedValue(new Error('Action not found'));

      const result = await completeActionHandler({
        action_id: 'action-id',
        implementation_story: 'Test implementation',
        impact_story: 'Test impact',
        learning_story: 'Test learning',
        changelog_visibility: 'private',
        headline: 'Test Headline',
        deck: 'Test deck',
        pull_quotes: ['Quote 1'],
      }, {});

      expect(result.content[0].text).toBe('Error completing action: Action not found');
      expect(mockConsoleError).toHaveBeenCalledWith('Error completing action:', expect.any(Error));
    });
  });

  describe('uncomplete_action tool', () => {
    let uncompleteActionHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const uncompleteActionCall = mockServer.tool.mock.calls.find(call => call[0] === 'uncomplete_action');
      uncompleteActionHandler = uncompleteActionCall![3];
    });

    it('should successfully uncomplete action', async () => {
      const mockAction = {
        id: 'action-id',
        data: { title: 'Reopened Action' },
        updatedAt: '2023-01-01T00:00:00.000Z',
      };

      mockActionsService.updateAction.mockResolvedValue(mockAction);

      const result = await uncompleteActionHandler({
        action_id: 'action-id',
      }, {});

      expect(mockActionsService.updateAction).toHaveBeenCalledWith({
        action_id: 'action-id',
        done: false,
      });

      expect(result.content[0].text).toContain('🔄 Reopened action: Reopened Action');
      expect(result.content[0].text).toContain('Action is now available for further work');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.updateAction.mockRejectedValue(new Error('Action not found'));

      const result = await uncompleteActionHandler({
        action_id: 'action-id',
      }, {});

      expect(result.content[0].text).toBe('Error uncompleting action: Action not found');
    });
  });

  describe('join_family tool', () => {
    let joinFamilyHandler: Function;

    beforeEach(() => {
      registerTools(mockServer);
      const updateParentCall = mockServer.tool.mock.calls.find(call => call[0] === 'join_family');
      joinFamilyHandler = updateParentCall![3];
    });

    it('should successfully update parent to a new parent', async () => {
      const mockResult = {
        action_id: 'action-id',
        old_parent_id: 'old-parent',
        new_family_id: 'new-parent',
      };

      mockActionsService.updateFamily.mockResolvedValue(mockResult);

      const result = await joinFamilyHandler({
        action_id: 'action-id',
        new_family_id: 'new-parent',
      }, {});

      expect(mockActionsService.updateFamily).toHaveBeenCalledWith({
        action_id: 'action-id',
        new_family_id: 'new-parent',
      });

      expect(result.content[0].text).toContain('Updated family relationship for action: action-id');
      expect(result.content[0].text).toContain('Joined family: new-parent');
    });

    it('should successfully make action a root action', async () => {
      const mockResult = {
        action_id: 'action-id',
        old_parent_id: 'old-parent',
        new_family_id: undefined,
      };

      mockActionsService.updateFamily.mockResolvedValue(mockResult);

      const result = await joinFamilyHandler({
        action_id: 'action-id',
      }, {});

      expect(mockActionsService.updateFamily).toHaveBeenCalledWith({
        action_id: 'action-id',
        new_family_id: undefined,
      });

      expect(result.content[0].text).toContain('Action is now independent (no family)');
    });

    it('should handle errors gracefully', async () => {
      mockActionsService.updateFamily.mockRejectedValue(new Error('Circular reference'));

      const result = await joinFamilyHandler({
        action_id: 'action-id',
        new_family_id: 'new-parent',
      }, {});

      expect(result.content[0].text).toBe('Error updating family: Circular reference');
    });
  });
});