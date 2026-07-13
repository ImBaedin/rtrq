import {
  createRtrqClient,
  type ClientCoreConfig,
  type ClientSubscription,
  type InvalidationMessage,
  type RtrqClient,
} from "@rtrq/client-core";
import type { QueryKey as RtrqQueryKey, RtrqPackageInfo } from "@rtrq/shared";
import { useEffect } from "react";
import type {
  QueryClient,
  QueryKey as TanStackQueryKey,
} from "@tanstack/react-query";

export interface ReactQueryClientLike {
  invalidateQueries: QueryClient["invalidateQueries"];
}

export interface ReactQueryAdapterConfig extends Omit<
  ClientCoreConfig,
  "autoConnect"
> {
  keys?: readonly RtrqQueryKey[];
  queryClient: ReactQueryClientLike;
}

export interface RtrqReactQueryBridgeConfig {
  client: RtrqClient;
  keys: readonly RtrqQueryKey[];
  queryClient: ReactQueryClientLike;
}

export interface RtrqReactQueryBridge {
  unsubscribe: () => void;
}

export function createRtrqReactQueryBridge({
  client,
  keys,
  queryClient,
}: RtrqReactQueryBridgeConfig): RtrqReactQueryBridge {
  const subscriptions: ClientSubscription[] = keys.map((key) =>
    client.subscribe(key, (event) => {
      invalidateReactQueryKey(queryClient, event);
    }),
  );

  return {
    unsubscribe: () => {
      for (const subscription of subscriptions) {
        subscription.unsubscribe();
      }
    },
  };
}

export function useRtrqReactQuery({
  keys = [],
  queryClient,
  ...clientConfig
}: ReactQueryAdapterConfig): void {
  useEffect(() => {
    const client = createRtrqClient({
      ...clientConfig,
      autoConnect: false,
    });
    const bridge = createRtrqReactQueryBridge({
      client,
      keys,
      queryClient,
    });

    client.connect();

    return () => {
      bridge.unsubscribe();
      client.disconnect();
    };
  }, [
    clientConfig.appId,
    clientConfig.metadata,
    clientConfig.protocols,
    clientConfig.reconnect,
    clientConfig.serverUrl,
    clientConfig.webSocket,
    keys,
    queryClient,
  ]);
}

function invalidateReactQueryKey(
  queryClient: ReactQueryClientLike,
  event: InvalidationMessage,
): void {
  void queryClient.invalidateQueries({
    exact: event.matchMode === "exact",
    queryKey: event.key as TanStackQueryKey,
  });
}

export const packageInfo: RtrqPackageInfo = {
  name: "@rtrq/adapter-react-query",
  runtime: "browser",
  status: "experimental",
};
