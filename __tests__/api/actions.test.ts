import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/actions/route";
import { ActionsService } from "../../lib/services/actions";

// Mock the ActionsService
jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    createAction: jest.fn(),
    listActions: jest.fn(),
  },
}));

const mockActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

describe("/api/actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/actions", () => {
    it("should create an action successfully", async () => {
      const mockResult = {
        action: {
          id: "test-id",
          data: { title: "Test Action" },
          done: false,
          version: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        dependencies_count: 0,
      };

      mockActionsService.createAction.mockResolvedValue(mockResult);

      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({ title: "Test Action" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockResult);
      expect(mockActionsService.createAction).toHaveBeenCalledWith({
        title: "Test Action",
      });
    });

    it("should create an action with parent and dependencies", async () => {
      const mockResult = {
        action: {
          id: "test-id",
          data: { title: "Child Action" },
          done: false,
          version: 1,
          createdAt: "2024-01-01T00:00:00.000Z",
          updatedAt: "2024-01-01T00:00:00.000Z",
        },
        parent_id: "parent-id",
        dependencies_count: 1,
      };

      mockActionsService.createAction.mockResolvedValue(mockResult);

      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({
          title: "Child Action",
          parent_id: "550e8400-e29b-41d4-a716-446655440000", // Valid UUID
          depends_on_ids: ["550e8400-e29b-41d4-a716-446655440001"], // Valid UUID
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockActionsService.createAction).toHaveBeenCalledWith({
        title: "Child Action",
        parent_id: "550e8400-e29b-41d4-a716-446655440000",
        depends_on_ids: ["550e8400-e29b-41d4-a716-446655440001"],
      });
    });

    it("should return 400 for invalid input", async () => {
      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({ title: "" }), // Empty title
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it("should return 400 for invalid UUID", async () => {
      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({
          title: "Test",
          parent_id: "invalid-uuid",
        }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle service errors", async () => {
      mockActionsService.createAction.mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: JSON.stringify({ title: "Test Action" }),
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Database error");
    });

    it("should handle malformed JSON", async () => {
      const request = new NextRequest("http://localhost/api/actions", {
        method: "POST",
        body: "invalid json",
        headers: { "Content-Type": "application/json" },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });
  });

  describe("GET /api/actions", () => {
    it("should list actions with default parameters", async () => {
      const mockActions = {
        actions: [
          {
            id: "1",
            data: { title: "Action 1" },
            done: false,
            version: 1,
            createdAt: "2024-01-01T00:00:00.000Z",
            updatedAt: "2024-01-01T00:00:00.000Z",
          },
        ],
        total: 1,
        limit: 20,
        offset: 0,
      };

      mockActionsService.listActions.mockResolvedValue(mockActions);

      const request = new NextRequest("http://localhost/api/actions?limit=20&offset=0");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockActions);
      expect(mockActionsService.listActions).toHaveBeenCalledWith({
        limit: 20,
        offset: 0,
        done: false,
      });
    });

    it("should list actions with custom parameters", async () => {
      const mockActions = {
        actions: [],
        total: 0,
        limit: 10,
        offset: 5,
        filtered_by_done: true,
      };

      mockActionsService.listActions.mockResolvedValue(mockActions);

      const request = new NextRequest(
        "http://localhost/api/actions?limit=10&offset=5&done=true"
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(mockActionsService.listActions).toHaveBeenCalledWith({
        limit: 10,
        offset: 5,
        done: true,
      });
    });

    it("should handle invalid limit parameter", async () => {
      const request = new NextRequest(
        "http://localhost/api/actions?limit=101" // Over max
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle invalid offset parameter", async () => {
      const request = new NextRequest(
        "http://localhost/api/actions?offset=-1" // Negative
      );

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
    });

    it("should handle service errors", async () => {
      mockActionsService.listActions.mockRejectedValue(
        new Error("Database error")
      );

      const request = new NextRequest("http://localhost/api/actions?limit=20&offset=0");

      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Database error");
    });
  });
});