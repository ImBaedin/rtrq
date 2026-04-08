export interface RTRQClientOptions {
  serverUrl?: string;
  sessionToken?: string | null;
  reconnectDelayMs?: number;
}

export interface RTRQInvalidationEvent {
  keys: readonly unknown[];
  receivedAt: string;
}

export type RTRQInvalidationHandler = (
  event: RTRQInvalidationEvent,
) => void | Promise<void>;

export class RTRQClient {
  readonly options: RTRQClientOptions;
  #handlers = new Set<RTRQInvalidationHandler>();
  #connected = false;

  constructor(options: RTRQClientOptions = {}) {
    this.options = options;
  }

  async connect(): Promise<void> {
    // TODO: add WebSocket lifecycle, authentication handshake, and backoff.
    this.#connected = true;
  }

  async disconnect(): Promise<void> {
    this.#connected = false;
  }

  get connected(): boolean {
    return this.#connected;
  }

  onInvalidation(handler: RTRQInvalidationHandler): () => void {
    this.#handlers.add(handler);

    return () => {
      this.#handlers.delete(handler);
    };
  }

  async emit(event: RTRQInvalidationEvent): Promise<void> {
    for (const handler of this.#handlers) {
      await handler(event);
    }
  }
}

