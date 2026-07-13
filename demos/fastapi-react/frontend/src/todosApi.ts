export type TodoId = number | string;

export interface Todo {
  id: TodoId;
  text: string;
  completed: boolean;
}

type Fetch = typeof fetch;

export interface TodosApi {
  listTodos: () => Promise<Todo[]>;
  addTodo: (text: string) => Promise<Todo>;
  updateTodo: (id: TodoId, completed: boolean) => Promise<Todo>;
  deleteTodo: (id: TodoId) => Promise<void>;
}

async function readErrorMessage(response: Response): Promise<string> {
  const fallback = `Request failed with ${response.status}`;

  try {
    const body = (await response.json()) as {
      detail?: unknown;
      message?: unknown;
    };
    const message = body.message ?? body.detail;

    return typeof message === "string" ? message : fallback;
  } catch {
    return fallback;
  }
}

async function requestJson<T>(
  fetchImpl: Fetch,
  url: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetchImpl(url, options);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function createTodosApi(
  apiUrl: string,
  fetchImpl: Fetch = fetch,
): TodosApi {
  const todoUrl = (id?: TodoId) => {
    const suffix = id === undefined ? "" : `/${encodeURIComponent(String(id))}`;

    return `${apiUrl}/todos${suffix}`;
  };

  return {
    listTodos: () => requestJson<Todo[]>(fetchImpl, todoUrl()),
    addTodo: (text) =>
      requestJson<Todo>(fetchImpl, todoUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      }),
    updateTodo: (id, completed) =>
      requestJson<Todo>(fetchImpl, todoUrl(id), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      }),
    deleteTodo: async (id) => {
      await requestJson<void>(fetchImpl, todoUrl(id), { method: "DELETE" });
    },
  };
}
