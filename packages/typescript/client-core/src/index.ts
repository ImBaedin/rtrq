import type { JsonValue, QueryKey, RtrqPackageInfo } from "@rtrq/shared";

export type MatchMode = "prefix" | "exact";
export type ClientStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "disconnecting";

export interface ConnectedMessage {
  connectionId: string;
  type: "connected";
}

export interface SubscribedMessage {
  key: QueryKey;
  type: "subscribed";
}

export interface UnsubscribedMessage {
  key: QueryKey;
  type: "unsubscribed";
}

export interface InvalidationMessage {
  appId: string;
  key: QueryKey;
  matchMode: MatchMode;
  type: "invalidation";
}

export interface ErrorMessage {
  code: string;
  message?: string;
  type: "error";
}

export type ServerMessage =
  | ConnectedMessage
  | ErrorMessage
  | InvalidationMessage
  | SubscribedMessage
  | UnsubscribedMessage;

export interface SubscribeMessage {
  key: QueryKey;
  type: "subscribe";
}

export interface UnsubscribeMessage {
  key: QueryKey;
  type: "unsubscribe";
}

export type ClientMessage = SubscribeMessage | UnsubscribeMessage;

export interface RtrqCloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

export interface RtrqClientEventMap {
  close: RtrqCloseEvent;
  connected: ConnectedMessage;
  error: Error | ErrorMessage;
  invalidation: InvalidationMessage;
  statuschange: ClientStatus;
  subscribed: SubscribedMessage;
  unsubscribed: UnsubscribedMessage;
}

export type RtrqClientEventName = keyof RtrqClientEventMap;
export type RtrqClientEventHandler<EventName extends RtrqClientEventName> = (
  event: RtrqClientEventMap[EventName],
) => void;
export type InvalidationHandler = (event: InvalidationMessage) => void;

export interface WebSocketEventMap {
  close: CloseEvent;
  error: Event;
  message: MessageEvent;
  open: Event;
}

export interface WebSocketLike {
  readonly readyState: number;
  addEventListener<EventName extends keyof WebSocketEventMap>(
    type: EventName,
    listener: (event: WebSocketEventMap[EventName]) => void,
  ): void;
  close(code?: number, reason?: string): void;
  removeEventListener<EventName extends keyof WebSocketEventMap>(
    type: EventName,
    listener: (event: WebSocketEventMap[EventName]) => void,
  ): void;
  send(data: string): void;
}

export interface WebSocketConstructor {
  new (url: string | URL, protocols?: string | string[]): WebSocketLike;
}

export interface ReconnectOptions {
  initialDelayMs?: number;
  maxAttempts?: number;
  maxDelayMs?: number;
}

export interface ClientCoreConfig {
  appId: string;
  autoConnect?: boolean;
  metadata?: Record<string, JsonValue>;
  protocols?: string | string[];
  reconnect?: boolean | ReconnectOptions;
  serverUrl: string;
  webSocket?: WebSocketConstructor;
}

export interface ClientSubscription {
  key: QueryKey;
  unsubscribe: () => void;
}

interface SubscriptionState {
  key: QueryKey;
  subscribers: Map<symbol, InvalidationHandler | undefined>;
}

interface SocketListeners {
  close: (event: CloseEvent) => void;
  error: (event: Event) => void;
  message: (event: MessageEvent) => void;
  open: (event: Event) => void;
}

const OPEN = 1;
const DEFAULT_INITIAL_RECONNECT_DELAY_MS = 250;
const DEFAULT_MAX_RECONNECT_DELAY_MS = 5_000;

export class RtrqClient {
  readonly appId: string;
  readonly serverUrl: string;

  #connectionId: string | undefined;
  #connectAfterDisconnect = false;
  #explicitlyClosed = false;
  #listeners = new Map<RtrqClientEventName, Set<(event: unknown) => void>>();
  #reconnectAttempts = 0;
  #reconnectTimer: ReturnType<typeof setTimeout> | undefined;
  #socket: WebSocketLike | undefined;
  #socketListeners = new WeakMap<WebSocketLike, SocketListeners>();
  #status: ClientStatus = "disconnected";
  #subscriptions = new Map<string, SubscriptionState>();

  constructor(readonly config: ClientCoreConfig) {
    this.appId = config.appId;
    this.serverUrl = config.serverUrl;

    if (config.autoConnect) {
      this.connect();
    }
  }

  get connectionId(): string | undefined {
    return this.#connectionId;
  }

  get status(): ClientStatus {
    return this.#status;
  }

