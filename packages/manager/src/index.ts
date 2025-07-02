import { RTRQServer, RTRQServerOptions } from "./server";

export const createRTRQ = (options?: RTRQServerOptions) => {
	return new RTRQServer(options);
};

// Export types for consumers
export type {
	RTRQServerOptions,
	QuerySubscriptionEvent,
	QueryUnsubscriptionEvent,
	QueryInvalidationEvent,
	ClientConnectionEvent,
	ClientDisconnectionEvent,
	BeforeInvalidationEvent,
	BeforeConnectionEvent
} from "./server";
