import { EventEmitter } from "events";
import { App, AppOptions, TemplatedApp, WebSocket } from "uWebSockets.js";
import * as v from "valibot";

import {
	ClientPacket,
	isKeyMatch,
	validateServerPacket,
	versionCheck,
} from "@rtrq/utils";

import { VERSION } from "./utils/version";

export type QuerySubscriptionEvent = {
	key: unknown[];
	clientId: string;
	totalSubscribers: number;
};

export type QueryUnsubscriptionEvent = {
	key: unknown[];
	clientId: string;
	remainingSubscribers: number;
};

export type QueryInvalidationEvent = {
	key: unknown[];
	matchedKeys: unknown[][];
	notifiedClients: number;
	totalSubscriptions: number;
};

export type ClientConnectionEvent = {
	clientId: string;
	totalConnections: number;
};

export type ClientDisconnectionEvent = {
	clientId: string;
	code: number;
	message: string;
	remainingConnections: number;
	removedSubscriptions: unknown[];
};

// Schema for the invalidation request body
const invalidationRequestSchema = v.object({
	key: v.array(v.unknown()),
});

export interface RTRQServerOptions {
	appOptions?: AppOptions;
	/**
	 * List of IP addresses allowed to access the invalidation endpoint
	 * If not provided, no IP restrictions are applied
	 */
	allowedIps?: string[];
	/**
	 * Maximum size of the request body in bytes
	 * Defaults to 1MB
	 */
	maxBodySize?: number;
	/**
	 * Secret key required for invalidation requests
	 * If not provided, no authentication is required
	 */
	secretKey?: string;
	/**
	 * CORS origin to allow for WebSocket connections
	 * If not provided, all origins are allowed
	 */
	corsOrigin?: string;
}

export class RTRQServer extends EventEmitter {
	private app: TemplatedApp;
	private subscriptions: Map<string, Set<WebSocket<unknown>>> = new Map();
	private clientIds: Map<WebSocket<unknown>, string> = new Map();
	private nextClientId = 1;
	private readonly allowedIps: Set<string>;
	private readonly maxBodySize: number;
	private readonly secretKey?: string;
	private readonly corsOrigin?: string;

