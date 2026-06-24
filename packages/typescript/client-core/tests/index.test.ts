import { describe, expect, it } from "vitest";

import { packageInfo } from "../src/index";

describe("@rtrq/client-core", () => {
  it("is scaffolded", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/client-core",
      runtime: "browser",
      status: "scaffold"
    });
  });
});
