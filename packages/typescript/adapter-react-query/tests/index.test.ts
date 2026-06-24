import { describe, expect, it } from "vitest";

import { packageInfo } from "../src/index";

describe("@rtrq/adapter-react-query", () => {
  it("is scaffolded", () => {
    expect(packageInfo).toMatchObject({
      name: "@rtrq/adapter-react-query",
      status: "scaffold"
    });
  });
});
