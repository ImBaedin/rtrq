from fastapi import FastAPI
from rtrq_server_core import package_info

app = FastAPI(
    title="RTRQ Server",
    description="Self-hostable RTRQ server scaffold.",
    version="0.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "rtrq-server",
        "status": "ok",
        "server_core": package_info.status,
    }


def run() -> None:
    import uvicorn

    uvicorn.run("rtrq_server.main:app", host="0.0.0.0", port=8000, reload=True)
