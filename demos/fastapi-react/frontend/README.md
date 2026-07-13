# FastAPI React Demo Frontend

Vite React frontend for the full-stack RTRQ todo demo. It uses TanStack Query for reads and mutations, then
connects the RTRQ React Query adapter so invalidations from the FastAPI backend can refetch matching clients.

The UI is intentionally bare bones: list todos, add a todo, toggle completion, and delete a todo.

## Runtime configuration

| Variable               | Default                 | Purpose             |
| ---------------------- | ----------------------- | ------------------- |
| `VITE_API_URL`         | `http://localhost:8001` | FastAPI backend URL |
| `VITE_RTRQ_SERVER_URL` | `http://localhost:8000` | RTRQ server URL     |
| `VITE_RTRQ_APP_ID`     | `dev`                   | RTRQ public app id  |

## Commands

```sh
bun run dev
bun run build
bun run typecheck
bun run test
```

## Status

Frontend todo UI implemented. The app uses the RTRQ React Query adapter to subscribe to todo invalidations:

```ts
useRtrqReactQuery({ appId, serverUrl, queryClient, keys: [["todos"]] });
```
