import { describe, expect, it } from "vitest";

import { packageInfo } from "../src/index";

describe("@rtrq/server-sdk", () => {
  it("is scaffolded", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/server-sdk",
      runtime: "server",
      status: "scaffold"
    });
  });
});
