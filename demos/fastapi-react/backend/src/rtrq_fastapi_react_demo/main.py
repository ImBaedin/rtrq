from __future__ import annotations

import os
from collections.abc import AsyncIterator
from dataclasses import dataclass
from typing import Protocol

from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from rtrq_server_sdk import package_info

app = FastAPI(
    title="RTRQ FastAPI React Demo Backend",
    description="Tiny todo API demonstrating RTRQ invalidations from FastAPI.",
    version="0.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


class RtrqInvalidator(Protocol):
    async def invalidate(self, key: list[str], *, match_mode: str) -> object: ...


@dataclass(frozen=True)
class DemoConfig:
    rtrq_server_url: str
    rtrq_app_id: str
    rtrq_api_key: str


class Todo(BaseModel):
    id: int
    text: str
    completed: bool = False


class CreateTodoRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200)


class UpdateTodoRequest(BaseModel):
    completed: bool


class TodoStore:
    def __init__(self) -> None:
        self._todos: dict[int, Todo] = {}
        self._next_id = 1

    def list(self) -> list[Todo]:
        return list(self._todos.values())

    def create(self, text: str) -> Todo:
        todo = Todo(id=self._next_id, text=text, completed=False)
        self._todos[todo.id] = todo
        self._next_id += 1
        return todo

    def update_completed(self, todo_id: int, completed: bool) -> Todo | None:
        todo = self._todos.get(todo_id)
        if todo is None:
            return None

        updated = todo.model_copy(update={"completed": completed})
        self._todos[todo_id] = updated
        return updated

    def toggle(self, todo_id: int) -> Todo | None:
        todo = self._todos.get(todo_id)
        if todo is None:
            return None

        return self.update_completed(todo_id, not todo.completed)

    def delete(self, todo_id: int) -> bool:
        return self._todos.pop(todo_id, None) is not None

    def reset(self) -> None:
        self._todos.clear()
        self._next_id = 1


store = TodoStore()


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "rtrq-demo-fastapi-react-backend",
        "status": "ok",
        "server_sdk": package_info.status,
    }


def get_config() -> DemoConfig:
    return DemoConfig(
        rtrq_server_url=os.getenv("RTRQ_SERVER_URL", "http://localhost:8000"),
        rtrq_app_id=os.getenv("RTRQ_APP_ID", "dev"),
        rtrq_api_key=os.getenv("RTRQ_API_KEY", "dev-secret"),
    )


CONFIG_DEPENDENCY = Depends(get_config)


async def get_rtrq_client(config: DemoConfig = CONFIG_DEPENDENCY) -> AsyncIterator[RtrqInvalidator]:
    from rtrq_server_sdk import RtrqClient, ServerSdkConfig

    client = RtrqClient(
        ServerSdkConfig(
            app_id=config.rtrq_app_id,
            api_key=config.rtrq_api_key,
            server_url=config.rtrq_server_url,
        )
    )
    try:
        yield client
    finally:
        await client.aclose()


RTRQ_CLIENT_DEPENDENCY = Depends(get_rtrq_client)


async def invalidate_todos(client: RtrqInvalidator) -> None:
    try:
        await client.invalidate(["todos"], match_mode="prefix")
    except Exception as error:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"failed to invalidate todos query: {error}",
        ) from error


@app.get("/todos")
async def list_todos() -> list[Todo]:
    return store.list()


@app.post("/todos", status_code=status.HTTP_201_CREATED)
async def create_todo(
    body: CreateTodoRequest,
    rtrq_client: RtrqInvalidator = RTRQ_CLIENT_DEPENDENCY,
) -> Todo:
    todo = store.create(body.text)
    await invalidate_todos(rtrq_client)
    return todo


@app.patch("/todos/{todo_id}")
async def update_todo(
    todo_id: int,
    body: UpdateTodoRequest,
    rtrq_client: RtrqInvalidator = RTRQ_CLIENT_DEPENDENCY,
) -> Todo:
    todo = store.update_completed(todo_id, body.completed)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="todo not found")

    await invalidate_todos(rtrq_client)
    return todo


@app.post("/todos/{todo_id}/toggle")
async def toggle_todo(
    todo_id: int,
    rtrq_client: RtrqInvalidator = RTRQ_CLIENT_DEPENDENCY,
) -> Todo:
    todo = store.toggle(todo_id)
    if todo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="todo not found")

    await invalidate_todos(rtrq_client)
    return todo


@app.delete("/todos/{todo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_todo(
    todo_id: int,
    rtrq_client: RtrqInvalidator = RTRQ_CLIENT_DEPENDENCY,
) -> None:
    deleted = store.delete(todo_id)
    if not deleted:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="todo not found")

    await invalidate_todos(rtrq_client)


def run() -> None:
    import uvicorn

    uvicorn.run("rtrq_fastapi_react_demo.main:app", host="0.0.0.0", port=8001, reload=True)