  connect(): void {
    if (this.#status === "connecting" || this.#status === "connected") {
      return;
    }

    if (this.#status === "disconnecting") {
      this.#connectAfterDisconnect = true;
      return;
    }

    this.#clearReconnectTimer();
    this.#connectAfterDisconnect = false;
    this.#explicitlyClosed = false;
    this.#setStatus("connecting");

    const WebSocketImpl = this.config.webSocket ?? globalThis.WebSocket;
    if (WebSocketImpl === undefined) {
      this.#handleError(
        new Error(
          "WebSocket is not available. Pass config.webSocket to use RTRQ here.",
        ),
      );
      this.#setStatus("disconnected");
      return;
    }

    let socket: WebSocketLike;

    try {
      socket = new WebSocketImpl(
        buildWebSocketUrl({
          appId: this.config.appId,
          metadata: this.config.metadata,
          serverUrl: this.config.serverUrl,
        }),
        this.config.protocols,
      );
    } catch (error) {
      this.#handleError(
        error instanceof Error
          ? error
          : new Error("Failed to create RTRQ WebSocket"),
      );
      this.#setStatus("disconnected");
      return;
    }

    this.#socket = socket;
    this.#addSocketListeners(socket);
  }

  disconnect(code?: number, reason?: string): void {
    this.#connectAfterDisconnect = false;
    this.#explicitlyClosed = true;
    this.#clearReconnectTimer();

    if (this.#socket === undefined) {
      this.#setStatus("disconnected");
      return;
    }

    this.#setStatus("disconnecting");
    this.#socket.close(code, reason);
  }

  on<EventName extends RtrqClientEventName>(
    eventName: EventName,
    handler: RtrqClientEventHandler<EventName>,
  ): () => void {
    const listeners =
      this.#listeners.get(eventName) ?? new Set<(event: unknown) => void>();
    listeners.add(handler as (event: unknown) => void);
    this.#listeners.set(eventName, listeners);

    return () => {
      listeners.delete(handler as (event: unknown) => void);
    };
  }

  subscribe(key: QueryKey, handler?: InvalidationHandler): ClientSubscription {
    const normalizedKey = normalizeQueryKey(key);
    const keyId = getQueryKeyId(normalizedKey);
    const existingSubscription = this.#subscriptions.get(keyId);
    const subscription = existingSubscription ?? {
      key: normalizedKey,
      subscribers: new Map<symbol, InvalidationHandler | undefined>(),
    };
    const subscriberId = Symbol("rtrq-subscription");

    subscription.subscribers.set(subscriberId, handler);

    this.#subscriptions.set(keyId, subscription);

    if (existingSubscription === undefined) {
      this.#sendWhenOpen({ key: normalizedKey, type: "subscribe" });
    }

    let subscribed = true;

    return {
      key: normalizedKey,
      unsubscribe: () => {
        if (!subscribed) {
          return;
        }

        subscribed = false;
        this.#removeSubscriber(normalizedKey, subscriberId);
      },
    };
  }

  unsubscribe(key: QueryKey): void {
    const normalizedKey = normalizeQueryKey(key);
    const keyId = getQueryKeyId(normalizedKey);

    if (!this.#subscriptions.delete(keyId)) {
      return;
    }

    this.#sendWhenOpen({ key: normalizedKey, type: "unsubscribe" });
  }

  #handleOpen(socket: WebSocketLike): void {
    if (this.#socket !== socket) {
      return;
    }

    this.#reconnectAttempts = 0;
    this.#setStatus("connected");

    for (const subscription of this.#subscriptions.values()) {
      this.#sendWhenOpen({ key: subscription.key, type: "subscribe" });
    }
  }

  #handleMessage(socket: WebSocketLike, event: MessageEvent): void {
    if (this.#socket !== socket) {
      return;
    }

    let message: ServerMessage;

    try {
      message = parseServerMessage(event.data);
    } catch (error) {
      this.#handleError(
        error instanceof Error
          ? error
          : new Error("Invalid RTRQ server message"),
      );
      return;
    }

    switch (message.type) {
      case "connected":
        this.#connectionId = message.connectionId;
        this.#emit("connected", message);
        return;
      case "error":
        this.#emit("error", message);
        return;
      case "invalidation":
        this.#emit("invalidation", message);
        this.#dispatchInvalidation(message);
        return;
      case "subscribed":
        this.#emit("subscribed", message);
        return;
      case "unsubscribed":
        this.#emit("unsubscribed", message);
        return;
    }
  }

  #handleSocketError(socket: WebSocketLike): void {
    if (this.#socket !== socket) {
      return;
    }

    this.#handleError(new Error("RTRQ WebSocket error"));
  }

  #handleClose(socket: WebSocketLike, event: CloseEvent): void {
    if (this.#socket !== socket) {
      this.#removeSocketListeners(socket);
      return;
    }

    this.#removeSocketListeners(socket);
    this.#socket = undefined;
    this.#connectionId = undefined;
    this.#emit("close", {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean,
    });
    this.#setStatus("disconnected");

    if (this.#connectAfterDisconnect) {
      this.connect();
      return;
    }

    if (!this.#explicitlyClosed && this.#shouldReconnect()) {
      this.#scheduleReconnect();
    }
  }

  #dispatchInvalidation(event: InvalidationMessage): void {
    for (const subscription of this.#subscriptions.values()) {
      if (
        !queryKeyMatches({
          invalidatedKey: event.key,
          matchMode: event.matchMode,
          subscribedKey: subscription.key,
        })
      ) {
        continue;
      }

      for (const handler of subscription.subscribers.values()) {
        if (handler !== undefined) {
          handler(event);
        }
      }
    }
  }

  #removeSubscriber(key: QueryKey, subscriberId: symbol): void {
    const keyId = getQueryKeyId(key);
    const subscription = this.#subscriptions.get(keyId);

    if (subscription === undefined) {
      return;
    }

    subscription.subscribers.delete(subscriberId);

    if (subscription.subscribers.size > 0) {
      return;
    }

    this.#subscriptions.delete(keyId);
    this.#sendWhenOpen({ key, type: "unsubscribe" });
  }

  #emit<EventName extends RtrqClientEventName>(
    eventName: EventName,
    event: RtrqClientEventMap[EventName],
  ): void {
    const listeners = this.#listeners.get(eventName);

    if (listeners === undefined) {
      return;
    }

    for (const listener of listeners) {
      listener(event);
    }
  }

  #handleError(error: Error): void {
    this.#emit("error", error);
  }

  #sendWhenOpen(message: ClientMessage): void {
    if (this.#socket?.readyState !== OPEN) {
      return;
    }

    this.#socket.send(JSON.stringify(message));
  }

  #setStatus(status: ClientStatus): void {
    if (this.#status === status) {
      return;
    }

    this.#status = status;
    this.#emit("statuschange", status);
  }

  #shouldReconnect(): boolean {
    return (
      this.config.reconnect !== undefined && this.config.reconnect !== false
    );
  }

  #scheduleReconnect(): void {
    const reconnect = this.config.reconnect;
    const options = typeof reconnect === "object" ? reconnect : {};
    const maxAttempts = options.maxAttempts ?? Number.POSITIVE_INFINITY;

    if (this.#reconnectAttempts >= maxAttempts) {
      return;
    }

    const initialDelayMs =
      options.initialDelayMs ?? DEFAULT_INITIAL_RECONNECT_DELAY_MS;
    const maxDelayMs = options.maxDelayMs ?? DEFAULT_MAX_RECONNECT_DELAY_MS;
    const delayMs = Math.min(
      maxDelayMs,
      initialDelayMs * 2 ** this.#reconnectAttempts,
    );

    this.#reconnectAttempts += 1;
    this.#reconnectTimer = setTimeout(() => {
      this.#reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  #clearReconnectTimer(): void {
    if (this.#reconnectTimer === undefined) {
      return;
    }

    clearTimeout(this.#reconnectTimer);
    this.#reconnectTimer = undefined;
  }

  #addSocketListeners(socket: WebSocketLike): void {
    const listeners = {
      close: (event: CloseEvent) => this.#handleClose(socket, event),
      error: () => this.#handleSocketError(socket),
      message: (event: MessageEvent) => this.#handleMessage(socket, event),
      open: () => this.#handleOpen(socket),
    };

    this.#socketListeners.set(socket, listeners);
    socket.addEventListener("open", listeners.open);
    socket.addEventListener("message", listeners.message);
    socket.addEventListener("error", listeners.error);
    socket.addEventListener("close", listeners.close);
  }

  #removeSocketListeners(socket: WebSocketLike): void {
    const listeners = this.#socketListeners.get(socket);

    if (listeners === undefined) {
      return;
    }

    socket.removeEventListener("open", listeners.open);
    socket.removeEventListener("message", listeners.message);
    socket.removeEventListener("error", listeners.error);
    socket.removeEventListener("close", listeners.close);
    this.#socketListeners.delete(socket);
  }
}

