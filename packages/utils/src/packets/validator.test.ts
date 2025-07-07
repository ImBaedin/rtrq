import { describe, it, expect } from "vitest";
import {
	validatePacket,
	validateClientPacket,
	validateServerPacket,
	type Packet,
	type ClientPacket,
	type ServerPacket,
} from "./validator";

describe("packet validators", () => {
	describe("validatePacket", () => {
		it("should validate a valid base packet", () => {
			const packet = {
				type: "test",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
			};

			const result = validatePacket(packet);

			expect(result).toEqual(packet);
		});

		it("should throw error for missing type", () => {
			const packet = {
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
			};

			expect(() => validatePacket(packet)).toThrow();
		});

		it("should throw error for invalid source", () => {
			const packet = {
				type: "test",
				version: "1.0.0",
				timestamp: new Date(),
				source: "invalid-source",
			};

			expect(() => validatePacket(packet)).toThrow();
		});

		it("should throw error for invalid timestamp", () => {
			const packet = {
				type: "test",
				version: "1.0.0",
				timestamp: "invalid-date",
				source: "rtrq-client",
			};

			expect(() => validatePacket(packet)).toThrow();
		});

		it("should throw error for missing version", () => {
			const packet = {
				type: "test",
				timestamp: new Date(),
				source: "rtrq-client",
			};

			expect(() => validatePacket(packet)).toThrow();
		});
	});

	describe("validateClientPacket", () => {
		it("should validate a valid invalidation packet", () => {
			const packet: ClientPacket = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			const result = validateClientPacket(packet);

			expect(result).toEqual(packet);
		});

		it("should throw error for server packet with client validation", () => {
			const packet = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: ["post", 12],
				},
			};

			expect(() => validateClientPacket(packet)).toThrow();
		});

		it("should throw error for invalidation packet with wrong source", () => {
			const packet = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client", // Should be rtrq-server
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			expect(() => validateClientPacket(packet)).toThrow();
		});

		it("should throw error for invalidation packet with missing payload", () => {
			const packet = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
			};

			expect(() => validateClientPacket(packet)).toThrow();
		});

		it("should throw error for invalidation packet with invalid key", () => {
			const packet = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: "invalid-key", // Should be array
					invalidationRecievedAt: new Date(),
				},
			};

			expect(() => validateClientPacket(packet)).toThrow();
		});

		it("should validate invalidation packet with complex key", () => {
			const packet: ClientPacket = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["user", "profile", 123, { nested: "object" }, [1, 2, 3]],
					invalidationRecievedAt: new Date(),
				},
			};

			const result = validateClientPacket(packet);

			expect(result).toEqual(packet);
		});
	});

	describe("validateServerPacket", () => {
		it("should validate a valid subscription packet", () => {
			const packet: ServerPacket = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: ["post", 12],
				},
			};

			const result = validateServerPacket(packet);

			expect(result).toEqual(packet);
		});

		it("should validate a valid unsubscription packet", () => {
			const packet: ServerPacket = {
				type: "unsubscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: ["post", 12],
				},
			};

			const result = validateServerPacket(packet);

			expect(result).toEqual(packet);
		});

		it("should throw error for client packet with server validation", () => {
			const packet = {
				type: "invalidation",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server",
				payload: {
					key: ["post", 12],
					invalidationRecievedAt: new Date(),
				},
			};

			expect(() => validateServerPacket(packet)).toThrow();
		});

		it("should throw error for subscription packet with wrong source", () => {
			const packet = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-server", // Should be rtrq-client
				payload: {
					key: ["post", 12],
				},
			};

			expect(() => validateServerPacket(packet)).toThrow();
		});

		it("should throw error for subscription packet with missing payload", () => {
			const packet = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
			};

			expect(() => validateServerPacket(packet)).toThrow();
		});

		it("should throw error for subscription packet with invalid key", () => {
			const packet = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: "invalid-key", // Should be array
				},
			};

			expect(() => validateServerPacket(packet)).toThrow();
		});

		it("should validate subscription packet with complex key", () => {
			const packet: ServerPacket = {
				type: "subscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: ["user", "profile", 123, { nested: "object" }, [1, 2, 3]],
				},
			};

			const result = validateServerPacket(packet);

			expect(result).toEqual(packet);
		});

		it("should validate unsubscription packet with empty key", () => {
			const packet: ServerPacket = {
				type: "unsubscription",
				version: "1.0.0",
				timestamp: new Date(),
				source: "rtrq-client",
				payload: {
					key: [],
				},
			};

			const result = validateServerPacket(packet);

			expect(result).toEqual(packet);
		});
	});
});