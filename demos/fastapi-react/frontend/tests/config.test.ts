import { describe, expect, it } from "vitest";

import {
  DEFAULT_API_URL,
  DEFAULT_RTRQ_APP_ID,
  DEFAULT_RTRQ_SERVER_URL,
  getDemoConfig,
} from "../src/config";

describe("demo config", () => {
  it("uses local defaults", () => {
    expect(getDemoConfig({})).toEqual({
      apiUrl: DEFAULT_API_URL,
      rtrqServerUrl: DEFAULT_RTRQ_SERVER_URL,
      rtrqAppId: DEFAULT_RTRQ_APP_ID,
    });
  });

  it("uses Vite environment values and trims trailing slashes", () => {
    expect(
      getDemoConfig({
        VITE_API_URL: "http://api.example.test/",
        VITE_RTRQ_SERVER_URL: "http://rtrq.example.test//",
        VITE_RTRQ_APP_ID: "demo",
      }),
    ).toEqual({
      apiUrl: "http://api.example.test",
      rtrqServerUrl: "http://rtrq.example.test",
      rtrqAppId: "demo",
    });
  });
});
