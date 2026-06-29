import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildWebSocketUrl,
  createRtrqClient,
  getQueryKeyId,
  packageInfo,
  queryKeyMatches,
  type InvalidationMessage,
  type WebSocketEventMap,
  type WebSocketLike,
} from "../src/index";

class MockWebSocket implements WebSocketLike {
  static instances: MockWebSocket[] = [];

  readonly listeners = new Map<
    keyof WebSocketEventMap,
    Set<(event: WebSocketEventMap[keyof WebSocketEventMap]) => void>
  >();
  readonly sent: string[] = [];
  closedWith: { code: number; reason: string } | undefined;
  readyState = 0;

  constructor(
    readonly url: string | URL,
    readonly protocols?: string | string[],
  ) {
    MockWebSocket.instances.push(this);
  }

  addEventListener<EventName extends keyof WebSocketEventMap>(
    type: EventName,
    listener: (event: WebSocketEventMap[EventName]) => void,
  ): void {
    const listeners =
      this.listeners.get(type) ??
      new Set<(event: WebSocketEventMap[keyof WebSocketEventMap]) => void>();
    listeners.add(
      listener as (event: WebSocketEventMap[keyof WebSocketEventMap]) => void,
    );
    this.listeners.set(type, listeners);
  }

  close(code = 1000, reason = ""): void {
    this.closedWith = { code, reason };
    this.readyState = 2;
  }

  emit<EventName extends keyof WebSocketEventMap>(
    type: EventName,
    event: WebSocketEventMap[EventName],
  ): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  open(): void {
    this.readyState = 1;
    this.emit("open", new Event("open"));
  }

  finishClose(
    code = this.closedWith?.code ?? 1000,
    reason = this.closedWith?.reason ?? "",
  ): void {
    this.readyState = 3;
    this.emit("close", { code, reason, wasClean: code === 1000 } as CloseEvent);
  }

  receive(payload: unknown): void {
    this.emit("message", { data: JSON.stringify(payload) } as MessageEvent);
  }

  removeEventListener<EventName extends keyof WebSocketEventMap>(
    type: EventName,
    listener: (event: WebSocketEventMap[EventName]) => void,
  ): void {
    this.listeners
      .get(type)
      ?.delete(
        listener as (event: WebSocketEventMap[keyof WebSocketEventMap]) => void,
      );
  }

  send(data: string): void {
    this.sent.push(data);
  }
}

