import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RTRQServer } from "./server";

// Mock fetch for HTTP requests
global.fetch = vi.fn();

describe("RTRQServer Invalidation API", () => {
	let server: RTRQServer;
	let serverPort: number;

	beforeEach(async () => {
		// Use random port for testing
		serverPort = Math.floor(Math.random() * 10000) + 30000;
		server = new RTRQServer({
			allowedIps: ["127.0.0.1", "::1"],
			maxBodySize: 1024,
		});
		
		// Start server
		await new Promise<void>((resolve) => {
			server.listen(serverPort);
			setTimeout(resolve, 100);
		});
	});

	afterEach(async () => {
		// Clean up server
		if (server) {
			server = null as any;
		}
		
		// Wait a bit for cleanup
		await new Promise(resolve => setTimeout(resolve, 100));
	});

	describe("POST /invalidate", () => {
		it("should accept valid invalidation requests", async () => {
			const invalidateHandler = vi.fn();
			server.onQueryInvalidate(invalidateHandler);

			const requestBody = {
				key: ["post", 12],
			};

			// Mock successful fetch
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					message: "Key invalidated successfully",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.ok).toBe(true);
			
			// Wait for invalidation to be processed
			await new Promise(resolve => setTimeout(resolve, 50));
			
			expect(invalidateHandler).toHaveBeenCalledWith({
				key: ["post", 12],
				matchedKeys: [],
				notifiedClients: 0,
				totalSubscriptions: 0,
				request: expect.any(Object),
			});
		});

		it("should reject invalid request body", async () => {
			const invalidRequestBody = {
				invalidField: "value",
			};

			// Mock error response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 400,
				json: async () => ({
					error: "Invalid request body",
					details: expect.any(Array),
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(invalidRequestBody),
			});

			expect(response.ok).toBe(false);
			expect(response.status).toBe(400);
		});

		it("should reject requests with invalid JSON", async () => {
			// Mock error response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 500,
				json: async () => ({
					error: "Failed to process invalidation request",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: "invalid json",
			});

			expect(response.ok).toBe(false);
			expect(response.status).toBe(500);
		});

		it("should reject requests exceeding max body size", async () => {
			const largeRequestBody = {
				key: new Array(1000).fill("large-key-item"),
			};

			// Mock error response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 413,
				json: async () => ({
					error: "Request too large",
					message: "Request body exceeds maximum size of 1024 bytes",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(largeRequestBody),
			});

			expect(response.ok).toBe(false);
			expect(response.status).toBe(413);
		});
	});

	describe("IP filtering", () => {
		let restrictedServer: RTRQServer;

		beforeEach(async () => {
			restrictedServer = new RTRQServer({
				allowedIps: ["192.168.1.1"], // Only allow specific IP
			});
			
			await new Promise<void>((resolve) => {
				restrictedServer.listen(serverPort + 1);
				setTimeout(resolve, 100);
			});
		});

		afterEach(() => {
			restrictedServer = null as any;
		});

		it("should reject requests from unauthorized IPs", async () => {
			const requestBody = {
				key: ["post", 12],
			};

			// Mock forbidden response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: false,
				status: 403,
				json: async () => ({
					error: "Access denied",
					message: "Your IP is not allowed to access this endpoint",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort + 1}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Forwarded-For": "127.0.0.1", // Unauthorized IP
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.ok).toBe(false);
			expect(response.status).toBe(403);
		});

		it("should accept requests from authorized IPs", async () => {
			const requestBody = {
				key: ["post", 12],
			};

			// Mock successful response
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					message: "Key invalidated successfully",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort + 1}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"X-Forwarded-For": "192.168.1.1", // Authorized IP
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.ok).toBe(true);
		});
	});

	describe("preventDefault functionality", () => {
		it("should prevent invalidation when preventDefault is called", async () => {
			const beforeHandler = vi.fn((event) => {
				event.preventDefault();
			});
			const invalidateHandler = vi.fn();

			server.onBeforeInvalidate(beforeHandler);
			server.onQueryInvalidate(invalidateHandler);

			const requestBody = {
				key: ["post", 12],
			};

			// Mock successful response (server still returns 200 even if prevented)
			vi.mocked(fetch).mockResolvedValueOnce({
				ok: true,
				status: 200,
				json: async () => ({
					message: "Key invalidated successfully",
				}),
			} as Response);

			const response = await fetch(`http://localhost:${serverPort}/invalidate`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(requestBody),
			});

			expect(response.ok).toBe(true);
			
			// Wait for events to be processed
			await new Promise(resolve => setTimeout(resolve, 50));
			
			expect(beforeHandler).toHaveBeenCalled();
			expect(invalidateHandler).not.toHaveBeenCalled();
		});
	});
});