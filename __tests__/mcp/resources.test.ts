import { registerResources, resourceCapabilities } from "../../lib/mcp/resources";
import { ActionsService } from "../../lib/services/actions";

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
  getDb: jest.fn(() => ({
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => ({
          limit: jest.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  })),
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

describe("MCP Resources", () => {
  let server: any;

  beforeEach(() => {
    server = { resource: jest.fn() };
    process.env.DATABASE_URL = "postgresql://test";
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
});
