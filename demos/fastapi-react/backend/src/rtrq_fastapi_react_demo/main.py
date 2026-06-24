from fastapi import FastAPI
from rtrq_server_sdk import package_info

app = FastAPI(
    title="RTRQ FastAPI React Demo Backend",
    description="Backend scaffold for demonstrating RTRQ invalidations from FastAPI.",
    version="0.0.0",
)


@app.get("/health")
def health() -> dict[str, str]:
    return {
        "service": "rtrq-demo-fastapi-react-backend",
        "status": "ok",
        "server_sdk": package_info.status,
    }


def run() -> None:
    import uvicorn

    uvicorn.run("rtrq_fastapi_react_demo.main:app", host="0.0.0.0", port=8001, reload=True)
