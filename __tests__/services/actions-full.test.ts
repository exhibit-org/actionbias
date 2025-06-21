import { ActionsService } from "../../lib/services/actions";

// Mock the database adapter with proper drizzle ORM chaining
const createMutableQueryBuilder = (resolvedValue: any) => {
  const builder: any = {
    from: jest.fn(() => builder),
    where: jest.fn(() => builder),
    limit: jest.fn(() => builder),
    orderBy: jest.fn(() => Promise.resolve(resolvedValue)),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve), // Make it thenable
  };
  return builder;
};

const mockDb = {
  select: jest.fn(() => createMutableQueryBuilder([])),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

jest.mock("../../lib/db/adapter", () => ({
  getDb: () => mockDb,
}));

jest.mock("../../lib/db/init");

// Mock crypto.randomUUID
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: jest.fn(() => 'test-uuid-123'),
  },
});

describe("ActionsService - Full Coverage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createAction", () => {
    const mockAction = {
      id: 'test-uuid-123',
      data: { title: 'Test Action' },
      done: false,
      version: 1,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    beforeEach(() => {
      // Default successful action creation
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAction]),
        }),
      });
    });

    it("should create action with just title", async () => {
      const result = await ActionsService.createAction({ title: "Test Action" });
      
      expect(result.action.id).toBe('test-uuid-123');
      expect(result.dependencies_count).toBe(0);
      expect(result.parent_id).toBeUndefined();
    });

    it("should create action with title and vision", async () => {
      const result = await ActionsService.createAction({ 
        title: "Test Action", 
        vision: "Success is achieved when this action is complete" 
      });
      
      expect(result.action.id).toBe('test-uuid-123');
      expect(result.dependencies_count).toBe(0);
      expect(result.parent_id).toBeUndefined();
      // Verify that vision was included in the data
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        id: 'test-uuid-123',
        data: { title: "Test Action", vision: "Success is achieved when this action is complete" },
        title: "Test Action",
        description: undefined,
        vision: "Success is achieved when this action is complete",
      });
    });

    it("should create action with title and description", async () => {
      const result = await ActionsService.createAction({ 
        title: "Test Action", 
        description: "Follow steps 1-5 in the implementation guide" 
      });
      
      expect(result.action.id).toBe('test-uuid-123');
      expect(result.dependencies_count).toBe(0);
      expect(result.parent_id).toBeUndefined();
      // Verify that description was included in the data
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        id: 'test-uuid-123',
        data: { title: "Test Action", description: "Follow steps 1-5 in the implementation guide" },
        title: "Test Action",
        description: "Follow steps 1-5 in the implementation guide",
        vision: undefined,
      });
    });

    it("should create action with all metadata fields", async () => {
      const result = await ActionsService.createAction({ 
        title: "Complete Task", 
        description: "Execute according to the project plan",
        vision: "Task is fully complete and reviewed" 
      });
      
      expect(result.action.id).toBe('test-uuid-123');
      expect(result.dependencies_count).toBe(0);
      expect(result.parent_id).toBeUndefined();
      // Verify that all fields were included in the data
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        id: 'test-uuid-123',
        data: {
          title: "Complete Task",
          description: "Execute according to the project plan",
          vision: "Task is fully complete and reviewed"
        },
        title: "Complete Task",
        description: "Execute according to the project plan",
        vision: "Task is fully complete and reviewed",
      });
    });

    it("should create action with parent", async () => {
      // Mock parent exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'parent-id' }]),
          }),
        }),
      });

      const result = await ActionsService.createAction({
        title: "Child Action",
        parent_id: "parent-id"
      });

      expect(result.parent_id).toBe("parent-id");
      expect(mockDb.insert).toHaveBeenCalledTimes(2); // action + edge
    });

    it("should create action with dependencies", async () => {
      // Mock dependencies exist
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{ id: 'dep-id' }]),
          }),
        }),
      });

      const result = await ActionsService.createAction({
        title: "Dependent Action",
        depends_on_ids: ["dep-1", "dep-2"]
      });

      expect(result.dependencies_count).toBe(2);
      expect(mockDb.insert).toHaveBeenCalledTimes(3); // action + 2 edges
    });

    it("should throw error if parent not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.createAction({
        title: "Child Action",
        parent_id: "non-existent"
      })).rejects.toThrow("Parent action with ID non-existent not found");
    });

    it("should throw error if dependency not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.createAction({
        title: "Dependent Action", 
        depends_on_ids: ["non-existent"]
      })).rejects.toThrow("Dependency action with ID non-existent not found");
    });
  });

  describe("listActions", () => {
    const mockActions = [
      { id: '1', data: { title: 'Action 1' }, done: false },
      { id: '2', data: { title: 'Action 2' }, done: true },
    ];

    it("should list actions with defaults", async () => {
      const mockQuery = {
        limit: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockActions),
          }),
        }),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await ActionsService.listActions();
      expect(result).toEqual(mockActions);
    });

    it("should list actions with custom params", async () => {
      const mockQuery = {
        limit: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockActions),
          }),
        }),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await ActionsService.listActions({ limit: 5, offset: 10 });
      expect(result).toEqual(mockActions);
    });

    it("should filter by done status", async () => {
      const whereQuery = {
        limit: jest.fn().mockReturnValue({
          offset: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue([mockActions[1]]),
          }),
        }),
      };

      const mockQuery = {
        where: jest.fn().mockReturnValue(whereQuery),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue(mockQuery),
      });

      const result = await ActionsService.listActions({ done: true });
      expect(result).toEqual([mockActions[1]]);
    });
  });

  describe("addChildAction", () => {
    const mockParent = { id: 'parent-id', data: { title: 'Parent' } };
    const mockChild = { id: 'child-id', data: { title: 'Child' } };
    const mockEdge = { src: 'parent-id', dst: 'child-id', kind: 'child' };

    it("should add child action successfully", async () => {
      // Mock parent exists
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([mockParent]),
          }),
        }),
      });

      // Mock action creation
      mockDb.insert
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockChild]),
          }),
        })
        .mockReturnValueOnce({
          values: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([mockEdge]),
          }),
        });

      const result = await ActionsService.addChildAction({
        title: "Child Action",
        parent_id: "parent-id"
      });

      expect(result.action.id).toBe('child-id');
      expect(result.parent.id).toBe('parent-id');
      expect(result.edge.src).toBe('parent-id');
    });

    it("should throw error if parent not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.addChildAction({
        title: "Child Action",
        parent_id: "non-existent"
      })).rejects.toThrow("Parent action with ID non-existent not found");
    });
  });

  describe("addDependency", () => {
    it("should add dependency edge", async () => {
      const mockEdge = { src: 'dep-id', dst: 'action-id', kind: 'depends_on' };
      
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockEdge]),
        }),
      });

      const result = await ActionsService.addDependency({
        action_id: "action-id",
        depends_on_id: "dep-id"
      });

      expect(result.src).toBe('dep-id');
      expect(result.dst).toBe('action-id');
    });
  });

  describe("deleteAction", () => {
    const mockAction = { id: 'action-id', data: { title: 'To Delete' } };

    beforeEach(() => {
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAction]),
        }),
      });
    });

    it("should delete action with reparent default handling", async () => {
      // Mock action exists
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]), // No children
          }),
        });

      const result = await ActionsService.deleteAction({ action_id: "action-id" });

      expect(result.deleted_action.id).toBe('action-id');
      expect(result.child_handling).toBe("reparent");
      expect(result.children_count).toBe(0);
    });

    it("should delete action with children using reparent", async () => {
      const childEdge = { src: 'action-id', dst: 'child-id', kind: 'child' };
      const newParent = { id: 'new-parent-id', data: { title: 'New Parent' } };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([childEdge]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([newParent]),
            }),
          }),
        });

      mockDb.insert.mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });

      const result = await ActionsService.deleteAction({
        action_id: "action-id",
        child_handling: "reparent",
        new_parent_id: "new-parent-id"
      });

      expect(result.child_handling).toBe("reparent");
      expect(result.children_count).toBe(1);
    });

    it("should delete action with recursive deletion", async () => {
      const childEdge = { src: 'action-id', dst: 'child-id', kind: 'child' };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([childEdge]),
          }),
        })
        // Mock getAllDescendants queries
        .mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([]),
          }),
        });

      const result = await ActionsService.deleteAction({
        action_id: "action-id",
        child_handling: "delete_recursive"
      });

      expect(result.child_handling).toBe("delete_recursive");
    });

    it("should throw error if action not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.deleteAction({
        action_id: "non-existent"
      })).rejects.toThrow("Action with ID non-existent not found");
    });

    it("should throw error for reparent without new_parent_id", async () => {
      const childEdge = { src: 'action-id', dst: 'child-id', kind: 'child' };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([childEdge]),
          }),
        });

      await expect(ActionsService.deleteAction({
        action_id: "action-id",
        child_handling: "reparent"
      })).rejects.toThrow("new_parent_id is required when child_handling is 'reparent'");
    });

    it("should throw error if new parent not found during reparent", async () => {
      const childEdge = { src: 'action-id', dst: 'child-id', kind: 'child' };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([childEdge]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      await expect(ActionsService.deleteAction({
        action_id: "action-id",
        child_handling: "reparent",
        new_parent_id: "non-existent"
      })).rejects.toThrow("New parent action with ID non-existent not found");
    });

    it("should handle root-level parent deletion with reparent correctly", async () => {
      // Test scenario: Delete a root-level action with children, but since it's root-level,
      // children should be handled without creating invalid parent connections
      const rootAction = { id: 'root-id', data: { title: 'Root Action' } };
      const childEdge = { src: 'root-id', dst: 'child-id', kind: 'child' };

      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([rootAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([childEdge]), // Has children
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{ id: 'new-parent-id', data: { title: 'New Parent' } }]),
            }),
          }),
        });

      // Mock the edge insertion for reparenting
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ src: 'new-parent-id', dst: 'child-id', kind: 'child' }]),
        }),
      });

      // Mock the delete operation to return the correct action
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([rootAction]),
        }),
      });

      const result = await ActionsService.deleteAction({
        action_id: "root-id",
        child_handling: "reparent",
        new_parent_id: "new-parent-id"
      });

      expect(result.deleted_action.id).toBe('root-id');
      expect(result.children_count).toBe(1);
      expect(result.child_handling).toBe("reparent");
      expect(result.new_parent_id).toBe("new-parent-id");

      // Verify that new parent-child relationship was created
      expect(mockDb.insert).toHaveBeenCalledWith(expect.any(Object)); // edges table
      expect(mockDb.insert().values).toHaveBeenCalledWith({
        src: 'new-parent-id',
        dst: 'child-id',
        kind: 'child',
      });
    });

    it("should ensure all edges are deleted in recursive deletion", async () => {
      // Test scenario: Delete an action with descendants recursively,
      // ensuring no orphaned edges remain
      const parentAction = { id: 'parent-id', data: { title: 'Parent Action' } };
      const childEdges = [
        { src: 'parent-id', dst: 'child-1-id', kind: 'child' },
        { src: 'parent-id', dst: 'child-2-id', kind: 'child' }
      ];
      
      // Mock finding the parent action
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([parentAction]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue(childEdges), // Has children
          }),
        })
        // Mock getAllDescendants queries - simulate finding grandchildren
        .mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              { src: 'child-1-id', dst: 'grandchild-1-id', kind: 'child' },
              { src: 'child-2-id', dst: 'grandchild-2-id', kind: 'child' }
            ]),
          }),
        });

      // Mock the delete operation to return the correct action
      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([parentAction]),
        }),
      });

      const result = await ActionsService.deleteAction({
        action_id: "parent-id",
        child_handling: "delete_recursive"
      });

      expect(result.deleted_action.id).toBe('parent-id');
      expect(result.children_count).toBe(2);
      expect(result.child_handling).toBe("delete_recursive");

      // Verify that descendant actions are deleted
      // The delete should be called for each descendant (child-1-id, child-2-id, grandchild-1-id, grandchild-2-id)
      // Plus the main action itself
      expect(mockDb.delete).toHaveBeenCalledTimes(5); // 4 descendants + 1 main action
      
      // Verify the main action deletion (this happens last)
      const lastDeleteCall = mockDb.delete.mock.calls[mockDb.delete.mock.calls.length - 1];
      expect(lastDeleteCall).toBeDefined(); // Verify delete was called
    });
  });

  describe("removeDependency", () => {
    const action1 = { id: 'action-1', data: { title: 'Action 1' } };
    const action2 = { id: 'action-2', data: { title: 'Action 2' } };
    const depEdge = { src: 'action-2', dst: 'action-1', kind: 'depends_on' };

    it("should remove dependency successfully", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([action1]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([action2]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([depEdge]),
            }),
          }),
        });

      mockDb.delete.mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([depEdge]),
        }),
      });

      const result = await ActionsService.removeDependency({
        action_id: "action-1",
        depends_on_id: "action-2"
      });

      expect(result.action.id).toBe('action-1');
      expect(result.depends_on.id).toBe('action-2');
    });

    it("should throw error if action not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.removeDependency({
        action_id: "non-existent",
        depends_on_id: "action-2"
      })).rejects.toThrow("Action with ID non-existent not found");
    });

    it("should throw error if dependency action not found", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([action1]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      await expect(ActionsService.removeDependency({
        action_id: "action-1",
        depends_on_id: "non-existent"
      })).rejects.toThrow("Dependency action with ID non-existent not found");
    });

    it("should throw error if no dependency exists", async () => {
      mockDb.select
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([action1]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([action2]),
            }),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      await expect(ActionsService.removeDependency({
        action_id: "action-1",
        depends_on_id: "action-2"
      })).rejects.toThrow("No dependency found: Action 1 does not depend on Action 2");
    });
  });

  describe("updateAction", () => {
    const existingAction = { id: 'action-id', data: { title: 'Old Title' }, done: false };
    const updatedAction = { id: 'action-id', data: { title: 'New Title' }, done: true };

    it("should update action title", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAction]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAction]),
          }),
        }),
      });

      const result = await ActionsService.updateAction({
        action_id: "action-id",
        title: "New Title"
      });

      expect(result.data.title).toBe('New Title');
    });

    it("should update action done status", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAction]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAction]),
          }),
        }),
      });

      const result = await ActionsService.updateAction({
        action_id: "action-id",
        done: true
      });

      expect(result.done).toBe(true);
    });

    it("should update both title and done", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAction]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAction]),
          }),
        }),
      });

      const result = await ActionsService.updateAction({
        action_id: "action-id",
        title: "New Title",
        done: true
      });

      expect(result.data.title).toBe('New Title');
      expect(result.done).toBe(true);
    });

    it("should throw error if action not found", async () => {
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });

      await expect(ActionsService.updateAction({
        action_id: "non-existent",
        title: "New Title"
      })).rejects.toThrow("Action with ID non-existent not found");
    });

    it("should throw error if no fields provided", async () => {
      await expect(ActionsService.updateAction({
        action_id: "action-id"
      })).rejects.toThrow("At least one field (title, description, vision, or done) must be provided");
    });

    it("should update action vision", async () => {
      const existingAction = { id: 'action-id', data: { title: 'Old Title' }, done: false };
      const updatedAction = { id: 'action-id', data: { title: 'Old Title', vision: 'New vision' }, done: false };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAction]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAction]),
          }),
        }),
      });

      const result = await ActionsService.updateAction({
        action_id: "action-id",
        vision: "New vision"
      });

      expect(result.data.vision).toBe('New vision');
      expect(result.data.title).toBe('Old Title'); // Should preserve existing title
    });

    it("should update action description", async () => {
      const existingAction = { id: 'action-id', data: { title: 'Old Title', vision: 'Old Vision' }, done: false };
      const updatedAction = { id: 'action-id', data: { title: 'Old Title', description: 'New description', vision: 'Old Vision' }, done: false };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([existingAction]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedAction]),
          }),
        }),
      });

      const result = await ActionsService.updateAction({
        action_id: "action-id",
        description: "New description"
      });

      expect(result.data.description).toBe('New description');
      expect(result.data.title).toBe('Old Title'); // Should preserve existing title
      expect(result.data.vision).toBe('Old Vision'); // Should preserve existing vision
    });
  });

  describe("resource methods", () => {
    describe("getActionListResource", () => {
      const mockActions = [
        {
          id: '1',
          data: { title: 'Action 1' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        }
      ];

      it("should return action list resource with count", async () => {
        // Mock count query - needs to return the result directly, not wrapped in a query chain
        mockDb.select
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue([{ count: 5 }]),
          })
          .mockReturnValueOnce({
            from: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue(mockActions),
                }),
              }),
            }),
          });

        const result = await ActionsService.getActionListResource({ includeCompleted: true });
        
        expect(result.actions).toHaveLength(1);
        expect(result.total).toBe(5);
        expect(result.offset).toBe(0);
        expect(result.limit).toBe(20);
      });

      it("should include done filter when specified", async () => {
        mockDb.select
          .mockReturnValueOnce({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ count: 3 }]),
            }),
          })
          .mockReturnValueOnce({
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockResolvedValue(mockActions),
                  }),
                }),
              }),
            }),
          });

        const result = await ActionsService.getActionListResource({ done: true });
        
        expect(result.filtered_by_done).toBe(true);
      });

      it("should handle custom pagination", async () => {
        mockDb.select
          .mockReturnValueOnce({
            from: jest.fn().mockResolvedValue([{ count: 100 }]),
          })
          .mockReturnValueOnce({
            from: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockReturnValue({
                  orderBy: jest.fn().mockResolvedValue(mockActions),
                }),
              }),
            }),
          });

        const result = await ActionsService.getActionListResource({ limit: 10, offset: 20, includeCompleted: true });
        
        expect(result.offset).toBe(20);
        expect(result.limit).toBe(10);
      });
    });

    describe("getActionTreeResource", () => {
      const mockActions = [
        { id: '1', data: { title: 'Root Action' }, done: false, createdAt: new Date('2023-01-01') },
        { id: '2', data: { title: 'Child Action' }, done: false, createdAt: new Date('2023-01-02') },
      ];
      
      const mockEdges = [
        { src: '1', dst: '2', kind: 'child' }
      ];

      const mockDependencyEdges = [
        { src: '1', dst: '2', kind: 'depends_on' }
      ];

      it("should return hierarchical tree structure", async () => {
        // Mock for the action query
        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder(mockActions))
          .mockReturnValueOnce(createMutableQueryBuilder(mockEdges))
          .mockReturnValueOnce(createMutableQueryBuilder(mockDependencyEdges));

        const result = await ActionsService.getActionTreeResource();
        
        expect(result.rootActions).toBeDefined();
        expect(result.rootActions).toHaveLength(1);
        expect(result.rootActions[0].id).toBe('1');
        expect(result.rootActions[0].children).toHaveLength(1);
        expect(result.rootActions[0].children[0].id).toBe('2');
      });
    });

    describe("getActionDependenciesResource", () => {
      const mockActions = [
        { id: '1', data: { title: 'Action 1' }, done: false },
        { id: '2', data: { title: 'Action 2' }, done: true },
      ];

      const mockDependencyEdges = [
        { src: '1', dst: '2', kind: 'depends_on' }
      ];

      it("should return dependency mapping", async () => {
        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder(mockActions))
          .mockReturnValueOnce(createMutableQueryBuilder(mockDependencyEdges));

        const result = await ActionsService.getActionDependenciesResource(true);
        
        expect(result.dependencies).toHaveLength(2);
        expect(result.dependencies[0].action_id).toBe('1');
        expect(result.dependencies[1].action_id).toBe('2');
        expect(result.dependencies[1].depends_on).toHaveLength(1);
        expect(result.dependencies[0].dependents).toHaveLength(1);
      });
    });

    describe("getActionDetailResource", () => {
      const mockAction = { 
        id: 'action-id', 
        data: { title: 'Test Action' }, 
        done: false,
        version: 1,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      it("should return detailed action information", async () => {
        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([mockAction]))
          .mockReturnValue(createMutableQueryBuilder([]));

        const result = await ActionsService.getActionDetailResource('action-id');
        
        expect(result.id).toBe('action-id');
        expect(result.title).toBe('Test Action');
        expect(result.description).toBeUndefined();
        expect(result.vision).toBeUndefined();
        expect(result.done).toBe(false);
        expect(result.parent_chain).toEqual([]);
        expect(result.children).toEqual([]);
        expect(result.dependencies).toEqual([]);
        expect(result.dependents).toEqual([]);
      });

      it("should throw error if action not found", async () => {
        mockDb.select.mockReturnValue(createMutableQueryBuilder([]));

        await expect(ActionsService.getActionDetailResource('non-existent'))
          .rejects.toThrow("Action with ID non-existent not found");
      });

      it("should include parent_id and parent_chain when parent exists", async () => {
        const parentEdge = { src: 'parent-id', dst: 'action-id', kind: 'child' };
        const parentAction = {
          id: 'parent-id',
          data: { title: 'Parent Action', description: 'Parent desc' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };

        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([mockAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([parentEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([parentAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          .mockReturnValue(createMutableQueryBuilder([]));

        const result = await ActionsService.getActionDetailResource('action-id');
        
        expect(result.parent_id).toBe('parent-id');
        expect(result.parent_chain).toHaveLength(1);
        expect(result.parent_chain[0]).toEqual({
          id: 'parent-id',
          title: 'Parent Action',
          description: 'Parent desc',
          vision: undefined,
          done: false,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        });
      });

      it("should build complete parent chain with multiple levels", async () => {
        const parentEdge = { src: 'parent-id', dst: 'action-id', kind: 'child' };
        const grandparentEdge = { src: 'grandparent-id', dst: 'parent-id', kind: 'child' };
        
        const parentAction = {
          id: 'parent-id',
          data: { title: 'Parent Action' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };
        
        const grandparentAction = {
          id: 'grandparent-id',
          data: { title: 'Grandparent Action', vision: 'Grand vision' },
          done: true,
          version: 2,
          createdAt: new Date('2022-12-01'),
          updatedAt: new Date('2022-12-01'),
        };

        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([mockAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([parentEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([parentAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([grandparentEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([grandparentAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          .mockReturnValue(createMutableQueryBuilder([]));

        const result = await ActionsService.getActionDetailResource('action-id');
        
        expect(result.parent_chain).toHaveLength(2);
        expect(result.parent_chain[0]).toEqual({
          id: 'grandparent-id',
          title: 'Grandparent Action',
          description: undefined,
          vision: 'Grand vision',
          done: true,
          version: 2,
          created_at: '2022-12-01T00:00:00.000Z',
          updated_at: '2022-12-01T00:00:00.000Z',
        });
        expect(result.parent_chain[1]).toEqual({
          id: 'parent-id',
          title: 'Parent Action',
          description: undefined,
          vision: undefined,
          done: false,
          version: 1,
          created_at: '2023-01-01T00:00:00.000Z',
          updated_at: '2023-01-01T00:00:00.000Z',
        });
      });

      it("should include children when they exist", async () => {
        const childEdge = { src: 'action-id', dst: 'child-id', kind: 'child' };
        const childAction = { 
          id: 'child-id', 
          data: { title: 'Child' }, 
          done: false, 
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };

        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([mockAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          .mockReturnValueOnce(createMutableQueryBuilder([childEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([childAction]))
          .mockReturnValue(createMutableQueryBuilder([]));

        const result = await ActionsService.getActionDetailResource('action-id');
        
        expect(result.children).toHaveLength(1);
        expect(result.children[0].id).toBe('child-id');
      });

      it("should include dependencies and dependents", async () => {
        const depEdge = { src: 'dep-id', dst: 'action-id', kind: 'depends_on' };
        const dependentEdge = { src: 'action-id', dst: 'dependent-id', kind: 'depends_on' };
        const depAction = { 
          id: 'dep-id', 
          data: { title: 'Dependency' }, 
          done: true, 
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };
        const dependentAction = { 
          id: 'dependent-id', 
          data: { title: 'Dependent' }, 
          done: false, 
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };

        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([mockAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          .mockReturnValueOnce(createMutableQueryBuilder([depEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([depAction]))
          .mockReturnValueOnce(createMutableQueryBuilder([dependentEdge]))
          .mockReturnValueOnce(createMutableQueryBuilder([dependentAction]));

        const result = await ActionsService.getActionDetailResource('action-id');
        
        expect(result.dependencies).toHaveLength(1);
        expect(result.dependencies[0].id).toBe('dep-id');
        expect(result.dependents).toHaveLength(1);
        expect(result.dependents[0].id).toBe('dependent-id');
      });
    });

    describe("getNextAction", () => {
      it("should return null when no open actions", async () => {
        mockDb.select.mockReturnValue(createMutableQueryBuilder([]));

        const result = await ActionsService.getNextAction();
        expect(result).toBeNull();
      });

      it("should return next action when available", async () => {
        const openAction = {
          id: 'next-action',
          data: { title: 'Next Action' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };

        // Mock open actions
        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([openAction]))
          // Mock dependenciesMet check - no dependencies
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          // Mock findNextActionInChildren - no children
          .mockReturnValueOnce(createMutableQueryBuilder([]));

        const result = await ActionsService.getNextAction();
        
        expect(result?.id).toBe('next-action');
        expect(result?.data.title).toBe('Next Action');
      });

      it("should skip actions with unmet dependencies", async () => {
        const blockedAction = {
          id: 'blocked-action',
          data: { title: 'Blocked Action' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        };

        const openAction = {
          id: 'open-action',
          data: { title: 'Open Action' },
          done: false,
          version: 1,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        };

        const unmetDependency = {
          id: 'unmet-dep',
          data: { title: 'Unmet Dependency' },
          done: false, // Not completed
        };

        // Mock open actions
        mockDb.select
          .mockReturnValueOnce(createMutableQueryBuilder([blockedAction, openAction]))
          // Mock first action has dependencies
          .mockReturnValueOnce(createMutableQueryBuilder([{ src: 'unmet-dep', dst: 'blocked-action' }]))
          // Mock dependency is not done
          .mockReturnValueOnce(createMutableQueryBuilder([unmetDependency]))
          // Mock second action has no dependencies
          .mockReturnValueOnce(createMutableQueryBuilder([]))
          // Mock findNextActionInChildren for second action
          .mockReturnValueOnce(createMutableQueryBuilder([]));

        const result = await ActionsService.getNextAction();
        
        expect(result?.id).toBe('open-action');
      });
    });
  });
});