import { RTRQServer, RTRQServerOptions } from "./server";

// TODO:
// - Rate limiting invalidation requests
// - Setting up some API key system that can work for both self hosted deployments and a SaaS offering
// - Sandbox query keys per public key (we don't want 2 different applications invalidating each other)
// - Add a way to limit number of clients per public key
// - Need a way to map cors domains to public keys - should the consumer be able to intercept and prevent requests?

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
