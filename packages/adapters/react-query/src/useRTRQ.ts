import { useEffect, useRef, useState } from "react";
import { QueryClient, QueryKey, useQueryClient } from "@tanstack/react-query";

import { ClientConfig, WebSocketClient } from "@rtrq/core";

// Singleton instance of WebSocketClient
let wsClient: WebSocketClient | null = null;

export function getWebSocketClient(config?: ClientConfig) {
	if (!wsClient) {
		wsClient = new WebSocketClient(config ?? {});
	}
	return wsClient;
}

export interface UseRTRQOptions extends ClientConfig {
	queryClient?: QueryClient;
}

export function useRTRQ(options?: UseRTRQOptions) {
	const fetchedQueryClient = useQueryClient();
	const qc = options?.queryClient ?? fetchedQueryClient;

	if (!qc) {
		throw new Error(
			"[RTRQ] Query client not found! Maybe you didn't set up react query?",
		);
	}

	const queryCache = qc.getQueryCache();

	const [subbedQueries, setSubbedQueries] = useState<QueryKey[]>([]);
	const [activeQueries, setActiveQueries] = useState<QueryKey[]>([]);

	const ws = useRef<WebSocketClient | null>(null);

	useEffect(() => {
		ws.current = getWebSocketClient(options);

		ws.current.connect();

		ws.current.subscribe("invalidation", (data) => {
			void qc.invalidateQueries({
				queryKey: data.key,
			});
		});

		return () => {
			ws.current?.disconnect();
		};
	}, [options]);

	useEffect(() => {
		return queryCache.subscribe(() => {
			const queries = Object.values(queryCache.getAll());

			const activeQueries = queries.filter((q) => {
				return q.getObserversCount() > 0;
			});

			const activeQueryKeys = activeQueries.map((q) => q.queryKey);

			setActiveQueries(activeQueryKeys);
		});
	}, [queryCache, subbedQueries]);

	useEffect(() => {
		// Check if arrays have the same content before proceeding
		const areArraysEqual =
			activeQueries.length === subbedQueries.length &&
			activeQueries.every(
				(query, index) => query === subbedQueries[index],
			);

		if (areArraysEqual) return;

		const addedQueries = difference(activeQueries, subbedQueries);
		const removedQueries = difference(subbedQueries, activeQueries);

		removedQueries.forEach((query) => {
			ws.current?.send("unsubscription", {
				key: query,
			});
		});

		addedQueries.forEach((query) => {
			ws.current?.send("subscription", {
				key: query,
			});
		});

		setSubbedQueries(activeQueries);
	}, [activeQueries, subbedQueries]);
}

function difference<T>(a: T[], b: T[]) {
	return a.filter((item) => !b.includes(item));
}
