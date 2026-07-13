# FastAPI React Demo Backend

FastAPI backend for the full-stack RTRQ demo.

This service exposes a tiny in-memory todo API and uses `rtrq-server-sdk` to send a prefix invalidation for
`["todos"]` after every mutation. It is intentionally stateful only in process; restarting the server clears all todos.

## API

- `GET /health`: service health and SDK scaffold status.
- `GET /todos`: list todos.
- `POST /todos`: create a todo with `{"text": "..."}`.
- `PATCH /todos/{todo_id}`: set completion with `{"completed": true}`.
- `POST /todos/{todo_id}/toggle`: toggle completion.
- `DELETE /todos/{todo_id}`: delete a todo.

Mutation endpoints call:

```python
await client.invalidate(["todos"], match_mode="prefix")
```

If the RTRQ invalidation fails, the mutation endpoint returns `502 Bad Gateway` with a clear error instead of silently
succeeding.

## Configuration

Environment variables:

- `RTRQ_SERVER_URL`: RTRQ server URL. Defaults to `http://localhost:8000`.
- `RTRQ_APP_ID`: RTRQ app ID. Defaults to `dev`.
- `RTRQ_API_KEY`: RTRQ server API key. Defaults to `dev-secret`.

The backend allows CORS requests from `http://localhost:5173` and `http://127.0.0.1:5173` for the local Vite frontend.

## Commands

```sh
uv run rtrq-demo-fastapi-react-backend
uv run pytest demos/fastapi-react/backend/tests
```
