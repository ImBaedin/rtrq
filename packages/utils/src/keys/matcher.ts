/**
 * Check if a subscription key matches an invalidation key
 * A subscription key matches if:
 * 1. It's exactly the same as the invalidation key
 * 2. The invalidation key is a prefix of the subscription key
 *
 * Examples:
 * - ['post', 12] matches ['post', 12] (exact match)
 * - ['post', 12] matches ['post'] (prefix match)
 * - ['post'] does not match ['post', 12] (not a prefix)
 */
export const isKeyMatch = (
	subscriptionKey: unknown[],
	invalidationKey: unknown[],
): boolean => {
	// Exact match
	if (subscriptionKey.length === invalidationKey.length) {
		return subscriptionKey.every(
			(item, index) => item === invalidationKey[index],
		);
	}

	// Prefix match (invalidation key must be shorter)
	if (invalidationKey.length < subscriptionKey.length) {
		return invalidationKey.every(
			(item, index) => item === subscriptionKey[index],
		);
	}

	return false;
};
