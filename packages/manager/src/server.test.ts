import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RTRQServer } from "./server";

// Mock uWebSockets.js
vi.mock("uWebSockets.js", () => ({
	App: vi.fn().mockReturnValue({
		ws: vi.fn(),
		post: vi.fn(),
		listen: vi.fn(),
	}),
}));

describe("RTRQServer", () => {
	let server: RTRQServer;

	beforeEach(() => {
		vi.clearAllMocks();
		server = new RTRQServer();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should create server with default options", () => {
			const testServer = new RTRQServer();
			expect(testServer).toBeInstanceOf(RTRQServer);
		});

		it("should create server with custom options", () => {
			const options = {
				allowedIps: ["127.0.0.1"],
				maxBodySize: 2048,
			};
			const testServer = new RTRQServer(options);
			expect(testServer).toBeInstanceOf(RTRQServer);
		});
	});

	describe("event handlers", () => {
		it("should register query subscribe handler", () => {
			const handler = vi.fn();
			const result = server.onQuerySubscribe(handler);
			expect(result).toBe(server);
		});

		it("should register query unsubscribe handler", () => {
			const handler = vi.fn();
			const result = server.onQueryUnsubscribe(handler);
			expect(result).toBe(server);
		});

		it("should register query invalidate handler", () => {
			const handler = vi.fn();
			const result = server.onQueryInvalidate(handler);
			expect(result).toBe(server);
		});

		it("should register before invalidate handler", () => {
			const handler = vi.fn();
			const result = server.onBeforeInvalidate(handler);
			expect(result).toBe(server);
		});

		it("should register client connect handler", () => {
			const handler = vi.fn();
			const result = server.onClientConnect(handler);
			expect(result).toBe(server);
		});

		it("should register client disconnect handler", () => {
			const handler = vi.fn();
			const result = server.onClientDisconnect(handler);
			expect(result).toBe(server);
		});
	});

	describe("invalidateQuery", () => {
		it("should emit before-invalidate event", () => {
			const beforeHandler = vi.fn();
			const invalidateHandler = vi.fn();

			server.onBeforeInvalidate(beforeHandler);
			server.onQueryInvalidate(invalidateHandler);

			const key = ["post", 12];
			server.invalidateQuery(key);

			expect(beforeHandler).toHaveBeenCalledWith({
				key,
				matchedKeys: [],
				totalSubscriptions: 0,
				preventDefault: expect.any(Function),
				request: undefined,
			});
		});

		it("should emit invalidate event", () => {
			const invalidateHandler = vi.fn();
			server.onQueryInvalidate(invalidateHandler);

			const key = ["post", 12];
			server.invalidateQuery(key);

			expect(invalidateHandler).toHaveBeenCalledWith({
				key,
				matchedKeys: [],
				notifiedClients: 0,
				totalSubscriptions: 0,
				request: undefined,
			});
		});

		it("should prevent invalidation when preventDefault is called", () => {
			const beforeHandler = vi.fn((event) => {
				event.preventDefault();
			});
			const invalidateHandler = vi.fn();

			server.onBeforeInvalidate(beforeHandler);
			server.onQueryInvalidate(invalidateHandler);

			const key = ["post", 12];
			server.invalidateQuery(key);

			expect(beforeHandler).toHaveBeenCalled();
			expect(invalidateHandler).not.toHaveBeenCalled();
		});

		it("should include request in event when provided", () => {
			const invalidateHandler = vi.fn();
			server.onQueryInvalidate(invalidateHandler);

			const key = ["post", 12];
			const mockRequest = { getHeader: vi.fn() } as any;
			server.invalidateQuery(key, mockRequest);

			expect(invalidateHandler).toHaveBeenCalledWith({
				key,
				matchedKeys: [],
				notifiedClients: 0,
				totalSubscriptions: 0,
				request: mockRequest,
			});
		});
	});

	describe("listen", () => {
		it("should start server on specified port", () => {
			const mockApp = {
				ws: vi.fn(),
				post: vi.fn(),
				listen: vi.fn((port, callback) => {
					callback(true); // Simulate successful start
				}),
			};
			
			vi.mocked(require("uWebSockets.js").App).mockReturnValue(mockApp);
			
			const testServer = new RTRQServer();
			const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
			
			testServer.listen(3000);
			
			expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
			expect(consoleSpy).toHaveBeenCalledWith("RTRQ Server listening on port 3000");
			
			consoleSpy.mockRestore();
		});

		it("should log error when server fails to start", () => {
			const mockApp = {
				ws: vi.fn(),
				post: vi.fn(),
				listen: vi.fn((port, callback) => {
					callback(false); // Simulate failed start
				}),
			};
			
			vi.mocked(require("uWebSockets.js").App).mockReturnValue(mockApp);
			
			const testServer = new RTRQServer();
			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
			
			testServer.listen(3000);
			
			expect(mockApp.listen).toHaveBeenCalledWith(3000, expect.any(Function));
			expect(consoleSpy).toHaveBeenCalledWith("Failed to start RTRQ Server on port 3000");
			
			consoleSpy.mockRestore();
		});
	});
});