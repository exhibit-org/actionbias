import { registerTools, toolCapabilities } from "../../lib/mcp/tools";
import { ActionsService } from "../../lib/services/actions";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    createAction: jest.fn(),
    addDependency: jest.fn(),
    deleteAction: jest.fn(),
    removeDependency: jest.fn(),
    updateAction: jest.fn(),
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

describe("MCP Tools", () => {
  let server: any;
  let tools: Record<string, any>;
  const originalFetch = global.fetch;

  beforeEach(() => {
    tools = {};
    server = { tool: jest.fn((name: string, _desc: string, _schema: any, handler: any) => { tools[name] = handler; }) };
    process.env.VERCEL_URL = "example.com";
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    global.fetch = originalFetch;
  });

  it("registers all tools", () => {
    registerTools(server);
    expect(server.tool).toHaveBeenCalledTimes(6);
    expect(Object.keys(toolCapabilities)).toEqual([
      "create_action",
      "add_dependency",
      "delete_action",
      "remove_dependency",
      "update_action",
      "update_parent",
    ]);
  });

  describe("create_action", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["create_action"];
      const expected = { action: { id: "1", createdAt: "now", data: { title: "A" } }, dependencies_count: 0 } as any;
      mockedService.createAction.mockResolvedValue(expected);
      const res = await handler({ title: "A" }, {});
      expect(mockedService.createAction).toHaveBeenCalledWith({ title: "A", parent_id: undefined, depends_on_ids: undefined });
      expect(res.content[0].text).toContain("Created action: A");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["create_action"];
      mockedService.createAction.mockRejectedValue(new Error("fail"));
      const res = await handler({ title: "A" }, {});
      expect(res.content[0].text).toContain("Error creating action: fail");
    });

    it("creates action with vision", async () => {
      registerTools(server);
      const handler = tools["create_action"];
      const expected = { action: { id: "1", createdAt: "now", data: { title: "A", vision: "World peace achieved" } }, dependencies_count: 0 } as any;
      mockedService.createAction.mockResolvedValue(expected);
      const res = await handler({ title: "A", vision: "World peace achieved" }, {});
      expect(mockedService.createAction).toHaveBeenCalledWith({ title: "A", description: undefined, vision: "World peace achieved", parent_id: undefined, depends_on_ids: undefined });
      expect(res.content[0].text).toContain("Created action: A");
    });

    it("creates action with description", async () => {
      registerTools(server);
      const handler = tools["create_action"];
      const expected = { action: { id: "1", createdAt: "now", data: { title: "A", description: "Follow the detailed guide" } }, dependencies_count: 0 } as any;
      mockedService.createAction.mockResolvedValue(expected);
      const res = await handler({ title: "A", description: "Follow the detailed guide" }, {});
      expect(mockedService.createAction).toHaveBeenCalledWith({ title: "A", description: "Follow the detailed guide", vision: undefined, parent_id: undefined, depends_on_ids: undefined });
      expect(res.content[0].text).toContain("Created action: A");
    });

    it("creates action with all fields", async () => {
      registerTools(server);
      const handler = tools["create_action"];
      const expected = { action: { id: "1", createdAt: "now", data: { title: "A", description: "Do this step by step", vision: "Success achieved" } }, dependencies_count: 0 } as any;
      mockedService.createAction.mockResolvedValue(expected);
      const res = await handler({ title: "A", description: "Do this step by step", vision: "Success achieved" }, {});
      expect(mockedService.createAction).toHaveBeenCalledWith({ title: "A", description: "Do this step by step", vision: "Success achieved", parent_id: undefined, depends_on_ids: undefined });
      expect(res.content[0].text).toContain("Created action: A");
    });
  });

  describe("add_dependency", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["add_dependency"];
      const expected = { src: "a2", dst: "a1", kind: "depends_on", createdAt: "now" } as any;
      mockedService.addDependency.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(mockedService.addDependency).toHaveBeenCalledWith({ action_id: "a1", depends_on_id: "a2" });
      expect(res.content[0].text).toContain("Created dependency");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["add_dependency"];
      mockedService.addDependency.mockRejectedValue(new Error("fail"));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(res.content[0].text).toContain("Error creating dependency: fail");
    });
  });

  describe("delete_action", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["delete_action"];
      mockedService.deleteAction.mockResolvedValue({
        deleted_action: { data: { title: "A" } },
        children_count: 0,
        child_handling: "reparent",
      } as any);
      const res = await handler({ action_id: "a1", child_handling: "reparent" }, {});
      expect(res.content[0].text).toContain("Deleted action");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["delete_action"];
      mockedService.deleteAction.mockRejectedValue(new Error("fail"));
      const res = await handler({ action_id: "a1", child_handling: "delete_recursive" }, {});
      expect(res.content[0].text).toContain("Error deleting action");
    });
  });

  describe("remove_dependency", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["remove_dependency"];
      const expected = { 
        action: { data: { title: "Action 1" } }, 
        depends_on: { data: { title: "Action 2" } }, 
        deleted_edge: { createdAt: "now" } 
      } as any;
      mockedService.removeDependency.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(mockedService.removeDependency).toHaveBeenCalledWith({ action_id: "a1", depends_on_id: "a2" });
      expect(res.content[0].text).toContain("Removed dependency");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["remove_dependency"];
      mockedService.removeDependency.mockRejectedValue(new Error("fail"));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(res.content[0].text).toContain("Error removing dependency: fail");
    });
  });

  describe("update_action", () => {

    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const expected = { id: "a1", data: { title: "A" }, updatedAt: "2024-01-01" } as any;
      mockedService.updateAction.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", title: "A" }, {});
      expect(mockedService.updateAction).toHaveBeenCalledWith({ action_id: "a1", title: "A" });
      expect(res.content[0].text).toContain("Updated action");
    });

    it("returns success message with done status", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const expected = { id: "a1", data: { title: "A" }, updatedAt: "2024-01-01", done: true } as any;
      mockedService.updateAction.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", done: true }, {});
      expect(mockedService.updateAction).toHaveBeenCalledWith({ action_id: "a1", done: true });
      expect(res.content[0].text).toContain("Updated action");
      expect(res.content[0].text).toContain("Status: Completed");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      mockedService.updateAction.mockRejectedValue(new Error("fail"));
      const res = await handler({ action_id: "a1", title: "A" }, {});
      expect(res.content[0].text).toContain("Error updating action: fail");
    });

    it("updates action with vision", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const expected = { id: "a1", data: { title: "A", vision: "Success state defined" }, updatedAt: "2024-01-01" } as any;
      mockedService.updateAction.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", vision: "Success state defined" }, {});
      expect(mockedService.updateAction).toHaveBeenCalledWith({ action_id: "a1", vision: "Success state defined" });
      expect(res.content[0].text).toContain("Updated action");
    });

    it("updates action with description", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const expected = { id: "a1", data: { title: "A", description: "Updated instructions" }, updatedAt: "2024-01-01" } as any;
      mockedService.updateAction.mockResolvedValue(expected);
      const res = await handler({ action_id: "a1", description: "Updated instructions" }, {});
      expect(mockedService.updateAction).toHaveBeenCalledWith({ action_id: "a1", description: "Updated instructions" });
      expect(res.content[0].text).toContain("Updated action");
    });

    it("rejects when no fields provided including description", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const res = await handler({ action_id: "a1" }, {});
      expect(res.content[0].text).toContain("At least one field (title, description, vision, or done) must be provided");
    });
  });

});
