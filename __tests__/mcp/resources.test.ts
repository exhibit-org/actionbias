import { registerResources, resourceCapabilities } from "../../lib/mcp/resources";
import { ActionsService } from "../../lib/services/actions";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    getActionListResource: jest.fn(),
    getActionTreeResource: jest.fn(),
    getActionDependenciesResource: jest.fn(),
    getActionDetailResource: jest.fn(),
  },
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
    expect(server.resource).toHaveBeenCalledTimes(4);
    expect(Object.keys(resourceCapabilities)).toEqual([
      "actions://list",
      "actions://tree",
      "actions://dependencies",
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

  it("detail resource returns data", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[3][2];
    const expected = { id: "123", title: "Test", children: [], dependencies: [], dependents: [], done: false, created_at: "now", updated_at: "now" } as any;
    mockedService.getActionDetailResource.mockResolvedValue(expected);
    const result = await handler(new URL("actions://123"), { id: "123" });
    expect(mockedService.getActionDetailResource).toHaveBeenCalledWith("123");
    expect(JSON.parse(result.contents[0].text)).toEqual(expected);
  });

  it("detail resource rejects missing id", async () => {
    registerResources(server);
    const handler = server.resource.mock.calls[3][2];
    await expect(handler(new URL("actions://{id}"), { id: "{id}" })).rejects.toThrow();
  });
});
