import { describe, expect, it } from "vitest";

import { docsAppMetadata } from "../src/content";

describe("@rtrq/docs", () => {
  it("is scaffolded", () => {
    expect(docsAppMetadata.status).toBe("scaffold");
  });
});
