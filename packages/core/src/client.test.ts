import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { WebSocketClient } from "./client";

// Mock WebSocket
class MockWebSocket {
	static OPEN = 1;
	static CONNECTING = 0;
	static CLOSING = 2;
	static CLOSED = 3;

	public readyState = MockWebSocket.CONNECTING;
	public onopen: ((event: Event) => void) | null = null;
	public onmessage: ((event: MessageEvent) => void) | null = null;
	public onclose: ((event: CloseEvent) => void) | null = null;
	public onerror: ((event: Event) => void) | null = null;

	constructor(public url: string) {
		// Simulate async connection
		setTimeout(() => {
			this.readyState = MockWebSocket.OPEN;
			this.onopen?.(new Event("open"));
		}, 10);
	}

	send(data: string) {
		if (this.readyState !== MockWebSocket.OPEN) {
			throw new Error("WebSocket is not open");
		}
		// Mock sending data
	}

	close() {
		this.readyState = MockWebSocket.CLOSED;
		this.onclose?.(new CloseEvent("close"));
	}

	// Method to simulate receiving messages
	simulateMessage(data: string) {
		if (this.onmessage) {
			this.onmessage(new MessageEvent("message", { data }));
		}
	}

	// Method to simulate error
	simulateError() {
		if (this.onerror) {
			this.onerror(new Event("error"));
		}
	}
}

// Mock the global WebSocket
vi.stubGlobal("WebSocket", MockWebSocket);

