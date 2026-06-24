import { describe, expect, it } from "vitest";

import { packageInfo } from "../src/index";

describe("@rtrq/shared", () => {
  it("is scaffolded", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/shared",
      status: "scaffold"
    });
  });
});
