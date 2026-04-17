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
        status_code=200,
    )
    async def invalidate(_: InvalidationRequest) -> InvalidationResponse:
        return InvalidationResponse()

    @app.websocket("/ws")
    async def websocket_endpoint(websocket: WebSocket) -> None:
        await websocket.accept()
        # Placeholder until handshake auth and typed message handling are implemented.
        await websocket.close(code=1013)

    return app
