import * as v from "valibot";

// Extensible base rtrq packet schema
const basePacketSchema = v.object({
	type: v.string(),
	version: v.string(),
	timestamp: v.date(),
	source: v.picklist(["rtrq-server", "rtrq-client"]),
});

/*

Server -> Client

*/

// Query invalidation packet schema
const invalidationPacketSchema = v.object({
	...basePacketSchema.entries,

	type: v.literal("invalidation"),
	source: v.literal("rtrq-server"),

	payload: v.object({
		key: v.array(v.any()),
		invalidationRecievedAt: v.date(),
	}),
});

/*

Client -> Server

*/

const subscriptionPacketSchema = v.object({
	...basePacketSchema.entries,

	type: v.literal("subscription"),
	source: v.literal("rtrq-client"),

	payload: v.object({
		key: v.array(v.any()),
	}),
});

// Validator for packets recieved on client
const clientPacketValidator = v.variant("type", [invalidationPacketSchema]);

// Validator for packets recieved on server
const serverPacketValidator = v.variant("type", [subscriptionPacketSchema]);

export type Packet = v.InferOutput<typeof basePacketSchema>;
export type ClientPacket = v.InferOutput<typeof clientPacketValidator>;
export type ServerPacket = v.InferOutput<typeof serverPacketValidator>;

/**
 * Validate an RTRQ packet
 * @param packet - The packet to validate
 * @returns The validated packet
 * @throws If the packet is invalid
 */
export const validatePacket = (packet: any) => {
	const result = v.parse(basePacketSchema, packet);
	return result;
};

/**
 * Validate a client packet
 * @param packet - The packet to validate
 * @returns The validated packet
 */
export const validateClientPacket = (packet: any) => {
	const result = v.parse(clientPacketValidator, packet);
	return result;
};

/**
 * Validate a server packet
 * @param packet - The packet to validate
 * @returns The validated packet
 */
export const validateServerPacket = (packet: any) => {
	const result = v.parse(serverPacketValidator, packet);
	return result;
};
