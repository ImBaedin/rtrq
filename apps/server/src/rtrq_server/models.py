from pydantic import BaseModel, Field


class InvalidationRequest(BaseModel):
    keys: list[str] = Field(default_factory=list)
    source: str | None = None


class InvalidationResponse(BaseModel):
    accepted: bool = True
    detail: str = "Invalidation transport is not wired yet."

