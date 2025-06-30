import { ContextService } from "../../lib/services/context";
import { getDb } from "../../lib/db/adapter";
import { actions, edges } from "../../db/schema";

// Mock the database
jest.mock("../../lib/db/adapter");

describe("ContextService", () => {
  const mockDb = {
    select: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getDb as jest.Mock).mockReturnValue(mockDb);
  });

  describe("getActionContext", () => {
    it("should return enhanced context with relationships and flags", async () => {
      // Mock action data
      const mockAction = {
        id: "action-1",
        title: "Test Action",
        description: "Test Description", 
        vision: "Test Vision",
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        data: { title: "Test Action" }
      };

      const mockParent = {
        id: "parent-1",
        title: "Parent Action",
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        data: { title: "Parent Action" }
      };

      const mockChild = {
        id: "child-1", 
        title: "Child Action",
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        data: { title: "Child Action" }
      };

      const mockSibling = {
        id: "sibling-1",
        title: "Sibling Action", 
        done: false,
        version: 1,
        createdAt: new Date("2023-01-01"),
        updatedAt: new Date("2023-01-01"),
        data: { title: "Sibling Action" }
      };

      // Mock database queries
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        map: jest.fn().mockReturnThis(),
        filter: jest.fn().mockReturnThis(),
      };

      mockDb.select.mockReturnValue(mockSelect);

      // Setup different return values for different queries
      mockSelect.from.mockImplementation((table) => {
        if (table === actions) {
          return {
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([mockAction])
            })
          };
        }
        if (table === edges) {
          return {
            where: jest.fn().mockImplementation((condition) => {
              // Mock different edge queries based on condition
              // Parent edge query
              if (condition.toString().includes('family')) {
                return Promise.resolve([{ src: "parent-1", dst: "action-1", kind: "family" }]);
              }
              // Return empty for other queries to simplify test
              return Promise.resolve([]);
            })
          };
        }
        return mockSelect;
      });

      const result = await ContextService.getActionContext("action-1");

      expect(result).toHaveProperty("action");
      expect(result).toHaveProperty("relationships");
      expect(result).toHaveProperty("relationship_flags");
      expect(result.action.id).toBe("action-1");
      expect(result.relationships).toHaveProperty("ancestors");
      expect(result.relationships).toHaveProperty("children");
      expect(result.relationships).toHaveProperty("dependencies");
      expect(result.relationships).toHaveProperty("dependents");
      expect(result.relationships).toHaveProperty("siblings");
    });

    it("should throw error if action not found", async () => {
      const mockSelect = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]) // Empty result
          })
        })
      };

      mockDb.select.mockReturnValue(mockSelect);

      await expect(ContextService.getActionContext("non-existent")).rejects.toThrow(
        "Action with ID non-existent not found"
      );
    });
  });
});