import { diff } from "semver";

import { Packet } from "./validator";

/**
 * Compare the version of the packet to the version of whatever service is consuming it
 * @param packet - The packet to verify
 * @param version - The version to verify against
 * @returns True if the version is valid
 */
export const versionCheck = (packet: Packet, version: string) => {
	// Major version mismatch
	if (diff(packet.version, version) === "major") {
		console.warn(
			`[RTRQ] Major version mismatch: ${packet.version} !== ${version}. Consider updating RTRQ.`,
		);
	}

	// For now, we will just verify major versions.
	// If we need to, we can add more granular version checks in the future.

	return true;
};
