import { describe, it, expect, vi } from "vitest";
import { versionCheck } from "./versionCheck";
import { Packet } from "./validator";

// Mock semver to control the diff function
vi.mock("semver", () => ({
	diff: vi.fn(),
}));

describe("versionCheck", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Clear any previous console.warn calls
		vi.spyOn(console, "warn").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should return true when versions are compatible", () => {
		const { diff } = require("semver");
		diff.mockReturnValue(null); // No difference

		const packet: Packet = {
			type: "test",
			version: "1.0.0",
			timestamp: new Date(),
			source: "rtrq-client",
		};

		const result = versionCheck(packet, "1.0.0");

		expect(result).toBe(true);
		expect(diff).toHaveBeenCalledWith("1.0.0", "1.0.0");
		expect(console.warn).not.toHaveBeenCalled();
	});

	it("should return true but warn when there's a major version mismatch", () => {
		const { diff } = require("semver");
		diff.mockReturnValue("major");

		const packet: Packet = {
			type: "test",
			version: "2.0.0",
			timestamp: new Date(),
			source: "rtrq-client",
		};

		const result = versionCheck(packet, "1.0.0");

		expect(result).toBe(true);
		expect(diff).toHaveBeenCalledWith("2.0.0", "1.0.0");
		expect(console.warn).toHaveBeenCalledWith(
			"[RTRQ] Major version mismatch: 2.0.0 !== 1.0.0. Consider updating RTRQ.",
		);
	});

	it("should return true without warning for minor version differences", () => {
		const { diff } = require("semver");
		diff.mockReturnValue("minor");

		const packet: Packet = {
			type: "test",
			version: "1.1.0",
			timestamp: new Date(),
			source: "rtrq-client",
		};

		const result = versionCheck(packet, "1.0.0");

		expect(result).toBe(true);
		expect(diff).toHaveBeenCalledWith("1.1.0", "1.0.0");
		expect(console.warn).not.toHaveBeenCalled();
	});

	it("should return true without warning for patch version differences", () => {
		const { diff } = require("semver");
		diff.mockReturnValue("patch");

		const packet: Packet = {
			type: "test",
			version: "1.0.1",
			timestamp: new Date(),
			source: "rtrq-client",
		};

		const result = versionCheck(packet, "1.0.0");

		expect(result).toBe(true);
		expect(diff).toHaveBeenCalledWith("1.0.1", "1.0.0");
		expect(console.warn).not.toHaveBeenCalled();
	});

	it("should handle different packet versions correctly", () => {
		const { diff } = require("semver");
		diff.mockReturnValue("major");

		const packet: Packet = {
			type: "invalidation",
			version: "3.0.0",
			timestamp: new Date(),
			source: "rtrq-server",
		};

		const result = versionCheck(packet, "1.0.0");

		expect(result).toBe(true);
		expect(diff).toHaveBeenCalledWith("3.0.0", "1.0.0");
		expect(console.warn).toHaveBeenCalledWith(
			"[RTRQ] Major version mismatch: 3.0.0 !== 1.0.0. Consider updating RTRQ.",
		);
	});
});