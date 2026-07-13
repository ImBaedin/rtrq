import { describe, expect, it } from "vitest";

import { demoMetadata } from "../src/demoMetadata";

describe("@rtrq/demo-fastapi-react-frontend", () => {
  it("describes the todo demo", () => {
    expect(demoMetadata.status).toBe("todo-demo");
  });
});
