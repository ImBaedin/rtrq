import { App } from "uWebSockets.js";

import { ClientPacket, validateClientPacket, versionCheck } from "@rtrq/utils";

import { VERSION } from "./utils/version";

const app = App();

// What in here?

// Probably a server class with a singleton?

// Need to think about how the application will consume this lib

// So return some object with hooks into the state of the server
