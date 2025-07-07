import { describe, it, expect } from "vitest";
import { isKeyMatch } from "./matcher";

describe("isKeyMatch", () => {
	describe("exact matches", () => {
		it("should match identical keys", () => {
			const subscriptionKey = ["post", 12];
			const invalidationKey = ["post", 12];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match identical complex keys", () => {
			const subscriptionKey = ["user", "profile", 123, "settings"];
			const invalidationKey = ["user", "profile", 123, "settings"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match empty keys", () => {
			const subscriptionKey: unknown[] = [];
			const invalidationKey: unknown[] = [];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match single element keys", () => {
			const subscriptionKey = ["post"];
			const invalidationKey = ["post"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match keys with mixed types", () => {
			const subscriptionKey = ["post", 12, true, "active"];
			const invalidationKey = ["post", 12, true, "active"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});
	});

	describe("prefix matches", () => {
		it("should match when invalidation key is a prefix of subscription key", () => {
			const subscriptionKey = ["post", 12];
			const invalidationKey = ["post"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match complex prefix patterns", () => {
			const subscriptionKey = ["user", "profile", 123, "settings", "notifications"];
			const invalidationKey = ["user", "profile", 123];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match when invalidation key is just the first element", () => {
			const subscriptionKey = ["post", 12, "comments", 456];
			const invalidationKey = ["post"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should match with nested object keys", () => {
			const subscriptionKey = ["api", "v1", "users", { id: 123 }];
			const invalidationKey = ["api", "v1"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});
	});

	describe("non-matches", () => {
		it("should not match when subscription key is shorter", () => {
			const subscriptionKey = ["post"];
			const invalidationKey = ["post", 12];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});

		it("should not match when keys are different", () => {
			const subscriptionKey = ["post", 12];
			const invalidationKey = ["user", 12];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});

		it("should not match when prefix doesn't match", () => {
			const subscriptionKey = ["post", 12, "comments"];
			const invalidationKey = ["post", 13];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});

		it("should not match empty invalidation key with non-empty subscription key", () => {
			const subscriptionKey = ["post", 12];
			const invalidationKey: unknown[] = [];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});

		it("should not match when types don't match", () => {
			const subscriptionKey = ["post", 12];
			const invalidationKey = ["post", "12"];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});

		it("should not match when objects don't match", () => {
			const subscriptionKey = ["user", { id: 123 }];
			const invalidationKey = ["user", { id: 124 }];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(false);
		});
	});

	describe("edge cases", () => {
		it("should handle null values", () => {
			const subscriptionKey = ["post", null, "comments"];
			const invalidationKey = ["post", null];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should handle undefined values", () => {
			const subscriptionKey = ["post", undefined, "comments"];
			const invalidationKey = ["post", undefined];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should handle boolean values", () => {
			const subscriptionKey = ["feature", true, "enabled"];
			const invalidationKey = ["feature", true];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should handle nested arrays", () => {
			const subscriptionKey = ["tags", ["urgent", "important"], "active"];
			const invalidationKey = ["tags", ["urgent", "important"]];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});

		it("should handle zero values", () => {
			const subscriptionKey = ["post", 0, "comments"];
			const invalidationKey = ["post", 0];

			expect(isKeyMatch(subscriptionKey, invalidationKey)).toBe(true);
		});
	});
});