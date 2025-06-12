import { registerTools, toolCapabilities } from "../../lib/mcp/tools";
import { ActionsService } from "../../lib/services/actions";

jest.mock("../../lib/services/actions", () => ({
  ActionsService: {
    createAction: jest.fn(),
    addDependency: jest.fn(),
    deleteAction: jest.fn(),
    removeDependency: jest.fn(),
    updateAction: jest.fn(),
    getNextAction: jest.fn(),
  },
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
      "get_next_action",
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
  });

  describe("add_dependency", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["add_dependency"];
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: { createdAt: "now" } }), { status: 200, headers: { "content-type": "application/json" } }));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("https://example.com/api/actions/dependencies");
      expect(res.content[0].text).toContain("Created dependency");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["add_dependency"];
      global.fetch = jest.fn().mockResolvedValue(new Response("bad", { status: 400, statusText: "Bad" }));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(res.content[0].text).toContain("Error creating dependency");
    });
  });

  describe("delete_action", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["delete_action"];
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: { deleted_action: { data: { title: "A" } }, children_count: 0, child_handling: "orphan" } }), { status: 200, headers: { "content-type": "application/json" } }));
      const res = await handler({ action_id: "a1", child_handling: "orphan" }, {});
      expect((global.fetch as jest.Mock).mock.calls[0][0]).toBe("https://example.com/api/actions/a1");
      expect(res.content[0].text).toContain("Deleted action");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["delete_action"];
      global.fetch = jest.fn().mockResolvedValue(new Response("bad", { status: 500, statusText: "Fail" }));
      const res = await handler({ action_id: "a1" }, {});
      expect(res.content[0].text).toContain("Error deleting action");
    });
  });

  describe("remove_dependency", () => {
    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["remove_dependency"];
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: { action: {}, depends_on: {}, deleted_edge: {} } }), { status: 200, headers: { "content-type": "application/json" } }));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(res.content[0].text).toContain("Removed dependency");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["remove_dependency"];
      global.fetch = jest.fn().mockResolvedValue(new Response("bad", { status: 400, statusText: "Bad" }));
      const res = await handler({ action_id: "a1", depends_on_id: "a2" }, {});
      expect(res.content[0].text).toContain("Error removing dependency");
    });
  });

  describe("update_action", () => {
    it("rejects when no fields provided", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      const res = await handler({ action_id: "a1" }, {});
      expect(res.content[0].text).toContain("At least one field");
    });

    it("returns success message", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify({ data: { id: "a1", data: { title: "A" } } }), { status: 200, headers: { "content-type": "application/json" } }));
      const res = await handler({ action_id: "a1", title: "A" }, {});
      expect(res.content[0].text).toContain("Updated action");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["update_action"];
      global.fetch = jest.fn().mockResolvedValue(new Response("bad", { status: 500, statusText: "Fail" }));
      const res = await handler({ action_id: "a1", title: "A" }, {});
      expect(res.content[0].text).toContain("Error updating action");
    });
  });

  describe("get_next_action", () => {
    it("returns message when action available", async () => {
      registerTools(server);
      const handler = tools["get_next_action"];
      mockedService.getNextAction.mockResolvedValue({ id: "a1", data: { title: "A" }, done: false, version: 0, createdAt: "now", updatedAt: "now" } as any);
      const res = await handler({}, {});
      expect(res.content[0].text).toContain("Next action: A");
    });

    it("returns no action message when none", async () => {
      registerTools(server);
      const handler = tools["get_next_action"];
      mockedService.getNextAction.mockResolvedValue(null as any);
      const res = await handler({}, {});
      expect(res.content[0].text).toContain("No available actions");
    });

    it("returns error message on failure", async () => {
      registerTools(server);
      const handler = tools["get_next_action"];
      mockedService.getNextAction.mockRejectedValue(new Error("fail"));
      const res = await handler({}, {});
      expect(res.content[0].text).toContain("Error getting next action");
    });
  });
});
