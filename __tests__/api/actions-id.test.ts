import { NextRequest } from "next/server";
import { PUT, DELETE } from "../../app/api/actions/[id]/route";
import { ActionsService } from "../../lib/services/actions";

// Mock the ActionsService
jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    updateAction: jest.fn(),
    deleteAction: jest.fn(),
  },
}));

const mockedActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

describe("/api/actions/[id] API Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("PUT /api/actions/[id]", () => {
    it("should update action successfully", async () => {
      const mockUpdatedAction = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        data: { title: "Updated Action" },
        done: false,
        version: 1,
        createdAt: "2025-06-13T16:53:31.050Z",
        updatedAt: "2025-06-13T16:53:31.050Z",
      };

      mockedActionsService.updateAction.mockResolvedValue(mockUpdatedAction);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Action",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockUpdatedAction);
      expect(mockedActionsService.updateAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated Action",
      });
    });

    it("should handle validation errors", async () => {
      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "PUT",
        body: JSON.stringify({}), // Empty body should fail validation
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("At least one field");
    });

    it("should handle service errors", async () => {
      mockedActionsService.updateAction.mockRejectedValue(new Error("Service error"));

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Action",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Service error");
    });

    it("should update action with description and vision", async () => {
      const mockUpdatedAction = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        data: { 
          title: "Updated Action",
          description: "New description",
          vision: "New vision"
        },
        done: false,
        version: 1,
        createdAt: "2025-06-13T16:53:31.050Z",
        updatedAt: "2025-06-13T16:53:31.050Z",
      };

      mockedActionsService.updateAction.mockResolvedValue(mockUpdatedAction);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "PUT",
        body: JSON.stringify({
          title: "Updated Action",
          description: "New description",
          vision: "New vision",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await PUT(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockedActionsService.updateAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        title: "Updated Action",
        description: "New description",
        vision: "New vision",
      });
    });
  });

  describe("DELETE /api/actions/[id]", () => {
    it("should delete action successfully with default child_handling", async () => {
      const mockDeleteResult = {
        deleted_action: { id: "550e8400-e29b-41d4-a716-446655440000", data: { title: "Deleted Action" } },
        children_count: 0,
        child_handling: "reparent" as const,
      };

      mockedActionsService.deleteAction.mockResolvedValue(mockDeleteResult);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDeleteResult);
      expect(mockedActionsService.deleteAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        child_handling: "reparent",
      });
    });

    it("should delete action with recursive child_handling", async () => {
      const mockDeleteResult = {
        deleted_action: { id: "550e8400-e29b-41d4-a716-446655440000", data: { title: "Deleted Action" } },
        children_count: 2,
        child_handling: "delete_recursive" as const,
      };

      mockedActionsService.deleteAction.mockResolvedValue(mockDeleteResult);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({
          child_handling: "delete_recursive",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDeleteResult);
      expect(mockedActionsService.deleteAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        child_handling: "delete_recursive",
      });
    });

    it("should delete action with reparent and new_parent_id", async () => {
      const mockDeleteResult = {
        deleted_action: { id: "550e8400-e29b-41d4-a716-446655440000", data: { title: "Deleted Action" } },
        children_count: 1,
        child_handling: "reparent" as const,
        new_parent_id: "550e8400-e29b-41d4-a716-446655440000",
      };

      mockedActionsService.deleteAction.mockResolvedValue(mockDeleteResult);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({
          child_handling: "reparent",
          new_parent_id: "550e8400-e29b-41d4-a716-446655440000",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toEqual(mockDeleteResult);
      expect(mockedActionsService.deleteAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        child_handling: "reparent",
        new_parent_id: "550e8400-e29b-41d4-a716-446655440000",
      });
    });

    it("should handle empty request body", async () => {
      const mockDeleteResult = {
        deleted_action: { id: "550e8400-e29b-41d4-a716-446655440000", data: { title: "Deleted Action" } },
        children_count: 0,
        child_handling: "reparent" as const,
      };

      mockedActionsService.deleteAction.mockResolvedValue(mockDeleteResult);

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        // No body
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(mockedActionsService.deleteAction).toHaveBeenCalledWith({
        action_id: "550e8400-e29b-41d4-a716-446655440000",
        child_handling: "reparent",
      });
    });

    it("should handle service errors", async () => {
      mockedActionsService.deleteAction.mockRejectedValue(new Error("Delete error"));

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Delete error");
    });

    it("should handle validation errors for invalid child_handling", async () => {
      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({
          child_handling: "invalid_option",
        }),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain("Invalid enum value");
    });

    it("should handle unknown errors", async () => {
      mockedActionsService.deleteAction.mockRejectedValue("Unknown error type");

      const request = new NextRequest("http://localhost:3000/api/actions/test-id", {
        method: "DELETE",
        body: JSON.stringify({}),
      });

      const params = Promise.resolve({ id: "550e8400-e29b-41d4-a716-446655440000" });
      const response = await DELETE(request, { params });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe("Unknown error");
    });
  });
});