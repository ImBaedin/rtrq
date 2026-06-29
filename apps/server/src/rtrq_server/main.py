from __future__ import annotations

import json
import os
from typing import Any

from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, ConfigDict, Field
from rtrq_server_core import (
    InvalidApiKeyError,
    InvalidationEvent,
    InvalidationRequest,
    InvalidOriginError,
    InvalidQueryKeyError,
    MatchMode,
    RtrqCore,
    UnknownAppError,
    package_info,
)
from rtrq_server_core.keys import JsonValue, query_key_to_json

app = FastAPI(
    title="RTRQ Server",
    description="Self-hostable RTRQ server.",
    version="0.0.0",
)


class InvalidationBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    key: list[Any]
    match_mode: MatchMode = Field(default=MatchMode.PREFIX, alias="matchMode")


class WebSocketSender:
    def __init__(self, websocket: WebSocket) -> None:
        self._websocket = websocket

    async def send_event(self, event: InvalidationEvent) -> None:
        await self._websocket.send_json(event.to_payload())


def _parse_allowed_origins(value: str) -> tuple[str, ...]:
    return tuple(origin.strip() for origin in value.split(",") if origin.strip())


def _extract_api_key(
    *,
    x_rtrq_api_key: str | None,
    authorization: str | None,
) -> str | None:
    if x_rtrq_api_key:
        return x_rtrq_api_key

    if authorization and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()

    return None


def _parse_metadata(value: str | None) -> dict[str, JsonValue]:
    if value is None:
        return {}

    decoded = json.loads(value)
    if not isinstance(decoded, dict):
        raise InvalidQueryKeyError("metadata must be a JSON object")

    return decoded


core = RtrqCore.for_development(
    app_id=os.getenv("RTRQ_APP_ID", "dev"),
    api_key=os.getenv("RTRQ_API_KEY", "dev-secret"),
    allowed_origins=_parse_allowed_origins(os.getenv("RTRQ_ALLOWED_ORIGINS", "")),
)


@app.get("/health")
async def health() -> dict[str, str | int]:
    return {
        "service": "rtrq-server",
        "status": "ok",
        "server_core": package_info.status,
        "connections": await core.connection_count(),
    }


@app.post("/v1/apps/{app_id}/invalidations")
async def invalidate(
    app_id: str,
    body: InvalidationBody,
    x_rtrq_api_key: str | None = Header(default=None),
    authorization: str | None = Header(default=None),
) -> dict[str, int | str]:
    api_key = _extract_api_key(
        x_rtrq_api_key=x_rtrq_api_key,
        authorization=authorization,
    )
    if api_key is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing API key",
        )

    try:
        delivered = await core.invalidate(
            app_id=app_id,
            api_key=api_key,
            request=InvalidationRequest(
                key=body.key,
                match_mode=body.match_mode,
            ),
        )
    except UnknownAppError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except InvalidApiKeyError as error:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(error)) from error
    except InvalidQueryKeyError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(error),
        ) from error

    return {"status": "ok", "delivered": delivered}


@app.websocket("/v1/apps/{app_id}/ws")
async def websocket_subscriptions(
    websocket: WebSocket,
    app_id: str,
    metadata: str | None = None,
) -> None:
    try:
        session = await core.connect_client(
            app_id=app_id,
            origin=websocket.headers.get("origin"),
            sender=WebSocketSender(websocket),
            metadata=_parse_metadata(metadata),
        )
    except (InvalidOriginError, InvalidQueryKeyError, UnknownAppError, ValueError):
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        await websocket.accept()
        await websocket.send_json(
            {
                "type": "connected",
                "connectionId": session.connection_id,
            }
        )

        while True:
            message = await websocket.receive_json()
            if not isinstance(message, dict):
                raise InvalidQueryKeyError("message must be a JSON object")

            message_type = message.get("type")
            key = message.get("key")

            if message_type == "subscribe":
                subscribed_key = await session.subscribe(key)
                await websocket.send_json(
                    {
                        "type": "subscribed",
                        "key": query_key_to_json(subscribed_key),
                    }
                )
                continue

            if message_type == "unsubscribe":
                unsubscribed_key = await session.unsubscribe(key)
                await websocket.send_json(
                    {
                        "type": "unsubscribed",
                        "key": query_key_to_json(unsubscribed_key),
                    }
                )
                continue

            await websocket.send_json(
                {
                    "type": "error",
                    "code": "unknown_message_type",
                }
            )
    except (InvalidQueryKeyError, TypeError):
        await websocket.close(code=status.WS_1003_UNSUPPORTED_DATA)
    except WebSocketDisconnect:
        pass
    finally:
        await session.close()


def run() -> None:
    import uvicorn

    uvicorn.run("rtrq_server.main:app", host="0.0.0.0", port=8000, reload=True)
