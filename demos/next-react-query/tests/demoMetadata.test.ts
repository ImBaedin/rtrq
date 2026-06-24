import { describe, expect, it } from "vitest";

import { demoMetadata } from "../src/demoMetadata";

describe("@rtrq/demo-next-react-query", () => {
  it("is scaffolded", () => {
    expect(demoMetadata.status).toBe("scaffold");
  });
});
