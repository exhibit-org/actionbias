import { registerResources, resourceCapabilities } from "../../lib/mcp/resources";
import { ActionsService } from "../../lib/services/actions";
import { getDb } from "../../lib/db/adapter";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    getActionListResource: jest.fn(),
    getActionTreeResource: jest.fn(),
    getActionTreeResourceScoped: jest.fn(),
    getActionDependenciesResource: jest.fn(),
    getActionDetailResource: jest.fn(),
    getNextAction: jest.fn(),
    getNextActionScoped: jest.fn(),
    getParentContextSummary: jest.fn(),
    getParentVisionSummary: jest.fn(),
  },
}));

jest.mock("../../lib/db/adapter", () => ({
  getDb: jest.fn(),
}));

jest.mock("../../db/schema", () => ({
  actions: {},
  edges: {},
  completionContexts: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  and: jest.fn(),
  desc: jest.fn(),
  sql: jest.fn((template: TemplateStringsArray) => template[0]),
}));

const mockedService = ActionsService as jest.Mocked<typeof ActionsService>;
const mockGetDb = getDb as jest.MockedFunction<typeof getDb>;

describe("MCP Resources", () => {
  let server: any;

  beforeEach(() => {
    server = { resource: jest.fn() };
    process.env.DATABASE_URL = "postgresql://test";
    
    // Set up default mock for getDb
    mockGetDb.mockReturnValue({
      select: jest.fn(() => ({
        from: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: jest.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("registers all resources", () => {
    registerResources(server);
    expect(server.resource).toHaveBeenCalledTimes(9);
    expect(Object.keys(resourceCapabilities)).toEqual([
      "action://list",
      "action://tree",
      "action://tree/{id}",
      "action://dependencies",
      "action://next",
      "action://next/{id}",
      "action://item/{id}",
      "log://feed",
      "log://item/{id}",
    ]);
  });

  it("list resource returns data from service", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 1, limit: 5, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://list?limit=5"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ limit: 5, offset: 0, includeCompleted: false });
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("list resource handles missing database", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const result = await handler(new URL("action://list"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.actions).toEqual([]);
  });

  it("list resource parses URI parameters with query string", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 5, limit: 10, offset: 20, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://list?limit=10&offset=20&includeCompleted=true"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ limit: 10, offset: 20, includeCompleted: true });
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("list resource parses includeCompleted parameter", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 3, limit: 20, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://list?includeCompleted=true"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ limit: 20, offset: 0, done: undefined, includeCompleted: true });
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });


  it("tree resource returns data", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const expected = { rootActions: [] } as any;
    mockedService.getActionTreeResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://tree"));
    expect(mockedService.getActionTreeResource).toHaveBeenCalledWith(false);
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("tree resource parses includeCompleted parameter", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const expected = { rootActions: [] } as any;
    mockedService.getActionTreeResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://tree?includeCompleted=true"));
    expect(mockedService.getActionTreeResource).toHaveBeenCalledWith(true);
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("dependencies resource returns data", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const expected = { dependencies: [] } as any;
    mockedService.getActionDependenciesResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://dependencies"));
    expect(mockedService.getActionDependenciesResource).toHaveBeenCalledWith(false);
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("dependencies resource parses includeCompleted parameter", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const expected = { dependencies: [] } as any;
    mockedService.getActionDependenciesResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://dependencies?includeCompleted=true"));
    expect(mockedService.getActionDependenciesResource).toHaveBeenCalledWith(true);
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("next resource returns action structure", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "action://next");
    const handler = nextCall[2];
    const mockAction = { id: "123", data: { title: "Next Action" }, done: false, version: 1, createdAt: "now", updatedAt: "now" } as any;
    const mockActionDetail = {
      id: "123",
      title: "Next Action",
      description: undefined,
      vision: undefined,
      done: false,
      version: 1,
      created_at: "now",
      updated_at: "now",
      parent_id: undefined,
      parent_chain: [],
      children: [],
      dependencies: [],
      dependents: [],
      family_context_summary: "test context summary",
      family_vision_summary: "test vision summary"
    };
    mockedService.getNextAction.mockResolvedValue(mockAction);
    mockedService.getActionDetailResource.mockResolvedValue(mockActionDetail);
    const result = await handler(new URL("action://next"));
    expect(mockedService.getNextAction).toHaveBeenCalled();
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith("123");
    const data = JSON.parse(result.contents[0].text);
    expect(data).toBeDefined();
    expect(data.id).toBe("123");
    expect(data.title).toBe("Next Action");
    expect(data.parent_chain).toEqual([]);
    expect(data.family_context_summary).toBe("test context summary");
    expect(data.family_vision_summary).toBe("test vision summary");
  });


  it("next resource returns null when no action", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "action://next");
    const handler = nextCall[2];
    mockedService.getNextAction.mockResolvedValue(null);
    const result = await handler(new URL("action://next"));
    expect(mockedService.getNextAction).toHaveBeenCalled();
    const data = JSON.parse(result.contents[0].text);
    expect(data.next_action).toBe(null);
  });

  it("next resource handles database errors", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "action://next");
    const handler = nextCall[2];
    mockedService.getNextAction.mockRejectedValue(new Error("Database connection failed"));
    const result = await handler(new URL("action://next"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database connection failed");
  });

  it("next resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "action://next");
    const handler = nextCall[2];
    const result = await handler(new URL("action://next"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.next_action).toBe(null);
  });

  it("detail resource returns data", async () => {
    registerResources(server);
    // Find the detail resource by index (action://item/{id} is at index 3)
    const detailCall = server.resource.mock.calls[3];
    const handler = detailCall[2];
    const expected = { id: "123", title: "Test", children: [], dependencies: [], dependents: [], done: false, created_at: "now", updated_at: "now", family_context_summary: "test context", family_vision_summary: "test vision", dependency_completion_context: []  } as any;
    const expectedWithSummaries = { ...expected };
    mockedService.getActionDetailResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://123"), { id: "123" });
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith("123");
    expect(result.contents[0].mimeType).toBe("application/json");
  });

  it("detail resource displays completion context prominently", async () => {
    registerResources(server);
    // Find the detail resource by index (action://item/{id} is at index 3)
    const detailCall = server.resource.mock.calls[3];
    const handler = detailCall[2];
    const expected = { 
      id: "123", 
      title: "Test Action", 
      children: [], 
      dependencies: [], 
      dependents: [], 
      done: false, 
      created_at: "now", 
      updated_at: "now",
      dependency_completion_context: [
        {
          action_id: "dep-1",
          action_title: "Setup Database",
          completion_timestamp: "2023-01-01T00:00:00.000Z",
          implementation_story: "Used PostgreSQL with Drizzle ORM",
          impact_story: "Improved data consistency and query performance",
          learning_story: "Learned that migrations should be atomic",
          changelog_visibility: "team"
        }
      ]
    } as any;
    mockedService.getActionDetailResource.mockResolvedValue(expected);
    const result = await handler(new URL("action://123"), { id: "123" });
    
    expect(result.contents[0].mimeType).toBe("application/json");
    const data = JSON.parse(result.contents[0].text);
    
    // Check that completion context is included in the response
    expect(data.dependency_completion_context).toHaveLength(1);
    expect(data.dependency_completion_context[0].action_title).toBe("Setup Database");
    expect(data.dependency_completion_context[0].implementation_story).toBe("Used PostgreSQL with Drizzle ORM");
    expect(data.dependency_completion_context[0].impact_story).toBe("Improved data consistency and query performance");
    expect(data.dependency_completion_context[0].learning_story).toBe("Learned that migrations should be atomic");
  });

  it("detail resource rejects missing id", async () => {
    registerResources(server);
    // Find the detail resource by index (action://item/{id} is at index 3)
    const detailCall = server.resource.mock.calls[3];
    const handler = detailCall[2];
    await expect(handler(new URL("action://{id}"), { id: "{id}" })).rejects.toThrow();
  });

  it("detail resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    // Find the detail resource by index (action://item/{id} is at index 3)
    const detailCall = server.resource.mock.calls[3];
    const handler = detailCall[2];
    const result = await handler(new URL("action://123"), { id: "123" });
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.id).toBe("123");
  });

  it("detail resource handles database errors", async () => {
    registerResources(server);
    // Find the detail resource by index (action://item/{id} is at index 3)
    const detailCall = server.resource.mock.calls[3];
    const handler = detailCall[2];
    mockedService.getActionDetailResource.mockRejectedValue(new Error("Database error"));
    await expect(handler(new URL("action://123"), { id: "123" })).rejects.toThrow("Failed to fetch action details: Database error");
  });

  it("tree resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const result = await handler(new URL("action://tree"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.rootActions).toEqual([]);
  });

  it("tree resource handles database errors", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    mockedService.getActionTreeResource.mockRejectedValue(new Error("Tree error"));
    await expect(handler(new URL("action://tree"))).rejects.toThrow("Failed to fetch action tree: Tree error");
  });

  it("dependencies resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const result = await handler(new URL("action://dependencies"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.dependencies).toEqual([]);
  });

  it("dependencies resource handles database errors", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    mockedService.getActionDependenciesResource.mockRejectedValue(new Error("Dependencies error"));
    await expect(handler(new URL("action://dependencies"))).rejects.toThrow("Failed to fetch action dependencies: Dependencies error");
  });

  // Test URL parsing error branches
  it("list resource handles URL parsing errors gracefully", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 1, limit: 20, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    
    // Mock console.log to capture the error logging
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a malformed URI that will cause URL constructor to throw
    const mockUri = {
      toString: () => "not-a-valid-url?query=param"
    };
    
    const result = await handler(mockUri);
    // Should fall back to defaults when URL parsing fails
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ 
      limit: 20, // Should use default
      offset: 0, // Should use default
      done: undefined, 
      includeCompleted: false 
    });
    
    // Should log the URL parsing error
    expect(consoleSpy).toHaveBeenCalledWith('Could not parse URI parameters, using defaults:', expect.objectContaining({
      name: 'TypeError',
      message: 'Invalid URL'
    }));
    
    consoleSpy.mockRestore();
  });

  it("tree resource handles URL parsing errors gracefully", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const expected = { rootActions: [] } as any;
    mockedService.getActionTreeResource.mockResolvedValue(expected);
    
    // Mock console.log to verify error logging
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a malformed URI that will cause URL constructor to throw
    const mockUri = {
      toString: () => "not-valid-url?includeCompleted=true"
    };
    
    const result = await handler(mockUri);
    // Should use default when URL parsing fails
    expect(mockedService.getActionTreeResource).toHaveBeenCalledWith(false);
    
    // Should log the URL parsing error
    expect(consoleSpy).toHaveBeenCalledWith('Could not parse URI parameters, using defaults:', expect.objectContaining({
      name: 'TypeError',
      message: 'Invalid URL'
    }));
    
    consoleSpy.mockRestore();
  });

  it("dependencies resource handles URL parsing errors gracefully", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const expected = { dependencies: [] } as any;
    mockedService.getActionDependenciesResource.mockResolvedValue(expected);
    
    // Mock console.log to verify error logging
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    
    // Create a malformed URI that will cause URL constructor to throw
    const mockUri = {
      toString: () => "invalid-url?includeCompleted=true"
    };
    
    const result = await handler(mockUri);
    // Should use default when URL parsing fails
    expect(mockedService.getActionDependenciesResource).toHaveBeenCalledWith(false);
    
    // Should log the URL parsing error
    expect(consoleSpy).toHaveBeenCalledWith('Could not parse URI parameters, using defaults:', expect.objectContaining({
      name: 'TypeError',
      message: 'Invalid URL'
    }));
    
    consoleSpy.mockRestore();
  });

  it("list resource handles non-Error exceptions", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    mockedService.getActionListResource.mockRejectedValue("String error");
    
    await expect(handler(new URL("action://list"))).rejects.toThrow("Failed to fetch actions: Unknown error");
  });

  it("tree resource handles non-Error exceptions", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    mockedService.getActionTreeResource.mockRejectedValue("String error");
    
    await expect(handler(new URL("action://tree"))).rejects.toThrow("Failed to fetch action tree: Unknown error");
  });

  it("dependencies resource handles non-Error exceptions", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    mockedService.getActionDependenciesResource.mockRejectedValue("String error");
    
    await expect(handler(new URL("action://dependencies"))).rejects.toThrow("Failed to fetch action dependencies: Unknown error");
  });

  it("detail resource handles non-Error exceptions", async () => {
    registerResources(server);
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    mockedService.getActionDetailResource.mockRejectedValue("String error");
    
    await expect(handler(new URL("action://123"), { id: "123" })).rejects.toThrow("Failed to fetch action details: Unknown error");
  });

  it("next resource handles non-Error exceptions", async () => {
    registerResources(server);
    const nextCall = server.resource.mock.calls.find(call => call[1] === "action://next");
    const handler = nextCall[2];
    mockedService.getNextAction.mockRejectedValue("String error");
    
    const result = await handler(new URL("action://next"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Unknown error");
  });

  it("detail resource handles array id parameter", async () => {
    registerResources(server);
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    const expected = { id: "first", title: "Test", children: [], dependencies: [], dependents: [], done: false } as any;
    mockedService.getActionDetailResource.mockResolvedValue(expected);
    mockedService.getParentContextSummary.mockResolvedValue("test context");
    mockedService.getParentVisionSummary.mockResolvedValue("test vision");
    
    const result = await handler(new URL("action://first"), { id: ["first", "second"] });
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith("first");
  });

  it("detail resource handles empty id parameter", async () => {
    registerResources(server);
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    
    await expect(handler(new URL("action://"), { id: "" })).rejects.toThrow("Action ID is required");
  });

  it("list resource parses includeCompleted=false parameter correctly", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 2, limit: 20, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    
    const result = await handler(new URL("action://list?includeCompleted=false"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ 
      limit: 20, 
      offset: 0, 
      includeCompleted: false 
    });
  });

  it("list resource handles parameters without includeCompleted", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 3, limit: 20, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    
    const result = await handler(new URL("action://list?other=value"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ 
      limit: 20, 
      offset: 0, 
      includeCompleted: false 
    });
  });


  it("tree resource parses includeCompleted=false parameter correctly", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const expected = { rootActions: [] } as any;
    mockedService.getActionTreeResource.mockResolvedValue(expected);
    
    const result = await handler(new URL("action://tree?includeCompleted=false"));
    expect(mockedService.getActionTreeResource).toHaveBeenCalledWith(false);
  });

  it("dependencies resource parses includeCompleted=false parameter correctly", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const expected = { dependencies: [] } as any;
    mockedService.getActionDependenciesResource.mockResolvedValue(expected);
    
    const result = await handler(new URL("action://dependencies?includeCompleted=false"));
    expect(mockedService.getActionDependenciesResource).toHaveBeenCalledWith(false);
  });

  it("list resource handles database errors", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    mockedService.getActionListResource.mockRejectedValue(new Error("Service error"));
    
    await expect(handler(new URL("action://list"))).rejects.toThrow("Failed to fetch actions: Service error");
  });

  // Log resource tests
  it("log feed resource returns recent logs", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[7][2]; // log://feed is at index 7
    
    const testLog = {
      id: "log1",
      actionId: "action1",
      actionTitle: "Test Action",
      actionDescription: "Test Description",
      implementationStory: "Implemented using TDD",
      impactStory: "Improved test coverage",
      learningStory: "TDD is effective",
      changelogVisibility: "team",
      completionTimestamp: new Date(),
      structuredData: null,
    };
    
    // Mock both queries - first for logs, second for count
    mockGetDb.mockReset();
    
    // First call for the main query
    mockGetDb.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              offset: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([testLog])
              })
            })
          })
        })
      })
    } as any));
    
    // Second call for the count query
    mockGetDb.mockImplementationOnce(() => ({
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockResolvedValue([{ count: 1 }])
      })
    } as any));
    
    const result = await handler(new URL("log://feed"));
    const data = JSON.parse(result.contents[0].text);
    
    expect(data.logs).toHaveLength(1);
    expect(data.logs[0].actionTitle).toBe("Test Action");
    expect(data.total).toBe(1);
  });

  it("log feed resource handles missing database", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[7][2];
    
    const result = await handler(new URL("log://feed"));
    const data = JSON.parse(result.contents[0].text);
    
    expect(data.error).toBe("Database not configured");
    expect(data.logs).toEqual([]);
  });

  it("log item resource returns specific action log", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[8][2]; // log://item/{id} is at index 8
    
    // Mock the database response
    mockGetDb.mockReturnValue({
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([{
                id: "log1",
                actionId: "action1",
                actionTitle: "Test Action",
                actionDescription: "Test Description",
                actionVision: "Test Vision",
                implementationStory: "Implemented using TDD",
                impactStory: "Improved test coverage",
                learningStory: "TDD is effective",
                changelogVisibility: "team",
                completionTimestamp: new Date(),
                structuredData: null,
              }])
            })
          })
        })
      })
    } as any);
    
    const result = await handler(new URL("log://item/action1"), { id: "action1" });
    const data = JSON.parse(result.contents[0].text);
    
    expect(data.log).toBeDefined();
    expect(data.log.actionTitle).toBe("Test Action");
    expect(data.log.implementationStory).toBe("Implemented using TDD");
  });

  it("log item resource returns null for missing log", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[8][2];
    
    // Mock empty response
    mockGetDb.mockReturnValue({
      select: jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([])
            })
          })
        })
      })
    } as any);
    
    const result = await handler(new URL("log://item/nonexistent"), { id: "nonexistent" });
    const data = JSON.parse(result.contents[0].text);
    
    expect(data.log).toBeNull();
    expect(data.message).toContain("No completion log found");
  });

  it("log item resource handles missing database", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[8][2];
    
    const result = await handler(new URL("log://item/action1"), { id: "action1" });
    const data = JSON.parse(result.contents[0].text);
    
    expect(data.error).toBe("Database not configured");
    expect(data.log).toBeNull();
  });
});
