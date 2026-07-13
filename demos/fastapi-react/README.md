# FastAPI React Demo

Full-stack todo demo pairing a FastAPI backend with a React frontend.

The backend uses the Python server SDK with server URL, app ID, and API key. The frontend uses the TypeScript
React Query adapter with server URL and app ID only.

## Projects

- `backend`: FastAPI backend scaffold.
- `frontend`: Vite React frontend scaffold.

## Local stack

Run the RTRQ server:

```sh
uv run rtrq-server
```

Run the demo backend:

```sh
uv run rtrq-demo-fastapi-react-backend
```

Run the demo frontend:

```sh
bun --cwd demos/fastapi-react/frontend run dev
```

Open two browser tabs to the frontend, create or toggle todos in one tab, and the other tab should refetch after
RTRQ broadcasts the `["todos"]` invalidation.

## Status

Experimental full-stack demo implemented with in-memory todos and cross-client query invalidation.
