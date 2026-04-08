from fastapi import FastAPI, WebSocket

from .config import Settings
from .models import InvalidationRequest, InvalidationResponse


def create_app(settings: Settings | None = None) -> FastAPI:
    app_settings = settings or Settings()
    app = FastAPI(title=app_settings.app_name)

    @app.get("/health")
    async def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    @app.post(
        f"{app_settings.api_prefix}/invalidate",
        response_model=InvalidationResponse,
    )
    async def invalidate(_: InvalidationRequest) -> InvalidationResponse:
        return InvalidationResponse()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()
        await websocket.send_json(
            {
                "type": "server_status",
                "detail": "WebSocket skeleton is online. Auth and fan-out are pending.",
            }
        )
        await websocket.close(code=1013)

    return app