export function createRtrqClient(config: ClientCoreConfig): RtrqClient {
  return new RtrqClient(config);
}

export function buildWebSocketUrl({
  appId,
  metadata,
  serverUrl,
}: Pick<ClientCoreConfig, "appId" | "metadata" | "serverUrl">): string {
  const url = new URL(serverUrl);

  if (url.protocol === "http:") {
    url.protocol = "ws:";
  } else if (url.protocol === "https:") {
    url.protocol = "wss:";
  }

  if (url.protocol !== "ws:" && url.protocol !== "wss:") {
    throw new Error(`Unsupported RTRQ server protocol: ${url.protocol}`);
  }

  const prefix = url.pathname.replace(/\/$/, "");
  url.pathname = `${prefix}/v1/apps/${encodeURIComponent(appId)}/ws`;

  if (metadata !== undefined) {
    url.searchParams.set("metadata", JSON.stringify(metadata));
  }

  return url.toString();
}

export function normalizeQueryKey(key: QueryKey): QueryKey {
  if (!Array.isArray(key)) {
    throw new Error("RTRQ query key must be an array");
  }

  return key.map((item) => normalizeJsonValue(item, "key")) as QueryKey;
}

export function getQueryKeyId(key: QueryKey): string {
  return JSON.stringify(normalizeQueryKey(key));
}

