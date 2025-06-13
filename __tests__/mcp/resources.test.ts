import { registerResources, resourceCapabilities } from "../../lib/mcp/resources";
import { ActionsService } from "../../lib/services/actions";
import { getDb } from "../../lib/db/adapter";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    getActionListResource: jest.fn(),
    getActionTreeResource: jest.fn(),
    getActionDependenciesResource: jest.fn(),
    getActionDetailResource: jest.fn(),
    getNextAction: jest.fn(),
  },
}));

jest.mock("../../lib/db/adapter", () => ({
  getDb: jest.fn(),
}));

jest.mock("../../db/schema", () => ({
  actions: {},
  edges: {},
}));

jest.mock("drizzle-orm", () => ({
  eq: jest.fn(),
  and: jest.fn(),
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
    expect(server.resource).toHaveBeenCalledTimes(5);
    expect(Object.keys(resourceCapabilities)).toEqual([
      "actions://list",
      "actions://tree",
      "actions://dependencies",
      "actions://next",
      "actions://{id}",
    ]);
  });

  it("list resource returns data from service", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 1, limit: 5, offset: 0, actions: [] } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://list?limit=5"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ limit: 5, offset: 0, done: undefined });
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("list resource handles missing database", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const result = await handler(new URL("actions://list"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.actions).toEqual([]);
  });

  it("list resource parses URI parameters with query string", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[0][2];
    const expected = { total: 5, limit: 10, offset: 20, actions: [], filtered_by_done: true } as any;
    mockedService.getActionListResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://list?limit=10&offset=20&done=true"));
    expect(mockedService.getActionListResource).toHaveBeenCalledWith({ limit: 10, offset: 20, done: true });
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });


  it("tree resource returns data", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const expected = { rootActions: [] } as any;
    mockedService.getActionTreeResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://tree"));
    expect(mockedService.getActionTreeResource).toHaveBeenCalled();
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("dependencies resource returns data", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const expected = { dependencies: [] } as any;
    mockedService.getActionDependenciesResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://dependencies"));
    expect(mockedService.getActionDependenciesResource).toHaveBeenCalled();
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("next resource returns action structure", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "actions://next");
    const handler = nextCall[2];
    const mockAction = { id: "123", data: { title: "Next Action" }, done: false, version: 1, createdAt: "now", updatedAt: "now" } as any;
    mockedService.getNextAction.mockResolvedValue(mockAction);
    const result = await handler(new URL("actions://next"));
    expect(mockedService.getNextAction).toHaveBeenCalled();
    const data = JSON.parse(result.contents[0].text);
    expect(data).toBeDefined();
  });


  it("next resource returns null when no action", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "actions://next");
    const handler = nextCall[2];
    mockedService.getNextAction.mockResolvedValue(null);
    const result = await handler(new URL("actions://next"));
    expect(mockedService.getNextAction).toHaveBeenCalled();
    const data = JSON.parse(result.contents[0].text);
    expect(data.next_action).toBe(null);
  });

  it("next resource handles database errors", async () => {
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "actions://next");
    const handler = nextCall[2];
    mockedService.getNextAction.mockRejectedValue(new Error("Database connection failed"));
    const result = await handler(new URL("actions://next"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database connection failed");
  });

  it("next resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    // Find the correct next resource by checking the URI
    const nextCall = server.resource.mock.calls.find(call => call[1] === "actions://next");
    const handler = nextCall[2];
    const result = await handler(new URL("actions://next"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.next_action).toBe(null);
  });

  it("detail resource returns data", async () => {
    registerResources(server);
    // Find the detail resource by looking for the one that's NOT a string URI
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    const expected = { id: "123", title: "Test", children: [], dependencies: [], dependents: [], done: false, created_at: "now", updated_at: "now" } as any;
    mockedService.getActionDetailResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://123"), { id: "123" });
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith("123");
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("detail resource rejects missing id", async () => {
    registerResources(server);
    // Find the detail resource by looking for the one that's NOT a string URI
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    await expect(handler(new URL("actions://{id}"), { id: "{id}" })).rejects.toThrow();
  });

  it("detail resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    // Find the detail resource by looking for the one that's NOT a string URI
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    const result = await handler(new URL("actions://123"), { id: "123" });
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.id).toBe("123");
  });

  it("detail resource handles database errors", async () => {
    registerResources(server);
    // Find the detail resource by looking for the one that's NOT a string URI
    const detailCall = server.resource.mock.calls.find(call => 
      typeof call[1] !== 'string'
    );
    const handler = detailCall[2];
    mockedService.getActionDetailResource.mockRejectedValue(new Error("Database error"));
    await expect(handler(new URL("actions://123"), { id: "123" })).rejects.toThrow("Failed to fetch action details: Database error");
  });

  it("tree resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    const result = await handler(new URL("actions://tree"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.rootActions).toEqual([]);
  });

  it("tree resource handles database errors", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[1][2];
    mockedService.getActionTreeResource.mockRejectedValue(new Error("Tree error"));
    await expect(handler(new URL("actions://tree"))).rejects.toThrow("Failed to fetch action tree: Tree error");
  });

  it("dependencies resource handles missing database url", async () => {
    process.env.DATABASE_URL = "";
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    const result = await handler(new URL("actions://dependencies"));
    const data = JSON.parse(result.contents[0].text);
    expect(data.error).toBe("Database not configured");
    expect(data.dependencies).toEqual([]);
  });

  it("dependencies resource handles database errors", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[2][2];
    mockedService.getActionDependenciesResource.mockRejectedValue(new Error("Dependencies error"));
    await expect(handler(new URL("actions://dependencies"))).rejects.toThrow("Failed to fetch action dependencies: Dependencies error");
  });
});
