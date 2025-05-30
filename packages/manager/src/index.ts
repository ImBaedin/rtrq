import { RTRQServer, RTRQServerOptions } from "./server";

export const createRTRQ = (options?: RTRQServerOptions) => {
	return new RTRQServer(options);
};
