import { EventEmitter } from "events";
import {
	App,
	AppOptions,
	HttpRequest,
	TemplatedApp,
	WebSocket,
} from "uWebSockets.js";
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
	request?: HttpRequest;
};

export type QueryUnsubscriptionEvent = {
	key: unknown[];
	clientId: string;
	remainingSubscribers: number;
	request?: HttpRequest;
};

export type QueryInvalidationEvent = {
	key: unknown[];
	matchedKeys: unknown[][];
	notifiedClients: number;
	totalSubscriptions: number;
	request?: HttpRequest;
};

export type QueryBeforeInvalidationEvent = {
	key: unknown[];
	matchedKeys: unknown[][];
	totalSubscriptions: number;
	preventDefault: () => void;
	request?: HttpRequest;
};

export type ClientConnectionEvent = {
	clientId: string;
	totalConnections: number;
	request?: HttpRequest;
};

export type ClientDisconnectionEvent = {
	clientId: string;
	code: number;
	message: string;
	remainingConnections: number;
	removedSubscriptions: unknown[];
	request?: HttpRequest;
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
}

export class RTRQServer extends EventEmitter {
	private app: TemplatedApp;
	private subscriptions: Map<string, Set<WebSocket<unknown>>> = new Map();
	private clientIds: Map<WebSocket<unknown>, string> = new Map();
	private clientRequests: Map<WebSocket<unknown>, HttpRequest> = new Map();
	private nextClientId = 1;
	private readonly allowedIps: Set<string>;
	private readonly maxBodySize: number;

	constructor(options?: RTRQServerOptions) {
		super();
		this.app = App(options?.appOptions);
		this.allowedIps = new Set(options?.allowedIps || []);
		this.maxBodySize = options?.maxBodySize || 1024 * 1024; // Default 1MB

		this.app.ws("/", {
			upgrade: (res, req, context) => {
				// Store the request for later use
				(context as any).request = req;
			},
			open: (ws) => {
				const clientId = `client-${this.nextClientId++}`;
				this.clientIds.set(ws, clientId);

				// Get the request from the context
				const request = (ws as any).context?.request;
				this.clientRequests.set(ws, request);

				this.emit("client:connect", {
					clientId,
					totalConnections: this.clientIds.size,
					request,
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
								request: this.clientRequests.get(ws),
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
								request: this.clientRequests.get(ws),
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

				const request = this.clientRequests.get(ws);
				this.clientIds.delete(ws);
				this.clientRequests.delete(ws);

				this.emit("client:disconnect", {
					clientId,
					code,
					message,
					remainingConnections: this.clientIds.size,
					removedSubscriptions,
					request,
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
						this.invalidateQuery(result.output.key, req);

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
	 * Subscribe to query before-invalidation events
	 * The callback can call preventDefault() to stop the invalidation from proceeding
	 */
	public onBeforeInvalidate(
		callback: (event: QueryBeforeInvalidationEvent) => void,
	) {
		this.on("query:before-invalidate", callback);
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
		const request = this.clientRequests.get(client);
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
		this.clientRequests.delete(client);

		// Emit disconnect event
		this.emit("client:disconnect", {
			clientId,
			code: 1006, // Abnormal Closure
			message: "Connection lost",
			remainingConnections: this.clientIds.size,
			removedSubscriptions,
			request,
		});
	}

	/**
	 * Invalidate a query and notify all subscribed clients
	 * Clients will be notified if their subscription key matches the invalidation key
	 * either exactly or as a prefix
	 */
	public invalidateQuery(key: unknown[], request?: HttpRequest) {
		// First, find all matching keys
		const matchedKeys: unknown[][] = [];
		for (const [subKey] of this.subscriptions.entries()) {
			const subscriptionKey = JSON.parse(subKey);
			if (isKeyMatch(subscriptionKey, key)) {
				matchedKeys.push(subscriptionKey);
			}
		}

		// Emit before-invalidation event
		let shouldPrevent = false;
		const preventDefault = () => {
			shouldPrevent = true;
		};

		this.emit("query:before-invalidate", {
			key,
			matchedKeys,
			totalSubscriptions: this.subscriptions.size,
			preventDefault,
			request,
		});

		// Check if invalidation was prevented
		if (shouldPrevent) {
			return;
		}

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

		let notifiedClients = 0;

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
			request,
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
