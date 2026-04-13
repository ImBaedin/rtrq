from pydantic import SecretStr

from rtrq_server_sdk import RTRQServerSDKConfig
from rtrq_server_sdk.security import (
    RTRQ_SHARED_SECRET_HEADER,
    build_shared_secret_headers,
)


def test_shared_secret_is_redacted_in_repr_and_json_dump() -> None:
    secret = "test-shared-secret"
    config = RTRQServerSDKConfig(
        base_url="http://example.test",
        shared_secret=SecretStr(secret),
    )

    assert secret not in repr(config)
    assert config.model_dump(mode="json")["shared_secret"] == "**********"


def test_build_shared_secret_headers_returns_auth_header() -> None:
    config = RTRQServerSDKConfig(
        base_url="http://example.test",
        shared_secret=SecretStr("test-shared-secret"),
    )

    assert build_shared_secret_headers(config.shared_secret) == {
        RTRQ_SHARED_SECRET_HEADER: "test-shared-secret",
    }
