import {
	ClientPacket,
	ServerPacket,
	validateClientPacket,
	versionCheck,
} from "@rtrq/utils";

import { VERSION } from "./utils/version";

const DEFAULT_URL = "ws://connect.rtrq.io";

export interface ClientConfig {
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
	) {
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
		let packet: ClientPacket;

		try {
			packet = validateClientPacket(message);
		} catch (error) {
			console.error("Failed to parse event message:", error);
			return;
		}

		const handlers = this.eventHandlers.get(packet.type);

		if (handlers) {
			handlers.forEach((handler) => handler(packet.payload));
		}

		if (!versionCheck(packet, VERSION)) {
			throw new Error(
				`Invalid packet version: ${packet.version}. Client version: ${VERSION}.`,
			);
		}
	}

	disconnect() {
		if (this.ws) {
			this.ws.close();
			this.ws = null;
		}
	}

	/**
	 * Send a packet to the server
	 * @param type - The type of packet to send
	 * @param payload - The payload to send
	 * @throws Error if the connection is not open
	 */
	send<T extends ServerPacket["type"]>(
		type: T,
		payload: Extract<ServerPacket, { type: T }>["payload"],
	): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
			throw new Error("WebSocket connection is not open");
		}

		const packet: ServerPacket = {
			type,
			version: VERSION,
			timestamp: new Date(),
			source: "rtrq-client",
			payload,
		};

		this.ws.send(JSON.stringify(packet));
	}
}
