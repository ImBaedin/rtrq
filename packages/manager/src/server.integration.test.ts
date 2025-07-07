import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RTRQServer } from "./server";
import WebSocket from "ws";

// Mock environment for testing
vi.mock("./env", () => ({
	VERSION: "1.0.0",
}));

describe("RTRQServer Integration Tests", () => {
	let server: RTRQServer;
	let serverPort: number;
	let wsUrl: string;

	beforeEach(async () => {
		// Use random port for testing
		serverPort = Math.floor(Math.random() * 10000) + 30000;
		wsUrl = `ws://localhost:${serverPort}`;
		
		server = new RTRQServer();
		
		// Start server and wait for it to be ready
		await new Promise<void>((resolve) => {
			server.listen(serverPort);
			// Small delay to ensure server is ready
			setTimeout(resolve, 100);
		});
	});

	afterEach(async () => {
		// Clean up server
		if (server) {
			// Note: RTRQServer doesn't have a close method, so we just clean up references
			server = null as any;
		}
		
		// Wait a bit for cleanup
		await new Promise(resolve => setTimeout(resolve, 100));
	});

	describe("WebSocket Connection", () => {
		it("should accept WebSocket connections", async () => {
			const connectionPromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					ws.close();
					resolve();
				});
				
				ws.on("error", (error) => {
					reject(error);
				});
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Connection timeout"));
				}, 5000);
			});

			await connectionPromise;
		});

		it("should emit client connect event", async () => {
			const connectHandler = vi.fn();
			server.onClientConnect(connectHandler);

			const connectionPromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// Wait a bit for event to be emitted
					setTimeout(() => {
						ws.close();
						resolve();
					}, 50);
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Connection timeout"));
				}, 5000);
			});

			await connectionPromise;

			expect(connectHandler).toHaveBeenCalledWith({
				clientId: expect.stringMatching(/^client-\d+$/),
				totalConnections: 1,
				request: expect.any(Object),
			});
		});

		it("should emit client disconnect event", async () => {
			const disconnectHandler = vi.fn();
			server.onClientDisconnect(disconnectHandler);

			const connectionPromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// Close connection immediately
					ws.close();
				});
				
				ws.on("close", () => {
					// Wait a bit for event to be emitted
					setTimeout(resolve, 100);
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					reject(new Error("Connection timeout"));
				}, 5000);
			});

			await connectionPromise;

			expect(disconnectHandler).toHaveBeenCalledWith({
				clientId: expect.stringMatching(/^client-\d+$/),
				code: expect.any(Number),
				message: expect.any(String),
				remainingConnections: 0,
				removedSubscriptions: [],
				request: expect.any(Object),
			});
		});
	});

	describe("Message Handling", () => {
		it("should handle subscription messages", async () => {
			const subscribeHandler = vi.fn();
			server.onQuerySubscribe(subscribeHandler);

			const messagePromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					// Wait for event to be processed
					setTimeout(() => {
						ws.close();
						resolve();
					}, 100);
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Message timeout"));
				}, 5000);
			});

			await messagePromise;

			expect(subscribeHandler).toHaveBeenCalledWith({
				key: ["post", 12],
				clientId: expect.stringMatching(/^client-\d+$/),
				totalSubscribers: 1,
				request: expect.any(Object),
			});
		});

		it("should handle unsubscription messages", async () => {
			const unsubscribeHandler = vi.fn();
			server.onQueryUnsubscribe(unsubscribeHandler);

			const messagePromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// First subscribe
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					// Then unsubscribe
					setTimeout(() => {
						const unsubscriptionMessage = {
							type: "unsubscription",
							version: "1.0.0",
							timestamp: new Date(),
							source: "rtrq-client",
							payload: {
								key: ["post", 12],
							},
						};
						
						ws.send(JSON.stringify(unsubscriptionMessage));
						
						// Wait for event to be processed
						setTimeout(() => {
							ws.close();
							resolve();
						}, 100);
					}, 50);
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Message timeout"));
				}, 5000);
			});

			await messagePromise;

			expect(unsubscribeHandler).toHaveBeenCalledWith({
				key: ["post", 12],
				clientId: expect.stringMatching(/^client-\d+$/),
				remainingSubscribers: 0,
				request: expect.any(Object),
			});
		});

		it("should handle invalid messages gracefully", async () => {
			const messagePromise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// Send invalid message
					ws.send("invalid json");
					
					// Wait for error response
					setTimeout(() => {
						ws.close();
						resolve();
					}, 100);
				});
				
				ws.on("message", (data) => {
					const message = JSON.parse(data.toString());
					if (message.type === "error") {
						// Expected error message received
						resolve();
					}
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Message timeout"));
				}, 5000);
			});

			await messagePromise;
		});
	});

	describe("Query Invalidation", () => {
		it("should notify subscribed clients when query is invalidated", async () => {
			const invalidationReceived = new Promise<any>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// Subscribe to a query
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					// Wait a bit, then invalidate the query
					setTimeout(() => {
						server.invalidateQuery(["post", 12]);
					}, 50);
				});
				
				ws.on("message", (data) => {
					const message = JSON.parse(data.toString());
					if (message.type === "invalidation") {
						ws.close();
						resolve(message);
					}
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Invalidation timeout"));
				}, 5000);
			});

			const invalidationMessage = await invalidationReceived;
			
			expect(invalidationMessage).toEqual({
				type: "invalidation",
				version: "1.0.0",
				timestamp: expect.any(String),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: expect.any(String),
				},
			});
		});

		it("should handle prefix matching for invalidations", async () => {
			const invalidationReceived = new Promise<any>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					// Subscribe to a specific query
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12, "comments"],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					// Wait a bit, then invalidate with a prefix
					setTimeout(() => {
						server.invalidateQuery(["post", 12]);
					}, 50);
				});
				
				ws.on("message", (data) => {
					const message = JSON.parse(data.toString());
					if (message.type === "invalidation") {
						ws.close();
						resolve(message);
					}
				});
				
				ws.on("error", reject);
				
				// Timeout after 5 seconds
				setTimeout(() => {
					ws.close();
					reject(new Error("Invalidation timeout"));
				}, 5000);
			});

			const invalidationMessage = await invalidationReceived;
			
			expect(invalidationMessage).toEqual({
				type: "invalidation",
				version: "1.0.0",
				timestamp: expect.any(String),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: expect.any(String),
				},
			});
		});
	});

	describe("Multiple Clients", () => {
		it("should handle multiple clients subscribing to same query", async () => {
			const subscribeHandler = vi.fn();
			server.onQuerySubscribe(subscribeHandler);

			const client1Promise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					setTimeout(() => {
						ws.close();
						resolve();
					}, 100);
				});
				
				ws.on("error", reject);
				
				setTimeout(() => {
					ws.close();
					reject(new Error("Client 1 timeout"));
				}, 5000);
			});

			const client2Promise = new Promise<void>((resolve, reject) => {
				const ws = new WebSocket(wsUrl);
				
				ws.on("open", () => {
					const subscriptionMessage = {
						type: "subscription",
						version: "1.0.0",
						timestamp: new Date(),
						source: "rtrq-client",
						payload: {
							key: ["post", 12],
						},
					};
					
					ws.send(JSON.stringify(subscriptionMessage));
					
					setTimeout(() => {
						ws.close();
						resolve();
					}, 100);
				});
				
				ws.on("error", reject);
				
				setTimeout(() => {
					ws.close();
					reject(new Error("Client 2 timeout"));
				}, 5000);
			});

			await Promise.all([client1Promise, client2Promise]);

			// Should have been called twice, once for each client
			expect(subscribeHandler).toHaveBeenCalledTimes(2);
			
			// First subscription should show 1 subscriber
			expect(subscribeHandler).toHaveBeenNthCalledWith(1, {
				key: ["post", 12],
				clientId: expect.stringMatching(/^client-\d+$/),
				totalSubscribers: 1,
				request: expect.any(Object),
			});
			
			// Second subscription should show 2 subscribers
			expect(subscribeHandler).toHaveBeenNthCalledWith(2, {
				key: ["post", 12],
				clientId: expect.stringMatching(/^client-\d+$/),
				totalSubscribers: 2,
				request: expect.any(Object),
			});
		});
	});
});