export function queryKeyMatches({
  invalidatedKey,
  matchMode,
  subscribedKey,
}: {
  invalidatedKey: QueryKey;
  matchMode: MatchMode;
  subscribedKey: QueryKey;
}): boolean {
  const normalizedInvalidatedKey = normalizeQueryKey(invalidatedKey);
  const normalizedSubscribedKey = normalizeQueryKey(subscribedKey);

  if (matchMode === "exact") {
    return (
      getQueryKeyId(normalizedInvalidatedKey) ===
      getQueryKeyId(normalizedSubscribedKey)
    );
  }

  if (normalizedSubscribedKey.length < normalizedInvalidatedKey.length) {
    return false;
  }

  return normalizedInvalidatedKey.every((value, index) => {
    return (
      JSON.stringify(value) === JSON.stringify(normalizedSubscribedKey[index])
    );
  });
}

function normalizeJsonValue(value: JsonValue, path: string): JsonValue {
  if (
    value === null ||
    typeof value === "boolean" ||
    typeof value === "string"
  ) {
    return value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error(`${path} must contain only finite numbers`);
    }

    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      normalizeJsonValue(item, `${path}[${index}]`),
    );
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([itemKey, itemValue]) => [
          itemKey,
          normalizeJsonValue(itemValue, `${path}.${itemKey}`),
        ]),
    );
  }

  throw new Error(`${path} must be JSON serializable`);
}

function parseServerMessage(data: unknown): ServerMessage {
  const payload = typeof data === "string" ? JSON.parse(data) : data;

  if (typeof payload !== "object" || payload === null || !("type" in payload)) {
    throw new Error("RTRQ server message must be an object with a type");
  }

  switch (payload.type) {
    case "connected":
      return {
        connectionId: readString(payload, "connectionId"),
        type: "connected",
      };
    case "error":
      return {
        code: readString(payload, "code"),
        message: readOptionalString(payload, "message"),
        type: "error",
      };
    case "invalidation":
      return {
        appId: readString(payload, "appId"),
        key: normalizeQueryKey(readQueryKey(payload, "key")),
        matchMode: readMatchMode(payload, "matchMode"),
        type: "invalidation",
      };
    case "subscribed":
      return {
        key: normalizeQueryKey(readQueryKey(payload, "key")),
        type: "subscribed",
      };
    case "unsubscribed":
      return {
        key: normalizeQueryKey(readQueryKey(payload, "key")),
        type: "unsubscribed",
      };
    default:
      throw new Error(
        `Unknown RTRQ server message type: ${String(payload.type)}`,
      );
  }
}

function readString(payload: object, field: string): string {
  const value = Reflect.get(payload, field);

  if (typeof value !== "string") {
    throw new Error(`RTRQ server message field ${field} must be a string`);
  }

  return value;
}

function readOptionalString(
  payload: object,
  field: string,
): string | undefined {
  const value = Reflect.get(payload, field);

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`RTRQ server message field ${field} must be a string`);
  }

  return value;
}

function readQueryKey(payload: object, field: string): QueryKey {
  const value = Reflect.get(payload, field);

  if (!Array.isArray(value)) {
    throw new Error(`RTRQ server message field ${field} must be an array`);
  }

  return value as QueryKey;
}

function readMatchMode(payload: object, field: string): MatchMode {
  const value = Reflect.get(payload, field);

  if (value === "exact" || value === "prefix") {
    return value;
  }

  throw new Error(
    `RTRQ server message field ${field} must be "exact" or "prefix"`,
  );
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/client-core",
  runtime: "browser",
  status: "experimental",
};
