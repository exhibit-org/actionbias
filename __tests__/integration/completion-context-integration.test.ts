import { ActionsService } from "../../lib/services/actions";
import { CompletionContextService } from "../../lib/services/completion-context";
import { getDb } from "../../lib/db/adapter";
import { actions, edges, completionContexts } from "../../db/schema";

// Mock dependencies
jest.mock("../../lib/db/adapter");
jest.mock("../../lib/db/init");
jest.mock("../../lib/services/analysis");
jest.mock("../../lib/services/placement");
jest.mock("../../lib/services/embeddings");
jest.mock("../../lib/services/vector");
jest.mock("../../lib/services/summary");
jest.mock("../../lib/services/subtree-summary");
jest.mock("../../lib/services/parent-summary");
jest.mock("../../lib/services/completion-context");

// Create a more sophisticated mock that handles Drizzle ORM chaining
const createQueryChain = (resolvedValue: any) => {
  const chain: any = {
    from: jest.fn(() => chain),
    where: jest.fn(() => chain),
    limit: jest.fn(() => Promise.resolve(resolvedValue)),
    innerJoin: jest.fn(() => chain),
    orderBy: jest.fn(() => Promise.resolve(resolvedValue)),
    then: (resolve: any) => Promise.resolve(resolvedValue).then(resolve),
  };
  return chain;
};

const mockDb = {
  select: jest.fn(() => createQueryChain([])),
  insert: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;
mockGetDb.mockReturnValue(mockDb as any);

describe("Completion Context Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getActionDetailResource with completion context", () => {
    it("should include completion context from dependencies", async () => {
      const actionId = "test-action-123";
      const dependencyId = "dependency-456";
      
      // Mock action data
      const mockAction = {
        id: actionId,
        data: { title: "Test Action" },
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      // Mock dependency edge
      const mockDependencyEdge = {
        src: dependencyId,
        dst: actionId,
        kind: "depends_on",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      // Mock completion context data
      const mockCompletionContext = {
        actionId: dependencyId,
        implementationStory: "Used React hooks for state management",
        impactStory: "Improved component reusability by 50%",
        learningStory: "Learned that custom hooks reduce code duplication",
        changelogVisibility: "team" as const,
        completionTimestamp: new Date("2023-01-01"),
        actionTitle: "Setup React Components",
      };

      // Setup mocks for database queries
      mockDb.select.mockImplementation(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([mockAction])),
          })),
        })),
      }));

      // Mock dependency edges query
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockDependencyEdge])),
        })),
      }));

      // Mock completion context query
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => Promise.resolve([mockCompletionContext])),
            })),
          })),
        })),
      }));

      // Setup other required mocks for empty results
      mockDb.select.mockImplementation(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await ActionsService.getActionDetailResource(actionId);

      expect(result).toBeDefined();
      expect(result.dependency_completion_context).toBeDefined();
      expect(result.dependency_completion_context).toHaveLength(1);
      expect(result.dependency_completion_context[0]).toMatchObject({
        action_id: dependencyId,
        action_title: "Setup React Components",
        implementation_story: "Used React hooks for state management",
        impact_story: "Improved component reusability by 50%",
        learning_story: "Learned that custom hooks reduce code duplication",
        changelog_visibility: "team",
      });
    });

    it("should handle actions with no dependencies", async () => {
      const actionId = "test-action-no-deps";
      
      const mockAction = {
        id: actionId,
        data: { title: "Independent Action" },
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      // Mock empty dependencies
      mockDb.select.mockImplementation(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
          limit: jest.fn(() => Promise.resolve([mockAction])),
        })),
      }));

      const result = await ActionsService.getActionDetailResource(actionId);

      expect(result).toBeDefined();
      expect(result.dependency_completion_context).toBeDefined();
      expect(result.dependency_completion_context).toHaveLength(0);
    });

    it("should handle dependencies without completion context", async () => {
      const actionId = "test-action-123";
      const dependencyId = "dependency-no-context";
      
      const mockAction = {
        id: actionId,
        data: { title: "Test Action" },
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      const mockDependencyEdge = {
        src: dependencyId,
        dst: actionId,
        kind: "depends_on",
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      // Setup mocks - action exists, dependency exists, but no completion context
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([mockAction])),
          })),
        })),
      }));

      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([mockDependencyEdge])),
        })),
      }));

      // Empty completion context
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      }));

      // Other empty results
      mockDb.select.mockImplementation(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await ActionsService.getActionDetailResource(actionId);

      expect(result).toBeDefined();
      expect(result.dependency_completion_context).toBeDefined();
      expect(result.dependency_completion_context).toHaveLength(0);
    });

    it("should order completion context by completion timestamp", async () => {
      const actionId = "test-action-123";
      const dependency1Id = "dependency-1";
      const dependency2Id = "dependency-2";
      
      const mockAction = {
        id: actionId,
        data: { title: "Test Action" },
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
      };

      const mockDependencyEdges = [
        {
          src: dependency1Id,
          dst: actionId,
          kind: "depends_on",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
        {
          src: dependency2Id,
          dst: actionId,
          kind: "depends_on",
          createdAt: new Date("2023-01-01"),
          updatedAt: new Date("2023-01-01"),
        },
      ];

      // Mock completion contexts (ordered by timestamp)
      const mockCompletionContexts = [
        {
          actionId: dependency1Id,
          implementationStory: "First implementation",
          impactStory: "First impact",
          learningStory: "First learning",
          changelogVisibility: "team" as const,
          completionTimestamp: new Date("2023-01-01"),
          actionTitle: "First Dependency",
        },
        {
          actionId: dependency2Id,
          implementationStory: "Second implementation",
          impactStory: "Second impact",
          learningStory: "Second learning",
          changelogVisibility: "public" as const,
          completionTimestamp: new Date("2023-01-02"),
          actionTitle: "Second Dependency",
        },
      ];

      // Setup database mocks
      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([mockAction])),
          })),
        })),
      }));

      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve(mockDependencyEdges)),
        })),
      }));

      mockDb.select.mockImplementationOnce(() => ({
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              orderBy: jest.fn(() => Promise.resolve(mockCompletionContexts)),
            })),
          })),
        })),
      }));

      // Other empty results
      mockDb.select.mockImplementation(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => Promise.resolve([])),
        })),
      }));

      const result = await ActionsService.getActionDetailResource(actionId);

      expect(result).toBeDefined();
      expect(result.dependency_completion_context).toHaveLength(2);
      
      // Verify ordering by timestamp (earliest first)
      expect(result.dependency_completion_context[0].action_title).toBe("First Dependency");
      expect(result.dependency_completion_context[1].action_title).toBe("Second Dependency");
    });
  });
});