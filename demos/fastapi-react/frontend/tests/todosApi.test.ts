import { describe, expect, it, vi } from "vitest";

import { createTodosApi } from "../src/todosApi";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("todos api", () => {
  it("fetches todos from the configured backend", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse([{ id: "1", text: "Ship demo", completed: false }]),
      );
    const api = createTodosApi("http://localhost:8001", fetchImpl);

    await expect(api.listTodos()).resolves.toEqual([
      { id: "1", text: "Ship demo", completed: false },
    ]);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://localhost:8001/todos",
      undefined,
    );
  });

  it("adds todos with a JSON body", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ id: "2", text: "Write tests", completed: false }),
      );
    const api = createTodosApi("http://localhost:8001", fetchImpl);

    await api.addTodo("Write tests");

    expect(fetchImpl).toHaveBeenCalledWith("http://localhost:8001/todos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Write tests" }),
    });
  });

  it("updates and deletes encoded todo ids", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ id: "a/b", text: "Toggle", completed: true }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    const api = createTodosApi("http://localhost:8001", fetchImpl);

    await api.updateTodo("a/b", true);
    await api.deleteTodo("a/b");

    expect(fetchImpl).toHaveBeenNthCalledWith(
      1,
      "http://localhost:8001/todos/a%2Fb",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      },
    );
    expect(fetchImpl).toHaveBeenNthCalledWith(
      2,
      "http://localhost:8001/todos/a%2Fb",
      { method: "DELETE" },
    );
  });

  it("throws backend error messages", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ detail: "Todo not found" }, { status: 404 }),
      );
    const api = createTodosApi("http://localhost:8001", fetchImpl);

    await expect(api.listTodos()).rejects.toThrow("Todo not found");
  });
});