describe("@rtrq/client-core", () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useRealTimers();
  });

  it("exports package metadata", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/client-core",
      runtime: "browser",
      status: "experimental",
    });
  });

  it("builds the server websocket URL", () => {
    expect(
      buildWebSocketUrl({
        appId: "dev",
        metadata: { source: "test" },
        serverUrl: "https://rtrq.example.com/api/",
      }),
    ).toBe(
      "wss://rtrq.example.com/api/v1/apps/dev/ws?metadata=%7B%22source%22%3A%22test%22%7D",
    );
  });

  it("uses an injected websocket and replays subscriptions after opening", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });

    client.subscribe(["todos"]);
    client.connect();

    const socket = MockWebSocket.instances[0];
    expect(socket?.url.toString()).toBe("ws://localhost:8000/v1/apps/dev/ws");
    expect(socket?.sent).toEqual([]);

    socket?.open();

    expect(socket?.sent.map((message) => JSON.parse(message))).toEqual([
      {
        key: ["todos"],
        type: "subscribe",
      },
    ]);
  });

  it("tracks connection messages", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });
    const connected = vi.fn();

    client.on("connected", connected);
    client.connect();
    MockWebSocket.instances[0]?.open();
    MockWebSocket.instances[0]?.receive({
      connectionId: "connection_123",
      type: "connected",
    });

    expect(client.connectionId).toBe("connection_123");
    expect(connected).toHaveBeenCalledWith({
      connectionId: "connection_123",
      type: "connected",
    });
  });

  it("returns to disconnected when websocket creation fails", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "ftp://localhost:8000",
      webSocket: MockWebSocket,
    });
    const errors = vi.fn();

    client.on("error", errors);
    client.connect();

    expect(client.status).toBe("disconnected");
    expect(errors).toHaveBeenCalledWith(expect.any(Error));
    expect(MockWebSocket.instances).toEqual([]);
  });

  it("dispatches invalidations to matching local subscriptions", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });
    const parentInvalidation = vi.fn();
    const childInvalidation = vi.fn();

    client.subscribe(["todos"], parentInvalidation);
    client.subscribe(["todos", 1], childInvalidation);
    client.connect();
    MockWebSocket.instances[0]?.open();

    const prefixEvent = {
      appId: "dev",
      key: ["todos"],
      matchMode: "prefix",
      type: "invalidation",
    } satisfies InvalidationMessage;

    MockWebSocket.instances[0]?.receive(prefixEvent);

    expect(parentInvalidation).toHaveBeenCalledWith(prefixEvent);
    expect(childInvalidation).toHaveBeenCalledWith(prefixEvent);

    const exactEvent = {
      appId: "dev",
      key: ["todos"],
      matchMode: "exact",
      type: "invalidation",
    } satisfies InvalidationMessage;

    MockWebSocket.instances[0]?.receive(exactEvent);

    expect(parentInvalidation).toHaveBeenCalledTimes(2);
    expect(childInvalidation).toHaveBeenCalledTimes(1);
  });

  it("sends an unsubscribe message when the final local handler is removed", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });
    const subscription = client.subscribe(["todos"], vi.fn());

    client.connect();
    const socket = MockWebSocket.instances[0];
    socket?.open();
    socket?.sent.splice(0);

    subscription.unsubscribe();

    expect(socket?.sent.map((message) => JSON.parse(message))).toEqual([
      {
        key: ["todos"],
        type: "unsubscribe",
      },
    ]);
  });

  it("keeps duplicate handler subscriptions active independently", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });
    const handler = vi.fn();
    const firstSubscription = client.subscribe(["todos"], handler);
    const secondSubscription = client.subscribe(["todos"], handler);

    client.connect();
    const socket = MockWebSocket.instances[0];
    socket?.open();
    socket?.sent.splice(0);

    firstSubscription.unsubscribe();

    expect(socket?.sent).toEqual([]);

    const event = {
      appId: "dev",
      key: ["todos"],
      matchMode: "exact",
      type: "invalidation",
    } satisfies InvalidationMessage;

    socket?.receive(event);

    expect(handler).toHaveBeenCalledOnce();

    secondSubscription.unsubscribe();

    expect(socket?.sent.map((message) => JSON.parse(message))).toEqual([
      {
        key: ["todos"],
        type: "unsubscribe",
      },
    ]);
  });

  it("keeps handlerless subscriptions active until every handle is removed", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });
    const firstSubscription = client.subscribe(["todos"]);
    const secondSubscription = client.subscribe(["todos"]);

    client.connect();
    const socket = MockWebSocket.instances[0];
    socket?.open();
    socket?.sent.splice(0);

    firstSubscription.unsubscribe();

    expect(socket?.sent).toEqual([]);

    secondSubscription.unsubscribe();

    expect(socket?.sent.map((message) => JSON.parse(message))).toEqual([
      {
        key: ["todos"],
        type: "unsubscribe",
      },
    ]);
  });

  it("defers reconnect requests until the current socket closes", () => {
    const client = createRtrqClient({
      appId: "dev",
      serverUrl: "http://localhost:8000",
      webSocket: MockWebSocket,
    });

    client.connect();

    const firstSocket = MockWebSocket.instances[0];
    firstSocket?.open();

    client.disconnect();
    client.connect();

    expect(client.status).toBe("disconnecting");
    expect(MockWebSocket.instances).toHaveLength(1);

    firstSocket?.finishClose();

    expect(client.status).toBe("connecting");
    expect(MockWebSocket.instances).toHaveLength(2);

    const secondSocket = MockWebSocket.instances[1];
    secondSocket?.open();

    expect(client.status).toBe("connected");
  });

  it("canonicalizes object query keys for local matching", () => {
    expect(getQueryKeyId(["todos", { page: 1, status: "open" }])).toBe(
      getQueryKeyId(["todos", { status: "open", page: 1 }]),
    );
    expect(
      queryKeyMatches({
        invalidatedKey: ["todos", { status: "open", page: 1 }],
        matchMode: "exact",
        subscribedKey: ["todos", { page: 1, status: "open" }],
      }),
    ).toBe(true);
  });
});
