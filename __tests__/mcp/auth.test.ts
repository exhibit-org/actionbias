import { validateAuth, authenticatedHandler } from "../../lib/mcp/auth";

describe("MCP Auth", () => {
  describe("validateAuth", () => {
    it("should return false for missing authorization header", () => {
      const request = new Request("http://localhost", {});
      expect(validateAuth(request)).toBe(false);
    });

    it("should return false for non-Bearer authorization header", () => {
      const request = new Request("http://localhost", {
        headers: { authorization: "Basic some-token" },
      });
      expect(validateAuth(request)).toBe(false);
    });

    it("should return false for invalid Bearer token", () => {
      const request = new Request("http://localhost", {
        headers: { authorization: "Bearer invalid-token" },
      });
      expect(validateAuth(request)).toBe(false);
    });

    it("should return true for test-token", () => {
      const request = new Request("http://localhost", {
        headers: { authorization: "Bearer test-token" },
      });
      expect(validateAuth(request)).toBe(true);
    });

    it("should return true for access_ prefixed tokens", () => {
      const request = new Request("http://localhost", {
        headers: { authorization: "Bearer access_12345" },
      });
      expect(validateAuth(request)).toBe(true);
    });

    it("should return false for empty Bearer token", () => {
      const request = new Request("http://localhost", {
        headers: { authorization: "Bearer " },
      });
      expect(validateAuth(request)).toBe(false);
    });
  });

  describe("authenticatedHandler", () => {
    const mockHandler = jest.fn().mockResolvedValue(new Response("OK"));

    beforeEach(() => {
      jest.clearAllMocks();
      // Spy on console.log to test logging behavior
      jest.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("should return 404 for non-MCP transport paths", async () => {
      const request = new Request("http://localhost/static/file.js");
      const response = await authenticatedHandler("GET", request, mockHandler);
      
      expect(response.status).toBe(404);
      expect(await response.text()).toBe("Not Found");
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should return 404 for invalid transport paths", async () => {
      const request = new Request("http://localhost/invalid");
      const response = await authenticatedHandler("GET", request, mockHandler);
      
      expect(response.status).toBe(404);
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should allow SSE GET requests without authentication", async () => {
      const request = new Request("http://localhost/sse");
      await authenticatedHandler("GET", request, mockHandler);
      
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it("should allow SSE GET requests with authentication", async () => {
      const request = new Request("http://localhost/sse", {
        headers: { authorization: "Bearer test-token" },
      });
      await authenticatedHandler("GET", request, mockHandler);
      
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it("should allow message endpoint requests without authentication", async () => {
      const request = new Request("http://localhost/message");
      await authenticatedHandler("POST", request, mockHandler);
      
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it("should allow message endpoint requests with authentication", async () => {
      const request = new Request("http://localhost/message", {
        headers: { authorization: "Bearer access_12345" },
      });
      await authenticatedHandler("POST", request, mockHandler);
      
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it("should require authentication for MCP transport", async () => {
      const request = new Request("http://localhost/mcp");
      const response = await authenticatedHandler("POST", request, mockHandler);
      
      expect(response.status).toBe(401);
      expect(await response.text()).toBe("Unauthorized");
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it("should allow authenticated MCP transport requests", async () => {
      const request = new Request("http://localhost/mcp", {
        headers: { authorization: "Bearer test-token" },
      });
      await authenticatedHandler("POST", request, mockHandler);
      
      expect(mockHandler).toHaveBeenCalledWith(request);
    });

    it("should log authentication flow", async () => {
      const request = new Request("http://localhost/mcp", {
        headers: { authorization: "Bearer test-token" },
      });
      await authenticatedHandler("POST", request, mockHandler);
      
      expect(console.log).toHaveBeenCalledWith("[MCP Auth] POST /mcp received");
      expect(console.log).toHaveBeenCalledWith("[MCP Auth] Authentication successful");
      expect(console.log).toHaveBeenCalledWith("[MCP Auth] Forwarding to MCP handler");
    });

    it("should log authentication failure", async () => {
      const request = new Request("http://localhost/mcp");
      await authenticatedHandler("POST", request, mockHandler);
      
      expect(console.log).toHaveBeenCalledWith("[MCP Auth] Authentication failed");
    });
  });
});