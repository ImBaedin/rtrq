import { FormEvent, useMemo, useState } from "react";
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { getDemoConfig } from "./config";
import { useRtrqReactQuery } from "@rtrq/adapter-react-query";
import { createTodosApi, type Todo, type TodoId } from "./todosApi";

const todoQueryKey = ["todos"] as const;
const rtrqKeys = [todoQueryKey] as const;
const config = getDemoConfig();
const todosApi = createTodosApi(config.apiUrl);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
  },
});

function RtrqBridge() {
  const client = useQueryClient();

  useRtrqReactQuery({
    appId: config.rtrqAppId,
    serverUrl: config.rtrqServerUrl,
    queryClient: client,
    keys: rtrqKeys,
  });

  return null;
}

function TodoForm() {
  const client = useQueryClient();
  const [title, setTitle] = useState("");
  const addTodo = useMutation({
    mutationFn: todosApi.addTodo,
    onSuccess: async () => {
      setTitle("");
      await client.invalidateQueries({ queryKey: todoQueryKey });
    },
  });

  const trimmedTitle = title.trim();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (trimmedTitle.length > 0) {
      addTodo.mutate(trimmedTitle);
    }
  }

  return (
    <form className="todo-form" onSubmit={handleSubmit}>
      <label htmlFor="new-todo">New todo</label>
      <div className="todo-form-row">
        <input
          id="new-todo"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Write a todo"
          disabled={addTodo.isPending}
        />
        <button
          type="submit"
          disabled={trimmedTitle.length === 0 || addTodo.isPending}
        >
          {addTodo.isPending ? "Adding..." : "Add"}
        </button>
      </div>
      {addTodo.isError ? (
        <p className="error">{addTodo.error.message}</p>
      ) : null}
    </form>
  );
}

function TodoItem({ todo }: { todo: Todo }) {
  const client = useQueryClient();
  const invalidateTodos = () =>
    client.invalidateQueries({ queryKey: todoQueryKey });
  const toggleTodo = useMutation({
    mutationFn: ({ id, completed }: { id: TodoId; completed: boolean }) =>
      todosApi.updateTodo(id, completed),
    onSuccess: invalidateTodos,
  });
  const deleteTodo = useMutation({
    mutationFn: todosApi.deleteTodo,
    onSuccess: invalidateTodos,
  });
  const isMutating = toggleTodo.isPending || deleteTodo.isPending;

  return (
    <li className="todo-item">
      <label className="todo-toggle">
        <input
          type="checkbox"
          checked={todo.completed}
          disabled={isMutating}
          onChange={(event) =>
            toggleTodo.mutate({ id: todo.id, completed: event.target.checked })
          }
        />
        <span className={todo.completed ? "completed" : undefined}>
          {todo.text}
        </span>
      </label>
      <button
        type="button"
        className="secondary"
        disabled={isMutating}
        onClick={() => deleteTodo.mutate(todo.id)}
      >
        Delete
      </button>
      {toggleTodo.isError ? (
        <p className="error">Could not update: {toggleTodo.error.message}</p>
      ) : null}
      {deleteTodo.isError ? (
        <p className="error">Could not delete: {deleteTodo.error.message}</p>
      ) : null}
    </li>
  );
}

function TodoList() {
  const todosQuery = useQuery({
    queryKey: todoQueryKey,
    queryFn: todosApi.listTodos,
  });
  const sortedTodos = useMemo(() => {
    return [...(todosQuery.data ?? [])].sort(
      (a, b) => Number(a.completed) - Number(b.completed),
    );
  }, [todosQuery.data]);

  if (todosQuery.isPending) {
    return <p className="muted">Loading todos...</p>;
  }

  if (todosQuery.isError) {
    return (
      <p className="error">Could not load todos: {todosQuery.error.message}</p>
    );
  }

  if (sortedTodos.length === 0) {
    return <p className="muted">No todos yet.</p>;
  }

  return (
    <ul className="todo-list">
      {sortedTodos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}

function DemoApp() {
  return (
    <main className="shell">
      <section className="panel" aria-labelledby="demo-title">
        <div className="header">
          <div>
            <p className="eyebrow">FastAPI + React Query + RTRQ</p>
            <h1 id="demo-title">Todos</h1>
          </div>
          <div
            className="connection-details"
            aria-label="Runtime configuration"
          >
            <span>API: {config.apiUrl}</span>
            <span>RTRQ: {config.rtrqServerUrl}</span>
            <span>App: {config.rtrqAppId}</span>
          </div>
        </div>
        <TodoForm />
        <TodoList />
      </section>
    </main>
  );
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RtrqBridge />
      <DemoApp />
    </QueryClientProvider>
  );
}
