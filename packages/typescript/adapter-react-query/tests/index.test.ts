import { describe, expect, it, vi } from "vitest";

import type { RtrqClient } from "@rtrq/client-core";

import { createRtrqReactQueryBridge, packageInfo } from "../src/index";

describe("@rtrq/adapter-react-query", () => {
  it("exports experimental package metadata", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/adapter-react-query",
      status: "experimental",
    });
  });

  it("subscribes keys and invalidates matching React Query queries", () => {
    const unsubscribe = vi.fn();
    const subscribe = vi.fn((_key, _handler) => ({ unsubscribe }));
    const invalidateQueries = vi.fn();

    createRtrqReactQueryBridge({
      client: { subscribe } as unknown as RtrqClient,
      keys: [["todos"]],
      queryClient: { invalidateQueries },
    });

    expect(subscribe).toHaveBeenCalledWith(["todos"], expect.any(Function));

    const handler = subscribe.mock.calls[0]?.[1];
    handler?.({
      appId: "dev",
      key: ["todos"],
      matchMode: "prefix",
      type: "invalidation",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: false,
      queryKey: ["todos"],
    });
  });

  it("preserves exact invalidation mode", () => {
    const subscribe = vi.fn((_key, _handler) => ({ unsubscribe: vi.fn() }));
    const invalidateQueries = vi.fn();

    createRtrqReactQueryBridge({
      client: { subscribe } as unknown as RtrqClient,
      keys: [["todos", 1]],
      queryClient: { invalidateQueries },
    });

    const handler = subscribe.mock.calls[0]?.[1];
    handler?.({
      appId: "dev",
      key: ["todos", 1],
      matchMode: "exact",
      type: "invalidation",
    });

    expect(invalidateQueries).toHaveBeenCalledWith({
      exact: true,
      queryKey: ["todos", 1],
    });
  });

  it("unsubscribes all client subscriptions", () => {
    const firstUnsubscribe = vi.fn();
    const secondUnsubscribe = vi.fn();
    const subscribe = vi
      .fn()
      .mockReturnValueOnce({ unsubscribe: firstUnsubscribe })
      .mockReturnValueOnce({ unsubscribe: secondUnsubscribe });

    const bridge = createRtrqReactQueryBridge({
      client: { subscribe } as unknown as RtrqClient,
      keys: [["todos"], ["todo", 1]],
      queryClient: { invalidateQueries: vi.fn() },
    });

    bridge.unsubscribe();

    expect(firstUnsubscribe).toHaveBeenCalledOnce();
    expect(secondUnsubscribe).toHaveBeenCalledOnce();
  });
});