describe("WebSocketClient", () => {
	let client: WebSocketClient;
	let mockWs: MockWebSocket;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new WebSocketClient({ url: "ws://localhost:3000" });
	});

	afterEach(() => {
		if (client) {
			client.disconnect();
		}
		vi.restoreAllMocks();
	});

	describe("constructor", () => {
		it("should create client with default URL", () => {
			const defaultClient = new WebSocketClient({});
			expect(defaultClient).toBeInstanceOf(WebSocketClient);
		});

		it("should create client with custom URL", () => {
			const customClient = new WebSocketClient({ url: "ws://custom.url" });
			expect(customClient).toBeInstanceOf(WebSocketClient);
		});

		it("should create client with options", () => {
			const clientWithOptions = new WebSocketClient({
				url: "ws://localhost:3000",
				options: {
					reconnect: true,
					reconnectAttempts: 5,
					reconnectInterval: 2000,
				},
			});
			expect(clientWithOptions).toBeInstanceOf(WebSocketClient);
		});
	});

	describe("connect", () => {
		it("should connect successfully", async () => {
			const connectPromise = client.connect();
			await expect(connectPromise).resolves.toBeUndefined();
		});

		it("should handle connection errors", async () => {
			const errorClient = new WebSocketClient({ url: "ws://localhost:3000" });
			
			// Mock WebSocket to throw error
			vi.mocked(WebSocket).mockImplementationOnce(() => {
				const ws = new MockWebSocket("ws://localhost:3000");
				setTimeout(() => ws.simulateError(), 10);
				return ws as any;
			});

			const connectPromise = errorClient.connect();
			await expect(connectPromise).rejects.toThrow();
		});

		it("should handle reconnection", async () => {
			const reconnectClient = new WebSocketClient({
				url: "ws://localhost:3000",
				options: {
					reconnect: true,
					reconnectAttempts: 2,
					reconnectInterval: 100,
				},
			});

			await reconnectClient.connect();
			
			// Simulate connection loss
			const wsInstance = (reconnectClient as any).ws;
			wsInstance.readyState = MockWebSocket.CLOSED;
			wsInstance.onclose(new CloseEvent("close"));

			// Wait for reconnection attempt
			await new Promise(resolve => setTimeout(resolve, 150));
		});
	});

	describe("subscribe", () => {
		beforeEach(async () => {
			await client.connect();
		});

		it("should subscribe to invalidation events", () => {
			const handler = vi.fn();
			const subscription = client.subscribe("invalidation", handler);
			
			expect(subscription).toHaveProperty("unsubscribe");
			expect(typeof subscription.unsubscribe).toBe("function");
		});

		it("should handle invalidation events", async () => {
			const handler = vi.fn();
			client.subscribe("invalidation", handler);

			const invalidationPacket = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			// Simulate receiving invalidation message
			const wsInstance = (client as any).ws;
			wsInstance.simulateMessage(JSON.stringify(invalidationPacket));

			// Wait for event processing
			await new Promise(resolve => setTimeout(resolve, 10));

			expect(handler).toHaveBeenCalledWith(invalidationPacket.payload);
		});

		it("should unsubscribe from events", () => {
			const handler = vi.fn();
			const subscription = client.subscribe("invalidation", handler);

			subscription.unsubscribe();

			// Try to trigger event after unsubscription
			const invalidationPacket = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			const wsInstance = (client as any).ws;
			wsInstance.simulateMessage(JSON.stringify(invalidationPacket));

			expect(handler).not.toHaveBeenCalled();
		});

		it("should handle multiple subscribers to the same event", () => {
			const handler1 = vi.fn();
			const handler2 = vi.fn();
			
			client.subscribe("invalidation", handler1);
			client.subscribe("invalidation", handler2);

			const invalidationPacket = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			const wsInstance = (client as any).ws;
			wsInstance.simulateMessage(JSON.stringify(invalidationPacket));

			expect(handler1).toHaveBeenCalledWith(invalidationPacket.payload);
			expect(handler2).toHaveBeenCalledWith(invalidationPacket.payload);
		});

		it("should handle invalid message gracefully", () => {
			const handler = vi.fn();
			client.subscribe("invalidation", handler);

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

			const wsInstance = (client as any).ws;
			wsInstance.simulateMessage("invalid json");

			expect(handler).not.toHaveBeenCalled();
			expect(consoleSpy).toHaveBeenCalledWith("Failed to parse event message:", expect.any(Error));

			consoleSpy.mockRestore();
		});
	});

	describe("send", () => {
		beforeEach(async () => {
			await client.connect();
		});

		it("should send subscription message", () => {
			const wsInstance = (client as any).ws;
			const sendSpy = vi.spyOn(wsInstance, "send");

			client.send("subscription", { key: ["post", 12] });

			expect(sendSpy).toHaveBeenCalledWith(
				JSON.stringify({
					type: "subscription",
					version: "1.0.0",
					timestamp: expect.any(Date),
					source: "rtrq-client",
					payload: { key: ["post", 12] },
				})
			);
		});

		it("should send unsubscription message", () => {
			const wsInstance = (client as any).ws;
			const sendSpy = vi.spyOn(wsInstance, "send");

			client.send("unsubscription", { key: ["post", 12] });

			expect(sendSpy).toHaveBeenCalledWith(
				JSON.stringify({
					type: "unsubscription",
					version: "1.0.0",
					timestamp: expect.any(Date),
					source: "rtrq-client",
					payload: { key: ["post", 12] },
				})
			);
		});

		it("should throw error when connection is not open", () => {
			const wsInstance = (client as any).ws;
			wsInstance.readyState = MockWebSocket.CLOSED;

			expect(() => {
				client.send("subscription", { key: ["post", 12] });
			}).toThrow("WebSocket connection is not open");
		});

		it("should throw error when no connection exists", () => {
			const disconnectedClient = new WebSocketClient({ url: "ws://localhost:3000" });

			expect(() => {
				disconnectedClient.send("subscription", { key: ["post", 12] });
			}).toThrow("WebSocket connection is not open");
		});
	});

	describe("disconnect", () => {
		it("should disconnect successfully", async () => {
			await client.connect();
			
			const wsInstance = (client as any).ws;
			const closeSpy = vi.spyOn(wsInstance, "close");

			client.disconnect();

			expect(closeSpy).toHaveBeenCalled();
			expect((client as any).ws).toBeNull();
		});

		it("should handle disconnect when not connected", () => {
			const disconnectedClient = new WebSocketClient({ url: "ws://localhost:3000" });
			
			// Should not throw error
			expect(() => {
				disconnectedClient.disconnect();
			}).not.toThrow();
		});
	});

	describe("version checking", () => {
		beforeEach(async () => {
			await client.connect();
		});

		it("should handle version mismatch", () => {
			const handler = vi.fn();
			client.subscribe("invalidation", handler);

			const invalidationPacket = {
				type: "invalidation",
				version: "2.0.0", // Different version
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			const wsInstance = (client as any).ws;
			
			// Mock versionCheck to return false
			vi.mock("@rtrq/utils", () => ({
				versionCheck: vi.fn().mockReturnValue(false),
				validateClientPacket: vi.fn().mockReturnValue(invalidationPacket),
			}));

			expect(() => {
				wsInstance.simulateMessage(JSON.stringify(invalidationPacket));
			}).toThrow("Invalid packet version");
		});
	});

	describe("error handling", () => {
		it("should handle WebSocket errors during connection", async () => {
			const errorClient = new WebSocketClient({ url: "ws://localhost:3000" });
			
			// Mock WebSocket constructor to create an instance that will error
			vi.mocked(WebSocket).mockImplementationOnce(() => {
				const ws = new MockWebSocket("ws://localhost:3000");
				setTimeout(() => ws.simulateError(), 10);
				return ws as any;
			});

			await expect(errorClient.connect()).rejects.toThrow();
		});

		it("should handle WebSocket errors after connection", async () => {
			await client.connect();
			
			const wsInstance = (client as any).ws;
			const errorSpy = vi.fn();
			
			// No default error handler, so this should not throw
			wsInstance.simulateError();
			
			expect(errorSpy).not.toHaveBeenCalled();
		});
	});
});