	constructor(options?: RTRQServerOptions) {
		super();
		this.app = App(options?.appOptions);
		this.allowedIps = new Set(options?.allowedIps || []);
		this.maxBodySize = options?.maxBodySize || 1024 * 1024; // Default 1MB
		this.secretKey = options?.secretKey;
		this.corsOrigin = options?.corsOrigin;

		this.app.ws("/", {
			upgrade: (res, req, context) => {
				// Check CORS origin if configured
				if (this.corsOrigin) {
					const origin = req.getHeader("origin");
					if (origin !== this.corsOrigin) {
						res.writeStatus("403 Forbidden");
						res.writeHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ error: "Origin not allowed" }));
						return;
					}
				}
				
				// Proceed with WebSocket upgrade
				res.upgrade(
					{},
					req.getHeader("sec-websocket-key"),
					req.getHeader("sec-websocket-protocol"),
					req.getHeader("sec-websocket-extensions"),
					context
				);
			},
			open: (ws) => {
				const clientId = `client-${this.nextClientId++}`;
				this.clientIds.set(ws, clientId);

				this.emit("client:connect", {
					clientId,
					totalConnections: this.clientIds.size,
				});
			},
			message: (ws, message) => {
				try {
					const packet = JSON.parse(Buffer.from(message).toString());

					// Validate packet version
					if (!versionCheck(packet, VERSION)) {
						ws.send(
							JSON.stringify({
								type: "error",
								message: "Version mismatch",
							}),
						);
						return;
					}

					// Validate packet structure
					const validatedPacket = validateServerPacket(packet);

					// Handle different packet types
					switch (validatedPacket.type) {
						case "subscription": {
							const key = JSON.stringify(
								validatedPacket.payload.key,
							);
							if (!this.subscriptions.has(key)) {
								this.subscriptions.set(key, new Set());
							}
							this.subscriptions.get(key)?.add(ws);

							this.emit("query:subscribe", {
								key: validatedPacket.payload.key,
								clientId: this.clientIds.get(ws) || "unknown",
								totalSubscribers:
									this.subscriptions.get(key)?.size || 0,
							});
							break;
						}
						case "unsubscription": {
							const key = JSON.stringify(
								validatedPacket.payload.key,
							);
							this.subscriptions.get(key)?.delete(ws);
							const remainingSubscribers =
								this.subscriptions.get(key)?.size || 0;

							if (remainingSubscribers === 0) {
								this.subscriptions.delete(key);
							}

							this.emit("query:unsubscribe", {
								key: validatedPacket.payload.key,
								clientId: this.clientIds.get(ws) || "unknown",
								remainingSubscribers,
							});
							break;
						}
					}

					this.emit("client:message", ws, validatedPacket);
				} catch (error) {
					console.error("Error processing message:", error);
					ws.send(
						JSON.stringify({
							type: "error",
							message: "Invalid message format",
						}),
					);
				}
			},
			close: (ws, code, message) => {
				const clientId = this.clientIds.get(ws) || "unknown";
				const removedSubscriptions: unknown[] = [];

				// Remove client from all subscriptions
				for (const [key, clients] of this.subscriptions.entries()) {
					if (clients.has(ws)) {
						clients.delete(ws);
						if (clients.size === 0) {
							this.subscriptions.delete(key);
						}
						removedSubscriptions.push(JSON.parse(key));
					}
				}

				this.clientIds.delete(ws);

				this.emit("client:disconnect", {
					clientId,
					code,
					message,
					remainingConnections: this.clientIds.size,
					removedSubscriptions,
				});
			},
		});

		// Setup invalidation endpoint
		this.app.post("/invalidate", async (res, req) => {
			// Check IP allow-list if configured
			if (this.allowedIps.size > 0) {
				const clientIp = req.getHeader("x-forwarded-for");
				if (!clientIp || !this.allowedIps.has(clientIp)) {
					res.writeStatus("403 Forbidden");
					res.writeHeader("Content-Type", "application/json");
					res.end(
						JSON.stringify({
							error: "Access denied",
							message:
								"Your IP is not allowed to access this endpoint",
						}),
					);
					return;
				}
			}

			// Check secret key authentication if configured
			if (this.secretKey) {
				const authHeader = req.getHeader("authorization");
				const providedKey = authHeader?.startsWith("Bearer ") 
					? authHeader.slice(7) 
					: authHeader;
				
				if (providedKey !== this.secretKey) {
					res.writeStatus("401 Unauthorized");
					res.writeHeader("Content-Type", "application/json");
					res.end(
						JSON.stringify({
							error: "Unauthorized",
							message: "Invalid or missing secret key",
						}),
					);
					return;
				}
			}

			// Track body size
			let bodySize = 0;
			let body = "";

			// Handle data chunks
			res.onData((chunk, isLast) => {
				bodySize += chunk.byteLength;

				// Check if body size exceeds limit
				if (bodySize > this.maxBodySize) {
					res.writeStatus("413 Payload Too Large");
					res.writeHeader("Content-Type", "application/json");
					res.end(
						JSON.stringify({
							error: "Request too large",
							message: `Request body exceeds maximum size of ${this.maxBodySize} bytes`,
						}),
					);
					return;
				}

				body += Buffer.from(chunk).toString();

				if (isLast) {
					try {
						// Parse and validate the request body
						const data = JSON.parse(body);
						const result = v.safeParse(
							invalidationRequestSchema,
							data,
						);

						if (!result.success) {
							res.writeStatus("400 Bad Request");
							res.writeHeader("Content-Type", "application/json");
							res.end(
								JSON.stringify({
									error: "Invalid request body",
									details: result.issues,
								}),
							);
							return;
						}

						// Invalidate the key
						this.invalidateQuery(result.output.key);

						// Send success response
						res.writeStatus("200 OK");
						res.writeHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								message: "Key invalidated successfully",
							}),
						);
					} catch (error) {
						console.error(
							"Error processing invalidation request:",
							error,
						);
						res.writeStatus("500 Internal Server Error");
						res.writeHeader("Content-Type", "application/json");
						res.end(
							JSON.stringify({
								error: "Failed to process invalidation request",
							}),
						);
					}
				}
			});

			// Handle request errors
			res.onAborted(() => {
				console.error("Invalidation request aborted");
			});
		});
	}

	/**
	 * Subscribe to query subscription events
	 */
	public onQuerySubscribe(callback: (event: QuerySubscriptionEvent) => void) {
		this.on("query:subscribe", callback);
		return this;
	}

	/**
	 * Subscribe to query unsubscription events
	 */
	public onQueryUnsubscribe(
		callback: (event: QueryUnsubscriptionEvent) => void,
	) {
		this.on("query:unsubscribe", callback);
		return this;
	}

	/**
	 * Subscribe to query invalidation events
	 */
	public onQueryInvalidate(
		callback: (event: QueryInvalidationEvent) => void,
	) {
		this.on("query:invalidate", callback);
		return this;
	}

	/**
	 * Subscribe to client connection events
	 */
	public onClientConnect(callback: (event: ClientConnectionEvent) => void) {
		this.on("client:connect", callback);
		return this;
	}

	/**
	 * Subscribe to client disconnection events
	 */
	public onClientDisconnect(
		callback: (event: ClientDisconnectionEvent) => void,
	) {
		this.on("client:disconnect", callback);
		return this;
	}

	/**
	 * Remove a dead client from all subscriptions and client tracking
	 */
	private removeDeadClient(client: WebSocket<unknown>) {
		const clientId = this.clientIds.get(client) || "unknown";
		const removedSubscriptions: unknown[] = [];

		// Remove client from all subscriptions
		for (const [key, clients] of this.subscriptions.entries()) {
			if (clients.has(client)) {
				clients.delete(client);
				if (clients.size === 0) {
					this.subscriptions.delete(key);
				}
				removedSubscriptions.push(JSON.parse(key));
			}
		}

		// Remove client from tracking
		this.clientIds.delete(client);

		// Emit disconnect event
		this.emit("client:disconnect", {
			clientId,
			code: 1006, // Abnormal Closure
			message: "Connection lost",
			remainingConnections: this.clientIds.size,
			removedSubscriptions,
		});
	}

	/**
	 * Invalidate a query and notify all subscribed clients
	 * Clients will be notified if their subscription key matches the invalidation key
	 * either exactly or as a prefix
	 */
	public invalidateQuery(key: unknown[]) {
		const invalidationPacket: ClientPacket = {
			type: "invalidation",
			version: VERSION,
			timestamp: new Date(),
			source: "rtrq-server",
			payload: {
				key,
				invalidationRecievedAt: new Date(),
			},
		};

		const matchedKeys: unknown[][] = [];
		let notifiedClients = 0;

		// First, find all matching keys
		for (const [subKey] of this.subscriptions.entries()) {
			const subscriptionKey = JSON.parse(subKey);
			if (isKeyMatch(subscriptionKey, key)) {
				matchedKeys.push(subscriptionKey);
			}
		}

		// Then notify all clients subscribed to matching keys
		for (const matchedKey of matchedKeys) {
			const keyStr = JSON.stringify(matchedKey);
			const clients = this.subscriptions.get(keyStr);
			if (clients) {
				// Create a copy of the clients set to avoid modification during iteration
				const clientsCopy = new Set(clients);
				clientsCopy.forEach((client) => {
					try {
						client.send(JSON.stringify(invalidationPacket));
						notifiedClients++;
					} catch (error) {
						console.error(
							"Failed to send invalidation to client:",
							error,
						);
						// Remove the dead client
						this.removeDeadClient(client);
					}
				});
			}
		}

		this.emit("query:invalidate", {
			key,
			matchedKeys,
			notifiedClients,
			totalSubscriptions: this.subscriptions.size,
		});
	}

	/**
	 * Start the server on the specified port
	 */
	public listen(port: number) {
		this.app.listen(port, (token) => {
			if (token) {
				console.log(`RTRQ Server listening on port ${port}`);
			} else {
				console.error(`Failed to start RTRQ Server on port ${port}`);
			}
		});
	}
}
