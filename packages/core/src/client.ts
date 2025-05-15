import { ClientPacket, validateClientPacket } from "@rtrq/utils";

const DEFAULT_URL = "ws://rtrq.io/ws";

interface ClientConfig {
	url?: string;
	options?: {
		reconnect?: boolean;
		reconnectAttempts?: number;
		reconnectInterval?: number;
	};
}

type ClientEventTypes = ClientPacket["type"];

type EventHandler<T extends ClientEventTypes> = (
	payload: Extract<ClientPacket, { type: T }>["payload"],
) => void;

interface Subscription {
	unsubscribe: () => void;
}

/**
 * RTRQ websocket client
 *
 * Manages websocket connection and subscription logic
 */
export class WebSocketClient {
	private ws: WebSocket | null = null;
	private eventHandlers: Map<
		ClientEventTypes,
		Set<EventHandler<ClientEventTypes>>
	> = new Map();
	private reconnectAttempts = 0;
	private config: ClientConfig;

	constructor(config: ClientConfig) {
		this.config = config;
	}

	connect(): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.ws = new WebSocket(this.config.url ?? DEFAULT_URL);

				this.ws.onopen = () => {
					this.reconnectAttempts = 0;
					resolve();
				};

				this.ws.onmessage = (event) => {
					this.handleEvent(event);
				};

				this.ws.onclose = () => {
					if (this.config.options?.reconnect) {
						this.handleReconnect();
					}
				};

				this.ws.onerror = (error) => {
					reject(error);
				};
			} catch (error) {
				reject(error);
			}
		});
	}

	private handleReconnect() {
		if (
			this.reconnectAttempts <
			(this.config.options?.reconnectAttempts ?? 3)
		) {
			setTimeout(() => {
				this.reconnectAttempts++;
				this.connect();
			}, this.config.options?.reconnectInterval ?? 1000);
		}
	}

	// Type-safe subscribe method
	subscribe<T extends ClientEventTypes>(
		eventType: T,
		handler: EventHandler<T>,
	): Subscription {
		if (!this.eventHandlers.has(eventType)) {
			this.eventHandlers.set(eventType, new Set());
		}

		const handlers = this.eventHandlers.get(eventType)!;
		handlers.add(handler);

		return {
			unsubscribe: () => {
				handlers.delete(handler);
				if (handlers.size === 0) {
					this.eventHandlers.delete(eventType);
				}
			},
		};
	}

	private handleEvent(message: any) {
		try {
			const packet = validateClientPacket(message);

			const handlers = this.eventHandlers.get(packet.type);

			if (handlers) {
				handlers.forEach((handler) => handler(packet.payload));
			}
		} catch (error) {
			console.error("Failed to parse event message:", error);
		}
	}

	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}
}

function test() {
	const t = new WebSocketClient({});

	t.subscribe("invalidation", (payload) => {
		console.log(payload);
	});
}
