import { QueryClient, type QueryClientConfig } from "@tanstack/react-query";
import {
  RTRQClient,
  type RTRQClientOptions,
  type RTRQInvalidationEvent,
} from "@rtrq/client-core";

export interface CreateRTRQQueryClientOptions {
  queryClient?: QueryClient;
  queryClientConfig?: QueryClientConfig;
  rtrq?: RTRQClient | RTRQClientOptions;
}

export interface RTRQQueryClientBinding {
  queryClient: QueryClient;
  rtrqClient: RTRQClient;
  disconnect(): Promise<void>;
}

export function createRTRQQueryClient(
  options: CreateRTRQQueryClientOptions = {},
): RTRQQueryClientBinding {
  const queryClient =
    options.queryClient ?? new QueryClient(options.queryClientConfig);
  const rtrqClient =
    options.rtrq instanceof RTRQClient
      ? options.rtrq
      : new RTRQClient(options.rtrq);

  return {
    queryClient,
    rtrqClient,
    disconnect: async () => {
      await rtrqClient.disconnect();
    },
  };
}

export async function handleRTRQInvalidation(
  queryClient: QueryClient,
  event: RTRQInvalidationEvent,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: event.keys,
  });
}
