from pydantic import BaseModel, ConfigDict, Field


class Settings(BaseModel):
    """Runtime configuration for the RTRQ server."""

    model_config = ConfigDict(extra="ignore")

    app_name: str = "RTRQ Server"
    api_prefix: str = "/v1"
    redis_url: str | None = Field(
        default=None,
        description="Reserved for the future Redis pub/sub integration.",
    )
    server_secret: str | None = Field(
        default=None,
        description="Shared secret expected from trusted application servers.",
    )

