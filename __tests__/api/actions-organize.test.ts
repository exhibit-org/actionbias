import { NextRequest } from "next/server";
import { POST } from "../../app/api/actions/[id]/organize/route";
import { ActionsService } from "../../lib/services/actions";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    organizeAction: jest.fn(),
  },
}));

const mockedActionsService = ActionsService as jest.Mocked<typeof ActionsService>;

describe("POST /api/actions/[id]/organize", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return organization suggestions for a valid action", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    const mockSuggestions = [
      {
        type: "move" as const,
        title: "Move to better parent",
        description: "This action would be better organized under 'API Development'",
        target_parent_id: "123e4567-e89b-12d3-a456-426614174000",
        target_parent_title: "API Development",
        confidence: 0.85,
        reasoning: "Strong semantic similarity with API-related tasks",
      },
      {
        type: "rename" as const,
        title: "Rename for clarity",
        description: "Rename to 'Implement organize_action MCP tool and REST API endpoint'",
        new_title: "Implement organize_action MCP tool and REST API endpoint",
        confidence: 0.75,
        reasoning: "Current title could be more specific about implementation details",
      },
    ];

    mockedActionsService.organizeAction.mockResolvedValue({
      action: { id: actionId, title: "Add Organize Action Tool and API Endpoint" },
      suggestions: mockSuggestions,
      metadata: { processingTimeMs: 250, analyzedCount: 15 },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        scope: "include_siblings",
        limit: 5,
        confidence_threshold: 60,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.suggestions).toHaveLength(2);
    expect(data.data.suggestions[0].type).toBe("move");
    expect(data.data.suggestions[1].type).toBe("rename");
    
    expect(mockedActionsService.organizeAction).toHaveBeenCalledWith({
      action_id: actionId,
      scope: "include_siblings",
      limit: 5,
      confidence_threshold: 60,
    });
  });

  it("should use default values when no body is provided", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    
    mockedActionsService.organizeAction.mockResolvedValue({
      action: { id: actionId, title: "Test Action" },
      suggestions: [],
      metadata: { processingTimeMs: 100, analyzedCount: 1 },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    
    expect(mockedActionsService.organizeAction).toHaveBeenCalledWith({
      action_id: actionId,
      scope: "action_only",
      limit: 5,
      confidence_threshold: 40,
    });
  });

  it("should return 400 for invalid action ID format", async () => {
    const invalidId = "not-a-uuid";
    
    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: invalidId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Invalid action ID format");
    expect(mockedActionsService.organizeAction).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid scope value", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    
    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        scope: "invalid_scope",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain("Invalid input");
    expect(mockedActionsService.organizeAction).not.toHaveBeenCalled();
  });

  it("should return 400 for invalid limit value", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    
    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        limit: 15, // max is 10
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(mockedActionsService.organizeAction).not.toHaveBeenCalled();
  });

  it("should handle service errors gracefully", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    
    mockedActionsService.organizeAction.mockRejectedValue(
      new Error("Action not found")
    );

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe("Action not found");
  });

  it("should handle empty suggestions response", async () => {
    const actionId = "550e8400-e29b-41d4-a716-446655440000";
    
    mockedActionsService.organizeAction.mockResolvedValue({
      action: { id: actionId, title: "Well Organized Action" },
      suggestions: [],
      metadata: { processingTimeMs: 150, analyzedCount: 10 },
    });

    const request = new NextRequest("http://localhost:3000", {
      method: "POST",
      body: JSON.stringify({
        confidence_threshold: 90,
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: actionId }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.suggestions).toHaveLength(0);
    expect(data.message).toContain("well-organized");
  });
});